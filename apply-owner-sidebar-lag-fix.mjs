import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const ATTENDANCE="attendance-center.js";

/* V31 is the authoritative owner sidebar loader. Never regenerate or overwrite
 * the sidebar during build; the loader reconciles missing menus after React renders,
 * reuses existing buttons, removes only loader-created duplicates, and keeps one observer/start path. */
if(!fs.existsSync(OWNER))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
const owner=fs.readFileSync(OWNER,"utf8");
if(!owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V31_REACT_SAFE_SINGLE_OWNER"))throw new Error("Expected V31 React-safe owner loader; refusing to overwrite sidebar.");

if(fs.existsSync(ATTENDANCE)){
  let attendance=fs.readFileSync(ATTENDANCE,"utf8");
  const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  if(attendance.includes(old)){
    attendance=attendance.replace(old,next);
    fs.writeFileSync(ATTENDANCE,attendance,"utf8");
  }
}
console.log("Applied SMALLBIZ_OWNER_SIDEBAR_LAG_FIX_V31_SAFE: preserved the authoritative V31 sidebar loader and existing sidebar items.");