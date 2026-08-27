import fs from "node:fs";

const mainPath="main.jsx";
let main=fs.readFileSync(mainPath,"utf8");

if(!main.includes("window.__SMALLBIZ_REACT_SIDEBAR_OWNER__=true")){
  const anchor='const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);';
  if(!main.includes(anchor))throw new Error("Supabase anchor not found; refusing sidebar isolation rewrite.");
  main=main.replace(anchor,anchor+'\nwindow.__SMALLBIZ_REACT_SIDEBAR_OWNER__=true;');
}

main=main.replace('["inventory","📦","Inventory",canManageInventory]','["inventory","📦","Product & Inventory",canManageInventory]');

const routes=[
  ["channels","smallbiz:open-channels"],
  ["marketplace-connections","smallbiz:open-marketplace-connections"],
  ["marketplace-stock","smallbiz:open-marketplace-stock"],
  ["marketplace-fulfillment","smallbiz:open-marketplace-fulfillment"],
  ["order-management","smallbiz:open-order-management"],
  ["channel-mapping","smallbiz:open-channel-mapping"],
  ["business-controls","smallbiz:open-business-controls"]
];

if(!main.includes("function requestSidebarModuleOpen")){
  const anchor="  const externalSidebarOpen={";
  if(!main.includes(anchor))throw new Error("External sidebar route map not found; refusing rewrite.");
  main=main.replace(anchor,'  function requestSidebarModuleOpen(eventName){const pending=window.__smallbizPendingModuleOpen||(window.__smallbizPendingModuleOpen={});pending[eventName]=true;}\n\n'+anchor);
}

for(const [key,eventName] of routes){
  const pattern=new RegExp(`\\\"${key}\\\":async\\(\\)=>\\{(?!requestSidebarModuleOpen\\()await import`);
  if(pattern.test(main))main=main.replace(pattern,`"${key}":async()=>{requestSidebarModuleOpen("${eventName}");await import`);
}

if(!main.includes("requestSidebarModuleOpen(\"smallbiz:open-channels\")"))throw new Error("Sidebar module routing was not inserted.");
if(!main.includes("window.__SMALLBIZ_REACT_SIDEBAR_OWNER__=true"))throw new Error("React sidebar ownership flag missing.");

fs.writeFileSync(mainPath,main,"utf8");

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
  if(!fs.existsSync(path))throw new Error(`${path} is missing; refusing module isolation.`);
  let text=fs.readFileSync(path,"utf8");
  const stateNeedle=",[open,setOpen]=useState(false)";
  if(text.includes(stateNeedle)&&!text.includes(`__smallbizPendingModuleOpen?.[\"${eventName}\"]`)){
    const replacement=`,[open,setOpen]=useState(()=>{const p=window.__smallbizPendingModuleOpen;const v=Boolean(p?.[\"${eventName}\"]);if(v)delete p[\"${eventName}\"];return v})`;
    text=text.replace(stateNeedle,replacement);
  }

  const sidebarEffect=/useEffect\(\(\)=>\{if\(!profile[^]*?const (?:id|rootId)=\"[^\"]+\";[^]*?\},\[profile[^\]]*\]\);/;
  if(sidebarEffect.test(text)){
    text=text.replace(sidebarEffect,`useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener("${eventName}",handler);return()=>window.removeEventListener("${eventName}",handler)},[]);`);
  }else if(!text.includes(`window.addEventListener(\"${eventName}\",handler)`)){
    throw new Error(`Sidebar injection effect not found in ${path}; refusing unsafe rewrite.`);
  }
  fs.writeFileSync(path,text,"utf8");
}

const teamPath="team-management.js";
if(!fs.existsSync(teamPath))throw new Error("team-management.js is missing; refusing team isolation.");
let team=fs.readFileSync(teamPath,"utf8");
if(!team.includes('window.addEventListener("smallbiz:open-team",openTeam)')){
  const anchor='window.__smallbizOpenTeam=openTeam;';
  if(!team.includes(anchor))throw new Error("Team open function anchor not found; refusing unsafe rewrite.");
  team=team.replace(anchor,anchor+'\nwindow.addEventListener("smallbiz:open-team",openTeam);');
}
fs.writeFileSync(teamPath,team,"utf8");

console.log("Applied SMALLBIZ_SIDEBAR_ROUTING_AND_MODULE_ISOLATION_V2: Product & Inventory label, React-only visible sidebar, pending module routing, and no external sidebar injection.");
