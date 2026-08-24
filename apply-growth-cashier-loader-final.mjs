import fs from "node:fs";

/* Final build-stage recovery. Never mutate/remove existing sidebar items.
 * Accept the current safe V26/V27 owner loader variants produced by the
 * preceding build steps; this script only adjusts owner visibility readiness. */
const ownerPath="owner-modules-loader.jsx";
if(!fs.existsSync(ownerPath))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
let owner=fs.readFileSync(ownerPath,"utf8");
const safeLoader=owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V26_SAFE")||owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V27_SAFE")||owner.includes("OWNER_MODULES_LOADER_V26_SAFE")||owner.includes("OWNER_MODULES_LOADER_V27_SAFE");
if(!safeLoader){
  console.warn("[SmallBiz] Owner loader marker not recognized; leaving generated loader untouched.");
  console.warn("[SmallBiz] No sidebar mutation performed by final recovery stage.");
  process.exit(0);
}
const oldPermission='const hasPermission=code=>typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code);';
const newPermission='const hasPermission=code=>{if(typeof window.__smallbizIsOwner==="boolean"&&window.__smallbizIsOwner)return true;return typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code)};';
if(owner.includes(oldPermission))owner=owner.replace(oldPermission,newPermission);
const oldReady='if(!root||!window.__smallbizPermissionsReady)return false;';
if(owner.includes(oldReady))owner=owner.replace(oldReady,'if(!root)return false;');
fs.writeFileSync(ownerPath,owner,"utf8");

/* Expose authenticated owner/admin role to the non-destructive loader. */
const mainPath="main.jsx";
let main=fs.readFileSync(mainPath,"utf8");
const ownerAnchor='window.__smallbizPermissionsReady=permissionsReady;';
const ownerBridge='window.__smallbizIsOwner=Boolean(profile&&["owner","admin","super_admin"].includes(String(profile.role||"").toLowerCase()))||isTenantSuperAdmin;\n    '+ownerAnchor;
if(main.includes(ownerAnchor)&&!main.includes('window.__smallbizIsOwner='))main=main.replace(ownerAnchor,ownerBridge);
if(!main.includes('window.__smallbizIsOwner=')){
  console.warn("[SmallBiz] Owner role bridge anchor not found; leaving main.jsx unchanged.");
}else{
  fs.writeFileSync(mainPath,main,"utf8");
}

console.log("Applied final owner sidebar recovery: existing sidebar items are preserved; Growth/Cashier remain direct-open; no destructive sidebar mutation performed.");
