import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getConfiguredProviderEnvironment, normalizeMarketplaceProvider } from "../_shared/marketplace-providers.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const html = (title: string, message: string, status = 200) => new Response(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`, { status, headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });
const sha256 = async (value: string) => { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join(""); };
const base64UrlEncode = (bytes: Uint8Array) => { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); };
const base64UrlDecode = (value: string) => { const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); const binary = atob(normalized); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); };
const getEncryptionKey = async () => { const raw = Deno.env.get("MARKETPLACE_TOKEN_ENCRYPTION_KEY"); if (!raw) throw new Error("MARKETPLACE_TOKEN_ENCRYPTION_KEY is not configured"); const bytes = base64UrlDecode(raw); if (bytes.byteLength !== 32) throw new Error("MARKETPLACE_TOKEN_ENCRYPTION_KEY must be a base64url-encoded 32-byte key"); return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt"]); };
const encryptSecret = async (value: string) => { const key = await getEncryptionKey(); const iv = crypto.getRandomValues(new Uint8Array(12)); const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)); const output = new Uint8Array(iv.byteLength + encrypted.byteLength); output.set(iv, 0); output.set(new Uint8Array(encrypted), iv.byteLength); return base64UrlEncode(output); };
const getParam = (url: URL, key: string) => url.searchParams.get(key)?.trim() || null;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });
  const url = new URL(req.url); const state = getParam(url, "state"); const code = getParam(url, "code"); const providerParam = getParam(url, "provider"); const oauthError = getParam(url, "error") || getParam(url, "error_code");
  if (!state) return html("Marketplace connection failed", "Missing OAuth state.", 400);
  if (oauthError) return html("Marketplace connection cancelled", "The marketplace authorization was cancelled or rejected.", 400);
  if (!code) return html("Marketplace connection failed", "Missing authorization code.", 400);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return html("Marketplace connection failed", "The marketplace OAuth service is not configured.", 500);
  const admin = createClient(supabaseUrl, serviceKey); const stateHash = await sha256(state);
  const { data: oauthState, error: stateError } = await admin.from("marketplace_oauth_states").select("id,business_id,user_id,sales_channel_id,provider,redirect_uri,expires_at,used_at").eq("state_hash", stateHash).maybeSingle();
  if (stateError) return html("Marketplace connection failed", "Unable to validate the authorization state.", 500);
  if (!oauthState) return html("Marketplace connection failed", "Invalid or expired authorization state.", 400);
  if (oauthState.used_at || new Date(oauthState.expires_at).getTime() <= Date.now()) return html("Marketplace connection failed", "This authorization attempt has expired or was already used.", 400);
  const provider = normalizeMarketplaceProvider(String(providerParam || oauthState.provider));
  if (!provider || provider !== normalizeMarketplaceProvider(String(oauthState.provider))) return html("Marketplace connection failed", "The authorization provider does not match the stored request.", 400);
  const env = getConfiguredProviderEnvironment(provider); const tokenUrl = Deno.env.get(`${provider.toUpperCase()}_OAUTH_TOKEN_URL`); const appSecret = Deno.env.get(`${provider.toUpperCase()}_APP_SECRET`);
  if (!tokenUrl || !appSecret || !env.appId || !oauthState.redirect_uri) return html("Marketplace connection pending", "The authorization was received, but the provider token configuration is not complete yet.", 409);

  try {
    const tokenResponse = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: env.appId, client_secret: appSecret, redirect_uri: oauthState.redirect_uri }) });
    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) { await admin.from("channel_connections").update({ connection_status: "error", last_sync_status: "oauth_token_exchange_failed", last_sync_error: `Marketplace token exchange failed (${tokenResponse.status})` }).eq("business_id", oauthState.business_id).eq("sales_channel_id", oauthState.sales_channel_id); return html("Marketplace connection failed", "The marketplace rejected the authorization exchange.", 502); }
    const accessToken = tokenPayload.access_token ?? tokenPayload.accessToken; const refreshToken = tokenPayload.refresh_token ?? tokenPayload.refreshToken;
    if (!accessToken) throw new Error("Provider token response did not contain an access token");
    const { data: connection, error: connectionLookupError } = await admin.from("channel_connections").select("id").eq("business_id", oauthState.business_id).eq("sales_channel_id", oauthState.sales_channel_id).maybeSingle();
    if (connectionLookupError || !connection) throw new Error("Marketplace connection record not found");
    const accessCiphertext = await encryptSecret(String(accessToken)); const refreshCiphertext = refreshToken ? await encryptSecret(String(refreshToken)) : null;
    const expiresIn = Number(tokenPayload.expires_in ?? tokenPayload.expiresIn ?? 0); const refreshExpiresIn = Number(tokenPayload.refresh_expires_in ?? tokenPayload.refreshExpiresIn ?? 0);
    const accessExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null; const refreshExpiresAt = refreshExpiresIn > 0 ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString() : null;
    const { error: secretError } = await admin.from("marketplace_connection_secrets").upsert({ business_id: oauthState.business_id, channel_connection_id: connection.id, access_token_ciphertext: accessCiphertext, refresh_token_ciphertext: refreshCiphertext, token_type: tokenPayload.token_type ?? tokenPayload.tokenType ?? "Bearer", scope: tokenPayload.scope ?? null, access_token_expires_at: accessExpiresAt, refresh_token_expires_at: refreshExpiresAt }, { onConflict: "channel_connection_id" });
    if (secretError) throw new Error(secretError.message);
    const externalStoreId = tokenPayload.shop_id ?? tokenPayload.shopId ?? tokenPayload.seller_id ?? tokenPayload.sellerId ?? null; const externalStoreName = tokenPayload.shop_name ?? tokenPayload.shopName ?? null;
    const { error: connectionError } = await admin.from("channel_connections").update({ connection_status: "connected", external_store_id: externalStoreId ? String(externalStoreId) : null, external_store_name: externalStoreName ? String(externalStoreName) : null, authorized_at: new Date().toISOString(), last_sync_status: "authorized", last_sync_error: null, sync_enabled: true, metadata: { oauth_scope: tokenPayload.scope ?? null } }).eq("id", connection.id).eq("business_id", oauthState.business_id);
    if (connectionError) throw new Error(connectionError.message);
    await admin.from("marketplace_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", oauthState.id);
    return html("Marketplace connected", "Your marketplace store is now connected to SmallBiz POS. You may close this window.");
  } catch (error) {
    await admin.from("channel_connections").update({ connection_status: "error", last_sync_status: "oauth_callback_failed", last_sync_error: error instanceof Error ? error.message : "Marketplace OAuth callback failed" }).eq("business_id", oauthState.business_id).eq("sales_channel_id", oauthState.sales_channel_id);
    return html("Marketplace connection failed", "We could not finish the secure marketplace connection. Please try connecting again.", 500);
  }
});
