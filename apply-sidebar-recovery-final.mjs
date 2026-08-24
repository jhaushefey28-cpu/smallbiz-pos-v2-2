import fs from "node:fs";

const ownerPath="owner-modules-loader.jsx";
if(!fs.existsSync(ownerPath))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
let owner=fs.readFileSync(ownerPath,"utf8");
const oldPermission='const hasPermission=code=>typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code);';
const newPermission='const hasPermission=code=>{if(typeof window.__smallbizIsOwner==="boolean"&&window.__smallbizIsOwner)return true;return typeof window.__smallbizHasPermission==="function"&&window.__smallbizHasPermission(code)};';
if(owner.includes(oldPermission))owner=owner.replace(oldPermission,newPermission);
const oldReady='if(!root||!window.__smallbizPermissionsReady)return false;';
if(owner.includes(oldReady))owner=owner.replace(oldReady,'if(!root)return false;');
fs.writeFileSync(ownerPath,owner,"utf8");

const path="main.jsx";
if(!fs.existsSync(path))throw new Error("main.jsx is missing; build stopped safely.");
let text=fs.readFileSync(path,"utf8");

/* This stage must never destroy an already-valid scanner implementation.
 * Earlier build stages may have already upgraded it, so missing historical
 * anchors are warnings rather than build failures. */
if(!text.includes('import { Html5Qrcode } from "html5-qrcode";')){
  console.warn("[SmallBiz] Html5Qrcode import anchor not found; preserving current barcode implementation.");
}else{
  if(text.includes('import React, { useEffect, useMemo, useState } from "react";'))text=text.replace('import React, { useEffect, useMemo, useState } from "react";','import React, { useEffect, useMemo, useRef, useState } from "react";');
  if(!text.includes('const scannerRef=useRef(null);')){
    const anchor='const [recentScanned,setRecentScanned]=useState([]);';
    if(text.includes(anchor))text=text.replace(anchor,anchor+'\n  const scannerRef=useRef(null);\n  const scannerStartingRef=useRef(false);');
    else console.warn("[SmallBiz] Scanner state anchor not found; preserving current scanner implementation.");
  }
  const scannerPattern=/  useEffect\(\(\)=>\{\n    if\(!scan\)return;\n    const reader=document\.getElementById\("reader"\); if\(!reader\)return;\n    const scanner=new Html5Qrcode\("reader"\);\n    scanner\.start\([\s\S]*?\n  \},\[scan,products\]\);/;
  const replacement=`  useEffect(()=>{\n    let cancelled=false;\n    if(!scan)return;\n    const start=async()=>{\n      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));\n      if(cancelled)return;\n      const reader=document.getElementById("reader");\n      if(!reader||scannerStartingRef.current)return;\n      scannerStartingRef.current=true;\n      const onScan=code=>{const normalized=String(code||"").trim();if(!normalized||cancelled)return;const p=products.find(x=>String(x.barcode||"").trim()===normalized);if(p){handleScannedProduct(p);setSearch(p.barcode);setStatus("Scanned: "+p.name)}else{setStatus("Barcode not found: "+normalized);setSearch(normalized)}};\n      try{\n        const scanner=new Html5Qrcode("reader");scannerRef.current=scanner;\n        const config={fps:8,qrbox:(w,h)=>({width:Math.max(220,Math.min(w-32,420)),height:Math.max(100,Math.min(h-32,180))}),aspectRatio:1.7777778,disableFlip:false};\n        try{await scanner.start({facingMode:{exact:"environment"}},config,onScan,()=>{})}\n        catch(first){await scanner.clear().catch(()=>{});if(cancelled)throw first;const fallback=new Html5Qrcode("reader");scannerRef.current=fallback;await fallback.start({facingMode:"environment"},config,onScan,()=>{})}\n      }catch(error){if(!cancelled)setStatus("Camera error: "+(error?.message||"Unable to open camera."))}finally{scannerStartingRef.current=false}\n    };\n    start();\n    return()=>{cancelled=true;const scanner=scannerRef.current;scannerRef.current=null;scannerStartingRef.current=false;if(scanner)scanner.stop().catch(()=>{}).finally(()=>scanner.clear().catch(()=>{}))};\n  },[scan,products]);`;
  if(scannerPattern.test(text))text=text.replace(scannerPattern,replacement);
  else console.warn("[SmallBiz] Historical scanner block not found; preserving current scanner implementation.");
}
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_SIDEBAR_RECOVERY_FINAL_V3: non-destructive owner sidebar recovery; existing barcode implementation preserved when already upgraded; mobile layout untouched.");
