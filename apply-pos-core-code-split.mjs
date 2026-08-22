import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

text = text.replace('import { Html5Qrcode } from "html5-qrcode";\n', '');
text = text.replace('import * as XLSX from "xlsx";\n', '');

const scannerOld = '    const scanner=new Html5Qrcode("reader");\n    scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},code=>{';
const scannerNew = '    let scanner=null;\n    import("html5-qrcode").then(({Html5Qrcode})=>{\n      scanner=new Html5Qrcode("reader");\n      return scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},code=>{';
if (text.includes(scannerOld)) {
  text = text.replace(scannerOld, scannerNew);
  text = text.replace('    },()=>{}).catch(e=>setStatus("Camera error: "+e));', '      },()=>{});\n    }).catch(e=>setStatus("Camera error: "+e));');
}

const excelOld = '  function downloadExcel(data,fileName,sheetName="Sheet1"){\n    if(!data.length){setStatus("No data available.");return}\n    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();\n    XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${fileName}.xlsx`);\n    setStatus(`Downloaded: ${fileName}.xlsx`);\n  }';
const excelNew = '  async function downloadExcel(data,fileName,sheetName="Sheet1"){\n    if(!data.length){setStatus("No data available.");return}\n    const XLSX=await import("xlsx");\n    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();\n    XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${fileName}.xlsx`);\n    setStatus(`Downloaded: ${fileName}.xlsx`);\n  }';
if (text.includes(excelOld)) text = text.replace(excelOld, excelNew);

const marker = "// SMALLBIZ_POS_CORE_CODE_SPLIT_V1";
if (!text.includes(marker)) {
  const anchor = 'function App(){';
  if (!text.includes(anchor)) throw new Error("App anchor not found; core code-split patch stopped safely.");
  text = text.replace(anchor, marker + "\n\n" + anchor);
}

if (text.includes('Html5Qrcode') && text.includes('import { Html5Qrcode }')) throw new Error("Barcode library remains statically imported; patch stopped safely.");
if (text.includes('XLSX.utils') && text.includes('import * as XLSX')) throw new Error("XLSX remains statically imported; patch stopped safely.");

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_POS_CORE_CODE_SPLIT_V1: barcode and Excel libraries load only when used.");
