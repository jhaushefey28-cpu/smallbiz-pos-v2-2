import fs from "node:fs";

const path="owner-modules-loader.jsx";
let text=fs.readFileSync(path,"utf8");

// Owner/admin accounts must be able to see the complete owner sidebar even if
// the async permission query has not completed yet. Cashier/other roles remain
// permission-scoped through the existing permission bridge.
const oldPermission='const hasPermission=code=>typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code);';
const newPermission='const hasPermission=code=>{if(typeof window.__smallbizIsOwner==="boolean"&&window.__smallbizIsOwner)return true;return typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code)};';
if(text.includes(oldPermission))text=text.replace(oldPermission,newPermission);
else if(!text.includes('window.__smallbizIsOwner'))throw new Error("Owner permission bridge anchor not found; refusing unsafe sidebar patch.");

const oldReady='if(!root||!window.__smallbizPermissionsReady)return false;';
const newReady='if(!root)return false;';
if(text.includes(oldReady))text=text.replace(oldReady,newReady);

fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_SIDEBAR_RECOVERY_FINAL_V1: owner/admin sidebar restored without removing existing menus.");
