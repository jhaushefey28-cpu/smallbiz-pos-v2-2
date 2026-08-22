import fs from "node:fs";

const mainPath = "main.jsx";
let main = fs.readFileSync(mainPath, "utf8");

const cssAnchor = 'import "./styles.css";';
const cssImports = `${cssAnchor}\nimport "./responsive-pos.css";\nimport "./sidebar-fix.css";`;
if (main.includes(cssAnchor) && !main.includes('import "./sidebar-fix.css";')) {
  main = main.replace(cssAnchor, cssImports);
}

const navNeedle = '["movements","🔄","Stock History",canManageInventory]]';
const navReplacement = '["attendance","👥","Employees / Attendance",true],["movements","🔄","Stock History",canManageInventory]]';
if (main.includes(navNeedle) && !main.includes('["attendance","👥","Employees / Attendance",true]')) {
  main = main.replace(navNeedle, navReplacement);
}

const clickNeedle = 'onClick={()=>setActivePage(key)}';
const clickReplacement = 'onClick={()=>{if(key==="attendance"){if(typeof window.__smallbizOpenAttendance==="function")window.__smallbizOpenAttendance();else import("./attendance-center.js").then(()=>window.__smallbizOpenAttendance?.()).catch(e=>console.warn("[SmallBiz] Attendance open failed.",e));}else setActivePage(key)}}';
if (main.includes(clickNeedle) && !main.includes('key==="attendance"')) {
  main = main.replace(clickNeedle, clickReplacement);
}

if (!main.includes('import "./sidebar-fix.css";')) throw new Error("Final mobile CSS imports were not inserted safely.");
if (!main.includes('["attendance","👥","Employees / Attendance",true]')) throw new Error("Employee / Attendance sidebar entry was not inserted safely.");
if (!main.includes('key==="attendance"')) throw new Error("Employee / Attendance click handler was not inserted safely.");

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_FINAL_ROLE_MOBILE_FIX_V1: deterministic mobile sidebar CSS + native Employee/Attendance entry.");
