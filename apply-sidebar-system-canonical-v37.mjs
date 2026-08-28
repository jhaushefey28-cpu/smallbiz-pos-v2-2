import fs from "node:fs";

const MAIN="main.jsx";
const STYLES="styles.css";
if(!fs.existsSync(MAIN))throw new Error("main.jsx not found; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");

/* SMALLBIZ SIDEBAR CANONICAL V41
   Only normalize the duplicate product entries. Do not rebuild, reorder,
   restyle, inject, observe, or otherwise mutate the sidebar. */

const productsEntry=/\["products","📦","Products",canManageInventory\],/g;
const inventoryEntry=/\["inventory","📦","Product & Inventory",canManageInventory\]/g;
const attendanceEntry=/\["attendance","👥","Employee\/Attendance",canSell\]/;

const productMatches=main.match(productsEntry)||[];
main=main.replace(productsEntry,"");

if(!inventoryEntry.test(main))throw new Error("Product & Inventory entry not found; build stopped safely.");
if(!attendanceEntry.test(main))throw new Error("Employee/Attendance entry not found; build stopped safely.");

/* If the same canonical Product & Inventory entry exists more than once,
   keep the first one and remove only subsequent copies. */
let inventorySeen=false;
main=main.replace(/\["inventory","📦","Product & Inventory",canManageInventory\],/g,m=>{
  if(inventorySeen)return "";
  inventorySeen=true;
  return m;
});
if(!inventorySeen)throw new Error("Canonical Product & Inventory entry was lost; build stopped safely.");

/* The owner loader is intentionally NOT touched. */

/* Remove only markdown fence lines accidentally stored in styles.css.
   This does not alter any CSS rule or layout value. */
if(fs.existsSync(STYLES)){
  let css=fs.readFileSync(STYLES,"utf8");
  css=css.replace(/^```(?:css)?\s*\n/,"").replace(/\n```\s*$/,"\n");
  fs.writeFileSync(STYLES,css,"utf8");
}

fs.writeFileSync(MAIN,main,"utf8");
console.log(`[SmallBiz] Canonical sidebar: removed ${productMatches.length} legacy Products entry/entries; kept Product & Inventory and Employee/Attendance; layout untouched.`);
