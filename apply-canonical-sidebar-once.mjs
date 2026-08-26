import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");

/* SMALLBIZ_CANONICAL_SIDEBAR_NAV_V43
   Single source of truth for the visible React sidebar.
   Runtime modules may open pages/overlays, but they never create sidebar items.
   The complete owner/OMS/online-platform menu is restored here on every build. */

const oldNav=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
const nav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["products","📦","Product",canManageInventory],["inventory","📦","Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Supplier",canManageMasters],["attendance","👥","Employee/Attendance",canSell],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" data-smallbiz-react-sidebar="true" data-sidebar-key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
if(!oldNav.test(text))throw new Error("Canonical sidebar source not found; refusing mutation.");
text=text.replace(oldNav,nav);

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
    });
  }`;

const functionPattern=/\s+(?:async )?function selectSidebarPage\(key\)\{[\s\S]*?\n  \}/;
if(functionPattern.test(text))text=text.replace(functionPattern,"\n"+openExternal);
else{
  const anchor='  return <div className="app-shell">';
  if(!text.includes(anchor))throw new Error("App shell anchor not found; refusing mutation.");
  text=text.replace(anchor,"\n"+openExternal+"\n"+anchor);
}

if(!text.includes("data-smallbiz-react-sidebar=\"true\""))throw new Error("React sidebar ownership marker was not inserted.");

const guardMarker="SMALLBIZ_SIDEBAR_DOM_GUARD_V43";
if(!text.includes(guardMarker)){
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
  const anchor='  useEffect(()=>{if(profile?.business_id)loadSaleItemsHistory()},[salesHistory,profile?.business_id]);';
  if(!text.includes(anchor))throw new Error("Sidebar DOM guard insertion anchor not found.");
  text=text.replace(anchor,anchor+"\n\n  // "+guardMarker+observerEffect);
}

if(!text.includes("window.__SMALLBIZ_SUPABASE__=supabase")){
  const anchor="const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);";
  if(!text.includes(anchor))throw new Error("Supabase source anchor not found.");
  text=text.replace(anchor,anchor+"\nwindow.__SMALLBIZ_SUPABASE__=supabase;");
}

fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_CANONICAL_SIDEBAR_NAV_V43: complete React sidebar restored, including OMS/online-platform modules; runtime navigation does not create duplicate sidebar items; existing layout preserved.");
