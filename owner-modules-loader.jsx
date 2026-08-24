// SMALLBIZ_OWNER_MODULES_LOADER_V29_DEDUP_SAFE
// Non-destructive owner sidebar loader. Reuses existing matching sidebar items instead of creating duplicates.
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
const loaded=new Set(),loading=new Set(),GLOBAL_KEY="__smallbizOwnerModulesLoader";
const isOwner=()=>Boolean(window.__smallbizIsOwner);
const hasPermission=code=>isOwner()||(typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code));
const nav=()=>document.querySelector(".sidebar-nav");
const textOf=el=>String(el?.textContent||"").replace(/\s+/g," ").trim();
const normalizedLabel=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const labelsFor=item=>[item.label].map(normalizedLabel);
function bindCanonicalButton(item,button){if(!button)return null;button.type="button";button.setAttribute("aria-label",item.label);button.style.setProperty("pointer-events","auto","important");button.style.setProperty("touch-action","manipulation","important");button.onclick=event=>{event.preventDefault();event.stopPropagation();loadOwnerModule(item,button)};button.dataset.smallbizOwnerBound="v29";button.dataset.smallbizOwnerCanonical=item.key;return button}
function findExistingButton(root,item){const target=normalizedLabel(item.label);return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>normalizedLabel(textOf(el))===target&&!el.dataset.smallbizOwnerCanonical)||null}
function removeOnlyOurDuplicateButtons(root,item,keep){Array.from(root.querySelectorAll(`[data-smallbiz-owner-canonical='${item.key}']`)).forEach(el=>{if(el!==keep)el.remove()})}
function ensureCanonicalButton(item){const root=nav();if(!root)return null;let canonical=root.querySelector(`[data-smallbiz-owner-canonical='${item.key}']`);if(canonical){removeOnlyOurDuplicateButtons(root,item,canonical);return bindCanonicalButton(item,canonical)}const existing=findExistingButton(root,item);if(existing)return bindCanonicalButton(item,existing);const button=document.createElement("button");button.className="nav-item";button.dataset.smallbizOwnerCanonical=item.key;button.innerHTML='<span aria-hidden="true">'+item.icon+'</span><b>'+item.label+'</b>';root.appendChild(button);return bindCanonicalButton(item,button)}
function reconcileOwnerMenu(){const root=nav();if(!root||!isOwner())return false;OWNER_MENU.forEach(item=>ensureCanonicalButton(item));return true}
function directHandlerFor(item){if(item.key==="team")return window.__smallbizOpenTeam;if(item.key==="growth")return window.__smallbizOpenGrowthCenter;if(item.key==="cashier-shift")return window.__smallbizOpenCashierShift;return null}
async function forceDirectOpen(item){for(let i=0;i<40;i++){try{const handler=directHandlerFor(item);if(typeof handler==="function"){handler();return true}}catch(error){console.warn(`[SmallBiz] ${item.label} open handler failed.`,error)}window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));await new Promise(resolve=>setTimeout(resolve,75))}return false}
async function loadOwnerModule(item,button){if(!hasPermission(item.permission)||loading.has(item.key))return;loading.add(item.key);button?.setAttribute("aria-busy","true");try{if(!loaded.has(item.key)){await item.load();loaded.add(item.key)}reconcileOwnerMenu();if(item.key==="growth"||item.key==="cashier-shift"||item.key==="team")await forceDirectOpen(item);else window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`))}catch(error){console.warn(`[SmallBiz] ${item.label} failed to load.`,error);window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}))}finally{button?.removeAttribute("aria-busy");loading.delete(item.key)}}
function scheduleReconcile(){[0,100,300,800,1500].forEach(delay=>setTimeout(()=>reconcileOwnerMenu(),delay))}
export function startOwnerModules(){const state=window[GLOBAL_KEY]||{};if(state.started){scheduleReconcile();return}window[GLOBAL_KEY]={...state,started:true};scheduleReconcile();window.addEventListener("smallbiz:permissions-ready",scheduleReconcile,{passive:true});if(!window[GLOBAL_KEY].supportStarted){window[GLOBAL_KEY].supportStarted=true;setTimeout(async()=>{for(const load of SUPPORT_MODULES){try{await load()}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed",error)}await new Promise(resolve=>setTimeout(resolve,0))}},0)}}