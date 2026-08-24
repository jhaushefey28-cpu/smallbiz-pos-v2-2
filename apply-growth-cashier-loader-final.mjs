import fs from "node:fs";

/* Final build-stage recovery. The generated V26 loader is preserved, but its
 * owner/admin visibility must not depend on an async permission query finishing. */
const ownerPath="owner-modules-loader.jsx";
if(!fs.existsSync(ownerPath))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
let owner=fs.readFileSync(ownerPath,"utf8");
if(!owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V26_SAFE")){
  throw new Error("Unsafe/old owner loader detected; refusing sidebar mutation.");
}
const oldPermission='const hasPermission=code=>typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code);';
const newPermission='const hasPermission=code=>{if(typeof window.__smallbizIsOwner==="boolean"&&window.__smallbizIsOwner)return true;return typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code)};';
if(owner.includes(oldPermission))owner=owner.replace(oldPermission,newPermission);
const oldReady='if(!root||!window.__smallbizPermissionsReady)return false;';
if(owner.includes(oldReady))owner=owner.replace(oldReady,'if(!root)return false;');
fs.writeFileSync(ownerPath,owner,"utf8");

/* Expose the authenticated owner/admin role to the non-destructive loader. */
const mainPath="main.jsx";
let main=fs.readFileSync(mainPath,"utf8");
const ownerAnchor='window.__smallbizPermissionsReady=permissionsReady;';
const ownerBridge='window.__smallbizIsOwner=Boolean(profile&&["owner","admin","super_admin"].includes(String(profile.role||"").toLowerCase()))||isTenantSuperAdmin;\n    '+ownerAnchor;
if(main.includes(ownerAnchor)&&!main.includes('window.__smallbizIsOwner='))main=main.replace(ownerAnchor,ownerBridge);
if(!main.includes('window.__smallbizIsOwner='))throw new Error("Owner role bridge insertion failed; build stopped safely.");
fs.writeFileSync(mainPath,main,"utf8");

console.log("Applied final owner sidebar recovery: all owner/admin modules preserved; Growth/Cashier remain direct-open; existing sidebar items are never removed.");
