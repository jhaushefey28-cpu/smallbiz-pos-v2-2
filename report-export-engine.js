/* SmallBiz POS — reusable Excel export engine.
   Loaded globally so report modules can reuse one consistent export format. */
import * as XLSX from "xlsx";

(function(){
  window.XLSX=window.XLSX||XLSX;
  function safeName(value){return String(value||"Report").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,80)||"Report";}
  function stamp(){const d=new Date(),pad=n=>String(n).padStart(2,"0");return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;}
  function exportWorkbook({sheets=[],filename="SmallBiz-Report",metadata={}}={}){
    const wb=XLSX.utils.book_new();
    const metaRows=Object.entries(metadata).map(([key,value])=>({Field:key,Value:value==null?"":value}));
    if(metaRows.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(metaRows),"Report Info");
    sheets.forEach((sheet,index)=>{
      const name=safeName(sheet.name||`Sheet ${index+1}`).slice(0,31)||`Sheet${index+1}`;
      const rows=Array.isArray(sheet.rows)?sheet.rows:[];
      const ws=rows.length?XLSX.utils.json_to_sheet(rows):XLSX.utils.aoa_to_sheet([["No data"]]);
      if(rows.length)ws["!autofilter"]={ref:XLSX.utils.encode_range(XLSX.utils.decode_range(ws["!ref"]))};
      XLSX.utils.book_append_sheet(wb,ws,name);
    });
    if(wb.SheetNames.length===0)XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["No data"]]),"Report");
    XLSX.writeFile(wb,`${safeName(filename)}-${stamp()}.xlsx`);
  }
  window.SmallBizExport={exportWorkbook,safeName,stamp};
})();