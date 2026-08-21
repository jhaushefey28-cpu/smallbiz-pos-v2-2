import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

// 1) React ref for barcode debounce. Safe/idempotent.
if (!text.includes("const lastBarcodeScanRef=useRef")) {
  text = text.replace(
    'import React, { useEffect, useMemo, useState } from "react";',
    'import React, { useEffect, useMemo, useRef, useState } from "react";'
  );
  text = text.replace(
    'const [recentScanned,setRecentScanned]=useState([]);',
    'const [recentScanned,setRecentScanned]=useState([]);\n  const lastBarcodeScanRef=useRef({code:"",at:0});'
  );
}

// 2) Replace the scanner callback with a physical/camera scan debounce and success beep.
const oldScanner = `  useEffect(()=>{\n    if(!scan)return;\n    const reader=document.getElementById("reader"); if(!reader)return;\n    const scanner=new Html5Qrcode("reader");\n    scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},code=>{\n      const p=products.find(x=>String(x.barcode)===String(code));\n      if(p){handleScannedProduct(p);setSearch(p.barcode);setStatus("Scanned: "+p.name)}\n      else{setStatus("Barcode not found: "+code);setSearch(code)}\n    },()=>{}).catch(e=>setStatus("Camera error: "+e));\n    return()=>{scanner.stop().then(()=>scanner.clear()).catch(()=>{})}\n  },[scan,products]);`;

const newScanner = `  useEffect(()=>{\n    if(!scan)return;\n    const reader=document.getElementById("reader"); if(!reader)return;\n    const scanner=new Html5Qrcode("reader");\n    let stopped=false;\n    const beep=()=>{\n      try{\n        const AudioCtx=window.AudioContext||window.webkitAudioContext;\n        if(!AudioCtx)return;\n        const ctx=new AudioCtx();\n        const osc=ctx.createOscillator();\n        const gain=ctx.createGain();\n        osc.type="sine"; osc.frequency.value=1000;\n        gain.gain.value=0.06;\n        osc.connect(gain); gain.connect(ctx.destination);\n        osc.start(); osc.stop(ctx.currentTime+0.08);\n        osc.onended=()=>ctx.close().catch(()=>{});\n      }catch{}\n    };\n    scanner.start({facingMode:"environment"},{fps:8,qrbox:{width:280,height:120}},code=>{\n      const normalized=String(code||"").trim();\n      if(!normalized||stopped)return;\n      const now=Date.now();\n      const last=lastBarcodeScanRef.current;\n      // One physical barcode scan must add only once even when the camera\n      // detects the same code repeatedly for several frames.\n      if(last.code===normalized && now-last.at<1200)return;\n      lastBarcodeScanRef.current={code:normalized,at:now};\n      const p=products.find(x=>String(x.barcode||"").trim()===normalized);\n      if(p){\n        handleScannedProduct(p);\n        setSearch(p.barcode);\n        setStatus("Scanned: "+p.name);\n        beep();\n      }else{\n        setStatus("Barcode not found: "+normalized);\n        setSearch(normalized);\n      }\n    },()=>{}).catch(e=>{if(!stopped)setStatus("Camera error: "+e)});\n    return()=>{\n      stopped=true;\n      scanner.stop().then(()=>scanner.clear()).catch(()=>{});\n    };\n  },[scan,products]);`;

if (text.includes(oldScanner)) {
  text = text.replace(oldScanner, newScanner);
} else if (!text.includes("One physical barcode scan must add only once")) {
  throw new Error("POS scanner block not found; build stopped safely.");
}

// 3) Restore a POS-only floating cart using the existing cart state. No duplicate cart state.
const marker = `  return <div className="app-shell">`;
const floating = `  return <div className="app-shell">\n    {activePage==="pos"&&cart.length>0&&<button id="smallbiz-floating-cart" type="button" onClick={()=>document.querySelector(".right-panel")?.scrollIntoView({behavior:"smooth",block:"start"})} style={{position:"fixed",right:16,bottom:"calc(18px + env(safe-area-inset-bottom))",zIndex:9999,border:0,borderRadius:18,padding:"12px 16px",background:"#111827",color:"#fff",boxShadow:"0 10px 28px rgba(0,0,0,.22)",display:"flex",alignItems:"center",gap:10,fontWeight:800,cursor:"grab",touchAction:"none"}} aria-label="Open cart">🛒 <span>{cart.reduce((n,i)=>n+i.qty,0)} item(s)</span><span>•</span><span>{money(total)}</span></button>} `;

if (!text.includes('id="smallbiz-floating-cart"')) {
  if (!text.includes(marker)) throw new Error("POS app shell marker not found; build stopped safely.");
  text = text.replace(marker, floating);
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_POS_STABILITY_2026_08_21: barcode debounce + success beep + POS-only floating cart.");
