import fs from "node:fs";

const MAIN="main.jsx";
const OWNER="owner-modules-loader.jsx";
if(!fs.existsSync(MAIN)||!fs.existsSync(OWNER))throw new Error("Sidebar system files are missing; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");
let owner=fs.readFileSync(OWNER,"utf8");

/* SMALLBIZ_SIDEBAR_SYSTEM_CANONICAL_V40
   Do not rebuild or reorder the sidebar. Only normalize the duplicate product
   entries in the existing React navigation and preserve Employee/Attendance.
*/

const navArray=/\[\["pos","🛒","POS",canSell\],[\s\S]*?\]\]\.filter\(x=>x\[3\]\)\.map/;
if(!navArray.test(main))throw new Error("Current React sidebar navigation array not found; build stopped safely.");

main=main.replace(navArray,`[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["inventory","📦","Product & Inventory",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["attendance","👥","Employee/Attendance",canSell],["movements","🔄","Stock History",canManageInventory],["team","👥","Team",isOwner],["channels","🌐","Online Channels",isOwner],["marketplace-connections","🔌","Marketplace Connections",isOwner],["marketplace-stock","📦","Marketplace Stock",isOwner],["marketplace-fulfillment","🚚","Marketplace Fulfillment",isOwner],["order-management","🛍️","Order Management",isOwner],["channel-mapping","🗺️","Product Channel Mapping",isOwner],["business-controls","⚙️","Business Controls",isOwner]].filter(x=>x[3]).map`);

// Do not modify owner-loader navigation behavior. It is already React-only.
// This file intentionally makes no DOM observers, injections, or layout changes.

fs.writeFileSync(MAIN,main,"utf8");
fs.writeFileSync(OWNER,owner,"utf8");
console.log("Applied V40: Product & Inventory single entry; Employee/Attendance preserved; sidebar layout untouched.");