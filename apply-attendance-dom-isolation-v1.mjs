import fs from "node:fs";

const path="attendance-center.js";
if(!fs.existsSync(path))throw new Error("attendance-center.js is missing; refusing attendance repair.");
let text=fs.readFileSync(path,"utf8");

const addNavPattern=/function addNav\(\)\{[\s\S]*?\}\n  function boot/;
if(addNavPattern.test(text)){
  text=text.replace(addNavPattern,"function addNav(){return false}\n  function boot");
}

const bootPattern=/function boot\(\)\{const s=document\.createElement\('script'\);s\.src='https:\/\/cdn\.jsdelivr\.net\/npm\/@vladmandic\/face-api\/dist\/face-api\.js';s\.onload=\(\)=>setTimeout\(addNav,300\);s\.onerror=\(\)=>console\.error\('Face recognition library failed to load'\);document\.head\.appendChild\(s\);const observer=new MutationObserver\(\(\)=>addNav\(\)\);observer\.observe\(document\.body,\{childList:true,subtree:true\}\);addNav\(\);let attempts=0;const timer=setInterval\(\(\)=>\{addNav\(\);if\(\+\+attempts>240\)clearInterval\(timer\)\},250\)\}/;
if(bootPattern.test(text)){
  text=text.replace(bootPattern,"function boot(){if(window.faceapi)return;const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';s.onload=()=>console.info('[SmallBiz] Face recognition library ready.');s.onerror=()=>console.error('Face recognition library failed to load');document.head.appendChild(s)}");
}else if(!text.includes("Face recognition library ready.")){
  throw new Error("Attendance boot block not found; refusing unsafe repair.");
}

if(text.includes("nav.insertBefore(b,bottom)"))throw new Error("Unsafe attendance insertBefore call still exists.");
if(text.includes("new MutationObserver(()=>addNav())"))throw new Error("Attendance sidebar MutationObserver still exists.");
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_ATTENDANCE_DOM_ISOLATION_V1: attendance module no longer mutates React sidebar DOM; insertBefore failure and duplicate attendance nav removed.");
