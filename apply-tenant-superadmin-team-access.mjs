import fs from "node:fs";

const mainPath = "main.jsx";
let main = fs.readFileSync(mainPath, "utf8");

const helperAnchor = '  function paymentLabel(m){return m==="gcash"?"GCash":m==="card"?"Card":"Cash"}';
const accessHelper = `
  const cashierSidebarPages=new Set(["pos","transactions","customers","cashier-shift","attendance"]);
  const canAccessPage=key=>{
    const normalized=String(key||"").toLowerCase();
    if(isOwner||isTenantSuperAdmin)return true;
    if(role==="cashier")return cashierSidebarPages.has(normalized);
    return hasPermission(normalized+".view")||hasPermission(normalized+".use")||hasPermission(normalized+".manage");
  };
`;
if (main.includes(helperAnchor) && !main.includes("const cashierSidebarPages")) main=main.replace(helperAnchor,helperAnchor+accessHelper);

const filterNeedle='.filter(x=>x[3]).map(([key,icon,label])=>';
const filterReplacement='.filter(x=>x[3]&&canAccessPage(x[0])).map(([key,icon,label])=>';
if (main.includes(filterNeedle) && !main.includes('canAccessPage(x[0])')) main=main.replace(filterNeedle,filterReplacement);

if (!main.includes("const cashierSidebarPages")) throw new Error("Role sidebar access helper was not inserted safely.");
if (!main.includes(".filter(x=>x[3]&&canAccessPage(x[0]))")) throw new Error("Role sidebar filter was not inserted safely.");

fs.writeFileSync(mainPath,main);
console.log("Applied SMALLBIZ_FINAL_ROLE_SIDEBAR_ACCESS_V1: owner/tenant super-admin full sidebar; cashier limited to POS, Transactions, Customers, Cashier Shift and Employee/Attendance; mobile CSS/layout untouched.");
