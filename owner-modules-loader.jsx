// SMALLBIZ_OWNER_MODULES_LOADER_V32_CANONICAL_CLICK_DEDUP
// One canonical owner sidebar item per key. Reuses the first existing button,
// removes all later same-label/key duplicates, and binds a reliable click path.
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
function matchingButtons(root,item){const target=normalizedLabel(item.label);return Array.from(root.querySelectorAll("button,a,[role='button']")).filter(el=>normalizedLabel(textOf(el))===target)}
function bindCanonicalButton(item,button,created=false){if(!button)return null;button.type="button";button.setAttribute("aria-label",item.label);button.style.setProperty("pointer-events","auto","important");button.style.setProperty("touch-action","manipulation","important");button.style.setProperty("position","relative","important");button.style.setProperty("z-index","5","important");if(created)button.dataset.smallbizOwnerCreated="v32";button.dataset.smallbizOwnerCanonical=item.key;if(button.dataset.smallbizOwnerBound!=="v32"){button.addEventListener("click",event=>{event.stopPropagation();loadOwnerModule(item,button)},{capture:true,passive:false});button.dataset.smallbizOwnerBound="v32"}return button}
function removeDuplicateButtons(root,item,keep){const all=matchingButtons(root,item);for(const el of all){if(el!==keep)el.remove()}for(const el of Array.from(root.querySelectorAll(`[data-smallbiz-owner-canonical='${item.key}']`))){if(el!==keep)el.remove()}}
function ensureCanonicalButton(item){const root=nav();if(!root||!hasPermission(item.permission))return null;const marked=Array.from(root.querySelectorAll(`[data-smallbiz-owner-canonical='${item.key}']`));const matches=matchingButtons(root,item);const canonical=marked[0]||matches[0]||null;if(canonical){removeDuplicateButtons(root,item,canonical);return bindCanonicalButton(item,canonical,false)}const button=document.createElement("button");button.className="nav-item";button.innerHTML='<span aria-hidden="true">'+item.icon+'</span><b>'+item.label+'</b>';root.appendChild(button);return bindCanonicalButton(item,button,true)}
function reconcileOwnerMenu(){const root=nav();if(!root||!isOwner())return false;OWNER_MENU.forEach(item=>ensureCanonicalButton(item));return true}
function directHandlerFor(item){if(item.key==="team")return window.__smallbizOpenTeam;if(item.key==="growth")return window.__smallbizOpenGrowthCenter;if(item.key==="cashier-shift")return window.__smallbizOpenCashierShift;return null}
async function forceDirectOpen(item){for(let i=0;i<20;i++){try{const handler=directHandlerFor(item);if(typeof handler==="function"){handler();return true}}catch(error){console.warn(`[SmallBiz] ${item.label} open handler failed.`,error)}window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));await new Promise(resolve=>setTimeout(resolve,75))}return false}
async function loadOwnerModule(item,button){if(!hasPermission(item.permission)||loading.has(item.key))return;loading.add(item.key);button?.setAttribute("aria-busy","true");try{if(!loaded.has(item.key)){await item.load();loaded.add(item.key)}reconcileOwnerMenu();if(item.key==="growth"||item.key==="cashier-shift"||item.key==="team")await forceDirectOpen(item);else window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`))}catch(error){console.warn(`[SmallBiz] ${item.label} failed to load.`,error);window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}))}finally{button?.removeAttribute("aria-busy");loading.delete(item.key)}}
let reconcileTimer=0;
function scheduleReconcile(){clearTimeout(reconcileTimer);reconcileTimer=setTimeout(()=>reconcileOwnerMenu(),80)}
function installSidebarObserver(){const state=window[GLOBAL_KEY]||{};if(state.observerInstalled||!document.body)return;const observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==="childList"&&m.addedNodes.length))scheduleReconcile()});observer.observe(document.body,{childList:true,subtree:true});window[GLOBAL_KEY]={...state,observerInstalled:true,observer};scheduleReconcile()}
export function startOwnerModules(){const state=window[GLOBAL_KEY]||{};if(state.started){installSidebarObserver();scheduleReconcile();return}window[GLOBAL_KEY]={...state,started:true};installSidebarObserver();window.addEventListener("smallbiz:permissions-ready",()=>{installSidebarObserver();scheduleReconcile()},{passive:true});if(!window[GLOBAL_KEY].supportStarted){window[GLOBAL_KEY].supportStarted=true;setTimeout(async()=>{for(const load of SUPPORT_MODULES){try{await load()}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed",error)}await new Promise(resolve=>setTimeout(resolve,0))}},0)}}