import fs from "node:fs";
const path="main.jsx";
const marker="SMALLBIZ_STOCK_EDIT_PROTECTION_2026_08_21";
const text=fs.readFileSync(path,"utf8");
if(text.includes(marker)){console.log(`Applied ${marker}: already present.`);process.exit(0)}
const old=`if(editingProduct){\n        const before=Number(editingProduct.stock||0),after=payload.stock;\n        const {error}=await supabase.from("products").update(payload).eq("id",editingProduct.id).eq("business_id",profile.business_id);\n        if(error)throw new Error(error.message);\n        if(before!==after)await recordMovement({product:{...editingProduct,name:payload.name,id:editingProduct.id},quantity:after-before,before,after,type:"ADJUSTMENT",reason:"Product edit / stock adjustment"});\n        setStatus("Product updated successfully.");`;
const replacement=`if(editingProduct){\n        // ${marker}: editing product details must never overwrite live stock.\n        const {stock:_ignoredStock,...updatePayload}=payload;\n        const {error}=await supabase.from("products").update(updatePayload).eq("id",editingProduct.id).eq("business_id",profile.business_id);\n        if(error)throw new Error(error.message);\n        setStatus("Product updated successfully.");`;
if(!text.includes(old))throw new Error("Product edit stock overwrite block was not found; build stopped safely.");
fs.writeFileSync(path,text.replace(old,replacement));
console.log(`Applied ${marker}: product edits preserve current stock.`);
