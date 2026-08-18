import { readFileSync, writeFileSync } from "node:fs";

const path = "main.jsx";
const text = readFileSync(path, "utf8");

const pattern = /  async function login\(e\)\{.*?\n  \}\n  async function logout\(\)/s;
const replacement = `  async function login(e){
    e.preventDefault();
    if(!supabase)return;
    setErr("");
    setStatus("");

    try{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw new Error(error.message||"Unable to sign in.");

      // Use Supabase's returned session immediately instead of relying only on
      // the asynchronous auth-state callback. This is important on mobile
      // browsers where the UI could remain stuck on "Signing in...".
      if(data?.session){
        setSession(data.session);
        try{sessionStorage.removeItem("smallbiz-login-recovery-used")}catch(_){ }
        return;
      }

      // Fallback: read the persisted session without forcing a page reload.
      const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
      if(sessionError)throw new Error(sessionError.message||"Unable to read login session.");
      if(sessionData?.session){
        setSession(sessionData.session);
        try{sessionStorage.removeItem("smallbiz-login-recovery-used")}catch(_){ }
        return;
      }

      throw new Error("Login succeeded but no session was returned. Please try again.");
    }catch(error){
      setSession(null);
      setErr(error?.message||"Unable to sign in.");
    }
  }
  async function logout()`;

const updated = text.replace(pattern, replacement);
if(updated === text) throw new Error("Mobile login function was not found; build stopped safely.");
writeFileSync(path, updated, "utf8");
console.log("Applied direct Supabase session handoff to main.jsx before Vite build.");
