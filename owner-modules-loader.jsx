// SMALLBIZ_OWNER_MODULES_LOADER_V12
// Canonical owner sidebar: one button per module, one click owner, no stacked
// placeholder/self-registered sidebar entries. Module-owned buttons are hidden
// and reused only as internal openers after their module has loaded.
import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";

const SUPPORT_MODULES = [
  () => import("./reprint-modal-fix.js"),
  () => import("./void-reason-enhancement.js"),
  () => import("./transaction-audit-enhancement.js")
];

const OWNER_MENU = [
  { key: "team", icon: "👥", label: "Team", permission: "team.view", load: () => import("./team-management.js") },
  { key: "channels", icon: "🌐", label: "Online Channels", permission: "marketplace.view", load: () => import("./sales-channels.jsx") },
  { key: "marketplace-connections", icon: "🔌", label: "Marketplace Connections", permission: "marketplace.view", load: () => import("./marketplace-connections.jsx") },
  { key: "marketplace-stock", icon: "📦", label: "Marketplace Stock", permission: "inventory.view", load: () => import("./marketplace-stock-reservation.jsx") },
  { key: "marketplace-fulfillment", icon: "🚚", label: "Marketplace Fulfillment", permission: "marketplace.manage", load: () => import("./marketplace-fulfillment.jsx") },
  { key: "order-management", icon: "🛍️", label: "Order Management", permission: "marketplace.view", load: () => import("./order-management.jsx") },
  { key: "sync-readiness", icon: "🔄", label: "Marketplace Sync Readiness", permission: "marketplace.view", load: () => import("./marketplace-sync-readiness.jsx") },
  { key: "channel-mapping", icon: "🗺️", label: "Product Channel Mapping", permission: "marketplace.manage", load: () => import("./product-channel-mapping.jsx") },
  { key: "platform-admin", icon: "🛠️", label: "Platform Channel Admin", permission: "marketplace.manage", load: () => import("./platform-channel-admin.js") },
  { key: "reports", icon: "📊", label: "Reports", permission: "reports.view", load: () => import("./reports-center.js") },
  { key: "business-controls", icon: "⚙️", label: "Business Controls", permission: "settings.manage", load: () => import("./business-controls.jsx") },
  { key: "inventory", icon: "📦", label: "Inventory", permission: "inventory.view", load: () => import("./inventory-center.jsx") },
  { key: "growth", icon: "📈", label: "Growth", permission: "reports.view", load: () => import("./growth-center.jsx") },
  { key: "cashier-shift", icon: "💵", label: "Cashier Shift", permission: "pos.use", load: () => import("./cashier-shift.jsx") }
];

const loaded = new Set();
const loading = new Set();
const GLOBAL_KEY = "__smallbizOwnerModulesLoaderV12";

function hasPermission(code){
  return typeof window.__smallbizHasPermission === "function" && window.__smallbizHasPermission(code);
}
function nav(){ return document.querySelector(".sidebar-nav"); }
function textOf(el){ return String(el?.textContent||"").replace(/\s+/g," ").trim(); }

function isCoreButton(el){
  return el instanceof HTMLElement && !el.dataset.smallbizOwnerCanonical && !el.dataset.smallbizOwnerInternal;
}

function findInternalButton(item){
  const root=nav();
  if(!root)return null;
  return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>{
    if(!isCoreButton(el))return false;
    return textOf(el).toLowerCase()===item.label.toLowerCase();
  })||null;
}

function hideDuplicateModuleButtons(item){
  const root=nav();
  if(!root)return;
  Array.from(root.querySelectorAll("button,a,[role='button']")).forEach(el=>{
    if(el.dataset.smallbizOwnerCanonical||el.dataset.smallbizOwnerInternal)return;
    if(textOf(el).toLowerCase()!==item.label.toLowerCase())return;
    el.dataset.smallbizOwnerInternal=item.key;
    el.setAttribute("aria-hidden","true");
    el.tabIndex=-1;
    el.style.display="none";
  });
}

