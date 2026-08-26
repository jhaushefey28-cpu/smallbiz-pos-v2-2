import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const ATTENDANCE="attendance-center.js";

/* V34 is the authoritative owner sidebar loader. Never regenerate or overwrite
 * the sidebar during build; it reconciles existing React menus first, removes
 * only loader-created duplicates, and keeps one sidebar observer/start path. */
if(!fs.existsSync(OWNER))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
const owner=fs.readFileSync(OWNER,"utf8");
if(!owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V34_EXISTING_FIRST_NO_DUPLICATE"))throw new Error("Expected V34 existing-first owner loader; refusing to overwrite sidebar.");

if(fs.existsSync(ATTENDANCE)){
  let attendance=fs.readFileSync(ATTENDANCE,"utf8");
  const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  if(attendance.includes(old)){
    attendance=attendance.replace(old,next);
    fs.writeFileSync(ATTENDANCE,attendance,"utf8");
  }
}
console.log("Applied SMALLBIZ_OWNER_SIDEBAR_LAG_FIX_V34_SAFE: preserved the existing-first canonical sidebar loader and prevented React-owned menu removal.");