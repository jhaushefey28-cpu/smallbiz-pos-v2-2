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

if (!main.includes('import "./sidebar-fix.css";')) throw new Error("Final mobile CSS imports were not inserted safely.");
if (!main.includes('className="profile-box" data-role={role}')) throw new Error("Deterministic role marker was not inserted safely.");

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_FINAL_ROLE_MOBILE_FIX_V3: deterministic role marker + isolated mobile CSS + permission-gated native Attendance entry.");
