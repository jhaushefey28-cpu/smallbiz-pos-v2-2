import fs from "node:fs";

const OWNER="owner-modules-loader.jsx";
const ATTENDANCE="attendance-center.js";

/* V28 is the authoritative owner sidebar loader. Never regenerate, remove,
 * hide, or deduplicate sidebar entries during the build. */
if(!fs.existsSync(OWNER))throw new Error("owner-modules-loader.jsx is missing; build stopped safely.");
const owner=fs.readFileSync(OWNER,"utf8");
if(!owner.includes("SMALLBIZ_OWNER_MODULES_LOADER_V28_SAFE"))throw new Error("Expected V28 safe owner loader; refusing to overwrite sidebar.");

if(fs.existsSync(ATTENDANCE)){
  let attendance=fs.readFileSync(ATTENDANCE,"utf8");
  const old="function ensure(){if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  const next="function ensure(){if(!sb&&window.__SMALLBIZ_SUPABASE__)sb=window.__SMALLBIZ_SUPABASE__;if(!sb&&window.supabase?.createClient)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}";
  if(attendance.includes(old)){
    attendance=attendance.replace(old,next);
    fs.writeFileSync(ATTENDANCE,attendance,"utf8");
  }
}
console.log("Applied SMALLBIZ_OWNER_SIDEBAR_LAG_FIX_V28_SAFE: preserved the authoritative V28 sidebar loader and all existing sidebar items.");
