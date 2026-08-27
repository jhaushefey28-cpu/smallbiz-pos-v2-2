import fs from "node:fs";

const modules=[
  ["sales-channels.jsx","smallbiz:open-channels"],
  ["marketplace-connections.jsx","smallbiz:open-marketplace-connections"],
  ["marketplace-stock-reservation.jsx","smallbiz:open-marketplace-stock"],
  ["marketplace-fulfillment.jsx","smallbiz:open-marketplace-fulfillment"],
  ["order-management.jsx","smallbiz:open-order-management"],
  ["product-channel-mapping.jsx","smallbiz:open-channel-mapping"],
  ["business-controls.jsx","smallbiz:open-business-controls"]
];

for(const [path,eventName] of modules){
  if(!fs.existsSync(path))throw new Error(`${path} is missing; refusing module repair.`);
  let text=fs.readFileSync(path,"utf8");
  const stateNeedle=",[open,setOpen]=useState(false)";
  if(text.includes(stateNeedle)&&!text.includes(`__smallbizPendingModuleOpen?.[\"${eventName}\"]`)){
    const stateReplacement=`,[open,setOpen]=useState(()=>{const p=window.__smallbizPendingModuleOpen;const v=Boolean(p?.[\"${eventName}\"]);if(v)delete p[\"${eventName}\"];return v})`;
    text=text.replace(stateNeedle,stateReplacement);
  }

  const sidebarEffect=/useEffect\(\(\)=>\{if\(!profile[^]*?const id=\"[^\"]+\";[^]*?\},\[profile[^\]]*\]\);/;
  if(sidebarEffect.test(text)){
    text=text.replace(sidebarEffect,`useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener("${eventName}",handler);return()=>window.removeEventListener("${eventName}",handler)},[]);`);
  }else if(!text.includes(`window.addEventListener(\"${eventName}\",handler)`)){
    throw new Error(`Sidebar injection effect not found in ${path}; refusing unsafe rewrite.`);
  }

  fs.writeFileSync(path,text,"utf8");
}

const teamPath="team-management.js";
if(!fs.existsSync(teamPath))throw new Error("team-management.js is missing; refusing team repair.");
let team=fs.readFileSync(teamPath,"utf8");
if(!team.includes('window.addEventListener("smallbiz:open-team",openTeam)')){
  const anchor='window.__smallbizOpenTeam=openTeam;';
  if(!team.includes(anchor))throw new Error("Team open function anchor not found; refusing unsafe rewrite.");
  team=team.replace(anchor,anchor+'\nwindow.addEventListener("smallbiz:open-team",openTeam);');
}
fs.writeFileSync(teamPath,team,"utf8");
console.log("Applied SMALLBIZ_EXTERNAL_MODULE_SINGLE_MOUNT_V1: external modules no longer inject sidebar buttons; React sidebar remains the only visible navigation owner.");
