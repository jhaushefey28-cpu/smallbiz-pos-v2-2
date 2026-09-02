// SMALLBIZ_TEAM_MANAGEMENT_V4
// Standalone Team UI. Platform owner can create tenant Super Admin accounts;
// Tenant Super Admin/Owner/Admin can create and manage tenant staff/cashier accounts.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=SUPABASE_URL&&SUPABASE_KEY?createClient(SUPABASE_URL,SUPABASE_KEY):null;

let overlay=null;
const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));

async function getContext(){
  if(!sb)throw new Error("Supabase is not configured.");
  const {data:{session}}=await sb.auth.getSession();
  const uid=session?.user?.id;if(!uid)throw new Error("You are not signed in.");
  const {data:profile,error:pe}=await sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",uid).maybeSingle();
  if(pe)throw new Error(pe.message);
  const [{data:platformOwner,error:poe},{data:tenantAdmin,error:te}]=await Promise.all([
    sb.from("platform_owners").select("user_id").eq("user_id",uid).maybeSingle(),
    profile?.business_id?sb.from("tenant_superadmins").select("business_id,user_id").eq("business_id",profile.business_id).eq("user_id",uid).maybeSingle():Promise.resolve({data:null,error:null})
  ]);
  if(poe)throw new Error(poe.message);if(te)throw new Error(te.message);
  const role=String(profile?.role||"").toLowerCase();
  const isPlatformOwner=Boolean(platformOwner?.user_id===uid);
  const allowed=isPlatformOwner||Boolean(tenantAdmin?.user_id===uid)||["owner","admin","super_admin"].includes(role);
  if(!allowed)throw new Error("Platform Owner or Tenant Super Admin access is required for Team Management.");
  return {profile,uid,isPlatformOwner};
}

function closeTeam(){overlay?.remove();overlay=null;}
function cardShell(){
  const o=document.createElement("div");
  o.id="smallbiz-team-overlay";
  o.style.cssText="position:fixed;inset:0;z-index:10020;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box";
  o.addEventListener("click",e=>{if(e.target===o)closeTeam()});
  document.body.appendChild(o);overlay=o;
  return o;
}

async function loadMembers(businessId){
  const {data,error}=await sb.rpc("get_business_team");
  if(error)throw new Error(error.message);
  return (data||[]).filter(x=>!x.business_id||String(x.business_id)===String(businessId));
}

