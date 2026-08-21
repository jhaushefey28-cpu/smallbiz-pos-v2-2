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
    'const [recentScanned,setRecentScanned]=useState([]);\n  const lastBarcodeScanRef=useRef({code:"",at:0});'
  );
}

const scannerPattern = /  useEffect\(\(\)=>\{\n    if\(!scan\)return;\n    const reader=document\.getElementById\("reader"\); if\(!reader\)return;\n    const scanner=new Html5Qrcode\("reader"\);\n    scanner\.start\(\{facingMode:"environment"\},\{fps:10,qrbox:\{width:280,height:120\}\},code=>\{[\s\S]*?    return\(\)=>\{scanner\.stop\(\)\.then\(\(\)=>scanner\.clear\(\)\)\.catch\(\(\)=>\{\}\)\}\n  \},\[scan,products\]\);/;
const newScanner = `  useEffect(()=>{
    if(!scan)return;
    const reader=document.getElementById("reader"); if(!reader)return;
    const scanner=new Html5Qrcode("reader");
    let stopped=false;
    const beep=()=>{
      try{
        const AudioCtx=window.AudioContext||window.webkitAudioContext;
        if(!AudioCtx)return;
        const ctx=new AudioCtx();
        const osc=ctx.createOscillator();
        const gain=ctx.createGain();
        osc.type="sine"; osc.frequency.value=1050;
        gain.gain.value=0.07;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime+0.09);
        osc.onended=()=>ctx.close().catch(()=>{});
      }catch{}
    };
    scanner.start({facingMode:"environment"},{fps:5,qrbox:{width:280,height:120}},code=>{
      const normalized=String(code||"").trim();
      if(!normalized||stopped)return;
      const now=Date.now();
      const last=lastBarcodeScanRef.current;
      if(last.code===normalized && now-last.at<1500)return;
      lastBarcodeScanRef.current={code:normalized,at:now};
      const p=products.find(x=>String(x.barcode||"").trim()===normalized);
      if(p){
        handleScannedProduct(p);
        setSearch(p.barcode);
        setStatus("Scanned: "+p.name);
        beep();
      }else{
        setStatus("Barcode not found: "+normalized);
        setSearch(normalized);
      }
    },()=>{}).catch(e=>{if(!stopped)setStatus("Camera error: "+e)});
    return()=>{
      stopped=true;
      scanner.stop().then(()=>scanner.clear()).catch(()=>{});
    };
  },[scan,products]);`;

if (text.includes('const lastBarcodeScanRef=useRef') && !text.includes('last.code===normalized && now-last.at<1500')) {
  if (!scannerPattern.test(text)) throw new Error("POS scanner block not found; build stopped safely.");
  text = text.replace(scannerPattern, newScanner);
} else if (!text.includes('last.code===normalized && now-last.at<1500') && !scannerPattern.test(text)) {
  throw new Error("POS scanner block not found; build stopped safely.");
}

if (!text.includes('id="smallbiz-floating-cart"')) {
  const marker = '  return <div className="app-shell">';
  const floating = `  return <div className="app-shell">
    {activePage==="pos"&&cart.length>0&&<FloatingCart cart={cart} total={total} onOpen={()=>document.querySelector(".right-panel")?.scrollIntoView({behavior:"smooth",block:"start"})} />}`;
  if (!text.includes(marker)) throw new Error("POS app shell marker not found; build stopped safely.");
  const component = `
function FloatingCart({cart,total,onOpen}){
  const [pos,setPos]=useState({x:0,y:0});
  const drag=useRef(null);
  const moved=useRef(false);
  const start=e=>{
    const p=e.touches?.[0]||e;
    moved.current=false;
    drag.current={sx:p.clientX,sy:p.clientY,ox:pos.x,oy:pos.y};
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",end,{once:true});
  };
  const move=e=>{
    if(!drag.current)return;
    if(Math.abs(e.clientX-drag.current.sx)>4||Math.abs(e.clientY-drag.current.sy)>4)moved.current=true;
    setPos({x:drag.current.ox+e.clientX-drag.current.sx,y:drag.current.oy+e.clientY-drag.current.sy});
  };
  const end=()=>{drag.current=null;window.removeEventListener("pointermove",move)};
  return <div id="smallbiz-floating-cart" style={{position:"fixed",right:16,bottom:"calc(18px + env(safe-area-inset-bottom))",zIndex:99999,transform:\`translate(\${pos.x}px,\${pos.y}px)\`,touchAction:"none"}}>
    <button type="button" onPointerDown={start} onClick={()=>{if(!moved.current)onOpen()}} aria-label="Open shopping cart" style={{border:0,borderRadius:18,padding:"12px 16px",background:"#111827",color:"white",boxShadow:"0 10px 28px rgba(0,0,0,.25)",display:"flex",alignItems:"center",gap:9,fontWeight:800,fontSize:14,cursor:"grab",whiteSpace:"nowrap"}}>
      <span style={{fontSize:20}}>🛒</span><span>{cart.reduce((n,i)=>n+Number(i.qty||0),0)} item(s)</span><span>•</span><span>{money(total)}</span>
    </button>
  </div>;
}
`;
  text = text.replace(marker, component + "\n" + floating);
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_POS_STABILITY_2026_08_21_V3: barcode debounce + success beep + visible draggable POS-only floating cart.");
