import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");

const marker="// SMALLBIZ_OWNER_MODULES_ROLE_READY_V3";

// Inject the V31 loader import regardless of the current React import shape.
if(!text.includes('from "./owner-modules-loader.jsx"')){
  const reactImportMatch=text.match(/^import React[^;]*;\s*$/m);
  if(!reactImportMatch)throw new Error("React import not found; owner loader injection stopped safely.");
  text=text.replace(reactImportMatch[0],reactImportMatch[0]+'\nimport { startOwnerModules } from "./owner-modules-loader.jsx";');
}

// The role-ready effect is inserted after the existing profile-loading effect.
// Do not depend on exact whitespace: build-time formatting changes must not break deployment.
if(!text.includes(marker)){
  const anchorRe=/\n\s*useEffect\(\(\)=>\{if\(session\?\.user\)load\(session\.user\.id\)\},\[session\]\);/;
  const match=text.match(anchorRe);
  if(!match)throw new Error("Session/profile load effect not found; owner role-ready injection stopped safely.");
  const anchor=match[0];
  const addition=anchor+`\n  ${marker}\n  useEffect(()=>{\n    if(!session?.user||!profile?.business_id)return;\n    const role=String(profile?.role||"").toLowerCase();\n    const ownerReady=role==="owner"||role==="admin"||role==="super_admin";\n    window.__smallbizIsOwner=ownerReady;\n    window.__smallbizPermissionsReady=Boolean(profile?.business_id);\n    if(ownerReady){\n      window.dispatchEvent(new CustomEvent("smallbiz:permissions-ready"));\n      startOwnerModules();\n    }\n  },[session?.user?.id,profile?.business_id,profile?.role]);`;
  text=text.replace(anchor,addition);
}

if(!text.includes('from "./owner-modules-loader.jsx"'))throw new Error("Owner module loader import insertion failed; build stopped safely.");
if(!text.includes(marker))throw new Error("Owner role-ready initialization insertion failed; build stopped safely.");
if(!text.includes('window.__smallbizIsOwner=ownerReady'))throw new Error("Owner state initialization missing; build stopped safely.");
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_OWNER_MODULES_ROLE_READY_V3: resilient idempotent owner-state initialization before the V31 sidebar loader.");