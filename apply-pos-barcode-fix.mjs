import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

const importOld = 'import React, { useEffect, useMemo, useState } from "react";';
const importNew = 'import React, { useEffect, useMemo, useRef, useState } from "react";';
if (text.includes(importOld)) text = text.replace(importOld, importNew);

const stateOld = '  const [recentScanned,setRecentScanned]=useState([]);';
const stateNew = `  const [recentScanned,setRecentScanned]=useState([]);\n  const scanGuardRef=useRef({code:"",time:0});\n  const scanAudioRef=useRef(null);`;
if (text.includes(stateOld) && !text.includes('const scanAudioRef=useRef')) text = text.replace(stateOld, stateNew);

const audioOld = '  useEffect(()=>{\n    if(!scan)return;';
const audioNew = `  const prepareScanAudio=()=>{\n    try{\n      const Ctx=window.AudioContext||window.webkitAudioContext;\n      if(!Ctx)return;\n      if(!scanAudioRef.current)scanAudioRef.current=new Ctx();\n      if(scanAudioRef.current.state==="suspended")scanAudioRef.current.resume().catch(()=>{});\n    }catch{}\n  };\n\n  const playScanBeep=()=>{\n    try{\n      const ctx=scanAudioRef.current;\n      if(!ctx)return;\n      if(ctx.state==="suspended")ctx.resume().catch(()=>{});\n      const osc=ctx.createOscillator(),gain=ctx.createGain();\n      osc.type="sine";osc.frequency.value=1046;gain.gain.setValueAtTime(0.07,ctx.currentTime);\n      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.10);\n      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.10);\n    }catch{}\n  };\n\n  useEffect(()=>{\n    if(!scan)return;`;
if (text.includes(audioOld) && !text.includes('const prepareScanAudio')) text = text.replace(audioOld, audioNew);

const oldEffect = `  useEffect(()=>{\n    if(!scan)return;\n    const reader=document.getElementById("reader"); if(!reader)return;\n    const scanner=new Html5Qrcode("reader");\n    scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},code=>{\n      const p=products.find(x=>String(x.barcode)===String(code));\n      if(p){handleScannedProduct(p);setSearch(p.barcode);setStatus("Scanned: "+p.name)}\n      else{setStatus("Barcode not found: "+code);setSearch(code)}\n    },()=>{}).catch(e=>setStatus("Camera error: "+e));\n    return()=>{scanner.stop().then(()=>scanner.clear()).catch(()=>{})}\n  },[scan,products]);`;

const newEffect = `  useEffect(()=>{\n    if(!scan)return;\n    prepareScanAudio();\n    const reader=document.getElementById("reader"); if(!reader)return;\n    const scanner=new Html5Qrcode("reader");\n    let stopped=false;\n    scanner.start({facingMode:"environment"},{fps:6,qrbox:{width:280,height:120}},code=>{\n      const normalized=String(code||"").trim();\n      if(!normalized||stopped)return;\n      const now=Date.now();\n      const last=scanGuardRef.current;\n      if(last.code===normalized&&now-last.time<1200)return;\n      scanGuardRef.current={code:normalized,time:now};\n      const p=products.find(x=>String(x.barcode||"").trim()===normalized);\n      if(p){handleScannedProduct(p);setSearch(p.barcode);setStatus("Scanned: "+p.name);playScanBeep()}\n      else{setStatus("Barcode not found: "+normalized);setSearch(normalized)}\n    },()=>{}).catch(e=>{if(!stopped)setStatus("Camera error: "+e)});\n    return()=>{stopped=true;scanner.stop().then(()=>scanner.clear()).catch(()=>{})}\n  },[scan,products]);`;

if (text.includes(oldEffect)) text = text.replace(oldEffect, newEffect);
else if (!text.includes('scanGuardRef.current={code:normalized,time:now}')) throw new Error("POS barcode scanner block was not found; build stopped safely.");

const scanButtonOld = 'onClick={()=>{setScan(!scan);setStatus("")}}';
const scanButtonNew = 'onClick={()=>{prepareScanAudio();setScan(!scan);setStatus("")}}';
if (text.includes(scanButtonOld) && !text.includes('prepareScanAudio();setScan(!scan)')) text=text.replace(scanButtonOld,scanButtonNew);

fs.writeFileSync(path, text);
console.log("Applied POS barcode guard + user-gesture audio beep + scanner FPS protection.");
