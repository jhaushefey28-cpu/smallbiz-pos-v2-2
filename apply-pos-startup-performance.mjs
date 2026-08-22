import fs from "node:fs";

const path = "main.jsx";
let text = fs.readFileSync(path, "utf8");

const oldBlock = `    await Promise.all([loadSalesHistory(p.business_id),loadMovements(p.business_id),loadSuppliers(p.business_id),loadPurchaseHistory(p.business_id),loadCategories(p.business_id),loadCustomers(p.business_id)]);`;
const newBlock = `    // POS-first startup: only products/categories are needed for the first paint.
    // Transactions, reports, inventory history, purchasing and customers are loaded on demand.
    await loadCategories(p.business_id);`;

const effectMarker = "// SMALLBIZ_LAZY_PAGE_DATA_V1";
const effect = [
  "",
  "  // SMALLBIZ_LAZY_PAGE_DATA_V1",
  "  useEffect(()=>{",
  "    const b=profile?.business_id;",
  "    if(!b)return;",
  "    const key=String(b)+\":\"+String(activePage);",
  "    if(window.__smallbizLazyPageLoads?.has(key))return;",
  "    window.__smallbizLazyPageLoads=window.__smallbizLazyPageLoads||new Set();",
  "    window.__smallbizLazyPageLoads.add(key);",
  "    const run=async()=>{",
  "      try{",
  "        if(activePage===\"dashboard\"||activePage===\"transactions\") await loadSalesHistory(b);",
  "        else if(activePage===\"reports\") await Promise.all([loadSalesHistory(b),loadPurchaseHistory(b)]);",
  "        else if(activePage===\"movements\") await loadMovements(b);",
  "        else if(activePage===\"customers\") await loadCustomers(b);",
  "        else if(activePage===\"purchases\") await Promise.all([loadSuppliers(b),loadPurchaseHistory(b)]);",
  "        else if(activePage===\"suppliers\") await loadSuppliers(b);",
  "        else if(activePage===\"categories\"||activePage===\"products\") await loadCategories(b);",
  "      }catch(error){console.warn(\"[SmallBiz] Lazy page data failed.\",error);window.__smallbizLazyPageLoads.delete(key);}",
  "    };",
  "    if(activePage!==\"pos\")run();",
  "  },[activePage,profile?.business_id]);",
  "",
  "  useEffect(()=>{",
  "    if(!paymentOpen||!profile?.business_id)return;",
  "    const b=profile.business_id;",
  "    const key=String(b)+\":customers-payment\";",
  "    window.__smallbizLazyPageLoads=window.__smallbizLazyPageLoads||new Set();",
  "    if(window.__smallbizLazyPageLoads.has(key))return;",
  "    window.__smallbizLazyPageLoads.add(key);",
  "    loadCustomers(b).catch(()=>window.__smallbizLazyPageLoads.delete(key));",
  "  },[paymentOpen,profile?.business_id]);",
  ""
].join("\n");

if (!text.includes(oldBlock) && !text.includes(effectMarker)) {
  throw new Error("POS startup data block not found; performance patch stopped safely.");
}
if (text.includes(oldBlock)) text = text.replace(oldBlock, newBlock);

if (!text.includes(effectMarker)) {
  const anchor = "  async function loadSalesHistory(businessId){";
  if (!text.includes(anchor)) throw new Error("Lazy page loader anchor not found; performance patch stopped safely.");
  text = text.replace(anchor, effect + "\n" + anchor);
}

fs.writeFileSync(path, text);
console.log("Applied SMALLBIZ_POS_STARTUP_PERFORMANCE_V3: defer secondary POS data queries until their page is opened.");
