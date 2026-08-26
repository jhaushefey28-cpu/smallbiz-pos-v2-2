import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");
const marker="SMALLBIZ_CANONICAL_SIDEBAR_NAV_V42";

if(!text.includes(marker)){
  const oldNav=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
  const nav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["products","📦","Product",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Supplier",canManageMasters],["attendance","👥","Employee/Attendance",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
  if(!oldNav.test(text))throw new Error("Canonical sidebar source not found; refusing mutation.");
  text=text.replace(oldNav,nav);

  const anchor='  return <div className="app-shell">';
  if(!text.includes(anchor))throw new Error("App shell anchor not found; refusing mutation.");
  const fn=`  // ${marker}
  async function selectSidebarPage(key){
    try{
      if(key==="cashier-shift"){
        await import("./cashier-shift.jsx");
        window.dispatchEvent(new CustomEvent("smallbiz:open-cashier-shift"));
        return;
      }
      if(key==="attendance"){
        await import("./attendance-runtime-bridge.js");
        await import("./attendance-center.js");
        window.dispatchEvent(new CustomEvent("smallbiz:open-attendance"));
        return;
      }
      setActivePage(key);
      requestAnimationFrame(()=>document.querySelector(".main-area")?.scrollTo({top:0,behavior:"auto"}));
    }catch(e){
      setErr(String(e?.message||e));
    }
  }

`;
  text=text.replace(anchor,fn+anchor);
  fs.writeFileSync(path,text,"utf8");
  console.log("Applied SMALLBIZ_CANONICAL_SIDEBAR_NAV_V42: one canonical React sidebar; Cashier Shift and Employee/Attendance use their existing modules without creating sidebar buttons.");
}else{
  console.log("Canonical sidebar already present; no mutation needed.");
}