function ensureCanonicalButton(item){
  const root=nav();
  if(!root)return null;
  const canonical=root.querySelector(`[data-smallbiz-owner-canonical='${item.key}']`);
  if(canonical)return canonical;
  if(item.key==="reports")return null;

  const button=document.createElement("button");
  button.type="button";
  button.className="nav-item";
  button.dataset.smallbizOwnerCanonical=item.key;
  button.innerHTML=`<span aria-hidden="true">${item.icon}</span><b>${item.label}</b>`;
  button.setAttribute("aria-label",item.label);
  button.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
    loadOwnerModule(item,button);
  },true);
  root.appendChild(button);
  return button;
}

function reconcileOwnerMenu(){
  const root=nav();
  if(!root||!window.__smallbizPermissionsReady)return false;
  OWNER_MENU.forEach(item=>{
    if(!hasPermission(item.permission)){
      root.querySelector(`[data-smallbiz-owner-canonical='${item.key}']`)?.remove();
      return;
    }
    ensureCanonicalButton(item);
    hideDuplicateModuleButtons(item);
  });
  return true;
}

function openLoadedModule(item){
  if(item.key==="team"&&typeof window.__smallbizOpenTeam==="function"){
    window.__smallbizOpenTeam();
    return true;
  }
  const internal=findInternalButton(item);
  if(internal){ internal.click(); return true; }
  window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
  return false;
}

async function loadOwnerModule(item,button){
  if(!hasPermission(item.permission)||loading.has(item.key))return;
  if(loaded.has(item.key)){
    openLoadedModule(item);
    return;
  }

  loading.add(item.key);
  button?.setAttribute("aria-busy","true");
  const labelNode=button?.querySelector("b");
  if(labelNode)labelNode.textContent=`${item.label}…`;

  try{
    await item.load();
    loaded.add(item.key);
    await new Promise(resolve=>setTimeout(resolve,120));
    reconcileOwnerMenu();
    openLoadedModule(item);
  }catch(error){
    console.warn(`[SmallBiz] ${item.label} failed to load.`,error);
  }finally{
    if(button){
      button.removeAttribute("aria-busy");
      const currentLabel=button.querySelector("b");
      if(currentLabel)currentLabel.textContent=item.label;
    }
    loading.delete(item.key);
  }
}

function startObserver(){
  const state=window[GLOBAL_KEY]||{};
  if(state.observer)return state.observer;
  const observer=new MutationObserver(()=>{
    if(document.querySelector(".app-shell"))reconcileOwnerMenu();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window[GLOBAL_KEY]={...state,observer};
  return observer;
}

function stopObserverIfLoggedOut(){
  if(document.querySelector(".app-shell"))return;
  const state=window[GLOBAL_KEY];
  state?.observer?.disconnect?.();
  state?.logoutObserver?.disconnect?.();
  if(state){state.observer=null;state.logoutObserver=null;}
}

export function startOwnerModules(){
  const state=window[GLOBAL_KEY]||{};
  if(state.started){
    startObserver();
    reconcileOwnerMenu();
    return;
  }

  window[GLOBAL_KEY]={...state,started:true};
  startObserver();
  reconcileOwnerMenu();
  window.addEventListener("smallbiz:permissions-ready",()=>{
    startObserver();
    reconcileOwnerMenu();
  });

  const logoutObserver=new MutationObserver(stopObserverIfLoggedOut);
  logoutObserver.observe(document.documentElement,{childList:true,subtree:true});
  window[GLOBAL_KEY].logoutObserver=logoutObserver;

  if(window.__smallbizPermissionsReady&&!window[GLOBAL_KEY].supportStarted){
    window[GLOBAL_KEY].supportStarted=true;
    setTimeout(async()=>{
      for(const load of SUPPORT_MODULES){
        try{await load();}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed.",error);}
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    },0);
  }
}
