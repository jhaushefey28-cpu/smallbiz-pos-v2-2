import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const MODULES = ["POS","Transactions","Inventory","Purchasing","Customers","Reports","Cashier Shift","Business Controls","Team","Marketplace","OMS","Growth Center","Employee/Attendance","Security","Operations"];
const STATUS = ["pending","in_progress","done","blocked"];
const PRIORITIES = ["critical","high","medium","low"];

const esc = (v) => String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/\"/g,"&quot;").replace(/'/g,"&#39;");

function showToast(message, type="success") {
  document.querySelectorAll("[data-system-audit-toast]").forEach((x)=>x.remove());
  const el=document.createElement("div");
  el.dataset.systemAuditToast="true";
  el.textContent=message;
  el.style.cssText=`position:fixed;right:22px;bottom:22px;z-index:100001;padding:12px 16px;border-radius:10px;font-weight:700;background:${type==="error"?"#fee2e2":"#dcfce7"};color:${type==="error"?"#991b1b":"#166534"};box-shadow:0 10px 35px rgba(0,0,0,.18);font-family:inherit;`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),4000);
}

async function getContext(){
  if(!supabase) throw new Error("Supabase configuration is missing.");
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError) throw new Error(sessionError.message);
  if(!session?.user?.id) throw new Error("You must be logged in.");
  const {data:profile,error}=await supabase.from("profiles").select("id,business_id,full_name,role,active").eq("id",session.user.id).single();
  if(error) throw new Error(error.message);
  if(!profile?.active) throw new Error("Account is inactive.");
  return {profile};
}

function isAdmin(profile){
  return ["super_admin","owner","admin"].includes(String(profile?.role||"").toLowerCase());
}

function closeAudit(){ document.querySelector("[data-system-audit-overlay]")?.remove(); }

