// SMALLBIZ_TENANT_SUPERADMIN_PERMISSIONS_V2
// Adds a tenant-scoped permission editor to the existing Team Management modal.
// Payroll/HR permissions are intentionally excluded from the POS permission UI.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let current = { profile: null, permissions: [], superAdmin: false, users: new Map() };
let mounted = false;

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");}

async function loadContext(){
  if(!sb)return false;
  const {data:sessionData}=await sb.auth.getSession();
  const uid=sessionData?.session?.user?.id;
  if(!uid)return false;
  const {data:profile}=await sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",uid).maybeSingle();
  if(!profile)return false;
  const {data:tenantAdmin}=await sb.from("tenant_superadmins").select("business_id,user_id").eq("business_id",profile.business_id).eq("user_id",uid).maybeSingle();
  current.profile=profile;
  current.superAdmin=Boolean(tenantAdmin?.user_id===uid&&tenantAdmin?.business_id===profile.business_id);
  if(!current.superAdmin)return false;
  const {data:permissions,error}=await sb.from("permissions").select("id,code,name,module").neq("module","Payroll").order("module").order("code");
  if(error)throw new Error(error.message);
  current.permissions=permissions||[];
  return true;
}

async function getAllowedIds(userId){
  const {data,error}=await sb.from("user_permissions").select("permission_id,allowed").eq("user_id",userId);
  if(error)throw new Error(error.message);
  return new Set((data||[]).filter(x=>x.allowed===true).map(x=>x.permission_id));
}

function closeDialog(){document.getElementById("smallbiz-permissions-overlay")?.remove();}

async function openDialog(userId,fullName,role){
  if(!current.superAdmin)return;
  closeDialog();
  const allowed=await getAllowedIds(userId);
  const grouped=current.permissions.reduce((acc,p)=>{(acc[p.module]=acc[p.module]||[]).push(p);return acc;},{});
  const overlay=document.createElement("div");
  overlay.id="smallbiz-permissions-overlay";
  overlay.style.cssText="position:fixed;inset:0;z-index:11000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px";
  const modules=Object.entries(grouped).map(([module,items])=>`<section style=\"border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff\"><h4 style=\"margin:0 0 8px\">${esc(module)}</h4>${items.map(p=>`<label style=\"display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid #f1f5f9;cursor:pointer\"><input type=\"checkbox\" data-permission-id=\"${p.id}\" ${allowed.has(p.id)?"checked":""}/> <span><b>${esc(p.name)}</b><small style=\"display:block;color:#64748b\">${esc(p.code)}</small></span></label>`).join("")}</section>`).join("");
  overlay.innerHTML=`<div style=\"width:min(720px,96vw);max-height:92dvh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28);color:#172033\"><div style=\"display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px\"><div><h2 style=\"margin:0 0 5px\">🔐 Permissions</h2><div style=\"color:#64748b;font-size:13px\">${esc(fullName)} · ${esc(role)}</div><div style=\"color:#64748b;font-size:12px;margin-top:4px\">Only the tenant Super Admin can grant these POS permissions. Changes apply to this tenant account only.</div></div><button id=\"smallbiz-permissions-close\" type=\"button\" style=\"border:0;background:#f1f5f9;border-radius:10px;width:40px;height:40px;cursor:pointer\">✕</button></div><div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px\">${modules}</div><div style=\"display:flex;justify-content:flex-end;gap:8px;margin-top:16px\"><button id=\"smallbiz-permissions-cancel\" type=\"button\" style=\"border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer\">Cancel</button><button id=\"smallbiz-permissions-save\" type=\"button\" style=\"border:1px solid #2563eb;background:#2563eb;color:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer\">Save Permissions</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeDialog()});
  document.getElementById("smallbiz-permissions-close")?.addEventListener("click",closeDialog);
  document.getElementById("smallbiz-permissions-cancel")?.addEventListener("click",closeDialog);
  document.getElementById("smallbiz-permissions-save")?.addEventListener("click",async()=>{
    const btn=document.getElementById("smallbiz-permissions-save");
    btn.disabled=true;btn.textContent="Saving…";
    try{
      if(!current.profile?.business_id||!current.superAdmin)throw new Error("Super Admin access is required.");
      const selected=Array.from(overlay.querySelectorAll("[data-permission-id]:checked")).map(el=>el.getAttribute("data-permission-id"));
      const {error:deleteError}=await sb.from("user_permissions").delete().eq("user_id",userId);
      if(deleteError)throw new Error(deleteError.message);
      if(selected.length){
        const rows=selected.map(permission_id=>({user_id:userId,permission_id,allowed:true}));
        const {error:insertError}=await sb.from("user_permissions").insert(rows);
        if(insertError)throw new Error(insertError.message);
      }
      current.users.set(userId,new Set(selected));
      closeDialog();
      window.dispatchEvent(new CustomEvent("smallbiz:user-permissions-updated",{detail:{userId}}));
      const toast=document.createElement("div");toast.textContent="Permissions saved.";toast.style.cssText="position:fixed;right:20px;top:20px;z-index:12000;background:#dcfce7;color:#166534;padding:12px 16px;border-radius:10px;font-weight:800;box-shadow:0 12px 30px rgba(0,0,0,.15)";document.body.appendChild(toast);setTimeout(()=>toast.remove(),2500);
    }catch(error){btn.disabled=false;btn.textContent="Save Permissions";alert("Unable to save permissions: "+(error?.message||"Unknown error"));}
  });
}

function injectButtons(){
  if(!current.superAdmin)return;
  const modal=document.getElementById("team-management-modal");
  if(!modal)return;
  modal.querySelectorAll("[data-team-active]").forEach(activeBtn=>{
    const row=activeBtn.closest("tr");
    if(!row||row.querySelector("[data-smallbiz-permissions-user]"))return;
    const userId=activeBtn.getAttribute("data-team-active");
    const role=(row.querySelector("td:nth-child(3)")?.textContent||"").trim().toLowerCase();
    if(role==="super_admin")return;
    const cell=activeBtn.parentElement;
    const button=document.createElement("button");
    button.type="button";button.dataset.smallbizPermissionsUser=userId;button.textContent="Permissions";button.className="tm-btn";button.style.marginLeft="6px";
    button.addEventListener("click",async()=>{try{await openDialog(userId,row.querySelector("td")?.textContent||"User",role)}catch(e){alert("Unable to open permissions: "+(e?.message||"Unknown error"))}});
    cell.appendChild(button);
  });
}

async function mount(){
  if(mounted)return;
  mounted=true;
  try{
    if(!(await loadContext()))return;
    const observer=new MutationObserver(()=>injectButtons());
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),30000);
    injectButtons();
  }catch(error){console.warn("[SmallBiz] Tenant permission editor unavailable.",error)}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
else mount();
