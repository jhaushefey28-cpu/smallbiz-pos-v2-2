import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");
const marker="// SMALLBIZ_OWNER_MODULES_ROLE_READY_V4";

// Import the V31 loader exactly once.
if(!text.includes('from "./owner-modules-loader.jsx"')){
  const reactImportMatch=text.match(/^import React[^;]*;\s*$/m);
  if(!reactImportMatch)throw new Error("React import not found; owner loader injection stopped safely.");
  text=text.replace(reactImportMatch[0],reactImportMatch[0]+'\nimport { startOwnerModules } from "./owner-modules-loader.jsx";');
}

// Establish owner state immediately after the profile is assigned inside load().
// This avoids depending on the formatting or shape of a separate useEffect.
if(!text.includes(marker)){
  const anchor="    setProfile(p);";
  if(!text.includes(anchor))throw new Error("Profile assignment anchor not found; owner role-ready injection stopped safely.");
  const addition=`${anchor}\n\n    ${marker}\n    {\n      const role=String(p?.role||"").toLowerCase();\n      const ownerReady=role==="owner"||role==="admin"||role==="super_admin";\n      window.__smallbizIsOwner=ownerReady;\n      window.__smallbizPermissionsReady=Boolean(p?.business_id);\n      if(ownerReady){\n        window.dispatchEvent(new CustomEvent("smallbiz:permissions-ready"));\n        startOwnerModules();\n      }\n    }`;
  text=text.replace(anchor,addition);
}

if(!text.includes('from "./owner-modules-loader.jsx"'))throw new Error("Owner module loader import insertion failed; build stopped safely.");
if(!text.includes(marker))throw new Error("Owner role-ready initialization insertion failed; build stopped safely.");
if(!text.includes('window.__smallbizIsOwner=ownerReady'))throw new Error("Owner state initialization missing; build stopped safely.");
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_OWNER_MODULES_ROLE_READY_V4: owner state is established directly from the loaded profile before V31 sidebar startup, with idempotent injection.");