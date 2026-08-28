import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");

/* SMALLBIZ_CANONICAL_SIDEBAR_NAV_V44
   One React-owned sidebar. Product & Inventory is the single product/inventory
   entry. Employee/Attendance remains present and uses the existing Attendance
   bridge. No sidebar CSS, spacing, ordering, or layout is changed. */

const oldNav=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
const nav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["inventory","📦","Product & Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["attendance","👥","Employee/Attendance",canSell],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" data-smallbiz-react-sidebar="true" data-sidebar-key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
if(!oldNav.test(text))throw new Error("Canonical sidebar source not found; refusing mutation.");
text=text.replace(oldNav,nav);

const externalBlock=`
  const externalSidebarOpen={
    "cashier-shift":async()=>{await import("./cashier-shift.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-cashier-shift"));},
    "growth":async()=>{await import("./growth-center.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-growth-center"));},
    "inventory":async()=>{window.__SMALLBIZ_SUPABASE__=supabase;await import("./inventory-center.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-inventory"));},
    "team":async()=>{await import("./team-management.js");window.dispatchEvent(new CustomEvent("smallbiz:open-team"));},
    "channels":async()=>{await import("./sales-channels.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-channels"));},
    "marketplace-connections":async()=>{await import("./marketplace-connections.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-marketplace-connections"));},
    "marketplace-stock":async()=>{await import("./marketplace-stock-reservation.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-marketplace-stock"));},
    "marketplace-fulfillment":async()=>{await import("./marketplace-fulfillment.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-marketplace-fulfillment"));},
    "order-management":async()=>{await import("./order-management.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-order-management"));},
    "channel-mapping":async()=>{await import("./product-channel-mapping.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-channel-mapping"));},
    "business-controls":async()=>{await import("./business-controls.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-business-controls"));},
    "attendance":async()=>{window.__SMALLBIZ_SUPABASE__=supabase;window.__smallbizAttendanceSupabase=supabase;await import("./attendance-runtime-bridge.js");await import("./attendance-center.js");if(typeof window.__smallbizOpenAttendance==="function")window.__smallbizOpenAttendance();else window.dispatchEvent(new CustomEvent("smallbiz:open-attendance"));}
  };

  async function selectSidebarPage(key){
    if(externalSidebarOpen[key]){
      try{await externalSidebarOpen[key]();}catch(error){console.warn("[SmallBiz] "+key+" failed to open.",error);setErr(String(key)+" failed to open: "+String(error?.message||error));}
      return;
    }
    setActivePage(key);
    requestAnimationFrame(()=>{const mainArea=document.querySelector(".main-area");if(mainArea)mainArea.scrollTo({top:0,behavior:"auto"});});
  }`;

const functionPattern=/\s+(?:async )?function selectSidebarPage\(key\)\{[\s\S]*?\n  \}/;
if(functionPattern.test(text))text=text.replace(functionPattern,"\n"+externalBlock);
else throw new Error("Existing selectSidebarPage handler not found; refusing mutation.");

if(!text.includes("window.__SMALLBIZ_SUPABASE__=supabase")){
  const anchor="const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);";
  if(!text.includes(anchor))throw new Error("Supabase source anchor not found.");
  text=text.replace(anchor,anchor+"\nwindow.__SMALLBIZ_SUPABASE__=supabase;");
}

fs.writeFileSync(path,text,"utf8");
console.log("Applied V44: one Product & Inventory entry; Employee/Attendance preserved; sidebar layout untouched.");