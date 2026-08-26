// SMALLBIZ_OWNER_MODULES_LOADER_V38_REACT_BIND_ONLY_NO_CREATE
// Existing React sidebar entries are canonical. Created fallbacks are removed only when
// duplicated; React-owned DOM nodes are never removed. Existing entries receive a
// bubble-phase open handler so they remain clickable without intercepting React events.
import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";

const SUPPORT_MODULES=[()=>import("./reprint-modal-fix.js"),()=>import("./void-reason-enhancement.js"),()=>import("./transaction-audit-enhancement.js")];
const OWNER_MENU=[
{key:"team",icon:"👥",label:"Team",permission:"team.view",load:()=>import("./team-management.js")},
{key:"channels",icon:"🌐",label:"Online Channels",permission:"marketplace.view",load:()=>import("./sales-channels.jsx")},
{key:"marketplace-connections",icon:"🔌",label:"Marketplace Connections",permission:"marketplace.view",load:()=>import("./marketplace-connections.jsx")},
{key:"marketplace-stock",icon:"📦",label:"Marketplace Stock",permission:"inventory.view",load:()=>import("./marketplace-stock-reservation.jsx")},
{key:"marketplace-fulfillment",icon:"🚚",label:"Marketplace Fulfillment",permission:"marketplace.manage",load:()=>import("./marketplace-fulfillment.jsx")},
{key:"order-management",icon:"🛍️",label:"Order Management",permission:"marketplace.view",load:()=>import("./order-management.jsx")},
{key:"channel-mapping",icon:"🗺️",label:"Product Channel Mapping",permission:"marketplace.manage",load:()=>import("./product-channel-mapping.jsx")},
{key:"business-controls",icon:"⚙️",label:"Business Controls",permission:"settings.manage",load:()=>import("./business-controls.jsx")},
{key:"inventory",icon:"📦",label:"Inventory",permission:"inventory.view",load:()=>import("./inventory-center.jsx")},
{key:"growth",icon:"📈",label:"Growth Center",permission:"reports.view",load:()=>import("./growth-center.jsx")},
{key:"cashier-shift",icon:"💵",label:"Cashier Shift",permission:"pos.use",load:()=>import("./cashier-shift.jsx")}
];
const GLOBAL_KEY="__smallbizOwnerModulesLoader";
const LOADER_VERSION="v38";
const loaded=new Set(),loading=new Set();
const isOwner=()=>Boolean(window.__smallbizIsOwner);
const hasPermission=code=>isOwner()||(typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code));
const nav=()=>document.querySelector(".sidebar-nav");
const textOf=el=>String(el?.textContent||"").replace(/\s+/g," ").trim();
const normalizedLabel=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const matchingButtons=(root,item)=>{const target=normalizedLabel(item.label);return Array.from(root.querySelectorAll("button,a,[role='button']")).filter(el=>normalizedLabel(textOf(el))===target)};

function removeCreatedDuplicates(root,item,keep){
  for(const el of matchingButtons(root,item)){
    if(el!==keep&&el.dataset.smallbizOwnerCreated)el.remove();
  }
}

function bindButton(item,button,created=false){
  if(!button)return null;
  if(button.tagName==="BUTTON")button.type="button";
  button.setAttribute("aria-label",item.label);
  button.dataset.smallbizOwnerCanonical=item.key;
  if(created)button.dataset.smallbizOwnerCreated=LOADER_VERSION;
  button.style.setProperty("pointer-events","auto","important");
  button.style.setProperty("touch-action","manipulation","important");
  button.style.setProperty("position","relative","important");
  button.style.setProperty("z-index","5","important");
  if(button.dataset.smallbizOwnerBound!==LOADER_VERSION){
    // Bubble phase only. This does not cancel or intercept React's delegated events.
    button.addEventListener("click",()=>loadOwnerModule(item,button),{capture:false,passive:false});
    button.dataset.smallbizOwnerBound=LOADER_VERSION;
  }
  return button;
}

