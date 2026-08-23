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

const sidebarRegex = /<aside\s+className=(?:"sidebar"|'sidebar')\s*>/;
if (!main.includes('mobile-sidebar-toggle')) {
  if (!sidebarRegex.test(main)) throw new Error("Final mobile layout sidebar insertion failed safely: sidebar markup anchor not found.");
  main = main.replace(sidebarRegex, '<aside className={mobileSidebarOpen?"sidebar mobile-sidebar-open":"sidebar"}>');

  const appShellRegex = /return\s+<div\s+className=(?:"app-shell"|'app-shell')\s*>/;
  const appShellReplacement = `return <div className="app-shell">\n    <button type="button" className="mobile-sidebar-toggle" aria-label="Open navigation" onClick={()=>setMobileSidebarOpen(true)}>☰</button>\n    {mobileSidebarOpen&&<button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMobileSidebarOpen(false)} />}`;
  if (!appShellRegex.test(main)) throw new Error("Final mobile layout sidebar insertion failed safely: app shell anchor not found.");
  main = main.replace(appShellRegex, appShellReplacement);
}

/* Navigation must use one bubble-phase click handler. The previous onClickCapture
   closed the mobile sidebar before the navigation onClick could reliably update
   activePage, which made sidebar items appear unresponsive. Closing the drawer and
   changing the page are now one atomic UI action; no mobile CSS/layout is changed. */
const oldCapture = ' onClickCapture={()=>setMobileSidebarOpen(false)} onClick=';
if (main.includes(oldCapture)) main = main.replace(oldCapture, ' onClick=');

const currentAttendanceHandler = 'onClick={()=>{if(key==="attendance"){if(typeof window.__smallbizOpenAttendance==="function")window.__smallbizOpenAttendance();else import("./attendance-center.js").then(()=>window.__smallbizOpenAttendance?.()).catch(e=>console.warn("[SmallBiz] Attendance open failed.",e));}else setActivePage(key)}}';
const robustAttendanceHandler = 'onClick={()=>{setMobileSidebarOpen(false);if(key==="attendance"){if(typeof window.__smallbizOpenAttendance==="function")window.__smallbizOpenAttendance();else import("./attendance-center.js").then(()=>window.__smallbizOpenAttendance?.()).catch(e=>console.warn("[SmallBiz] Attendance open failed.",e));}else{setActivePage(key);window.requestAnimationFrame?.(()=>document.querySelector(".main-area")?.scrollTo({top:0,behavior:"auto"}));}}}';
if (main.includes(currentAttendanceHandler)) main = main.replace(currentAttendanceHandler, robustAttendanceHandler);

/* Safety fallback: if a future source variant still has the plain nav handler,
   make it robust without touching any layout rules. */
const plainHandler = 'onClick={()=>setActivePage(key)}';
if (main.includes(plainHandler)) main = main.replace(plainHandler, 'onClick={()=>{setMobileSidebarOpen(false);setActivePage(key);window.requestAnimationFrame?.(()=>document.querySelector(".main-area")?.scrollTo({top:0,behavior:"auto"}));}}');

if (!main.includes('import "./mobile-final-layout.css";')) throw new Error("Final mobile layout CSS import was not inserted safely.");
if (!main.includes('className="profile-box" data-role={role}')) throw new Error("Deterministic role marker was not inserted safely.");
if (!main.includes('mobile-sidebar-toggle')) throw new Error("Mobile sidebar toggle was not inserted safely.");
if (main.includes('onClickCapture={()=>setMobileSidebarOpen(false)}')) throw new Error("Navigation capture handler remained; build stopped safely.");

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_FINAL_ROLE_MOBILE_FIX_V7: sidebar navigation uses a reliable bubble click handler; mobile layout/CSS unchanged.");
