import fs from "node:fs";

const MAIN="main.jsx";
const OWNER="owner-modules-loader.jsx";
if(!fs.existsSync(MAIN)||!fs.existsSync(OWNER))throw new Error("Sidebar system files are missing; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");
let owner=fs.readFileSync(OWNER,"utf8");

/* SMALLBIZ_SIDEBAR_SYSTEM_CANONICAL_V37
   React is the ONLY creator of sidebar navigation. The owner module loader may
   bind/load an existing canonical entry, but it may never append a new button.
   This prevents the exact failure where an unclickable item is duplicated at
   the bottom and the working duplicate becomes the only usable entry.
   The visual sidebar layout is preserved; only the canonical item list/order
   is restored. */

const navBlock=/<nav className="sidebar-nav">[\\s\\S]*?<\\/nav>/;
const canonicalNav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["products","📦","Products",canManageInventory],["inventory","📦","Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
if(!navBlock.test(main))throw new Error("Canonical React sidebar nav block not found; build stopped safely.");
main=main.replace(navBlock,canonicalNav);

const stableFunction=`  function selectSidebarPage(key){
    setActivePage(key);
    requestAnimationFrame(()=>{
      const next=document.querySelector(".sidebar-nav");
      if(next)next.scrollTop=0;
      const mainArea=document.querySelector(".main-area");
      if(mainArea)mainArea.scrollTo({top:0,behavior:"auto"});
    });
  }`;
if(!main.includes("function selectSidebarPage(key)")){
  const anchor='  const canManageMasters=isOwner||role==="manager";';
  if(!main.includes(anchor))throw new Error("Sidebar permission anchor not found; build stopped safely.");
  main=main.replace(anchor,anchor+"\n\n"+stableFunction);
}else{
  main=main.replace(/  function selectSidebarPage\(key\)\{[\\s\\S]*?\n  \}/,stableFunction);
}

// Make the runtime loader strictly bind-only. It must never manufacture missing
// sidebar buttons or move a button to the bottom of the React navigation.
owner=owner.replace(/\/\/ SMALLBIZ_OWNER_MODULES_LOADER_V[^
]*\n/,"// SMALLBIZ_OWNER_MODULES_LOADER_V37_REACT_CANONICAL_BIND_ONLY\n");
owner=owner.replace(/const LOADER_VERSION="[^"]+";/,'const LOADER_VERSION="v37";');
const ensurePattern=/function ensureCanonicalButton\(item\)\{[\\s\\S]*?\n\}/;
const bindOnly=`function ensureCanonicalButton(item){
  const root=nav();
  if(!root||!hasPermission(item.permission))return null;
  const matches=matchingButtons(root,item);
  const existing=matches.find(el=>!el.dataset.smallbizOwnerCreated)||null;
  if(existing){bindButton(item,existing,false);removeCreatedDuplicates(root,item,existing);return existing;}
  const created=matches.find(el=>el.dataset.smallbizOwnerCreated)||null;
  if(created){
    // Legacy fallback is tolerated only when it already exists; never create a new one.
    bindButton(item,created,true);removeCreatedDuplicates(root,item,created);return created;
  }
  return null;
}`;
if(!ensurePattern.test(owner))throw new Error("Owner loader ensureCanonicalButton block not found; build stopped safely.");
owner=owner.replace(ensurePattern,bindOnly);

// Do not append a fallback during reconciliation. Existing React entries are enough.
const reconcilePattern=/function reconcileOwnerMenu\(\)\{[\\s\\S]*?\n\}/;
const reconcile=`function reconcileOwnerMenu(){
  const root=nav();
  if(!root||!isOwner())return false;
  for(const item of OWNER_MENU)ensureCanonicalButton(item);
  return true;
}`;
if(!reconcilePattern.test(owner))throw new Error("Owner loader reconcile block not found; build stopped safely.");
owner=owner.replace(reconcilePattern,reconcile);

fs.writeFileSync(MAIN,main,"utf8");
fs.writeFileSync(OWNER,owner,"utf8");
console.log("Applied SMALLBIZ_SIDEBAR_SYSTEM_CANONICAL_V37: React-only canonical sidebar; no fallback creation; Cashier Shift/Growth Center restored in fixed order; layout preserved.");
