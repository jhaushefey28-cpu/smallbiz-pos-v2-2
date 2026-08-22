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

/* FINAL MOBILE LAYOUT: replace the old 54/60px mobile rail with an off-canvas
   full navigation. The main POS keeps the full phone width while the sidebar
   gets its own vertical scroll when opened. */
if (!main.includes('import "./mobile-final-layout.css";')) {
  const sidebarCssAnchor = 'import "./sidebar-fix.css";';
  if (main.includes(sidebarCssAnchor)) main = main.replace(sidebarCssAnchor, `${sidebarCssAnchor}\nimport "./mobile-final-layout.css";`);
  else if (main.includes(cssAnchor)) main = main.replace(cssAnchor, `${cssAnchor}\nimport "./mobile-final-layout.css";`);
  else throw new Error("Final mobile layout CSS import insertion failed safely.");
}

const stateNeedle = 'const [profile,setProfile]=useState(null),[activePage,setActivePage]=useState("pos");';
if (!main.includes("mobileSidebarOpen")) {
  if (!main.includes(stateNeedle)) throw new Error("Final mobile layout state insertion failed safely.");
  main = main.replace(stateNeedle, `${stateNeedle}\n  const [mobileSidebarOpen,setMobileSidebarOpen]=useState(false);`);
}

const appNeedle = 'return <div className="app-shell">\n    <aside className="sidebar">';
const appReplacement = `return <div className="app-shell">\n    <button type="button" className="mobile-sidebar-toggle" aria-label="Open navigation" onClick={()=>setMobileSidebarOpen(true)}>☰</button>\n    {mobileSidebarOpen&&<button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMobileSidebarOpen(false)} />}\n    <aside className={mobileSidebarOpen?"sidebar mobile-sidebar-open":"sidebar"}>`;
if (!main.includes('mobile-sidebar-toggle')) {
  if (!main.includes(appNeedle)) throw new Error("Final mobile layout sidebar insertion failed safely.");
  main = main.replace(appNeedle, appReplacement);
}

const navNeedle = 'className={activePage==="'+"key"+'"?"nav-item active":"nav-item"} onClick=';
const navNeedleExact = 'className={activePage===key?"nav-item active":"nav-item"} onClick=';
const navReplacement = 'className={activePage===key?"nav-item active":"nav-item"} onClickCapture={()=>setMobileSidebarOpen(false)} onClick=';
if (!main.includes('onClickCapture={()=>setMobileSidebarOpen(false)}')) {
  if (!main.includes(navNeedleExact)) throw new Error("Final mobile layout navigation hook insertion failed safely.");
  main = main.replace(navNeedleExact, navReplacement);
}

if (!main.includes('import "./mobile-final-layout.css";')) throw new Error("Final mobile layout CSS import was not inserted safely.");
if (!main.includes('className="profile-box" data-role={role}')) throw new Error("Deterministic role marker was not inserted safely.");
if (!main.includes('mobile-sidebar-toggle')) throw new Error("Mobile sidebar toggle was not inserted safely.");

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_FINAL_ROLE_MOBILE_FIX_V4: deterministic role marker + permission-gated Attendance + full off-canvas mobile sidebar + isolated POS scrolling.");
