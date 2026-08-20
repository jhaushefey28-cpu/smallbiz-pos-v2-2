import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const FN = "team-admin-user";

const style = document.createElement("style");
style.textContent = `#sb-team-rbac-overlay{position:fixed;inset:0;z-index:10030;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px}#sb-team-rbac-card{width:min(720px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.25);font-family:system-ui;color:#172033}.sb-rbac-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sb-rbac-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sb-rbac-field{margin-bottom:10px}.sb-rbac-field label{display:block;font-size:12px;font-weight:700;margin-bottom:5px}.sb-rbac-field input,.sb-rbac-field select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:9px}.sb-rbac-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}.sb-rbac-btn{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer}.sb-rbac-primary{background:#2563eb;color:#fff;border-color:#2563eb}.sb-rbac-muted{background:#f1f5f9}.sb-rbac-checks{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-height:280px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px;padding:10px}.sb-rbac-check{display:flex;gap:7px;align-items:flex-start;font-size:12px}.sb-rbac-msg{font-size:12px;margin-top:10px}.sb-rbac-ok{color:#166534}.sb-rbac-err{color:#991b1b}@media(max-width:650px){.sb-rbac-grid,.sb-rbac-checks{grid-template-columns:1fr}#sb-team-rbac-card{width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}}`;
document.head.appendChild(style);

