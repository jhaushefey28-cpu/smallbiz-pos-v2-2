import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

const marker = 'import React, { useEffect, useMemo, useRef, useState } from "react";';
const importLine = 'import "./attendance-sidebar-fix.js";';

if (!text.includes(importLine)) {
  if (!text.includes(marker)) {
    throw new Error("Attendance sidebar static import insertion failed: React import marker not found.");
  }
  text = text.replace(marker, marker + "\n" + importLine);
}

if (!text.includes(importLine)) {
  throw new Error("Attendance sidebar static import insertion failed; build stopped safely.");
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_ATTENDANCE_SIDEBAR_STABILITY_V2: static sidebar bridge without touching auth/POS.");
