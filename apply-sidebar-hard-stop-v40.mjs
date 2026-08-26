import fs from "node:fs";

const MAIN="main.jsx";
const OWNER="owner-modules-loader.jsx";
if(!fs.existsSync(MAIN)||!fs.existsSync(OWNER))throw new Error("Sidebar source files are missing; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");
let owner=fs.readFileSync(OWNER,"utf8");

/* SMALLBIZ_SIDEBAR_HARD_STOP_V41
   React owns every visible sidebar button. Runtime modules may open their
   existing pages/overlays, but they never create or rebind sidebar buttons.
   The complete owner sidebar is restored in one canonical React list. */

const navBlock=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
const canonicalNav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["products","📦","Products",canManageInventory],["inventory","📦","Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["attendance","👥","Employee/Attendance",canSell],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" data-smallbiz-react-sidebar="true" data-sidebar-key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
if(!navBlock.test(main))throw new Error("Sidebar nav source block not found; refusing hard-stop repair.");
main=main.replace(navBlock,canonicalNav);

const openExternal=`  const externalSidebarOpen={
    "cashier-shift":async()=>{await import("./cashier-shift.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-cashier-shift"));},
    "growth":async()=>{await import("./growth-center.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-growth-center"));},
    "inventory":async()=>{await import("./inventory-center.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-inventory"));},
    "team":async()=>{await import("./team-management.js");window.dispatchEvent(new CustomEvent("smallbiz:open-team"));},
    "channels":async()=>{await import("./sales-channels.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-channels"));},
    "marketplace-connections":async()=>{await import("./marketplace-connections.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-marketplace-connections"));},
    "marketplace-stock":async()=>{await import("./marketplace-stock-reservation.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-marketplace-stock"));},
    "marketplace-fulfillment":async()=>{await import("./marketplace-fulfillment.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-marketplace-fulfillment"));},
    "order-management":async()=>{await import("./order-management.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-order-management"));},
    "channel-mapping":async()=>{await import("./product-channel-mapping.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-channel-mapping"));},
    "business-controls":async()=>{await import("./business-controls.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-business-controls"));},
    "attendance":async()=>{window.__SMALLBIZ_SUPABASE__=supabase;await import("./attendance-runtime-bridge.js");await import("./attendance-center.js");window.dispatchEvent(new CustomEvent("smallbiz:open-attendance"));}
  };

  async function selectSidebarPage(key){
    if(externalSidebarOpen[key]){
      try{await externalSidebarOpen[key]();}catch(error){console.warn("[SmallBiz] "+key+" failed to open.",error);setErr(String(key)+" failed to open: "+String(error?.message||error));}
      return;
    }
    setActivePage(key);
    requestAnimationFrame(()=>{
      const mainArea=document.querySelector(".main-area");
      if(mainArea)mainArea.scrollTo({top:0,behavior:"auto"});
      const sidebar=document.querySelector(".sidebar-nav");
      if(sidebar)sidebar.scrollTop=0;
    });
  }`;
const functionPattern=/\s+(?:async )?function selectSidebarPage\(key\)\{[\s\S]*?\n  \}/;
if(functionPattern.test(main))main=main.replace(functionPattern,"\n"+openExternal);
else{
  const anchor='  const canManageMasters=isOwner||role==="manager";';
  if(!main.includes(anchor))throw new Error("Sidebar permission anchor not found; refusing hard-stop repair.");
  main=main.replace(anchor,anchor+"\n\n"+openExternal);
}

if(!main.includes("data-smallbiz-react-sidebar=\"true\""))throw new Error("React sidebar ownership marker was not inserted.");

const observerEffect=`
  useEffect(()=>{
    const root=document.querySelector(".sidebar-nav");
    if(!root)return;
    const clean=()=>{
      Array.from(root.children).forEach(node=>{
        if(node instanceof HTMLElement&&!node.dataset.smallbizReactSidebar)node.remove();
      });
    };
    clean();
    const observer=new MutationObserver(clean);
    observer.observe(root,{childList:true});
    return()=>observer.disconnect();
  },[profile?.id]);`;
if(!main.includes("SMALLBIZ_SIDEBAR_DOM_GUARD_V40")){
  const anchor='  useEffect(()=>{if(profile?.business_id)loadSaleItemsHistory()},[salesHistory,profile?.business_id]);';
  if(!main.includes(anchor))throw new Error("Sidebar DOM guard insertion anchor not found.");
  main=main.replace(anchor,anchor+"\n\n  // SMALLBIZ_SIDEBAR_DOM_GUARD_V40"+observerEffect);
}

if(!main.includes("window.__SMALLBIZ_SUPABASE__=supabase")){
  const anchor="const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);";
  if(!main.includes(anchor))throw new Error("Supabase source anchor not found.");
  main=main.replace(anchor,anchor+"\nwindow.__SMALLBIZ_SUPABASE__=supabase;");
}

const bindPattern=/function bindButton\(item,button,created=false\)\{[\s\S]*?\n\}\n\nfunction ensureCanonicalButton/;
const bindOnly=`function bindButton(item,button,created=false){
  if(!button)return null;
  if(button.tagName==="BUTTON")button.type="button";
  button.setAttribute("aria-label",item.label);
  button.dataset.smallbizOwnerCanonical=item.key;
  if(created)button.dataset.smallbizOwnerCreated=LOADER_VERSION;
  button.style.setProperty("pointer-events","auto","important");
  button.style.setProperty("touch-action","manipulation","important");
  button.style.setProperty("position","relative","important");
  button.style.setProperty("z-index","5","important");
  return button;
}

function ensureCanonicalButton`;
if(!bindPattern.test(owner))throw new Error("Owner loader bind block not found; refusing hard-stop repair.");
owner=owner.replace(bindPattern,bindOnly);
owner=owner.replace(/SMALLBIZ_OWNER_MODULES_LOADER_V[^\n]*/,"SMALLBIZ_OWNER_MODULES_LOADER_V41_REACT_BIND_ONLY");
owner=owner.replace(/const LOADER_VERSION="[^"]+";/,'const LOADER_VERSION="v41";');

fs.writeFileSync(MAIN,main,"utf8");
fs.writeFileSync(OWNER,owner,"utf8");
console.log("Applied SMALLBIZ_SIDEBAR_HARD_STOP_V41: complete canonical sidebar restored; React owns navigation; runtime modules only open existing pages; no duplicate sidebar creation.");
