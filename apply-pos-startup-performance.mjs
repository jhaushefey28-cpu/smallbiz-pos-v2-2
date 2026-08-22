import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

const oldBlock = `    await Promise.all([loadSalesHistory(p.business_id),loadMovements(p.business_id),loadSuppliers(p.business_id),loadPurchaseHistory(p.business_id),loadCategories(p.business_id),loadCustomers(p.business_id)]);`;
const newBlock = `    // POS-first startup: only products/categories are needed for the first paint.
    // Transactions, reports, inventory history, purchasing and customers are loaded on demand.
    await loadCategories(p.business_id);`;

const effectMarker = "// SMALLBIZ_LAZY_PAGE_DATA_V1";
const effect = `\n  ${effectMarker}\n  useEffect(()=>{\n    const b=profile?.business_id;\n    if(!b)return;\n    const key=\`\\${b}:\\${activePage}\`;\n    if(window.__smallbizLazyPageLoads?.has(key))return;\n    window.__smallbizLazyPageLoads=window.__smallbizLazyPageLoads||new Set();\n    window.__smallbizLazyPageLoads.add(key);\n    const run=async()=>{\n      try{\n        if(activePage===\"dashboard\"||activePage===\"transactions\") await loadSalesHistory(b);\n        else if(activePage===\"reports\") await Promise.all([loadSalesHistory(b),loadPurchaseHistory(b)]);\n        else if(activePage===\"movements\") await loadMovements(b);\n        else if(activePage===\"customers\") await loadCustomers(b);\n        else if(activePage===\"purchases\") await Promise.all([loadSuppliers(b),loadPurchaseHistory(b)]);\n        else if(activePage===\"suppliers\") await loadSuppliers(b);\n        else if(activePage===\"categories\"||activePage===\"products\") await loadCategories(b);\n      }catch(error){console.warn(\"[SmallBiz] Lazy page data failed.\",error);window.__smallbizLazyPageLoads.delete(key);}\n    };\n    if(activePage!==\"pos\")run();\n  },[activePage,profile?.business_id]);\n\n  useEffect(()=>{\n    if(!paymentOpen||!profile?.business_id)return;\n    const b=profile.business_id;\n    const key=\`\\${b}:customers-payment\`;\n    window.__smallbizLazyPageLoads=window.__smallbizLazyPageLoads||new Set();\n    if(window.__smallbizLazyPageLoads.has(key))return;\n    window.__smallbizLazyPageLoads.add(key);\n    loadCustomers(b).catch(()=>window.__smallbizLazyPageLoads.delete(key));\n  },[paymentOpen,profile?.business_id]);\n`;

if (!text.includes(oldBlock)) {
  if (!text.includes(effectMarker)) {
    throw new Error("POS startup data block not found; performance patch stopped safely.");
  }
} else {
  text = text.replace(oldBlock, newBlock);
}

if (!text.includes(effectMarker)) {
  const anchor = "  async function loadSalesHistory(businessId){";
  if (!text.includes(anchor)) throw new Error("Lazy page loader anchor not found; performance patch stopped safely.");
  text = text.replace(anchor, effect + "\n" + anchor);
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_POS_STARTUP_PERFORMANCE_V1: defer secondary data queries until their page is opened.");
