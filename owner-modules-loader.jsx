// SMALLBIZ_OWNER_MODULES_LOADER_V10
// Tenant-aware lazy owner-module loader with reliable click/open handling.
// Mobile/sidebar layout is intentionally untouched.
let started = false;

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
const yieldToBrowser = (callback) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) window.requestIdleCallback(callback,{timeout:300});
  else setTimeout(callback,0);
};
function nav(){return document.querySelector(".sidebar-nav");}
function textOf(el){return String(el?.textContent||"").replace(/\s+/g," ").trim();}
function hasPermission(code){return typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code);}

function findNativeButton(item){
  const root=nav();if(!root)return null;
  return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>{
    if(el.dataset?.smallbizLazyOwner)return false;
    const text=textOf(el);
    return item.label===text||item.label.replace(/\s+/g," ").toLowerCase()===text.toLowerCase();
  })||null;
}

function openLoadedModule(item){
  // Team is a standalone DOM module and exposes an explicit opener.
  if(item.key==="team"&&typeof window.__smallbizOpenTeam==="function"){
    window.__smallbizOpenTeam();
    return true;
  }
  // Modules such as Cashier Shift mount their own native sidebar button.
  const native=findNativeButton(item);
  if(native){
    native.click();
    return true;
  }
  // Keep compatibility with modules that listen for the custom open event.
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
  placeholder.dataset.loading="1";
  const labelNode=placeholder.querySelector("b");
  if(labelNode)labelNode.textContent=`${item.label}…`;
  try{
    await item.load();
    loaded.add(item.key);
    // Give self-mounting modules a tick to create their native button.
    await new Promise(resolve=>setTimeout(resolve,60));
    const opened=openLoadedModule(item);
    if(opened&&item.key!=="team")placeholder.remove();
    else if(!opened&&item.key!=="team"){
      // Do not remove a menu entry when a module did not expose an opener.
      placeholder.dataset.loading="0";
      if(labelNode)labelNode.textContent=item.label;
    }
  }catch(error){
    console.warn(`[SmallBiz] ${item.label} failed to load.`,error);
    placeholder.dataset.loading="0";
    if(labelNode)labelNode.textContent=item.label;
  }finally{loading.delete(item.key);}
}

function ensureOwnerMenu(){
  const root=nav();if(!root||!window.__smallbizPermissionsReady)return false;
  OWNER_MENU.forEach(item=>{
    const existing=root.querySelector(`[data-smallbiz-lazy-owner='${item.key}']`);
    if(!hasPermission(item.permission)){existing?.remove();return;}
    if(findNativeButton(item)||existing)return;
    const button=document.createElement("button");
    button.type="button";button.className="nav-item";button.dataset.smallbizLazyOwner=item.key;
    button.innerHTML=`<span aria-hidden="true">${item.icon}</span><b>${item.label}</b>`;
    button.setAttribute("aria-label",item.label);
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
      loadOwnerModule(item,button);
    },true);
    root.appendChild(button);
  });
  return true;
}

async function loadAttendance(){
  if(!hasPermission("attendance.view"))return;
  try{
    await import("./attendance-runtime-bridge.js");
    await import("./attendance-center.js");
    await import("./employee-attendance.js");
    await import("./attendance-sidebar-fix.js");
  }catch(error){console.warn("[SmallBiz] Attendance module failed; core app remains active.",error);}
}

function observeSidebarOnce(){
  if(ensureOwnerMenu())return;
  const observer=new MutationObserver(()=>{if(ensureOwnerMenu())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("smallbiz:permissions-ready",()=>{ensureOwnerMenu();loadAttendance();},{once:true});
  setTimeout(()=>observer.disconnect(),20000);
}

export function startOwnerModules(){
  if(started)return;
  started=true;
  observeSidebarOnce();
  if(window.__smallbizPermissionsReady)loadAttendance();
  yieldToBrowser(async()=>{
    for(const load of SUPPORT_MODULES){
      try{await load();}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed.",error);}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  });
}
