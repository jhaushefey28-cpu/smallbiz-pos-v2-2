import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

// Attendance is lazy-loaded by owner-modules-loader after authentication.
// Remove the old static bridge import so it cannot inflate the core POS bundle or
// start a MutationObserver before the sidebar is ready.
text = text.replace(/\n?import ["']\.\/attendance-sidebar-fix\.js["'];\s*/g, "\n");

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_ATTENDANCE_SIDEBAR_STABILITY_V3: attendance sidebar bridge is lazy-loaded after authentication.");