async function openPermissions(member){
  const ctx=await getContext();
  if(!member?.user_id)throw new Error("Team member account ID is missing.");
  const {data:permissions,error:pe}=await sb.from("permissions").select("id,code,name,module").neq("module","Payroll").order("module").order("code");
  if(pe)throw new Error(pe.message);
  const {data:userPerms,error:ue}=await sb.from("user_permissions").select("permission_id,allowed").eq("user_id",member.user_id);
  if(ue)throw new Error(ue.message);
  const allowed=new Set((userPerms||[]).filter(x=>x.allowed===true).map(x=>String(x.permission_id)));
  const groups={};(permissions||[]).forEach(p=>(groups[p.module||"Other"]??=[]).push(p));
  const o=cardShell();
  o.innerHTML=`<div style="width:min(820px,96vw);max-height:92dvh;overflow:auto;background:#fff;border-radius:18px;padding:20px;color:#172033;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:system-ui">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:12px;color:#64748b;font-weight:800">TEAM ACCESS</div><h2 style="margin:4px 0">🔐 Manage Access</h2><div style="font-size:13px;color:#64748b">${esc(member.full_name||member.name||"User")} · ${esc(member.email||"")} · ${esc(member.role||"cashier")}</div></div><button id="team-perm-close" type="button" style="border:0;background:#f1f5f9;border-radius:10px;width:40px;height:40px;cursor:pointer">✕</button></div>
    <div id="team-perm-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin-top:16px">${Object.entries(groups).map(([module,items])=>`<section style="border:1px solid #e2e8f0;border-radius:12px;padding:12px"><h4 style="margin:0 0 8px">${esc(module)}</h4>${items.map(p=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-top:1px solid #f1f5f9;cursor:pointer"><input type="checkbox" data-permission-id="${esc(p.id)}" ${allowed.has(String(p.id))?"checked":""}/> <span><b>${esc(p.name)}</b><small style="display:block;color:#64748b">${esc(p.code)}</small></span></label>`).join("")}</section>`).join("")||`<div style="color:#64748b">No permissions configured.</div>`}</div>
    <div id="team-perm-msg" style="font-size:12px;margin-top:12px"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button id="team-perm-cancel" type="button" style="border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700">Cancel</button><button id="team-perm-save" type="button" style="border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:10px;padding:10px 14px;font-weight:700">Save Permissions</button></div>
  </div>`;
  o.querySelector("#team-perm-close").onclick=closeTeam;o.querySelector("#team-perm-cancel").onclick=closeTeam;
  o.querySelector("#team-perm-save").onclick=async()=>{
    const btn=o.querySelector("#team-perm-save"),msg=o.querySelector("#team-perm-msg");btn.disabled=true;msg.textContent="Saving...";
    try{
      const selected=[...o.querySelectorAll("[data-permission-id]:checked")].map(x=>x.getAttribute("data-permission-id"));
      const {error}=await sb.functions.invoke("team-admin-user",{body:{action:"set_permissions",user_id:member.user_id,permission_codes:await codesFromIds(selected)}});
      if(error)throw new Error(error.message);window.dispatchEvent(new CustomEvent("smallbiz:user-permissions-updated",{detail:{userId:member.user_id}}));
      msg.style.color="#166534";msg.textContent="Permissions saved.";setTimeout(closeTeam,500);
    }catch(e){msg.style.color="#991b1b";msg.textContent=e.message||"Unable to save permissions.";btn.disabled=false;}
  };
}

async function codesFromIds(ids){
  if(!ids.length)return [];
  const {data,error}=await sb.from("permissions").select("id,code").in("id",ids);
  if(error)throw new Error(error.message);return (data||[]).map(x=>x.code);
}

async function openCreate(){
  const ctx=await getContext();
  let businesses=[];
  if(ctx.isPlatformOwner){
    const {data,error}=await sb.functions.invoke("team-admin-user",{body:{action:"list_businesses"}});
    if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);businesses=data?.businesses||[];
    if(!businesses.length)throw new Error("No tenants/businesses found.");
  }
  const o=cardShell();
  const tenantField=ctx.isPlatformOwner?`<label>Tenant / Business<select id="tm-business" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px">${businesses.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("")}</select></label>`:"<div style=\"padding:10px;border-radius:10px;background:#f8fafc;color:#475569;font-size:13px\">Tenant: <b>Current Business</b></div>";
  const roleField=ctx.isPlatformOwner?`<label>Account Type<select id="tm-role" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px"><option value="super_admin">Tenant Super Admin</option></select></label>`:`<label>Role<select id="tm-role" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px"><option value="cashier">Cashier</option><option value="staff">Staff</option></select></label>`;
  o.innerHTML=`<div style="width:min(600px,96vw);background:#fff;border-radius:18px;padding:20px;color:#172033;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:system-ui"><div style="display:flex;justify-content:space-between"><div><div style="font-size:12px;color:#64748b;font-weight:800">${ctx.isPlatformOwner?"PLATFORM OWNER":"TENANT SUPER ADMIN"}</div><h2 style="margin:4px 0">👤 ${ctx.isPlatformOwner?"Create Tenant Super Admin":"Add Team Account"}</h2></div><button id="team-create-close" type="button" style="border:0;background:#f1f5f9;border-radius:10px;width:40px;height:40px">✕</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">${tenantField}<label>Full Name<input id="tm-name" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px" placeholder="Juan Dela Cruz"></label><label>Email<input id="tm-email" type="email" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px" placeholder="juan@example.com"></label>${roleField}<label>Temporary Password<input id="tm-password" type="password" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px" placeholder="At least 8 characters"></label></div><div id="tm-create-msg" style="font-size:12px;margin-top:12px"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button id="tm-create-cancel" type="button">Cancel</button><button id="tm-create-save" type="button" class="primary">Create Account</button></div></div>`;
  o.querySelector("#team-create-close").onclick=closeTeam;o.querySelector("#tm-create-cancel").onclick=closeTeam;
  o.querySelector("#tm-create-save").onclick=async()=>{
    const btn=o.querySelector("#tm-create-save"),msg=o.querySelector("#tm-create-msg");btn.disabled=true;msg.textContent="Creating account...";
    try{
      const action=ctx.isPlatformOwner?"create_superadmin":"create";
      const businessId=ctx.isPlatformOwner?o.querySelector("#tm-business").value:ctx.profile.business_id;
      const body={action,full_name:o.querySelector("#tm-name").value.trim(),email:o.querySelector("#tm-email").value.trim().toLowerCase(),role:o.querySelector("#tm-role").value,password:o.querySelector("#tm-password").value,business_id:businessId};
      const {data,error}=await sb.functions.invoke("team-admin-user",{body});
      if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);
      msg.style.color="#166534";msg.textContent=`Account created: ${data?.email||body.email}`;setTimeout(closeTeam,800);
    }catch(e){msg.style.color="#991b1b";msg.textContent=e.message||"Unable to create account.";btn.disabled=false;}
  };
}

async function openTeam(){
  try{
    const ctx=await getContext();
    const businessId=ctx.profile?.business_id;
    const members=businessId?await loadMembers(businessId):[];
    const o=cardShell();
    o.innerHTML=`<div id="team-management-modal" style="width:min(1000px,96vw);max-height:92dvh;overflow:auto;background:#fff;border-radius:18px;padding:20px;color:#172033;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:system-ui"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:12px;color:#64748b;font-weight:800">SMALLBIZ POS</div><h2 style="margin:4px 0">👥 Team Management</h2><p style="margin:0;color:#64748b">${ctx.isPlatformOwner?"Platform Owner: create Tenant Super Admin accounts across businesses.":"Tenant Super Admin: create and manage staff/cashier accounts for this business."}</p></div><button id="team-close" type="button" style="border:0;background:#f1f5f9;border-radius:10px;width:40px;height:40px">✕</button></div><div style="display:flex;justify-content:flex-end;margin:14px 0"><button id="tm-add-cashier" type="button" class="primary">➕ ${ctx.isPlatformOwner?"Create Tenant Super Admin":"Add Team Account"}</button></div><div class="table-wrapper"><table class="tm-table" style="width:100%"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>${members.length?members.map(m=>`<tr><td><b>${esc(m.full_name||m.name||"User")}</b></td><td>${esc(m.role||"cashier")}</td><td>${m.active===false?"Inactive":"Active"}</td><td>${m.created_at?new Date(m.created_at).toLocaleDateString("en-PH"):"-"}</td><td><button type="button" data-team-active="${esc(m.user_id||m.id||"")}" data-team-email="${esc(m.email||"")}" data-team-name="${esc(m.full_name||m.name||"User")}" data-team-role="${esc(m.role||"cashier")}">Manage Access</button></td></tr>`).join(""):"<tr><td colspan=\"5\" style=\"text-align:center;padding:30px\">No team members found for this business.</td></tr>"}</tbody></table></div></div>`;
    o.querySelector("#team-close").onclick=closeTeam;o.querySelector("#tm-add-cashier").onclick=()=>openCreate().catch(e=>alert(e.message));
    o.querySelectorAll("[data-team-active]").forEach(btn=>btn.onclick=()=>{const m={user_id:btn.dataset.teamActive,email:btn.dataset.teamEmail,full_name:btn.dataset.teamName,role:btn.dataset.teamRole};openPermissions(m).catch(e=>alert("Unable to open permissions: "+e.message));});
  }catch(e){console.error("[SmallBiz] Team Management failed:",e);alert(e.message||"Unable to open Team Management.");}
}

window.__smallbizOpenTeam=openTeam;
window.addEventListener("smallbiz:open-team",openTeam);
window.__SMALLBIZ_TEAM_MANAGEMENT__="v4";
