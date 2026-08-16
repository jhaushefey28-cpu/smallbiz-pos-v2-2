import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;
const roles = ["owner", "admin", "super_admin"];
const codeFromCard = (card) => {
  const icon = card?.querySelector(".mcp-icon")?.textContent?.trim();
  if (icon === "🛍️") return "shopee";
  if (icon === "🛒") return "lazada";
  if (icon === "🎵") return "tiktok_shop";
  return null;
};

function toast(message, bad = false) {
  document.getElementById("smallbiz-marketplace-oauth-toast")?.remove();
  const el = document.createElement("div");
  el.id = "smallbiz-marketplace-oauth-toast";
  el.textContent = message;
  el.style.cssText = `position:fixed;right:22px;bottom:22px;z-index:120000;max-width:min(520px,calc(100vw - 44px));padding:13px 16px;border-radius:12px;font:600 13px/1.45 system-ui,sans-serif;background:${bad ? "#fee2e2" : "#eff6ff"};color:${bad ? "#991b1b" : "#1e40af"};box-shadow:0 14px 40px rgba(0,0,0,.18)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6500);
}

async function startConnection(button) {
  if (!sb) {
    toast("Supabase configuration is missing.", true);
    return;
  }
  const card = button.closest(".mcp-card");
  const provider = codeFromCard(card);
  if (!provider) {
    toast("Unable to identify the marketplace channel.", true);
    return;
  }

  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Preparing…";
  try {
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) throw new Error("Please log in again before connecting a marketplace store.");

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("business_id,role,active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.active || !roles.includes(String(profile.role || "").toLowerCase())) {
      throw new Error("Marketplace connection requires an active business administrator.");
    }

    const { data: channel, error: channelError } = await sb
      .from("sales_channels")
      .select("id,name,code,platform_enabled")
      .eq("business_id", profile.business_id)
      .eq("code", provider)
      .maybeSingle();
    if (channelError) throw channelError;
    if (!channel) throw new Error("Marketplace channel is not configured for this business.");
    if (!channel.platform_enabled) throw new Error(`${channel.name} is not platform-enabled yet.`);

    const { data, error } = await sb.functions.invoke("marketplace-oauth-start", {
      body: { business_id: profile.business_id, sales_channel_id: channel.id },
    });
    if (error) {
      let detail = error.message || "Unable to start marketplace authorization.";
      try {
        const ctx = await error.context?.json?.();
        if (ctx?.error) detail = ctx.error;
      } catch {}
      throw new Error(detail);
    }

    if (data?.authorization_url) {
      toast(`Opening ${channel.name} authorization…`);
      window.location.assign(data.authorization_url);
      return;
    }

    if (data?.ok && data?.configured === false) {
      toast(`${channel.name}: connector foundation is ready, but the official provider OAuth credentials/endpoints are not configured yet.`);
      return;
    }

    throw new Error(data?.error || data?.message || "Marketplace authorization is not ready yet.");
  } catch (error) {
    toast(error?.message || "Unable to start marketplace authorization.", true);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

const observer = new MutationObserver(() => {});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest(".mcp-actions button") : null;
  if (!target || target.classList.contains("secondary")) return;
  if (!/^(Connect Store|Retry Setup)$/.test(target.textContent?.trim() || "")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  startConnection(target);
}, true);
