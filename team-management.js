import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const state = { session: null, profile: null, settings: null, members: [], busy: false };

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

function isAdminRole(role) {
  return ["super_admin", "owner", "admin"].includes(String(role || "").toLowerCase());
}

function notify(message, error = false) {
  const existing = document.getElementById("team-management-toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = "team-management-toast";
  el.textContent = message;
  el.style.cssText = `position:fixed;right:24px;top:24px;z-index:10050;padding:13px 17px;border-radius:12px;font-weight:700;background:${error ? "#fee2e2" : "#dcfce7"};color:${error ? "#991b1b" : "#166534"};box-shadow:0 12px 30px rgba(0,0,0,.15);max-width:420px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function injectStyles() {
  if (document.getElementById("team-management-styles")) return;
  const style = document.createElement("style");
  style.id = "team-management-styles";
  style.textContent = `
    #team-management-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px}
    #team-management-modal{width:min(980px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.25);padding:24px;color:#172033}
    #team-management-modal .tm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
    #team-management-modal .tm-head h2{margin:0 0 5px;font-size:24px}.tm-muted{color:#64748b;font-size:13px}
    #team-management-modal .tm-close{border:0;background:#f1f5f9;border-radius:10px;width:40px;height:40px;font-size:20px;cursor:pointer}
    .tm-grid{display:grid;grid-template-columns:1.05fr 1.95fr;gap:18px}.tm-card{border:1px solid #e2e8f0;border-radius:14px;padding:18px;background:#fff}.tm-card h3{margin:0 0 14px}
    .tm-field{margin-bottom:12px}.tm-field label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#475569}.tm-field input,.tm-field textarea{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px 11px;font:inherit}.tm-field textarea{resize:vertical}
    .tm-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.tm-btn{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer}.tm-primary{background:#2563eb;color:#fff;border-color:#2563eb}.tm-danger{background:#fff;color:#b91c1c;border-color:#fecaca}.tm-success{background:#fff;color:#166534;border-color:#bbf7d0}
    .tm-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:12px}.tm-table{width:100%;border-collapse:collapse;min-width:650px}.tm-table th,.tm-table td{padding:11px 12px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13px}.tm-table th{background:#f8fafc;color:#475569}.tm-table tr:last-child td{border-bottom:0}
    .tm-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800}.tm-active{background:#dcfce7;color:#166534}.tm-inactive{background:#fee2e2;color:#991b1b}.tm-admin{background:#dbeafe;color:#1d4ed8}.tm-cashier{background:#f1f5f9;color:#334155}
    .tm-empty{padding:28px;text-align:center;color:#64748b}.tm-count{font-size:13px;color:#64748b;margin-bottom:12px}.tm-warning{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:10px 12px;border-radius:10px;font-size:13px;margin-bottom:14px}
    @media(max-width:800px){.tm-grid{grid-template-columns:1fr}#team-management-modal{padding:16px}}
  `;
  document.head.appendChild(style);
}

function ensureModal() {
  if (document.getElementById("team-management-modal-backdrop")) return;
  const wrap = document.createElement("div");
  wrap.id = "team-management-modal-backdrop";
  wrap.style.display = "none";
  wrap.innerHTML = `<div id="team-management-modal" role="dialog" aria-modal="true" aria-labelledby="tm-title"></div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap) closeTeam(); });
  document.body.appendChild(wrap);
}

function closeTeam() {
  const el = document.getElementById("team-management-modal-backdrop");
  if (el) el.style.display = "none";
}

async function loadContext() {
  if (!sb) return false;
  const { data: sessionData } = await sb.auth.getSession();
  state.session = sessionData?.session || null;
  if (!state.session?.user) return false;
  const { data: profile, error } = await sb.from("profiles").select("id,business_id,full_name,role,active").eq("id", state.session.user.id).maybeSingle();
  if (error || !profile) return false;
  state.profile = profile;
  return isAdminRole(profile.role) && profile.active !== false;
}

async function loadBusinessSettings() {
  const { data, error } = await sb.from("business_settings").select("business_id,business_name,tin,address,phone").eq("business_id", state.profile.business_id).maybeSingle();
  if (error) throw new Error(error.message);
  state.settings = data || { business_id: state.profile.business_id, business_name: "", tin: "", address: "", phone: "" };
}

async function loadMembers() {
  const { data, error } = await sb.rpc("get_business_team");
  if (error) throw new Error(error.message);
  state.members = data || [];
}

function renderTeamModal() {
  const modal = document.getElementById("team-management-modal");
  if (!modal) return;
  const s = state.settings || {};
  const members = state.members || [];
  modal.innerHTML = `
    <div class="tm-head">
      <div><h2 id="tm-title">🏢 Business & Team Management</h2><div class="tm-muted">Manage this tenant's business profile and cashier access. Other businesses are isolated.</div></div>
      <button class="tm-close" id="tm-close" aria-label="Close">✕</button>
    </div>
    <div class="tm-grid">
      <section class="tm-card">
        <h3>Business Profile</h3>
        <div class="tm-muted" style="margin-bottom:14px">These details are used by this business's receipts.</div>
        <form id="tm-business-form">
          <div class="tm-field"><label>Business Name *</label><input id="tm-business-name" maxlength="200" required value="${esc(s.business_name)}" /></div>
          <div class="tm-field"><label>TIN</label><input id="tm-business-tin" maxlength="80" value="${esc(s.tin)}" placeholder="000-000-000-000" /></div>
          <div class="tm-field"><label>Business Address</label><textarea id="tm-business-address" rows="3" maxlength="500">${esc(s.address)}</textarea></div>
          <div class="tm-field"><label>Contact Number</label><input id="tm-business-phone" maxlength="50" value="${esc(s.phone)}" /></div>
          <div class="tm-actions"><button class="tm-btn tm-primary" id="tm-save-business" type="submit">Save Business Profile</button></div>
        </form>
      </section>
      <section class="tm-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><div><h3 style="margin-bottom:3px">Cashiers / Team</h3><div class="tm-count">${members.length} account(s) in this business</div></div><button class="tm-btn tm-primary" id="tm-add-cashier">➕ Add Cashier</button></div>
        <div class="tm-warning">Cashiers receive POS + Transaction History access only. Super Admin/owner accounts remain protected.</div>
        <div class="tm-table-wrap"><table class="tm-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Action</th></tr></thead><tbody>
          ${members.length ? members.map(m => `<tr><td><b>${esc(m.full_name || "Unnamed")}</b></td><td>${esc(m.email || "-")}</td><td><span class="tm-badge ${isAdminRole(m.role) ? "tm-admin" : "tm-cashier"}">${esc(m.role)}</span></td><td><span class="tm-badge ${m.active ? "tm-active" : "tm-inactive"}">${m.active ? "ACTIVE" : "INACTIVE"}</span></td><td>${m.last_sign_in_at ? esc(new Date(m.last_sign_in_at).toLocaleString("en-PH")) : "Never"}</td><td>${!isAdminRole(m.role) ? `<button class="tm-btn ${m.active ? "tm-danger" : "tm-success"}" data-team-active="${m.id}" data-next-active="${m.active ? "false" : "true"}">${m.active ? "Deactivate" : "Activate"}</button>` : "Protected"}</td></tr>`).join("") : `<tr><td colspan="6" class="tm-empty">No team members found.</td></tr>`}
        </tbody></table></div>
      </section>
    </div>`;

  document.getElementById("tm-close")?.addEventListener("click", closeTeam);
  document.getElementById("tm-add-cashier")?.addEventListener("click", openInviteDialog);
  document.getElementById("tm-business-form")?.addEventListener("submit", saveBusinessProfile);
  modal.querySelectorAll("[data-team-active]").forEach(btn => btn.addEventListener("click", async () => {
    const userId = btn.getAttribute("data-team-active");
    const next = btn.getAttribute("data-next-active") === "true";
    await setMemberActive(userId, next);
  }));
}

async function openTeam() {
  try {
    const allowed = await loadContext();
    if (!allowed) { notify("Only an active business admin can open Team Management.", true); return; }
    await Promise.all([loadBusinessSettings(), loadMembers()]);
    ensureModal();
    renderTeamModal();
    document.getElementById("team-management-modal-backdrop").style.display = "flex";
  } catch (e) {
    notify("Unable to load Team Management: " + (e?.message || "Unknown error"), true);
  }
}

async function saveBusinessProfile(e) {
  e.preventDefault();
  if (state.busy) return;
  state.busy = true;
  const btn = document.getElementById("tm-save-business");
  if (btn) btn.disabled = true;
  try {
    const businessName = document.getElementById("tm-business-name")?.value.trim() || "";
    const tin = document.getElementById("tm-business-tin")?.value.trim() || "";
    const address = document.getElementById("tm-business-address")?.value.trim() || "";
    const phone = document.getElementById("tm-business-phone")?.value.trim() || "";
    const { data, error } = await sb.rpc("update_business_profile", { p_business_name: businessName, p_tin: tin || null, p_address: address || null, p_phone: phone || null });
    if (error) throw new Error(error.message);
    state.settings = data;
    notify("Business profile saved successfully.");
    renderTeamModal();
  } catch (e) {
    notify("Unable to save business profile: " + (e?.message || "Unknown error"), true);
  } finally { state.busy = false; }
}

function openInviteDialog() {
  const modal = document.getElementById("team-management-modal");
  if (!modal) return;
  const box = document.createElement("div");
  box.id = "tm-invite-overlay";
  box.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10020;display:flex;align-items:center;justify-content:center;padding:20px";
  box.innerHTML = `<div style="width:min(460px,94vw);background:#fff;border-radius:16px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.25)">
    <h3 style="margin:0 0 5px">➕ Add Cashier</h3><p class="tm-muted" style="margin:0 0 16px">An invitation link will be sent to the cashier's email. The account will be assigned to this business only.</p>
    <form id="tm-invite-form"><div class="tm-field"><label>Cashier Full Name *</label><input id="tm-invite-name" maxlength="120" required placeholder="e.g. Juan Dela Cruz" /></div><div class="tm-field"><label>Email *</label><input id="tm-invite-email" type="email" maxlength="254" required placeholder="cashier@example.com" /></div><div class="tm-actions"><button type="button" class="tm-btn" id="tm-invite-cancel">Cancel</button><button type="submit" class="tm-btn tm-primary" id="tm-invite-submit">Send Invitation</button></div></form>
  </div>`;
  document.body.appendChild(box);
  box.addEventListener("click", e => { if (e.target === box) box.remove(); });
  document.getElementById("tm-invite-cancel")?.addEventListener("click", () => box.remove());
  document.getElementById("tm-invite-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const submit = document.getElementById("tm-invite-submit");
    submit.disabled = true;
    try {
      const fullName = document.getElementById("tm-invite-name").value.trim();
      const email = document.getElementById("tm-invite-email").value.trim().toLowerCase();
      const { data, error } = await sb.functions.invoke("invite-cashier", { body: { full_name: fullName, email } });
      if (error) throw new Error(error.message || "Invitation failed");
      if (data?.error) throw new Error(data.error);
      box.remove();
      notify(`Invitation sent to ${email}.`);
      await loadMembers();
      renderTeamModal();
    } catch (err) {
      notify("Unable to invite cashier: " + (err?.message || "Unknown error"), true);
      submit.disabled = false;
    }
  });
}

async function setMemberActive(userId, active) {
  try {
    const action = active ? "activate" : "deactivate";
    if (!confirm(`Are you sure you want to ${action} this cashier account?`)) return;
    const { error } = await sb.rpc("set_business_user_active", { p_user_id: userId, p_active: active });
    if (error) throw new Error(error.message);
    notify(`Cashier account ${active ? "activated" : "deactivated"}.`);
    await loadMembers();
    renderTeamModal();
  } catch (e) { notify("Unable to change account status: " + (e?.message || "Unknown error"), true); }
}

function installTeamButton() {
  if (!sb) return;
  const nav = document.querySelector(".sidebar-nav");
  if (!nav || document.getElementById("team-management-nav")) return;
  if (!state.profile || !isAdminRole(state.profile.role) || state.profile.active === false) return;
  const btn = document.createElement("button");
  btn.id = "team-management-nav";
  btn.className = "nav-item";
  btn.type = "button";
  btn.innerHTML = "<span>👥</span><b>Team</b>";
  btn.addEventListener("click", openTeam);
  nav.appendChild(btn);
}

async function syncNav() {
  if (!sb) return;
  const allowed = await loadContext();
  const existing = document.getElementById("team-management-nav");
  if (!allowed) { existing?.remove(); return; }
  installTeamButton();
}

async function init() {
  if (!sb) return;
  injectStyles(); ensureModal();
  await syncNav();
  sb.auth.onAuthStateChange(() => setTimeout(syncNav, 150));
  const observer = new MutationObserver(() => { if (!document.getElementById("team-management-nav")) installTeamButton(); });
  observer.observe(document.body, { childList: true, subtree: true });
}

setTimeout(init, 250);
