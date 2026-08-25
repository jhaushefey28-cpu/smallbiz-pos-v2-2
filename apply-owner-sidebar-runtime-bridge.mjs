import fs from "node:fs";

// SMALLBIZ_OWNER_SIDEBAR_RUNTIME_BRIDGE_V2
// The authenticated owner loader is already wired by apply-owner-modules-loader.mjs.
// Do not inject a second startup path into main.jsx; duplicate startup can race with
// React sidebar reconciliation and cause duplicate/missing navigation items.
const path="main.jsx";
if(!fs.existsSync(path))throw new Error("main.jsx is missing; build stopped safely.");
console.log("Owner sidebar runtime bridge V2: no-op; single authenticated loader startup remains authoritative.");
