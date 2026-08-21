import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

if (!text.includes("const lastBarcodeScanRef=useRef")) {
  text = text.replace(
    'import React, { useEffect, useMemo, useState } from "react";',
    'import React, { useEffect, useMemo, useRef, useState } from "react";'
  );
  text = text.replace(
    'const [recentScanned,setRecentScanned]=useState([]);',
    'const [recentScanned,setRecentScanned]=useState([]);\n  const lastBarcodeScanRef=useRef({code:"",at:0});\n  const scanAudioRef=useRef(null);'
  );
} else if (!text.includes("const scanAudioRef=useRef")) {
  text=text.replace('const lastBarcodeScanRef=useRef({code:"",at:0});','const lastBarcodeScanRef=useRef({code:"",at:0});\n  const scanAudioRef=useRef(null);');
}

const scannerPattern = /  useEffect\(\(\)=>\{\n    if\(!scan\)return;\n    const reader=document\.getElementById\("reader"\); if\(!reader\)return;\n    const scanner=new Html5Qrcode\("reader"\);\n    [\s\S]*?  \},\[scan,products\]\);/;

const newScanner = `  const prepareScanAudio=()=>{\n    try{\n      const AudioCtx=window.AudioContext||window.webkitAudioContext;\n      if(!AudioCtx)return;\n      if(!scanAudioRef.current)scanAudioRef.current=new AudioCtx();\n      if(scanAudioRef.current.state==="suspended")scanAudioRef.current.resume().catch(()=>{});\n    }catch{}\n  };\n  const beep=()=>{\n    try{\n      const ctx=scanAudioRef.current;\n      if(!ctx)return;\n      if(ctx.state==="suspended")ctx.resume().catch(()=>{});\n      const osc=ctx.createOscillator(),gain=ctx.createGain();\n      osc.type="sine";osc.frequency.value=1050;\n      gain.gain.setValueAtTime(0.07,ctx.currentTime);\n      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.10);\n      osc.connect(gain);gain.connect(ctx.destination);\n      osc.start();osc.stop(ctx.currentTime+0.10);\n    }catch{}\n  };\n\n  useEffect(()=>{\n    if(!scan)return;\n    prepareScanAudio();\n    const reader=document.getElementById("reader"); if(!reader)return;\n    const scanner=new Html5Qrcode("reader");\n    let stopped=false;\n    scanner.start({facingMode:"environment"},{fps:5,qrbox:{width:280,height:120}},code=>{\n      const normalized=String(code||"").trim();\n      if(!normalized||stopped)return;\n      const now=Date.now();\n      const last=lastBarcodeScanRef.current;\n      if(last.code===normalized && now-last.at<1500)return;\n      lastBarcodeScanRef.current={code:normalized,at:now};\n      const p=products.find(x=>String(x.barcode||"").trim()===normalized);\n      if(p){handleScannedProduct(p);setSearch(p.barcode);setStatus("Scanned: "+p.name);beep()}\n      else{setStatus("Barcode not found: "+normalized);setSearch(normalized)}\n    },()=>{}).catch(e=>{if(!stopped)setStatus("Camera error: "+e)});\n    return()=>{stopped=true;scanner.stop().then(()=>scanner.clear()).catch(()=>{})}\n  },[scan,products]);`;

if (!scannerPattern.test(text)) throw new Error("POS scanner block not found; build stopped safely.");
text = text.replace(scannerPattern, newScanner);

const scanButtonOld='onClick={()=>{setScan(!scan);setStatus("")}}';
const scanButtonNew='onClick={()=>{prepareScanAudio();setScan(!scan);setStatus("")}}';
if(text.includes(scanButtonOld))text=text.replace(scanButtonOld,scanButtonNew);

if (!text.includes('id="smallbiz-floating-cart"')) {
  const marker = '  return <div className="app-shell">';
  const floating = `  return <div className="app-shell">\n    {activePage==="pos"&&<FloatingCart cart={cart} total={total} onOpen={()=>document.querySelector(".right-panel")?.scrollIntoView({behavior:"smooth",block:"start"})} />}`;
  if (!text.includes(marker)) throw new Error("POS app shell marker not found; build stopped safely.");
  const component = `\nfunction FloatingCart({cart,total,onOpen}){\n  const [pos,setPos]=useState({x:0,y:0});\n  const drag=useRef(null);\n  const moved=useRef(false);\n  const start=e=>{\n    const p=e.touches?.[0]||e;\n    moved.current=false;\n    drag.current={sx:p.clientX,sy:p.clientY,ox:pos.x,oy:pos.y};\n    window.addEventListener("pointermove",move);\n    window.addEventListener("pointerup",end,{once:true});\n  };\n  const move=e=>{\n    if(!drag.current)return;\n    if(Math.abs(e.clientX-drag.current.sx)>4||Math.abs(e.clientY-drag.current.sy)>4)moved.current=true;\n    setPos({x:drag.current.ox+e.clientX-drag.current.sx,y:drag.current.oy+e.clientY-drag.current.sy});\n  };\n  const end=()=>{drag.current=null;window.removeEventListener("pointermove",move)};\n  return <div id="smallbiz-floating-cart" style={{position:"fixed",right:16,bottom:"calc(18px + env(safe-area-inset-bottom))",zIndex:99999,transform:\`translate(\${pos.x}px,\${pos.y}px)\`,touchAction:"none"}}>\n    <button type="button" onPointerDown={start} onClick={()=>{if(!moved.current)onOpen()}} aria-label="Open shopping cart" style={{border:0,borderRadius:18,padding:"12px 16px",background:"#111827",color:"white",boxShadow:"0 10px 28px rgba(0,0,0,.25)",display:"flex",alignItems:"center",gap:9,fontWeight:800,fontSize:14,cursor:"grab",whiteSpace:"nowrap"}}>\n      <span style={{fontSize:20}}>🛒</span><span>{cart.reduce((n,i)=>n+Number(i.qty||0),0)} item(s)</span><span>•</span><span>{money(total)}</span>\n    </button>\n  </div>;\n}\n`;
  text = text.replace(marker, component + "\n" + floating);
}

fs.writeFileSync(path, text);
console.log("Applied POS stability: authenticated-safe barcode debounce + user-gesture beep + POS-only draggable floating cart.");