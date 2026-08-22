import fs from "node:fs";

const path = "styles.css";
let text = fs.readFileSync(path, "utf8");
const cleaned = text.replace(/```css/gi, "").replace(/```/g, "");

if (cleaned !== text) {
  fs.writeFileSync(path, cleaned);
  console.log("Applied SMALLBIZ_CSS_MARKDOWN_FENCE_FIX_V1: removed stray Markdown fences from styles.css.");
} else {
  console.log("CSS Markdown fences already absent.");
}
