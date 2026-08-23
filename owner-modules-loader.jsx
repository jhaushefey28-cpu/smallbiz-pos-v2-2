// SMALLBIZ_OWNER_MODULES_LOADER_V11
// Tenant-aware lazy owner-module loader with a single sidebar owner, stable
// deduplication, and reliable module opening. Mobile/sidebar CSS is untouched.
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
const GLOBAL_KEY = "__smallbizOwnerModulesLoaderV11";

function hasPermission(code){
  return typeof window.__smallbizHasPermission === "function" && window.__smallbizHasPermission(code);
}

function nav(){return document.querySelector(".sidebar-nav");}
function textOf(el){return String(el?.textContent||"").replace(/\s+/g," ").trim();}

function findNativeButton(item){
  const root=nav();
  if(!root)return null;
  return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>{
    if(el.dataset?.smallbizLazyOwner)return false;
    const text=textOf(el);
    return item.label===text || item.label.replace(/\s+/g," ").toLowerCase()===text.toLowerCase();
  })||null;
}

function removeLazyButtons(item){
  const root=nav();
  if(!root)return;
  const buttons=Array.from(root.querySelectorAll(`[data-smallbiz-lazy-owner='${item.key}']`));
  buttons.forEach((button,index)=>{
    // Keep at most one placeholder only when no native button exists.
    if(index>0 || findNativeButton(item))button.remove();
  });
}

function ensureOneLazyButton(item){
  const root=nav();
  if(!root)return null;
  const native=findNativeButton(item);
  const existing=Array.from(root.querySelectorAll(`[data-smallbiz-lazy-owner='${item.key}']`));

  if(native){
    existing.forEach(button=>button.remove());
    return null;
  }

  const button=existing[0]||document.createElement("button");
  existing.slice(1).forEach(node=>node.remove());
  if(!button.parentNode){
    button.type="button";
    button.className="nav-item";
    button.dataset.smallbizLazyOwner=item.key;
    button.innerHTML=`<span aria-hidden="true">${item.icon}</span><b>${item.label}</b>`;
    button.setAttribute("aria-label",item.label);
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
      loadOwnerModule(item,button);
    },true);
    root.appendChild(button);
  }
  return button;
}

function reconcileOwnerMenu(){
  const root=nav();
  if(!root||!window.__smallbizPermissionsReady)return false;

  OWNER_MENU.forEach(item=>{
    if(!hasPermission(item.permission)){
      Array.from(root.querySelectorAll(`[data-smallbiz-lazy-owner='${item.key}']`)).forEach(el=>el.remove());
      return;
    }
    // Native buttons (for example the core Reports item) always win.
    // Lazy placeholders are only used for modules that have no native entry.
    ensureOneLazyButton(item);
  });
  return true;
}

function openLoadedModule(item){
  if(item.key==="team"&&typeof window.__smallbizOpenTeam==="function"){
    window.__smallbizOpenTeam();
    return true;
  }

  const native=findNativeButton(item);
  if(native){
    native.click();
    return true;
  }

  window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
  return false;
}

async function loadOwnerModule(item,placeholder){
  if(!hasPermission(item.permission))return;
  if(loading.has(item.key))return;

  if(loaded.has(item.key)){
    openLoadedModule(item);
    return;
  }

  loading.add(item.key);
  if(placeholder)placeholder.dataset.loading="1";
  const labelNode=placeholder?.querySelector("b");
  if(labelNode)labelNode.textContent=`${item.label}…`;

  try{
    await item.load();
    loaded.add(item.key);
    // Self-mounting modules such as Cashier Shift need a short tick to register
    // their native sidebar button before the placeholder is reconciled.
    await new Promise(resolve=>setTimeout(resolve,80));
    reconcileOwnerMenu();
    const opened=openLoadedModule(item);
    if(opened)reconcileOwnerMenu();
    else if(placeholder){
      placeholder.dataset.loading="0";
      const currentLabel=placeholder.querySelector("b");
      if(currentLabel)currentLabel.textContent=item.label;
    }
  }catch(error){
    console.warn(`[SmallBiz] ${item.label} failed to load.`,error);
    if(placeholder){
      placeholder.dataset.loading="0";
      const currentLabel=placeholder.querySelector("b");
      if(currentLabel)currentLabel.textContent=item.label;
    }
  }finally{
    loading.delete(item.key);
  }
}

function startObserver(){
  if(window[GLOBAL_KEY]?.observer)return window[GLOBAL_KEY].observer;

  const observer=new MutationObserver(()=>{
    // React and module mounts can both mutate the sidebar. Reconcile instead of
    // appending another copy of the owner menu.
    if(document.querySelector(".app-shell"))reconcileOwnerMenu();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window[GLOBAL_KEY]={...(window[GLOBAL_KEY]||{}),observer};
  return observer;
}

function stopObserverIfLoggedOut(){
  if(document.querySelector(".app-shell"))return;
  const state=window[GLOBAL_KEY];
  state?.observer?.disconnect?.();
  if(state)state.observer=null;
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

  if(window.__smallbizPermissionsReady){
    reconcileOwnerMenu();
    if(!window[GLOBAL_KEY].supportStarted){
      window[GLOBAL_KEY].supportStarted=true;
      setTimeout(async()=>{
        for(const load of SUPPORT_MODULES){
          try{await load();}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed.",error);}
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      },0);
    }
  }
}
