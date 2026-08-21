import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");

const reactImport='import React, { useEffect, useMemo, useRef, useState } from "react";';
const withLoader=reactImport+'\nimport { startOwnerModules } from "./owner-modules-loader.jsx";';
if(text.includes(reactImport)&&!text.includes('from "./owner-modules-loader.jsx"')) text=text.replace(reactImport,withLoader);

const anchor='  useEffect(()=>{if(session?.user)load(session.user.id)},[session]);';
const addition=anchor+'\n  useEffect(()=>{\n    if(session?.user&&profile?.business_id) startOwnerModules();\n  },[session?.user?.id,profile?.business_id]);';
if(text.includes(anchor)&&!text.includes('startOwnerModules();')) text=text.replace(anchor,addition);

if(!text.includes('startOwnerModules')) throw new Error("Owner module loader insertion failed; build stopped safely.");
fs.writeFileSync(path,text);
console.log("Applied Vite-native authenticated Owner module loader.");
