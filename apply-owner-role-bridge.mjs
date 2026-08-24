import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");
const anchor='window.__smallbizPermissionsReady=permissionsReady;';
const replacement='window.__smallbizIsOwner=Boolean(profile&&["owner","admin","super_admin"].includes(String(profile.role||"").toLowerCase()))||isTenantSuperAdmin;\n    '+anchor;
if(text.includes(anchor)&&!text.includes('window.__smallbizIsOwner='))text=text.replace(anchor,replacement);
if(!text.includes('window.__smallbizIsOwner='))throw new Error("Owner role bridge insertion failed; refusing unsafe build.");
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_OWNER_ROLE_BRIDGE_V1.");
