import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const ATTENDANCE="attendance-center.js";

const ownerLoader=`// SMALLBIZ_OWNER_MODULES_LOADER_V19
import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";
if (typeof window !== "undefined" && !window.supabase?.createClient && window.__SMALLBIZ_SUPABASE__) window.supabase={createClient:()=>window.__SMALLBIZ_SUPABASE__};
const SUPPORT_MODULES=[()=>import("./reprint-modal-fix.js"),()=>import("./void-reason-enhancement.js"),()=>import("./transaction-audit-enhancement.js")];
const OWNER_MENU=[
{key:"team",icon:"👥",label:"Team",permission:"team.view",load:()=>import("./team-management.js")},
{key:"channels",icon:"🌐",label:"Online Channels",permission:"marketplace.view",load:()=>import("./sales-channels.jsx")},
{key:"marketplace-connections",icon:"🔌",label:"Marketplace Connections",permission:"marketplace.view",load:()=>import("./marketplace-connections.jsx")},
{key:"marketplace-stock",icon:"📦",label:"Marketplace Stock",permission:"inventory.view",load:()=>import("./marketplace-stock-reservation.jsx")},
{key:"marketplace-fulfillment",icon:"🚚",label:"Marketplace Fulfillment",permission:"marketplace.manage",load:()=>import("./marketplace-fulfillment.jsx")},
{key:"order-management",icon:"🛍️",label:"Order Management",permission:"marketplace.view",load:()=>import("./order-management.jsx")},
{key:"channel-mapping",icon:"🗺️",label:"Product Channel Mapping",internalLabels:["Product Channel Mapping","Product Mapping"],permission:"marketplace.manage",load:()=>import("./product-channel-mapping.jsx")},
{key:"business-controls",icon:"⚙️",label:"Business Controls",permission:"settings.manage",load:()=>import("./business-controls.jsx")},
{key:"inventory",icon:"📦",label:"Inventory",internalLabels:["Inventory","Products & Inventory"],permission:"inventory.view",load:()=>import("./inventory-center.jsx")},
{key:"growth",icon:"📈",label:"Growth Center",internalLabels:["Growth Center","Growth"],permission:"reports.view",load:()=>import("./growth-center.jsx")},
{key:"cashier-shift",icon:"💵",label:"Cashier Shift",internalLabels:["Cashier Shift","Cashier"],permission:"pos.use",load:()=>import("./cashier-shift.jsx")}
];
const RETIRED_LABELS=["Marketplace Sync Readiness","Product Mapping","Products & Inventory","Platform Channel Admin","Growth"];
const loaded=new Set(),loading=new Set(),GLOBAL_KEY="__smallbizOwnerModulesLoader";
const hasPermission=code=>typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code);
const nav=()=>document.querySelector(".sidebar-nav"),textOf=el=>String(el?.textContent||"").replace(/\\s+/g," ").trim(),normalizedLabel=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,""),isCanonical=el=>Boolean(el?.dataset?.smallbizOwnerCanonical),labelsFor=item=>[item.label,...(item.internalLabels||[])].map(normalizedLabel);
function removeRetiredMenuItems(){const root=nav();if(!root)return;const retired=new Set(RETIRED_LABELS.map(normalizedLabel));Array.from(root.querySelectorAll("button,a,[role='button']")).forEach(el=>{if(isCanonical(el)||el.dataset?.smallbizOwnerInternal)return;const label=normalizedLabel(textOf(el));if(retired.has(label)&&label!==normalizedLabel("Product Channel Mapping")&&label!==normalizedLabel("Inventory"))el.remove()})}
function markInternal(el,item){if(!el||isCanonical(el))return;el.dataset.smallbizOwnerInternal=item.key;el.setAttribute("aria-hidden","true");el.tabIndex=-1;el.style.setProperty("display","none","important");el.style.setProperty("pointer-events","none","important")}
function findInternalButton(item){const root=nav();if(!root)return null;return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>el.dataset?.smallbizOwnerInternal===item.key)||null}
function hideDuplicateModuleButtons(item){const root=nav();if(!root)return;const targets=new Set(labelsFor(item));Array.from(root.querySelectorAll("button,a,[role='button']")).forEach(el=>{if(isCanonical(el)||el.dataset?.smallbizOwnerInternal)return;if(targets.has(normalizedLabel(textOf(el))))markInternal(el,item)})}
function removeDuplicateCanonicalButtons(item,keep){const root=nav();if(!root)return;Array.from(root.querySelectorAll(\`[data-smallbiz-owner-canonical='\${item.key}']\`)).forEach(el=>{if(el!==keep)el.remove()})}
function bindCanonicalButton(item,button){if(!button)return null;button.type="button";button.setAttribute("aria-label",item.label);button.style.setProperty("pointer-events","auto","important");button.style.setProperty("touch-action","manipulation","important");button.style.setProperty("position","relative","important");button.style.setProperty("z-index","3","important");if(button.dataset.smallbizOwnerBound!=="v19"){button.onclick=event=>{event.preventDefault();event.stopPropagation();loadOwnerModule(item,button)};button.dataset.smallbizOwnerBound="v19"}return button}
function ensureCanonicalButton(item){const root=nav();if(!root)return null;let existing=root.querySelector(\`[data-smallbiz-owner-canonical='\${item.key}']\`);if(existing){removeDuplicateCanonicalButtons(item,existing);return bindCanonicalButton(item,existing)}const button=document.createElement("button");button.className="nav-item";button.dataset.smallbizOwnerCanonical=item.key;button.innerHTML=\`<span aria-hidden="true">\${item.icon}</span><b>\${item.label}</b>\`;const targets=new Set(labelsFor(item));const firstMatching=Array.from(root.querySelectorAll("button,a,[role='button']")).find(el=>targets.has(normalizedLabel(textOf(el)))&&!isCanonical(el));if(firstMatching)root.insertBefore(button,firstMatching);else root.appendChild(button);return bindCanonicalButton(item,button)}
function removeDuplicateReports(){const root=nav();if(!root)return;const reports=Array.from(root.querySelectorAll("button,a,[role='button']")).filter(el=>normalizedLabel(textOf(el))==="reports");reports.slice(1).forEach(el=>el.remove())}
function reconcileOwnerMenu(){const root=nav();if(!root||!window.__smallbizPermissionsReady)return false;removeRetiredMenuItems();OWNER_MENU.forEach(item=>{if(!hasPermission(item.permission)){root.querySelector(\`[data-smallbiz-owner-canonical='\${item.key}']\`)?.remove();return}const canonical=ensureCanonicalButton(item);hideDuplicateModuleButtons(item);removeDuplicateCanonicalButtons(item,canonical)});removeDuplicateReports();return true}
function openLoadedModule(item){if(item.key==="team"&&typeof window.__smallbizOpenTeam==="function"){window.__smallbizOpenTeam();return true}const internal=findInternalButton(item);if(internal){internal.click();return true}window.dispatchEvent(new CustomEvent(\`smallbiz:open-\${item.key}\`));return false}
async function waitForInternalButton(item,timeout=3000){const started=Date.now();while(Date.now()-started<timeout){hideDuplicateModuleButtons(item);const internal=findInternalButton(item);if(internal)return internal;await new Promise(resolve=>setTimeout(resolve,60))}return null}
async function loadOwnerModule(item,button){if(!hasPermission(item.permission)||loading.has(item.key))return;if(loaded.has(item.key)){openLoadedModule(item);return}loading.add(item.key);button?.setAttribute("aria-busy","true");const labelNode=button?.querySelector("b");if(labelNode)labelNode.textContent=\`\${item.label}…\`;try{await item.load();loaded.add(item.key);const internal=await waitForInternalButton(item);if(internal)internal.click();else window.dispatchEvent(new CustomEvent(\`smallbiz:open-\${item.key}\`))}catch(error){console.warn(\`[SmallBiz] \${item.label} failed to load.\`,error);window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}))}finally{button?.removeAttribute("aria-busy");const currentLabel=button?.querySelector("b");if(currentLabel)currentLabel.textContent=item.label;loading.delete(item.key)}}
function scheduleStartupReconcile(){[0,120,350,800,1500].forEach(delay=>setTimeout(()=>reconcileOwnerMenu(),delay))}
export function startOwnerModules(){const state=window[GLOBAL_KEY]||{};if(state.started){scheduleStartupReconcile();return}window[GLOBAL_KEY]={...state,started:true};scheduleStartupReconcile();window.addEventListener("smallbiz:permissions-ready",()=>scheduleStartupReconcile());if(window.__smallbizPermissionsReady&&!window[GLOBAL_KEY].supportStarted){window[GLOBAL_KEY].supportStarted=true;setTimeout(async()=>{for(const load of SUPPORT_MODULES){try{await load()}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed.",error)}await new Promise(resolve=>setTimeout(resolve,0))}},1000)}}
`;
fs.writeFileSync(OWNER,ownerLoader,"utf8");

let attendance=fs.readFileSync(ATTENDANCE,"utf8");
const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
if(attendance.includes(old)) attendance=attendance.replace(old,next);
fs.writeFileSync(ATTENDANCE,attendance,"utf8");
console.log("Applied SMALLBIZ_OWNER_SIDEBAR_LAG_FIX_V19: removed permanent sidebar/body MutationObservers from owner loader and bridged attendance to the authenticated Supabase client.");
