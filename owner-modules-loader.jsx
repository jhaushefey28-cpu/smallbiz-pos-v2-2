// SMALLBIZ_OWNER_MODULES_LOADER_V43_REACT_ONLY
// React owns the complete visible sidebar. This module must never create,
// remove, observe, rebind, or otherwise mutate sidebar DOM nodes.
// Runtime modules are opened by main.jsx through explicit React handlers.
import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";

const SUPPORT_MODULES=[
  ()=>import("./reprint-modal-fix.js"),
  ()=>import("./void-reason-enhancement.js"),
  ()=>import("./transaction-audit-enhancement.js")
];

const GLOBAL_KEY="__smallbizOwnerModulesLoader";
const LOADER_VERSION="v43";

export function startOwnerModules(){
  const state=window[GLOBAL_KEY]||{};
  if(state.supportStarted)return;
  window[GLOBAL_KEY]={...state,supportStarted:true,loaderVersion:LOADER_VERSION};
  setTimeout(async()=>{
    for(const load of SUPPORT_MODULES){
      try{await load()}catch(error){console.warn("[SmallBiz] Optional POS enhancement failed",error)}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  },0);
}

console.info("[SmallBiz] Owner modules loader V43: React-only sidebar mode active; no sidebar DOM observer or mutation.");
