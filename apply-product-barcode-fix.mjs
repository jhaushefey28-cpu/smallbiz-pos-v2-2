import fs from "node:fs";
const path="main.jsx";
const text=fs.readFileSync(path,"utf8");
const marker="SMALLBIZ_PRODUCT_BARCODE_FIX_2026_08_21";
if(text.includes(marker)){console.log(`Applied ${marker}: already present.`);process.exit(0)}
let updated=text;
const anchor='setSavingProduct(true);setErr("");\n    try{';
const injection=`setSavingProduct(true);setErr("");\n    // ${marker}\n    const barcode=String(productForm.barcode||"").trim()||null;\n    if(barcode){\n      const {data:dupes,error:barcodeError}=await supabase.from("products").select("id,name,barcode").eq("business_id",profile.business_id).eq("barcode",barcode);\n      if(barcodeError)throw new Error("Barcode check failed: "+barcodeError.message);\n      const duplicate=(dupes||[]).find(p=>!editingProduct||p.id!==editingProduct.id);\n      if(duplicate)throw new Error(\`Duplicate barcode: \${barcode} is already assigned to \${duplicate.name||"another product"}. Please use a different barcode.\`);\n    }\n    try{`;
if(!updated.includes(anchor))throw new Error("Product save anchor was not found; build stopped safely.");
updated=updated.replace(anchor,injection);
updated=updated.replace('barcode:productForm.barcode.trim(),','barcode,');
const catchOld='setErr(e?.message||"Product save failed.");';
const catchNew='const msg=String(e?.message||"Product save failed.");setErr(msg.includes("products_business_id_barcode_key")?"Duplicate barcode: this barcode is already assigned to another product. Please use a different barcode.":msg);';
if(!updated.includes(catchOld))throw new Error("Product save error handler was not found; build stopped safely.");
updated=updated.replace(catchOld,catchNew);
fs.writeFileSync(path,updated);
console.log(`Applied ${marker}: duplicate barcode validation + friendly error.`);
