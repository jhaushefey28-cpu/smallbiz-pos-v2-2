import fs from "node:fs";

const mainPath = "main.jsx";
let main = fs.readFileSync(mainPath, "utf8");

const cssNeedle = 'import "./sidebar-fix.css";';
const cssImport = `${cssNeedle}\nimport "./mobile-final-layout.css";`;
if (!main.includes('import "./mobile-final-layout.css";')) {
  if (main.includes(cssNeedle)) main = main.replace(cssNeedle, cssImport);
  else if (main.includes('import "./styles.css";')) main = main.replace('import "./styles.css";', 'import "./styles.css";\nimport "./mobile-final-layout.css";');
  else throw new Error("Final mobile layout patch failed safely: CSS import anchor not found.");
}

const stateNeedle = 'const [profile,setProfile]=useState(null),[activePage,setActivePage]=useState("pos");';
if (!main.includes("mobileSidebarOpen")) {
  if (!main.includes(stateNeedle)) throw new Error("Final mobile layout patch failed safely: profile state anchor not found.");
  main = main.replace(stateNeedle, `${stateNeedle}\n  const [mobileSidebarOpen,setMobileSidebarOpen]=useState(false);`);
}

const appNeedle = 'return <div className="app-shell">\n    <aside className="sidebar">';
const appReplacement = `return <div className="app-shell">\n    <button type="button" className="mobile-sidebar-toggle" aria-label="Open navigation" onClick={()=>setMobileSidebarOpen(true)}>☰</button>\n    {mobileSidebarOpen&&<button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMobileSidebarOpen(false)} />}\n    <aside className={mobileSidebarOpen?"sidebar mobile-sidebar-open":"sidebar"}>`;
if (!main.includes('mobile-sidebar-toggle')) {
  if (!main.includes(appNeedle)) throw new Error("Final mobile layout patch failed safely: app/sidebar anchor not found.");
  main = main.replace(appNeedle, appReplacement);
}

const navNeedle = 'className={activePage===key?"nav-item active":"nav-item"} onClick=';
const navReplacement = 'className={activePage===key?"nav-item active":"nav-item"} onClickCapture={()=>setMobileSidebarOpen(false)} onClick=';
if (!main.includes('onClickCapture={()=>setMobileSidebarOpen(false)}')) {
  if (!main.includes(navNeedle)) throw new Error("Final mobile layout patch failed safely: navigation button anchor not found.");
  main = main.replace(navNeedle, navReplacement);
}

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_FINAL_MOBILE_LAYOUT_V1: off-canvas full sidebar, independent sidebar scroll, full-width POS content, mobile navigation toggle.");
