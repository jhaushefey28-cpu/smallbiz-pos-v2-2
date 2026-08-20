import { readFileSync, writeFileSync } from "node:fs";

const path = "main.jsx";
const text = readFileSync(path, "utf8");

const oldLine = '  useEffect(()=>{if(session?.user)load(session.user.id)},[session]);';
const newBlock = `  // Load the tenant profile only when the authenticated USER changes.
  // Supabase can refresh/replace the session object on mobile browsers; using
  // the whole session as a dependency causes an auth/profile request loop.
  useEffect(()=>{\n    const uid=session?.user?.id;\n    if(uid)load(uid);\n  },[session?.user?.id]);`;

if (!text.includes(oldLine)) {
  throw new Error("Mobile session effect was not found; build stopped safely.");
}

const updated = text.replace(oldLine, newBlock);
writeFileSync(path, updated, "utf8");
console.log("Applied mobile session-loop fix: profile loading now depends on user id only.");
