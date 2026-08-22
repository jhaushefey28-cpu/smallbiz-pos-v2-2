import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

const anchor = 'import "./styles.css";';
const extra = anchor + '\nimport "./sidebar-layout-stability.css";';

if (!text.includes(anchor)) {
  throw new Error("Sidebar layout CSS anchor not found; build stopped safely.");
}

if (!text.includes('import "./sidebar-layout-stability.css";')) {
  text = text.replace(anchor, extra);
  fs.writeFileSync(path, text);
}

console.log("Applied SMALLBIZ_SIDEBAR_LAYOUT_STABILITY_V1: isolated sidebar/main scrolling.");
