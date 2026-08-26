import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const MAIN="main.jsx";
const ATTENDANCE="attendance-center.js";

if(!fs.existsSync(OWNER))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
if(!fs.existsSync(MAIN))throw new Error("main.jsx is missing; build stopped safely.");

/* SMALLBIZ_SIDEBAR_CANONICAL_V35
   React owns the sidebar. The owner loader may bind existing entries and load
   modules, but it must NEVER manufacture navigation buttons. Growth Center and
   Cashier Shift are rendered by the canonical React sidebar so they cannot jump
   to the bottom or duplicate after a React rerender. */
let owner=fs.readFileSync(OWNER,"utf8");
if(!owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V34_EXISTING_FIRST_NO_DUPLICATE")){
  throw new Error("Expected V34 existing-first owner loader; refusing sidebar mutation.");
}

owner=owner.replace(
  "// SMALLBIZ_OWNER_MODULES_LOADER_V34_EXISTING_FIRST_NO_DUPLICATE",
  "// SMALLBIZ_OWNER_MODULES_LOADER_V35_CANONICAL_REACT_NO_CREATE"
);
owner=owner.replace('const LOADER_VERSION="v34";','const LOADER_VERSION="v35";');

const fallbackBlock=`  // Reuse one previously-created fallback instead of creating another.\n  const created=matches.find(el=>el.dataset.smallbizOwnerCreated)||null;\n  if(created){\n    bindButton(item,created,true);\n    removeCreatedDuplicates(root,item,created);\n    return created;\n  }\n  const button=document.createElement("button");\n  button.className="nav-item";\n  button.innerHTML='<span aria-hidden="true">'+item.icon+'</span><b>'+item.label+'</b>';\n  root.appendChild(button);\n  return bindButton(item,button,true);`;
if(!owner.includes(fallbackBlock))throw new Error("V34 fallback creation block not found; refusing unsafe sidebar rewrite.");
owner=owner.replace(fallbackBlock,'  // React is the sole owner of sidebar creation. Missing entries are not generated here.\n  return null;');
fs.writeFileSync(OWNER,owner,"utf8");

let main=fs.readFileSync(MAIN,"utf8");
const oldNav=`        {[["pos","🛒","POS",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>\n          <button key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>setActivePage(key)}><span>{icon}</span><b>{label}</b></button>)}`;
const newNav=`        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>\n          <button key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}`;
if(main.includes(oldNav))main=main.replace(oldNav,newNav);
else if(!main.includes('['+'"cashier-shift","💵","Cashier Shift"'))throw new Error("Canonical sidebar anchor not found; build stopped safely.");

if(!main.includes('function selectSidebarPage(key)')){
  const anchor='  const canManageMasters=isOwner||role==="manager";';
  if(!main.includes(anchor))throw new Error("Sidebar permission anchor not found; build stopped safely.");
  main=main.replace(anchor,anchor+'\n\n  function selectSidebarPage(key){\n    const nav=document.querySelector(".sidebar-nav");\n    const scrollTop=nav?.scrollTop||0;\n    setActivePage(key);\n    requestAnimationFrame(()=>{const next=document.querySelector(".sidebar-nav");if(next)next.scrollTop=scrollTop});\n  }');
}

fs.writeFileSync(MAIN,main,"utf8");

if(fs.existsSync(ATTENDANCE)){
  let attendance=fs.readFileSync(ATTENDANCE,"utf8");
  const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  if(attendance.includes(old)){attendance=attendance.replace(old,next);fs.writeFileSync(ATTENDANCE,attendance,"utf8");}
}

console.log("Applied SMALLBIZ_SIDEBAR_CANONICAL_V35: Growth Center + Cashier Shift are canonical React sidebar entries; owner loader no longer creates fallback/duplicate menu items; sidebar scroll position is preserved on navigation.");