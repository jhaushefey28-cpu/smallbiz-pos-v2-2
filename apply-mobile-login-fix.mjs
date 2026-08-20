import { readFileSync, writeFileSync } from "node:fs";

const path = "main.jsx";
const text = readFileSync(path, "utf8");

// Supports both the older formatted login function and the compact login
// function currently in main.jsx. The patch is intentionally limited to the
// login function so the rest of the POS source is untouched.
const pattern = /async function login\(e\)\{.*?\}\s*async function logout\(\)/s;
const replacement = `async function login(e){
    e.preventDefault();
    if(!supabase)return;
    setErr("");
    setStatus("Signing in...");
    try{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw new Error(error.message||"Unable to sign in.");
      if(data?.session){
        setSession(data.session);
        try{sessionStorage.removeItem("smallbiz-login-recovery-used")}catch(_){ }
        setStatus("");
        return;
      }
      const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
      if(sessionError)throw new Error(sessionError.message||"Unable to read login session.");
      if(sessionData?.session){
        setSession(sessionData.session);
        try{sessionStorage.removeItem("smallbiz-login-recovery-used")}catch(_){ }
        setStatus("");
        return;
      }
      throw new Error("Login succeeded but no session was returned. Please try again.");
    }catch(error){
      setSession(null);
      setStatus("");
      setErr(error?.message||"Unable to sign in.");
    }
  }
  async function logout()`;

const updated = text.replace(pattern, replacement);
if(updated === text && !text.includes("SMALLBIZ_MOBILE_AUTH_FIX_2026_08_18_V3")) {
  throw new Error("Mobile login function was not found; build stopped safely.");
}

const marker = "/* SMALLBIZ_MOBILE_AUTH_FIX_2026_08_18_V3 */";
const marked = updated.includes(marker) ? updated : `${marker}\n${updated}`;
writeFileSync(path, marked, "utf8");
console.log("Applied direct Supabase session handoff + fresh mobile auth bundle marker.");
