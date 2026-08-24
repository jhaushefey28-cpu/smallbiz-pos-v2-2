import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const ATTENDANCE="attendance-center.js";

/* Final sidebar recovery: never remove, hide, or deduplicate existing menus. */
const ownerLoader=`// SMALLBIZ_OWNER_MODULES_LOADER_V27_SAFE
// Non-destructive owner sidebar loader: existing sidebar items are preserved.
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
const hasPermission=code=>Boolean(window.__smallbizIsOwner)||Boolean(window.__smallbizIsTenantSuperAdmin)|| (typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code));
const nav=()=>document.querySelector(".sidebar-nav");
const textOf=el=>String(el?.textContent||"").replace(/\s+/g," ").trim();
const normalizedLabel=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const labelsFor=item=>[item.label].map(normalizedLabel);
function findExistingButton(item){const root=nav();if(!root)return null;const targets=new Set(labelsFor(item));return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>targets.has(normalizedLabel(textOf(el))))||null}
function bindButton(item,button){if(!button)return null;button.type="button";button.setAttribute("aria-label",item.label);button.style.setProperty("pointer-events","auto","important");button.style.setProperty("touch-action","pan-y","important");button.style.setProperty("position","relative","important");button.style.setProperty("z-index","3","important");if(button.dataset.smallbizOwnerBound!=="v27"){button.onclick=event=>{event.preventDefault();event.stopPropagation();loadOwnerModule(item,button)};button.dataset.smallbizOwnerBound="v27"}return button}
function ensureButton(item){const root=nav();if(!root)return null;const existing=findExistingButton(item);if(existing)return bindButton(item,existing);const button=document.createElement("button");button.className="nav-item";button.innerHTML='<span aria-hidden="true">'+item.icon+'</span><b>'+item.label+'</b>';root.appendChild(button);return bindButton(item,button)}
function directHandlerFor(item){if(item.key==="team")return window.__smallbizOpenTeam;if(item.key==="growth")return window.__smallbizOpenGrowthCenter;if(item.key==="cashier-shift")return window.__smallbizOpenCashierShift;return null}
async function openModule(item){const handler=directHandlerFor(item);if(typeof handler==="function"){handler();return true}window.dispatchEvent(new CustomEvent("smallbiz:open-"+item.key));return true}
async function loadOwnerModule(item,button){if(!hasPermission(item.permission)||loading.has(item.key))return;loading.add(item.key);button?.setAttribute("aria-busy","true");const labelNode=button?.querySelector("b");if(labelNode)labelNode.textContent=item.label+"…";try{if(!loaded.has(item.key)){await item.load();loaded.add(item.key)}await openModule(item)}catch(error){console.warn("[SmallBiz] "+item.label+" failed to load.",error);window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}))}finally{button?.removeAttribute("aria-busy");const currentLabel=button?.querySelector("b");if(currentLabel)currentLabel.textContent=item.label;loading.delete(item.key)}}
function reconcileOwnerMenu(){const root=nav();if(!root)return false;OWNER_MENU.forEach(item=>{if(hasPermission(item.permission))ensureButton(item)});return true}
function scheduleReconcile(){[0,250,750,1500,3000].forEach(delay=>setTimeout(reconcileOwnerMenu,delay))}
export function startOwnerModules(){const state=window[GLOBAL_KEY]||{};if(state.started){scheduleReconcile();return}window[GLOBAL_KEY]={...state,started:true};scheduleReconcile();window.addEventListener("smallbiz:permissions-ready",scheduleReconcile,{passive:true});window.addEventListener("smallbiz:owner-ready",scheduleReconcile,{passive:true});if(window.__smallbizPermissionsReady&&!window[GLOBAL_KEY].supportStarted){window[GLOBAL_KEY].supportStarted=true;setTimeout(async()=>{for(const load of SUPPORT_MODULES){try{await load()}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed",error)}await new Promise(resolve=>setTimeout(resolve,0))}},0)}}
`;
fs.writeFileSync(OWNER,ownerLoader,"utf8");
let attendance=fs.readFileSync(ATTENDANCE,"utf8");
const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
if(attendance.includes(old))attendance=attendance.replace(old,next);
fs.writeFileSync(ATTENDANCE,attendance,"utf8");
console.log("Applied SMALLBIZ_OWNER_SIDEBAR_LAG_FIX_V27_SAFE: preserved all existing sidebar items and restored owner menu availability without destructive reconciliation.");