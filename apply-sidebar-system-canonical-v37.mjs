import fs from "node:fs";

const MAIN="main.jsx";
if(!fs.existsSync(MAIN))throw new Error("main.jsx is missing; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");

/* SMALLBIZ_SIDEBAR_SYSTEM_CANONICAL_V40
   Build-time normalization only. React remains the sole visible sidebar owner.
   Product & Inventory is one canonical entry; legacy Products is removed.
   Employee/Attendance remains in the same position and keeps main.jsx's existing
   external module opener. No sidebar CSS, layout, ordering, or handlers are
   otherwise rewritten here.
*/

const navBlock=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
const canonicalNav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["inventory","📦","Product & Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["attendance","👥","Employee/Attendance",canSell],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" data-smallbiz-react-sidebar="true" data-sidebar-key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;

if(!navBlock.test(main))throw new Error("Canonical React sidebar nav block not found; build stopped safely.");
main=main.replace(navBlock,canonicalNav);

// Do not rewrite selectSidebarPage: main.jsx already contains the external
// Employee/Attendance opener and other module handlers. Replacing it here was
// the reason Employee/Attendance disappeared in the previous build.

fs.writeFileSync(MAIN,main,"utf8");
console.log("Applied V40: one Product & Inventory entry; Employee/Attendance preserved; sidebar layout and handlers untouched.");