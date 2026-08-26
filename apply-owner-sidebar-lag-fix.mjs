import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const MAIN="main.jsx";
const ATTENDANCE="attendance-center.js";

if(!fs.existsSync(OWNER))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
if(!fs.existsSync(MAIN))throw new Error("main.jsx is missing; build stopped safely.");

/* SMALLBIZ_SIDEBAR_CANONICAL_V36
   React owns the sidebar. The owner loader may bind existing entries and load
   modules, but it must NEVER manufacture navigation buttons. Navigation keeps
   the existing visual layout/order, and changing page resets the sidebar to the
   top instead of preserving a bottom scroll position that hides the menu. */
let owner=fs.readFileSync(OWNER,"utf8");
const v34="SMALLBIZ_OWNER_MODULES_LOADER_V34_EXISTING_FIRST_NO_DUPLICATE";
const v35="SMALLBIZ_OWNER_MODULES_LOADER_V35_CANONICAL_REACT_NO_CREATE";
const v36="SMALLBIZ_OWNER_MODULES_LOADER_V36_CANONICAL_REACT_STABLE";
const v38="SMALLBIZ_OWNER_MODULES_LOADER_V38_REACT_BIND_ONLY_NO_CREATE";
if(!owner.includes(v34)&&!owner.includes(v35)&&!owner.includes(v36)&&!owner.includes(v38))throw new Error("Expected safe owner loader; refusing sidebar mutation.");

if(owner.includes(v34)){
  owner=owner.replace(v34,v36);
  owner=owner.replace('const LOADER_VERSION="v34";','const LOADER_VERSION="v36";');
  const fallbackBlock=`  // Reuse one previously-created fallback instead of creating another.\n  const created=matches.find(el=>el.dataset.smallbizOwnerCreated)||null;\n  if(created){\n    bindButton(item,created,true);\n    removeCreatedDuplicates(root,item,created);\n    return created;\n  }\n  const button=document.createElement("button");\n  button.className="nav-item";\n  button.innerHTML='<span aria-hidden="true">'+item.icon+'</span><b>'+item.label+'</b>';\n  root.appendChild(button);\n  return bindButton(item,button,true);`;
  if(!owner.includes(fallbackBlock))throw new Error("V34 fallback creation block not found; refusing unsafe sidebar rewrite.");
  owner=owner.replace(fallbackBlock,'  // React is the sole owner of sidebar creation. Missing entries are not generated here.\n  return null;');
  fs.writeFileSync(OWNER,owner,"utf8");
}else if(owner.includes(v35)){
  owner=owner.replace(v35,v36).replace('const LOADER_VERSION="v34";','const LOADER_VERSION="v36";');
  fs.writeFileSync(OWNER,owner,"utf8");
}else if(owner.includes('const LOADER_VERSION="v34";')){
  owner=owner.replace('const LOADER_VERSION="v34";','const LOADER_VERSION="v36";');
  fs.writeFileSync(OWNER,owner,"utf8");
}

let main=fs.readFileSync(MAIN,"utf8");
const oldNav=`        {[["pos","🛒","POS",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>\n          <button key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>setActivePage(key)}><span>{icon}</span><b>{label}</b></button>)}`;
const newNav=`        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>\n          <button key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}`;
if(main.includes(oldNav))main=main.replace(oldNav,newNav);
else if(!main.includes('["cashier-shift","💵","Cashier Shift"'))throw new Error("Canonical sidebar anchor not found; build stopped safely.");

const stableFunction=`  function selectSidebarPage(key){\n    if(typeof setMobileSidebarOpen==="function")setMobileSidebarOpen(false);\n    setActivePage(key);\n    requestAnimationFrame(()=>{\n      const next=document.querySelector(".sidebar-nav");\n      if(next)next.scrollTop=0;\n      const mainArea=document.querySelector(".main-area");\n      if(mainArea)mainArea.scrollTo({top:0,behavior:"auto"});\n    });\n  }`;
const functionPattern=/  function selectSidebarPage\(key\)\{[\s\S]*?\n  \}/;
if(functionPattern.test(main))main=main.replace(functionPattern,stableFunction);
else if(!main.includes('function selectSidebarPage(key)')){
  const anchor='  const canManageMasters=isOwner||role==="manager";';
  if(!main.includes(anchor))throw new Error("Sidebar permission anchor not found; build stopped safely.");
  main=main.replace(anchor,anchor+'\n\n'+stableFunction);
}

fs.writeFileSync(MAIN,main,"utf8");

if(fs.existsSync(ATTENDANCE)){
  let attendance=fs.readFileSync(ATTENDANCE,"utf8");
  const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  if(attendance.includes(old)){attendance=attendance.replace(old,next);fs.writeFileSync(ATTENDANCE,attendance,"utf8");}
}

console.log("Applied SMALLBIZ_SIDEBAR_CANONICAL_V36: React remains the sole sidebar creator; Growth Center + Cashier Shift stay canonical; navigation resets sidebar scroll to keep the existing menu visible without changing layout.");