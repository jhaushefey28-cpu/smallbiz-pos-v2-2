import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const INDEX = "index.html";
const MAIN = "main.jsx";
const marker = "SMALLBIZ_AUTH_SINGLETON_2026_08_20_V1";

function replaceOnce(text, pattern, replacement, label) {
  if (!pattern.test(text)) return text;
  return text.replace(pattern, replacement);
}

// 1) Make main.jsx the first module so it creates the single browser auth client.
let index = readFileSync(INDEX, "utf8");
const mainTag = index.match(/<script type="module" src="\/main\.jsx[^>]*><\/script>/)?.[0];
if (mainTag) {
  index = index.replace(mainTag, "");
  const moduleAnchor = '<script type="module" src="/auth-recovery.js?v=5"></script>';
  index = index.replace(moduleAnchor, `${mainTag}${moduleAnchor}`);
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
// Multiple auto-refreshing GoTrue clients sharing the same localStorage session can
// race refresh-token rotation and flood /auth/v1/token, which is especially visible on mobile.
const files = readdirSync(".").filter(name => /\.(js|jsx)$/.test(name) && !name.startsWith("apply-auth-singleton-fix"));
for (const file of files) {
  if (file === MAIN) continue;
  let text = readFileSync(file, "utf8");
  const before = text;

  // Common one-line client declarations used throughout the POS modules.
  text = text.replace(/const\s+(sb|supabase)\s*=\s*([^;\n]*createClient\([^;\n]*\));/g,
    'const $1 = window.__SMALLBIZ_SUPABASE__ || ($2);');

  // auth-recovery.js lazily creates its own client; point it at the main client instead.
  text = text.replace(/sb=mod\.createClient\(SUPABASE_URL,SUPABASE_KEY\);/g,
    'sb=window.__SMALLBIZ_SUPABASE__ || mod.createClient(SUPABASE_URL,SUPABASE_KEY);');

  if (text !== before) writeFileSync(file, text, "utf8");
}

console.log(`Applied ${marker}: one browser Supabase auth client + idempotent tenant bootstrap.`);
