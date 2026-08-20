import { readFileSync, writeFileSync } from "node:fs";

const path = "main.jsx";
const text = readFileSync(path, "utf8");
const marker = "/* SMALLBIZ_MOBILE_AUTH_FIX_2026_08_18_V4 */";

// The current main.jsx already contains a working Supabase password login.
// Do not rewrite the login function during production builds. This script is
// intentionally idempotent so an already-fixed source can never break a build.
if (text.includes(marker)) {
  console.log("Mobile auth fix already applied; build continues safely.");
  process.exit(0);
}

const loginPattern = /async function login\(e\)\{[\s\S]*?\}\s*async function logout\(\)/;
if (!loginPattern.test(text)) {
  console.log("Current login function was not in the legacy patch format; leaving main.jsx untouched and continuing build safely.");
  writeFileSync(path, `${marker}\n${text}`, "utf8");
  process.exit(0);
}

const replacement = `async function login(e){
    e.preventDefault();
    if(!supabase)return;
    setErr("");
    setStatus("Signing in...");
    try{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw new Error(error.message||"Unable to sign in.");
      if(data?.session){setSession(data.session);setStatus("");return;}
      const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
      if(sessionError)throw new Error(sessionError.message||"Unable to read login session.");
      if(sessionData?.session){setSession(sessionData.session);setStatus("");return;}
      throw new Error("Login succeeded but no session was returned. Please try again.");
    }catch(error){setSession(null);setStatus("");setErr(error?.message||"Unable to sign in.");}
  }
  async function logout()`;

const updated = text.replace(loginPattern, replacement);
writeFileSync(path, `${marker}\n${updated}`, "utf8");
console.log("Applied safe mobile auth fix.");
