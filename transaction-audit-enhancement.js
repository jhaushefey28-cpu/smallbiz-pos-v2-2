import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const PRESET_REASONS = ["Customer Request", "Wrong Item", "Wrong Quantity", "Wrong Price", "Duplicate Transaction", "Test Transaction"];
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

async function getContext() {
  if (!supabase) throw new Error("Supabase configuration is missing.");
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!session?.user?.id) throw new Error("You must be logged in.");
  const { data: profile, error } = await supabase.from("profiles").select("id,business_id,full_name,role,active").eq("id", session.user.id).single();
  if (error) throw new Error(error.message);
  if (!profile?.active) throw new Error("Account is inactive.");
  return { profile };
}

function showToast(message, type = "success") {
  document.querySelectorAll("[data-tx-audit-toast]").forEach((x) => x.remove());
  const el = document.createElement("div");
  el.dataset.txAuditToast = "true";
  el.textContent = message;
  el.style.cssText = `position:fixed;right:22px;bottom:22px;z-index:100000;padding:12px 16px;border-radius:10px;font-weight:700;background:${type === "error" ? "#fee2e2" : "#dcfce7"};color:${type === "error" ? "#991b1b" : "#166534"};box-shadow:0 8px 30px rgba(0,0,0,.18);`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
function closeVoidModal() { document.querySelector("[data-tx-audit-void-modal]")?.remove(); }

async function runVoid(sale, reason, button) {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Void reason is required.");
  if (cleanReason.length > 200) throw new Error("Void reason must be 200 characters or less.");
  const { profile } = await getContext();
  if (!["super_admin", "owner", "admin", "cashier"].includes(String(profile.role || "").toLowerCase())) throw new Error("Your role is not allowed to void transactions.");
  if (profile.business_id !== sale.business_id) throw new Error("Transaction does not belong to your business.");
  button.disabled = true; button.textContent = "Voiding...";
  const { error } = await supabase.rpc("void_sale", { p_sale_id: sale.id, p_reason: cleanReason });
  if (error) throw new Error(error.message || "Void failed.");
  closeVoidModal(); showToast(`Transaction ${sale.invoice_no} voided successfully.`);
  setTimeout(() => {
    const refresh = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Refresh"));
    if (refresh) refresh.click(); else window.location.reload();
  }, 250);
}

function openVoidDialog(sale) {
  closeVoidModal();
  const backdrop = document.createElement("div");
  backdrop.dataset.txAuditVoidModal = "true";
  backdrop.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;";
  const modal = document.createElement("div");
  modal.style.cssText = "width:min(560px,100%);background:#fff;border-radius:18px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.25);font-family:inherit;";
  modal.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px"><h2 style="margin:0">↩ Void Transaction</h2><button type="button" data-close style="font-size:20px">✕</button></div><p style="margin:0 0 8px">Void invoice <b>${esc(sale.invoice_no)}</b>?</p><p style="color:#64748b;margin-top:0">The existing atomic <b>void_sale</b> RPC will restore the sold inventory and create a VOID stock movement.</p><label style="display:block;font-weight:700;margin:16px 0 7px">Void Reason</label><select data-reason style="width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px"><option value="">Select a reason...</option>${PRESET_REASONS.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}<option value="__other__">Other</option></select><input data-other type="text" maxlength="200" placeholder="Enter custom reason..." style="display:none;width:100%;box-sizing:border-box;margin-top:9px;padding:11px;border:1px solid #cbd5e1;border-radius:9px" /><p data-error style="display:none;color:#b91c1c;font-weight:700;margin:12px 0 0"></p><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px"><button type="button" data-close>Cancel</button><button type="button" data-confirm class="primary" disabled>Confirm Void</button></div>`;
  backdrop.appendChild(modal); document.body.appendChild(backdrop);
  const select = modal.querySelector("[data-reason]"), other = modal.querySelector("[data-other]"), confirm = modal.querySelector("[data-confirm]"), error = modal.querySelector("[data-error]");
  const getReason = () => select.value === "__other__" ? other.value.trim() : select.value;
  const update = () => { confirm.disabled = !getReason(); };
  select.addEventListener("change", () => { other.style.display = select.value === "__other__" ? "block" : "none"; if (select.value === "__other__") other.focus(); update(); });
  other.addEventListener("input", update);
  modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeVoidModal));
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeVoidModal(); });
  confirm.addEventListener("click", async () => { error.style.display = "none"; try { await runVoid(sale, getReason(), confirm); } catch (e) { confirm.disabled = false; confirm.textContent = "Confirm Void"; error.textContent = e?.message || "Void failed."; error.style.display = "block"; } });
}

function enhanceVoidButtons() {
  document.querySelectorAll("button").forEach((button) => {
    if (button.dataset.txAuditVoidEnhanced === "true" || !button.textContent.includes("Void")) return;
    const row = button.closest("tr"); if (!row) return;
    const cells = row.querySelectorAll("td"), invoice = cells[0]?.textContent?.trim(); if (!invoice) return;
    button.dataset.txAuditVoidEnhanced = "true";
    const replacement = button.cloneNode(true); replacement.dataset.txAuditVoidEnhanced = "true"; button.replaceWith(replacement);
    replacement.addEventListener("click", async (event) => {
      event.preventDefault(); event.stopPropagation(); replacement.disabled = true;
      try {
        const { profile } = await getContext();
        const { data: sale, error } = await supabase.from("sales").select("id,business_id,invoice_no,status").eq("business_id", profile.business_id).eq("invoice_no", invoice).maybeSingle();
        if (error) throw new Error(error.message); if (!sale) throw new Error("Transaction not found."); if (sale.status !== "completed") throw new Error("Only completed transactions can be voided.");
        openVoidDialog(sale);
      } catch (e) { showToast(e?.message || "Unable to open void dialog.", "error"); } finally { replacement.disabled = false; }
    });
  });
}

async function enhanceSaleDetails() {
  const modal = document.querySelector(".sale-details-modal");
  if (!modal || modal.dataset.txAuditDetailsEnhanced === "true") return;
  const match = (modal.textContent || "").match(/Invoice:\s*([^\s<]+)/i); if (!match) return;
  try {
    const { profile } = await getContext();
    const { data: sale, error } = await supabase.from("sales").select("invoice_no,status,void_reason,voided_at,voided_by").eq("business_id", profile.business_id).eq("invoice_no", match[1].trim()).maybeSingle();
    if (error || !sale) return;
    modal.dataset.txAuditDetailsEnhanced = "true";
    const box = document.createElement("div"); box.style.cssText = "margin-top:16px;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;";
    const when = sale.voided_at ? new Date(sale.voided_at).toLocaleString("en-PH") : "-";
    let who = "-";
    if (sale.voided_by) { const { data: p } = await supabase.from("profiles").select("full_name").eq("id", sale.voided_by).eq("business_id", profile.business_id).maybeSingle(); who = p?.full_name || sale.voided_by; }
    box.innerHTML = `<b>Void Audit</b><div style="margin-top:8px"><div>Reason: <b>${esc(sale.void_reason || "-")}</b></div><div>Voided At: ${esc(when)}</div><div>Voided By: ${esc(who)}</div></div>`;
    modal.appendChild(box);
  } catch (e) { console.warn("Void audit enhancement failed:", e); }
}

const observer = new MutationObserver(() => { enhanceVoidButtons(); enhanceSaleDetails(); });
observer.observe(document.body, { childList: true, subtree: true });
enhanceVoidButtons(); enhanceSaleDetails();
