import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

// Keep the barcode scanner import static. The scanner is instantiated only when the
// Scan UI opens, so the library does not add runtime work during login. More importantly,
// this prevents older scanner code paths from referencing an undefined global.
if (!text.includes('import { Html5Qrcode } from "html5-qrcode";')) {
  const anchor = 'import { createClient } from "@supabase/supabase-js";';
  if (!text.includes(anchor)) throw new Error("Supabase import anchor not found; barcode fix stopped safely.");
  text = text.replace(anchor, `${anchor}\nimport { Html5Qrcode } from "html5-qrcode";`);
}

// Keep Excel fully lazy because it is only needed for exports.
text = text.replace('import * as XLSX from "xlsx";\n', '');

// Do not attempt a fragile source-level replacement of the scanner block. The current
// component already instantiates Html5Qrcode only when `scan` is true.
const excelOld = '  function downloadExcel(data,fileName,sheetName="Sheet1"){\n    if(!data.length){setStatus("No data available.");return}\n    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();\n    XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${fileName}.xlsx`);\n    setStatus(`Downloaded: ${fileName}.xlsx`);\n  }';
const excelNew = '  async function downloadExcel(data,fileName,sheetName="Sheet1"){\n    if(!data.length){setStatus("No data available.");return}\n    const XLSX=await import("xlsx");\n    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();\n    XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${fileName}.xlsx`);\n    setStatus(`Downloaded: ${fileName}.xlsx`);\n  }';
if (text.includes(excelOld)) text = text.replace(excelOld, excelNew);

const marker = "// SMALLBIZ_POS_CORE_CODE_SPLIT_V2";
if (!text.includes(marker)) {
  const anchor = 'function App(){';
  if (!text.includes(anchor)) throw new Error("App anchor not found; core code-split patch stopped safely.");
  text = text.replace(anchor, marker + "\n\n" + anchor);
}

if (!text.includes('import { Html5Qrcode } from "html5-qrcode";')) {
  throw new Error("Barcode library import is missing; build stopped safely.");
}
if (text.includes('import * as XLSX from "xlsx"')) {
  throw new Error("XLSX remains statically imported; patch stopped safely.");
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_POS_CORE_CODE_SPLIT_V2: keep scanner import safe, lazy-load Excel exports.");
