import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const INDEX = "index.html";
const MAIN = "main.jsx";
const marker = "SMALLBIZ_AUTH_SINGLETON_2026_08_20_V2";

// 1) Keep the core React entrypoint in index.html.
// The previous build patch removed /main.jsx and only restored it when
// /auth-recovery.js existed. That made the production build a blank shell
// after auth-recovery.js was intentionally removed. Main must never be
// removed from the document.
let index = readFileSync(INDEX, "utf8");
const mainTag = index.match(/<script type="module" src="\/main\.jsx[^>]*><\/script>/)?.[0];
if (!mainTag) {
  const mainWithQuery = '<script type="module" src="/main.jsx?v=20260820-auth-core-1"></script>';
  const root = '<div id="root"></div>';
  if (!index.includes("/main.jsx")) {
    if (index.includes(root)) index = index.replace(root, `${root}${mainWithQuery}`);
    else if (index.includes("</body>")) index = index.replace("</body>", `${mainWithQuery}</body>`);
    else throw new Error("main.jsx entrypoint is missing and could not be restored safely.");
  }
}
writeFileSync(INDEX, index, "utf8");

// 2) Expose the main app's Supabase client globally and make tenant loading idempotent.
let main = readFileSync(MAIN, "utf8");
if (!main.includes(marker)) {
  main = main.replace(
    'const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);',
    'const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);\nif(supabase && !window.__SMALLBIZ_SUPABASE__) window.__SMALLBIZ_SUPABASE__=supabase;'
  );
  main = main.replace('function App(){', `let __smallbizLoadedUserId="";\n\nfunction App(){`);
  main = main.replace(
    'useEffect(()=>{if(session?.user)load(session.user.id)},[session]);',
    'useEffect(()=>{const uid=session?.user?.id;if(uid)load(uid)},[session?.user?.id]);'
  );
  main = main.replace(
    'async function load(uid){\n    if(!supabase)return;',
    'async function load(uid){\n    if(!supabase||!uid)return;\n    if(__smallbizLoadedUserId===uid)return;\n    __smallbizLoadedUserId=uid;'
  );
  main = main.replace(
    'async function logout(){\n    await supabase?.auth.signOut();',
    'async function logout(){\n    __smallbizLoadedUserId="";\n    await supabase?.auth.signOut();'
  );
  main = `/* ${marker} */\n${main}`;
  writeFileSync(MAIN, main, "utf8");
}

// 3) Reuse the main auth client in every browser module that creates another client.
const files = readdirSync(".").filter(name => /\.(js|jsx)$/.test(name) && !name.startsWith("apply-auth-singleton-fix"));
for (const file of files) {
  if (file === MAIN) continue;
  let text = readFileSync(file, "utf8");
  const before = text;

  text = text.replace(/const\s+(sb|supabase)\s*=\s*([^;\n]*createClient\([^;\n]*\));/g,
    'const $1 = window.__SMALLBIZ_SUPABASE__ || ($2);');

  text = text.replace(/sb=mod\.createClient\(SUPABASE_URL,SUPABASE_KEY\);/g,
    'sb=window.__SMALLBIZ_SUPABASE__ || mod.createClient(SUPABASE_URL,SUPABASE_KEY);');

  if (text !== before) writeFileSync(file, text, "utf8");
}

console.log(`Applied ${marker}: preserved React entrypoint + one browser Supabase auth client.`);
