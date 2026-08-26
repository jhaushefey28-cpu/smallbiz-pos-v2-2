import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");

const reactImport='import React, { useEffect, useMemo, useRef, useState } from "react";';
const withLoader=reactImport+'\nimport { startOwnerModules } from "./owner-modules-loader.jsx";';
if(text.includes(reactImport)&&!text.includes('from "./owner-modules-loader.jsx"')) text=text.replace(reactImport,withLoader);

const anchor='  useEffect(()=>{if(session?.user)load(session.user.id)},[session]);';
const addition=anchor+'\n  useEffect(()=>{\n    if(!session?.user||!profile?.business_id)return;\n    const role=String(profile?.role||"").toLowerCase();\n    const ownerReady=role==="owner"||role==="admin"||role==="super_admin";\n    window.__smallbizIsOwner=ownerReady;\n    window.__smallbizPermissionsReady=Boolean(profile?.business_id);\n    if(ownerReady){\n      window.dispatchEvent(new CustomEvent("smallbiz:permissions-ready"));\n      startOwnerModules();\n    }\n  },[session?.user?.id,profile?.business_id,profile?.role]);';
if(text.includes(anchor)&&!text.includes('window.__smallbizIsOwner=ownerReady')) text=text.replace(anchor,addition);

if(!text.includes('window.__smallbizIsOwner=ownerReady')) throw new Error("Owner role-ready initialization insertion failed; build stopped safely.");
if(!text.includes('startOwnerModules')) throw new Error("Owner module loader insertion failed; build stopped safely.");
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_OWNER_MODULES_ROLE_READY_V1: owner state is established before the V31 sidebar loader starts.");