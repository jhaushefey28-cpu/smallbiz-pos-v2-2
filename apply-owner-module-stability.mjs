import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");
const marker = 'import "./styles.css";';
const importLine = 'import "./post-login-modules.js";';

if (!text.includes(importLine)) {
  if (!text.includes(marker)) {
    throw new Error("Core styles import marker not found; owner module stabilization stopped safely.");
  }
  text = text.replace(marker, `${marker}\n${importLine}`);
  fs.writeFileSync(path, text);
  console.log("Applied SMALLBIZ_OWNER_MODULE_STABILITY_V3: optional modules load only after core app shell.");
} else {
  console.log("SMALLBIZ_OWNER_MODULE_STABILITY_V3 already applied.");
}
