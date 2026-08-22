import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

const reactImport = 'import React, { useEffect, useMemo, useState } from "react";';
const attendanceImport = reactImport + '\nimport "./attendance-sidebar-fix.js";';

if (text.includes(reactImport) && !text.includes('import "./attendance-sidebar-fix.js";')) {
  text = text.replace(reactImport, attendanceImport);
}

if (!text.includes('import "./attendance-sidebar-fix.js";')) {
  throw new Error("Attendance sidebar static import insertion failed; build stopped safely.");
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_ATTENDANCE_SIDEBAR_STABILITY_V1: static sidebar bridge without touching auth/POS.");
