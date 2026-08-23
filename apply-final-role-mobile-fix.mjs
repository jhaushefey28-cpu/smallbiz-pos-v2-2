import fs from "node:fs";

const mainPath = "main.jsx";
let main = fs.readFileSync(mainPath, "utf8");

const cssAnchor = 'import "./styles.css";';
const cssImports = `${cssAnchor}\nimport "./responsive-pos.css";\nimport "./sidebar-fix.css";`;
if (main.includes(cssAnchor) && !main.includes('import "./sidebar-fix.css";')) main = main.replace(cssAnchor, cssImports);

const profileAnchor = '<div className="profile-box">';
const profileReplacement = '<div className="profile-box" data-role={role}>';
if (main.includes(profileAnchor) && !main.includes('className="profile-box" data-role={role}')) main = main.replace(profileAnchor, profileReplacement);

const unconditionalAttendance = '["attendance","👥","Employees / Attendance",true]';
const permissionAttendance = '["attendance","👥","Employees / Attendance",hasPermission("attendance.view")]';
main = main.replace(unconditionalAttendance, permissionAttendance);

const legacyAttendanceNeedle = '["movements","🔄","Stock History",canManageInventory]]';
const legacyAttendanceReplacement = permissionAttendance + ',["movements","🔄","Stock History",hasPermission("inventory.view")]]';
if (main.includes(legacyAttendanceNeedle) && !main.includes(permissionAttendance)) main = main.replace(legacyAttendanceNeedle, legacyAttendanceReplacement);

const clickNeedle = 'onClick={()=>setActivePage(key)}';
const clickReplacement = 'onClick={()=>{if(key==="attendance"){if(typeof window.__smallbizOpenAttendance==="function")window.__smallbizOpenAttendance();else import("./attendance-center.js").then(()=>window.__smallbizOpenAttendance?.()).catch(e=>console.warn("[SmallBiz] Attendance open failed.",e));}else setActivePage(key)}}';
if (main.includes(clickNeedle) && !main.includes('key==="attendance"')) main = main.replace(clickNeedle, clickReplacement);

/* FINAL MOBILE LAYOUT: full off-canvas navigation on phones/tablets.
   Sidebar and main POS scroll independently. */
if (!main.includes('import "./mobile-final-layout.css";')) {
  const sidebarCssAnchor = 'import "./sidebar-fix.css";';
  if (main.includes(sidebarCssAnchor)) main = main.replace(sidebarCssAnchor, `${sidebarCssAnchor}\nimport "./mobile-final-layout.css";`);
  else if (main.includes(cssAnchor)) main = main.replace(cssAnchor, `${cssAnchor}\nimport "./mobile-final-layout.css";`);
  else throw new Error("Final mobile layout CSS import insertion failed safely.");
}

const stateRegex = /const \[profile,setProfile\]=useState\(null\),\[activePage,setActivePage\]=useState\("pos"\);/;
if (!main.includes("mobileSidebarOpen")) {
  if (!stateRegex.test(main)) throw new Error("Final mobile layout state insertion failed safely.");
  main = main.replace(stateRegex, match => `${match}\n  const [mobileSidebarOpen,setMobileSidebarOpen]=useState(false);`);
}

/* Earlier versions matched the entire app-shell string. That was brittle because
   other build-time patches can change whitespace/newlines. Match only the actual
   sidebar element and insert the mobile controls immediately before the sidebar. */
const sidebarRegex = /<aside\s+className=(?:"sidebar"|'sidebar')\s*>/;
if (!main.includes('mobile-sidebar-toggle')) {
  if (!sidebarRegex.test(main)) throw new Error("Final mobile layout sidebar insertion failed safely: sidebar markup anchor not found.");
  main = main.replace(sidebarRegex, '<aside className={mobileSidebarOpen?"sidebar mobile-sidebar-open":"sidebar"}>');

  const appShellRegex = /return\s+<div\s+className=(?:"app-shell"|'app-shell')\s*>/;
  const appShellReplacement = `return <div className="app-shell">\n    <button type="button" className="mobile-sidebar-toggle" aria-label="Open navigation" onClick={()=>setMobileSidebarOpen(true)}>☰</button>\n    {mobileSidebarOpen&&<button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMobileSidebarOpen(false)} />}`;
  if (!appShellRegex.test(main)) throw new Error("Final mobile layout sidebar insertion failed safely: app shell anchor not found.");
  main = main.replace(appShellRegex, appShellReplacement);
}

const navRegex = /className=\{activePage===key\?"nav-item active":"nav-item"\}\s+onClick=/;
const navReplacement = 'className={activePage===key?"nav-item active":"nav-item"} onClickCapture={()=>setMobileSidebarOpen(false)} onClick=';
if (!main.includes('onClickCapture={()=>setMobileSidebarOpen(false)}')) {
  if (!navRegex.test(main)) throw new Error("Final mobile layout navigation hook insertion failed safely.");
  main = main.replace(navRegex, navReplacement);
}

if (!main.includes('import "./mobile-final-layout.css";')) throw new Error("Final mobile layout CSS import was not inserted safely.");
if (!main.includes('className="profile-box" data-role={role}')) throw new Error("Deterministic role marker was not inserted safely.");
if (!main.includes('mobile-sidebar-toggle')) throw new Error("Mobile sidebar toggle was not inserted safely.");

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_FINAL_ROLE_MOBILE_FIX_V6: deterministic role marker + permission-gated Attendance + robust full off-canvas mobile sidebar + isolated POS scrolling.");
