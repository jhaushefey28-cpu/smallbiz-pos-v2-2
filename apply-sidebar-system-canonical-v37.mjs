import fs from "node:fs";

const MAIN="main.jsx";
const OWNER="owner-modules-loader.jsx";
if(!fs.existsSync(MAIN)||!fs.existsSync(OWNER))throw new Error("Sidebar system files are missing; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");
let owner=fs.readFileSync(OWNER,"utf8");

/* SMALLBIZ_SIDEBAR_SYSTEM_CANONICAL_V39
   React is the ONLY creator of sidebar navigation. Product & Inventory is ONE
   canonical entry (key: inventory); the legacy Products entry is removed.
   The visual sidebar layout/order is otherwise preserved. The owner loader
   may bind existing entries but never creates navigation buttons.
*/

const navBlock=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
const canonicalNav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["inventory","📦","Product & Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
if(!navBlock.test(main))throw new Error("Canonical React sidebar nav block not found; build stopped safely.");
main=main.replace(navBlock,canonicalNav);

const stableFunction=`  function selectSidebarPage(key){
    setActivePage(key);
    requestAnimationFrame(()=>{
      const mainArea=document.querySelector(".main-area");
      if(mainArea)mainArea.scrollTo({top:0,behavior:"auto"});
    });
  }`;
if(!main.includes("function selectSidebarPage(key)")){
  const anchor='  const canManageMasters=isOwner||role==="manager";';
  if(!main.includes(anchor))throw new Error("Sidebar permission anchor not found; build stopped safely.");
  main=main.replace(anchor,anchor+"\n\n"+stableFunction);
}else{
  main=main.replace(/  function selectSidebarPage\(key\)\{[\s\S]*?\n  \}/,stableFunction);
}

// Current owner loader versions differ across repair commits. Rather than
// requiring a fragile helper function, disable only its button-creation calls.
owner=owner.replace(/const LOADER_VERSION="[^"]+";/,'const LOADER_VERSION="v39";');
owner=owner.replace(/function ensureCanonicalButton\([\s\S]*?\n\}/,`function ensureCanonicalButton(item){
  const root=nav();
  if(!root||!hasPermission(item.permission))return null;
  const matches=matchingButtons(root,item);
  const existing=matches.find(el=>!el.dataset.smallbizOwnerCreated)||null;
  if(existing){bindButton(item,existing,false);removeCreatedDuplicates(root,item,existing);return existing;}
  const created=matches.find(el=>el.dataset.smallbizOwnerCreated)||null;
  if(created){bindButton(item,created,true);removeCreatedDuplicates(root,item,created);return created;}
  return null;
}`);

fs.writeFileSync(MAIN,main,"utf8");
fs.writeFileSync(OWNER,owner,"utf8");
console.log("Applied SMALLBIZ_SIDEBAR_SYSTEM_CANONICAL_V39: single Product & Inventory entry; no sidebar/layout changes.");