function styleOnce(){
  if(document.getElementById("system-audit-center-css")) return;
  const style=document.createElement("style");
  style.id="system-audit-center-css";
  style.textContent=`
    [data-system-audit-overlay]{position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit}
    [data-system-audit-modal]{width:min(1180px,100%);height:min(88vh,900px);background:#f8fafc;border-radius:20px;box-shadow:0 30px 100px rgba(0,0,0,.28);overflow:hidden;display:flex;flex-direction:column}
    .sa-head{background:#fff;padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .sa-title{display:flex;gap:12px;align-items:flex-start}.sa-title-icon{width:42px;height:42px;border-radius:12px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:22px}.sa-title h2{margin:0;font-size:23px;color:#0f172a}.sa-title p{margin:4px 0 0;color:#64748b;font-size:13px}
    .sa-close{border:0;background:#f1f5f9;width:42px;height:42px;border-radius:12px;font-size:22px;cursor:pointer;color:#334155}.sa-close:hover{background:#e2e8f0}
    .sa-body{padding:18px 22px 22px;overflow:auto;flex:1}.sa-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.sa-stat{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px 15px}.sa-stat small{display:block;color:#64748b;font-weight:700}.sa-stat b{display:block;margin-top:4px;font-size:23px;color:#0f172a}.sa-toolbar{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.sa-toolbar input,.sa-toolbar select,.sa-form input,.sa-form select,.sa-form textarea{border:1px solid #cbd5e1;border-radius:9px;padding:9px 10px;background:#fff;font:inherit;box-sizing:border-box}.sa-toolbar input{min-width:240px;flex:1}.sa-toolbar select{min-width:135px}.sa-btn{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}.sa-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}.sa-btn.green{background:#ecfdf5;border-color:#bbf7d0;color:#166534}.sa-btn.red{background:#fef2f2;border-color:#fecaca;color:#991b1b}.sa-btn:disabled{opacity:.5;cursor:not-allowed}
    .sa-section{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:14px}.sa-section-head{padding:13px 15px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;align-items:center}.sa-section-head h3{margin:0;color:#0f172a;font-size:15px}.sa-section-head span{color:#64748b;font-size:12px}.sa-table{width:100%;border-collapse:collapse}.sa-table th,.sa-table td{padding:10px 11px;border-bottom:1px solid #eef2f7;text-align:left;vertical-align:top;font-size:12px}.sa-table th{background:#f8fafc;color:#475569;font-weight:900}.sa-table tr:last-child td{border-bottom:0}.sa-title-cell{font-weight:800;color:#0f172a}.sa-desc{display:block;color:#64748b;margin-top:3px;line-height:1.35}.sa-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-weight:900;font-size:10px;text-transform:uppercase}.sa-p-critical{background:#fee2e2;color:#991b1b}.sa-p-high{background:#ffedd5;color:#9a3412}.sa-p-medium{background:#fef9c3;color:#854d0e}.sa-p-low{background:#e0f2fe;color:#075985}.sa-s-pending{background:#f1f5f9;color:#475569}.sa-s-in_progress{background:#dbeafe;color:#1d4ed8}.sa-s-done{background:#dcfce7;color:#166534}.sa-s-blocked{background:#fee2e2;color:#991b1b}.sa-actions{display:flex;gap:5px;flex-wrap:wrap}.sa-mini{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:5px 7px;font-size:11px;font-weight:800;cursor:pointer}.sa-health{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;padding:12px}.sa-health-card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc}.sa-health-card b{display:block;color:#0f172a}.sa-health-card small{color:#64748b}.sa-ok{color:#166534}.sa-warn{color:#9a3412}.sa-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sa-form label{font-size:12px;font-weight:900;color:#334155;display:block;margin-bottom:5px}.sa-form .full{grid-column:1/-1}.sa-form textarea{min-height:90px;resize:vertical}.sa-modal{width:min(640px,100%);background:#fff;border-radius:16px;padding:20px;box-shadow:0 25px 80px rgba(0,0,0,.25)}
    @media(max-width:850px){.sa-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-health{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-table{min-width:950px}.sa-section{overflow:auto}.sa-body{padding:12px}.sa-form{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

async function writeAuditLog(profile,item,fromStatus,toStatus,notes){
  try{
    await supabase.from("audit_logs").insert({
      business_id:profile.business_id,
      user_id:profile.id,
      action:"SYSTEM_AUDIT_UPDATE",
      details:{audit_key:item.audit_key,module:item.module,title:item.title,from_status:fromStatus,to_status:toStatus,notes:notes||null}
    });
  }catch(e){ console.warn("System audit history write failed:",e); }
}

async function fetchItems(profile){
  const {data,error}=await supabase.from("system_audit_items").select("*").eq("business_id",profile.business_id).order("priority",{ascending:true}).order("module",{ascending:true}).order("title",{ascending:true});
  if(error) throw new Error(error.message);
  return data||[];
}

async function ensureSeed(profile){
  const items=await fetchItems(profile);
  if(items.length) return items;
  return fetchItems(profile);
}

async function fetchHealth(profile){
  const checks=[
    ["Products","products"],["Transactions","sales"],["Purchases","purchases"],["Attendance","attendance"],["Marketplace","channel_connections"],["Audit Logs","audit_logs"]
  ];
  return Promise.all(checks.map(async ([label,table])=>{
    const {count,error}=await supabase.from(table).select("id",{count:"exact",head:true}).eq("business_id",profile.business_id);
    return {label,count,error:error?.message||""};
  }));
}

function renderHealth(el,health){
  el.innerHTML=health.map(h=>`<div class="sa-health-card"><b>${esc(h.label)}</b><small class="${h.error?"sa-warn":"sa-ok"}">${h.error?"⚠ Error":"✓ Connected"}${h.error?`<br>${esc(h.error)}`:`<br>${Number(h.count||0)} record(s)`}</small></div>`).join("");
}

function openAddModal(profile,refresh){
  const back=document.createElement("div");back.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:18px";
  back.innerHTML=`<div class="sa-modal"><div class="sa-section-head" style="padding:0 0 14px;border:0"><h3>➕ Add Audit Item</h3><button class="sa-close" data-x>✕</button></div><form class="sa-form" data-form><div><label>Module</label><select name="module">${MODULES.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div><div><label>Priority</label><select name="priority">${PRIORITIES.map(x=>`<option value="${x}">${x}</option>`).join("")}</select></div><div class="full"><label>Title</label><input name="title" required maxlength="160" placeholder="What needs to be checked or fixed?"></div><div class="full"><label>Description</label><textarea name="description" maxlength="500" placeholder="Expected behavior / acceptance criteria"></textarea></div><div class="full"><label>Notes</label><textarea name="notes" maxlength="1000" placeholder="Current finding, blocker, or next step"></textarea></div><div class="full" style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="sa-btn" data-x>Cancel</button><button class="sa-btn primary">Save Audit Item</button></div></form></div>`;
  document.body.appendChild(back);
  back.querySelectorAll("[data-x]").forEach(b=>b.addEventListener("click",()=>back.remove()));
  back.querySelector("[data-form]").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const title=String(fd.get("title")||"").trim();if(!title)return;
    const auditKey=`custom_${Date.now()}`;
    const {error}=await supabase.from("system_audit_items").insert({business_id:profile.business_id,audit_key:auditKey,module:String(fd.get("module")),title,description:String(fd.get("description")||"").trim()||null,priority:String(fd.get("priority")),notes:String(fd.get("notes")||"").trim()||null,status:"pending",created_by:profile.id});
    if(error){showToast(error.message,"error");return}
    back.remove();showToast("Audit item added.");await refresh();
  });
}

async function openAudit(){
  styleOnce();
  closeAudit();
  let ctx;
  try{ctx=await getContext();}catch(e){showToast(e?.message||"Unable to open audit.","error");return}
  const {profile}=ctx;
  const admin=isAdmin(profile);
  const overlay=document.createElement("div");overlay.dataset.systemAuditOverlay="true";
  overlay.innerHTML=`<div data-system-audit-modal><div class="sa-head"><div class="sa-title"><div class="sa-title-icon">🧭</div><div><h2>SmallBiz POS / OMS System Audit</h2><p>Central checklist for overlooked items, bugs, security checks and production readiness. Payroll/HR is intentionally excluded; Employee/Attendance is included.</p></div></div><button class="sa-close" data-close>✕</button></div><div class="sa-body"><div class="sa-stats" data-stats></div><div class="sa-toolbar"><input data-search placeholder="🔍 Search audit items..."/><select data-module><option value="all">All Modules</option>${MODULES.map(x=>`<option>${esc(x)}</option>`).join("")}</select><select data-status><option value="all">All Status</option>${STATUS.map(x=>`<option value="${x}">${x.replace("_"," ")}</option>`).join("")}</select><select data-priority><option value="all">All Priority</option>${PRIORITIES.map(x=>`<option>${x}</option>`).join("")}</select><button class="sa-btn" data-refresh>🔄 Refresh</button>${admin?`<button class="sa-btn primary" data-add>➕ Add Item</button>`:""}</div><div class="sa-section"><div class="sa-section-head"><div><h3>System Health Snapshot</h3><span>Quick connectivity and record-count check for the current business.</span></div></div><div class="sa-health" data-health></div></div><div class="sa-section"><div class="sa-section-head"><div><h3>Audit Checklist</h3><span data-subtitle>Loading...</span></div><button class="sa-btn" data-reset>Clear Filters</button></div><div style="overflow:auto"><table class="sa-table"><thead><tr><th style="min-width:250px">Item</th><th>Module</th><th>Priority</th><th>Status</th><th style="min-width:230px">Notes</th><th>Last Checked</th><th>Action</th></tr></thead><tbody data-rows></tbody></table></div></div></div></div>`;
  document.body.appendChild(overlay);

  let items=[];let health=[];
  const stats=overlay.querySelector("[data-stats]"),rows=overlay.querySelector("[data-rows]"),subtitle=overlay.querySelector("[data-subtitle]"),healthEl=overlay.querySelector("[data-health]");
  const search=overlay.querySelector("[data-search]"),module=overlay.querySelector("[data-module]"),status=overlay.querySelector("[data-status]"),priority=overlay.querySelector("[data-priority]");
  const refresh=async()=>{
    try{items=await ensureSeed(profile);health=await fetchHealth(profile);renderHealth(healthEl,health);render();}catch(e){showToast(e?.message||"Unable to load audit.","error");}
  };
  const render=()=>{
    const q=search.value.trim().toLowerCase();
    const filtered=items.filter(i=>{
      const hay=[i.title,i.description,i.notes,i.module,i.audit_key].map(v=>String(v||"").toLowerCase()).join(" ");
      return(!q||hay.includes(q))&&(module.value==="all"||i.module===module.value)&&(status.value==="all"||i.status===status.value)&&(priority.value==="all"||i.priority===priority.value);
    });
    const counts={pending:0,in_progress:0,done:0,blocked:0};items.forEach(i=>counts[i.status]=(counts[i.status]||0)+1);
    stats.innerHTML=`<div class="sa-stat"><small>Pending</small><b>${counts.pending||0}</b></div><div class="sa-stat"><small>In Progress</small><b>${counts.in_progress||0}</b></div><div class="sa-stat"><small>Done</small><b>${counts.done||0}</b></div><div class="sa-stat"><small>Blocked</small><b>${counts.blocked||0}</b></div>`;
    subtitle.textContent=`Showing ${filtered.length} of ${items.length} audit item(s) • ${admin?"Owner/Admin editing enabled":"View only"}`;
    rows.innerHTML=filtered.length?filtered.map(i=>`<tr data-id="${esc(i.id)}"><td><div class="sa-title-cell">${esc(i.title)}</div><span class="sa-desc">${esc(i.description||"")}</span></td><td>${esc(i.module)}</td><td><span class="sa-badge sa-p-${esc(i.priority)}">${esc(i.priority)}</span></td><td><span class="sa-badge sa-s-${esc(i.status)}">${esc(i.status.replace("_"," "))}</span></td><td>${admin?`<textarea data-notes rows="2" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px;box-sizing:border-box;font:inherit">${esc(i.notes||"")}</textarea>`:esc(i.notes||"-")}</td><td>${i.last_checked_at?esc(new Date(i.last_checked_at).toLocaleString("en-PH")):"-"}</td><td><div class="sa-actions">${admin?`<select class="sa-mini" data-set-status>${STATUS.map(s=>`<option value="${s}" ${s===i.status?"selected":""}>${s.replace("_"," ")}</option>`).join("")}</select><select class="sa-mini" data-set-priority>${PRIORITIES.map(p=>`<option value="${p}" ${p===i.priority?"selected":""}>${p}</option>`).join("")}</select><button class="sa-mini" data-check>✓ Check</button>`:""}</div></td></tr>`).join(""):`<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748b">No audit items match the current filters.</td></tr>`;
    if(admin){
      rows.querySelectorAll("tr[data-id]").forEach(tr=>{
        const item=items.find(x=>x.id===tr.dataset.id);if(!item)return;
        const notes=tr.querySelector("[data-notes]"),st=tr.querySelector("[data-set-status]"),pr=tr.querySelector("[data-set-priority]"),check=tr.querySelector("[data-check]");
        let saveTimer=null;
        notes?.addEventListener("change",async()=>{clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{const newNotes=notes.value.trim()||null;const {error}=await supabase.from("system_audit_items").update({notes:newNotes,updated_at:new Date().toISOString(),last_checked_at:new Date().toISOString()}).eq("id",item.id).eq("business_id",profile.business_id);if(error)showToast(error.message,"error");else{item.notes=newNotes;item.last_checked_at=new Date().toISOString();await writeAuditLog(profile,item,item.status,item.status,newNotes);showToast("Audit note saved.");render();}},250)});
        st?.addEventListener("change",async()=>{const from=item.status,to=st.value;const {error}=await supabase.from("system_audit_items").update({status:to,updated_at:new Date().toISOString(),last_checked_at:new Date().toISOString()}).eq("id",item.id).eq("business_id",profile.business_id);if(error){showToast(error.message,"error");return}item.status=to;item.last_checked_at=new Date().toISOString();await writeAuditLog(profile,item,from,to,item.notes);showToast(`Status: ${to.replace("_"," ")}`);render();});
        pr?.addEventListener("change",async()=>{const from=item.priority,to=pr.value;const {error}=await supabase.from("system_audit_items").update({priority:to,updated_at:new Date().toISOString(),last_checked_at:new Date().toISOString()}).eq("id",item.id).eq("business_id",profile.business_id);if(error){showToast(error.message,"error");return}item.priority=to;item.last_checked_at=new Date().toISOString();await writeAuditLog(profile,item,item.status,item.status,item.notes);showToast(`Priority: ${to}`);render();});
        check?.addEventListener("click",async()=>{const {error}=await supabase.from("system_audit_items").update({last_checked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",item.id).eq("business_id",profile.business_id);if(error){showToast(error.message,"error");return}item.last_checked_at=new Date().toISOString();await writeAuditLog(profile,item,item.status,item.status,item.notes);showToast("Audit check recorded.");render();});
      });
    }
  };
  overlay.querySelector("[data-close]").addEventListener("click",closeAudit);
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeAudit()});
  [search,module,status,priority].forEach(el=>el.addEventListener("input",render));
  overlay.querySelector("[data-reset]").addEventListener("click",()=>{search.value="";module.value="all";status.value="all";priority.value="all";render()});
  overlay.querySelector("[data-refresh]").addEventListener("click",refresh);
  overlay.querySelector("[data-add]")?.addEventListener("click",()=>openAddModal(profile,refresh));
  await refresh();
}

function injectAuditButton(){
  const nav=document.querySelector(".sidebar-nav");
  if(!nav||nav.querySelector("[data-system-audit-button]"))return;
  const button=document.createElement("button");
  button.type="button";button.dataset.systemAuditButton="true";button.className="nav-item";
  button.innerHTML='<span>🧭</span><b>System Audit</b>';
  button.addEventListener("click",openAudit);
  const anchor=[...nav.querySelectorAll("button")].find(b=>b.textContent.includes("Stock History"))||nav.lastElementChild;
  if(anchor)anchor.insertAdjacentElement("afterend",button);else nav.appendChild(button);
}

styleOnce();
const observer=new MutationObserver(()=>injectAuditButton());
observer.observe(document.body,{childList:true,subtree:true});
injectAuditButton();