function esc(v){return String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
async function invoke(body){const {data,error}=await sb.functions.invoke(FN,{body});if(error)throw new Error(error.message||"Request failed");if(data?.error)throw new Error(data.error);return data;}
function closeOverlay(){document.getElementById("sb-team-rbac-overlay")?.remove();}
function openOverlay(html){closeOverlay();const o=document.createElement("div");o.id="sb-team-rbac-overlay";o.innerHTML=`<div id="sb-team-rbac-card">${html}</div>`;o.addEventListener("click",e=>{if(e.target===o)closeOverlay();});document.body.appendChild(o);return o.querySelector("#sb-team-rbac-card");}

async function resolveMemberId(email){
  const {data,error}=await sb.rpc("get_business_team");
  if(error)throw new Error(error.message);
  const wanted=String(email||"").trim().toLowerCase();
  const member=(data||[]).find(m=>String(m.email||"").trim().toLowerCase()===wanted);
  if(!member?.user_id)throw new Error("Unable to resolve this team member account. Please refresh Team and try again.");
  return member.user_id;
}

async function openCreate(){
  const card=openOverlay(`<div class="sb-rbac-head"><div><h2 style="margin:0 0 4px">Add Team Account</h2><div style="font-size:12px;color:#64748b">Tenant Super Admin/Owner/Admin creates the account.</div></div><button class="sb-rbac-btn sb-rbac-muted" id="sb-rbac-close">✕</button></div><div class="sb-rbac-grid" style="margin-top:16px"><div class="sb-rbac-field"><label>Full Name</label><input id="rbac-name" placeholder="Juan Dela Cruz"></div><div class="sb-rbac-field"><label>Email</label><input id="rbac-email" type="email" placeholder="juan@example.com"></div><div class="sb-rbac-field"><label>Role</label><select id="rbac-role"><option value="cashier">Cashier</option><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div><div class="sb-rbac-field"><label>Temporary Password</label><input id="rbac-password" type="password" autocomplete="new-password" placeholder="At least 8 characters"></div></div><div id="rbac-msg" class="sb-rbac-msg"></div><div class="sb-rbac-actions"><button class="sb-rbac-btn sb-rbac-muted" id="rbac-cancel">Cancel</button><button class="sb-rbac-btn sb-rbac-primary" id="rbac-create">Create Account</button></div>`);
  card.querySelector("#sb-rbac-close").onclick=closeOverlay;card.querySelector("#rbac-cancel").onclick=closeOverlay;
  card.querySelector("#rbac-create").onclick=async()=>{const btn=card.querySelector("#rbac-create"),msg=card.querySelector("#rbac-msg");btn.disabled=true;msg.textContent="Creating account...";try{const d=await invoke({action:"create",full_name:card.querySelector("#rbac-name").value.trim(),email:card.querySelector("#rbac-email").value.trim().toLowerCase(),role:card.querySelector("#rbac-role").value,password:card.querySelector("#rbac-password").value});msg.className="sb-rbac-msg sb-rbac-ok";msg.textContent=`Account created: ${d.email}`;setTimeout(closeOverlay,900);}catch(e){msg.className="sb-rbac-msg sb-rbac-err";msg.textContent=e.message;btn.disabled=false;}};
}

async function openManage(email,name,role){
  const card=openOverlay(`<div class="sb-rbac-head"><div><h2 style="margin:0 0 4px">Manage Access</h2><div style="font-size:12px;color:#64748b">${esc(name)} · ${esc(email)}</div></div><button class="sb-rbac-btn sb-rbac-muted" id="sb-rbac-close">✕</button></div><div class="sb-rbac-grid" style="margin-top:16px"><div class="sb-rbac-field"><label>Role</label><select id="rbac-edit-role"><option value="cashier">Cashier</option><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div><div class="sb-rbac-field"><label>New Password</label><input id="rbac-edit-password" type="password" autocomplete="new-password" placeholder="Leave blank to keep current"></div></div><div class="sb-rbac-field"><label>Individual Permissions</label><div id="rbac-permissions" class="sb-rbac-checks">Loading permissions...</div></div><div id="rbac-msg" class="sb-rbac-msg"></div><div class="sb-rbac-actions"><button class="sb-rbac-btn sb-rbac-muted" id="rbac-cancel">Cancel</button><button class="sb-rbac-btn sb-rbac-primary" id="rbac-save">Save Access</button></div>`);
  card.querySelector("#sb-rbac-close").onclick=closeOverlay;card.querySelector("#rbac-cancel").onclick=closeOverlay;card.querySelector("#rbac-edit-role").value=role||"cashier";
  let userId="";
  try{
    userId=await resolveMemberId(email);
    const [all,current]=await Promise.all([invoke({action:"list_permissions"}),invoke({action:"get_permissions",user_id:userId,email})]);
    const selected=new Set(current.permission_codes||[]),groups={};
    (all.permissions||[]).forEach(p=>(groups[p.module||"Other"]??=[]).push(p));
    card.querySelector("#rbac-permissions").innerHTML=Object.entries(groups).map(([module,ps])=>`<div style="grid-column:1/-1;font-weight:800;font-size:12px;color:#475569;margin-top:4px">${esc(module)}</div>`+ps.map(p=>`<label class="sb-rbac-check"><input type="checkbox" data-rbac-perm="${esc(p.code)}" ${selected.has(p.code)?"checked":""}><span><b>${esc(p.name)}</b><br><small style="color:#64748b">${esc(p.code)}</small></span></label>`).join("")).join("")||"No permissions configured.";
  }catch(e){card.querySelector("#rbac-permissions").innerHTML=`<span class="sb-rbac-err">${esc(e.message)}</span>`;}
  card.querySelector("#rbac-save").onclick=async()=>{const btn=card.querySelector("#rbac-save"),msg=card.querySelector("#rbac-msg");btn.disabled=true;msg.textContent="Saving...";try{if(!userId)userId=await resolveMemberId(email);await invoke({action:"set_role",user_id:userId,email,role:card.querySelector("#rbac-edit-role").value});const codes=[...card.querySelectorAll("[data-rbac-perm]:checked")].map(x=>x.getAttribute("data-rbac-perm"));await invoke({action:"set_permissions",user_id:userId,email,permission_codes:codes});const pass=card.querySelector("#rbac-edit-password").value;if(pass)await invoke({action:"set_password",email,password:pass});msg.className="sb-rbac-msg sb-rbac-ok";msg.textContent="Access, role and password settings saved.";setTimeout(closeOverlay,900);}catch(e){msg.className="sb-rbac-msg sb-rbac-err";msg.textContent=e.message;btn.disabled=false;}};
}

function decorateTeamModal(){
  const modal=document.getElementById("team-management-modal");
  if(!modal)return;
  const addCashier=modal.querySelector("#tm-add-cashier");
  if(addCashier&&!modal.querySelector("#sb-rbac-add-user")){const b=document.createElement("button");b.id="sb-rbac-add-user";b.className=addCashier.className;b.textContent="👤 Add User";b.onclick=openCreate;addCashier.parentElement?.appendChild(b);}
  const rows=[...modal.querySelectorAll(".tm-table tbody tr")];
  rows.forEach(row=>{if(row.querySelector("[data-rbac-manage]"))return;const cells=row.querySelectorAll("td");if(cells.length<6)return;const name=cells[0]?.innerText.trim()||"",email=cells[1]?.innerText.trim()||"",role=cells[2]?.innerText.trim().toLowerCase()||"cashier";if(!email||["super_admin","owner"].includes(role))return;const action=cells[5],b=document.createElement("button");b.className="tm-btn tm-success";b.dataset.rbacManage="1";b.textContent="Access";b.style.marginLeft="6px";b.onclick=()=>openManage(email,name,role);action?.appendChild(b);});
}

const obs=new MutationObserver(decorateTeamModal);obs.observe(document.body,{childList:true,subtree:true});setInterval(decorateTeamModal,1200);decorateTeamModal();window.__SMALLBIZ_TEAM_RBAC__="v2";
