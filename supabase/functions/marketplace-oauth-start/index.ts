import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const hashState = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Marketplace OAuth service is not configured" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { business_id?: string; sales_channel_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  if (!body.business_id || !body.sales_channel_id) return json({ error: "business_id and sales_channel_id are required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("business_id,role,active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return json({ error: profileError.message }, 500);
  if (!profile?.active || profile.business_id !== body.business_id || !["owner", "admin", "super_admin"].includes(String(profile.role || "").toLowerCase())) {
    return json({ error: "Marketplace authorization requires an active business administrator" }, 403);
  }

  const { data: channel, error: channelError } = await admin
    .from("sales_channels")
    .select("id,business_id,code,name,platform_enabled")
    .eq("id", body.sales_channel_id)
    .eq("business_id", body.business_id)
    .maybeSingle();
  if (channelError) return json({ error: channelError.message }, 500);
  if (!channel) return json({ error: "Marketplace channel not found for this business" }, 404);
  if (!channel.platform_enabled) return json({ error: "Marketplace channel is not platform-enabled" }, 409);

  const provider = String(channel.code);
  const rawState = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const stateHash = await hashState(rawState);
  const redirectUri = Deno.env.get(`${provider.toUpperCase()}_OAUTH_REDIRECT_URI`) || null;

  const { data: connection } = await admin
    .from("channel_connections")
    .select("id")
    .eq("business_id", body.business_id)
    .eq("sales_channel_id", channel.id)
    .maybeSingle();

  if (connection) {
    const { error } = await admin.from("channel_connections").update({
      provider,
      connection_status: "pending_authorization",
      sync_enabled: true,
      authorized_by: user.id,
      last_sync_error: null,
    }).eq("id", connection.id).eq("business_id", body.business_id);
    if (error) return json({ error: error.message }, 500);
  } else {
    const { error } = await admin.from("channel_connections").insert({
      business_id: body.business_id,
      sales_channel_id: channel.id,
      provider,
      connection_status: "pending_authorization",
      sync_enabled: true,
      authorized_by: user.id,
      metadata: {},
    });
    if (error) return json({ error: error.message }, 500);
  }

  const { error: stateError } = await admin.from("marketplace_oauth_states").insert({
    business_id: body.business_id,
    user_id: user.id,
    sales_channel_id: channel.id,
    provider,
    state_hash: stateHash,
    redirect_uri: redirectUri,
    metadata: { channel_code: channel.code },
  });
  if (stateError) return json({ error: stateError.message }, 500);

  const configured = Boolean(
    Deno.env.get(`${provider.toUpperCase()}_OAUTH_AUTHORIZE_URL`) &&
    Deno.env.get(`${provider.toUpperCase()}_APP_ID`) &&
    redirectUri
  );

  if (!configured) {
    return json({
      ok: true,
      configured: false,
      provider,
      connection_status: "pending_authorization",
      message: `${channel.name} connection foundation is ready. Provider OAuth credentials and authorize endpoint are not configured yet.`,
    });
  }

  const authorizeUrl = new URL(Deno.env.get(`${provider.toUpperCase()}_OAUTH_AUTHORIZE_URL`)!);
  authorizeUrl.searchParams.set("client_id", Deno.env.get(`${provider.toUpperCase()}_APP_ID`)!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri!);
  authorizeUrl.searchParams.set("state", rawState);

  return json({ ok: true, configured: true, provider, authorization_url: authorizeUrl.toString() });
});