function ensureCanonicalButton(item){
  const root=nav();
  if(!root||!hasPermission(item.permission))return null;
  const matches=matchingButtons(root,item);
  const existing=matches.find(el=>!el.dataset.smallbizOwnerCreated)||null;
  if(existing){bindButton(item,existing,false);removeCreatedDuplicates(root,item,existing);return existing;}
  const created=matches.find(el=>el.dataset.smallbizOwnerCreated)||null;
  if(created){bindButton(item,created,true);removeCreatedDuplicates(root,item,created);return created;}
  return null;
}

function reconcileOwnerMenu(){
  const root=nav();
  if(!root||!isOwner())return false;
  for(const item of OWNER_MENU)ensureCanonicalButton(item);
  return true;
}

function directHandlerFor(item){
  if(item.key==="team")return window.__smallbizOpenTeam;
  if(item.key==="growth")return window.__smallbizOpenGrowthCenter;
  if(item.key==="cashier-shift")return window.__smallbizOpenCashierShift;
  return null;
}

async function forceDirectOpen(item){
  for(let i=0;i<20;i++){
    try{
      const handler=directHandlerFor(item);
      if(typeof handler==="function"){handler();return true}
    }catch(error){console.warn(`[SmallBiz] ${item.label} open handler failed.`,error)}
    window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  return false;
}

async function loadOwnerModule(item,button){
  if(!hasPermission(item.permission)||loading.has(item.key))return;
  loading.add(item.key);
  window[GLOBAL_KEY]={...(window[GLOBAL_KEY]||{}),suppressCreateUntil:Date.now()+1500};
  button?.setAttribute("aria-busy","true");
  try{
    if(!loaded.has(item.key)){
      await item.load();
      loaded.add(item.key);
    }
    if(item.key==="growth"||item.key==="cashier-shift"||item.key==="team")await forceDirectOpen(item);
    else window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
    const root=nav();
    if(root){
      const matches=matchingButtons(root,item);
      const canonical=matches.find(el=>!el.dataset.smallbizOwnerCreated)||matches.find(el=>el.dataset.smallbizOwnerCreated);
      if(canonical){bindButton(item,canonical,Boolean(canonical.dataset.smallbizOwnerCreated));removeCreatedDuplicates(root,item,canonical)}
    }
  }catch(error){
    console.warn(`[SmallBiz] ${item.label} failed to load.`,error);
    window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}));
  }finally{
    button?.removeAttribute("aria-busy");
    loading.delete(item.key);
  }
}

let reconcileTimer=0;
function scheduleReconcile(){
  clearTimeout(reconcileTimer);
  reconcileTimer=setTimeout(reconcileOwnerMenu,180);
}

function installSidebarObserver(){
  const state=window[GLOBAL_KEY]||{};
  if(state.observerInstalled)return;
  const root=nav();
  if(!root)return;
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==="childList"&&m.addedNodes.length))scheduleReconcile();
  });
  observer.observe(root,{childList:true,subtree:true});
  window[GLOBAL_KEY]={...state,observerInstalled:true,observer,loaderVersion:LOADER_VERSION};
  scheduleReconcile();
}

export function startOwnerModules(){
  const state=window[GLOBAL_KEY]||{};
  if(state.started){installSidebarObserver();scheduleReconcile();return}
  window[GLOBAL_KEY]={...state,started:true,loaderVersion:LOADER_VERSION};
  installSidebarObserver();
  window.addEventListener("smallbiz:permissions-ready",()=>{installSidebarObserver();scheduleReconcile()},{passive:true});
  if(!window[GLOBAL_KEY].supportStarted){
    window[GLOBAL_KEY].supportStarted=true;
    setTimeout(async()=>{
      for(const load of SUPPORT_MODULES){
        try{await load()}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed",error)}
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    },0);
  }
}