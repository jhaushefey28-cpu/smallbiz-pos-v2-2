import { createClient } from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=url&&key?createClient(url,key):null;
const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));
const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
function dateOnly(v){return v?new Date(v).toLocaleDateString("en-CA",{timeZone:"Asia/Manila"}):""}
function dateTime(v){return v?new Date(v).toLocaleString("en-PH"):""}
function todayPH(){return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Manila"})}
function firstDay(){const d=new Date();d.setDate(1);return d.toLocaleDateString("en-CA",{timeZone:"Asia/Manila"})}

async function getBusinessContext(){
  if(!sb)throw new Error("Supabase configuration is missing.");
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user)throw new Error("Please sign in first.");
  const {data:profile,error:pe}=await sb.from("profiles").select("id,business_id,full_name,role").eq("id",session.user.id).single();
  if(pe)throw pe;
  const {data:settings}=await sb.from("business_settings").select("business_name,tin,address,phone").eq("business_id",profile.business_id).maybeSingle();
  const {data:business}=await sb.from("businesses").select("name").eq("id",profile.business_id).maybeSingle();
  return {session,profile,businessName:settings?.business_name||business?.name||"SmallBiz POS",tin:settings?.tin||"",address:settings?.address||"",phone:settings?.phone||""};
}

async function loadData(ctx,start,end,channel){
  const bid=ctx.profile.business_id;
  const from=new Date(`${start}T00:00:00+08:00`).toISOString();
  const to=new Date(`${end}T23:59:59+08:00`).toISOString();
  const salesQ=sb.from("sales").select("id,business_id,invoice_no,cashier_id,customer_id,subtotal,discount,discount_reason,total,payment_method,payment_reference,amount_tendered,change_amount,status,created_at").eq("business_id",bid).gte("created_at",from).lte("created_at",to).order("created_at",{ascending:false}).limit(5000);
  const extQ=sb.from("external_orders").select("id,business_id,sales_channel_id,external_order_no,customer_name,customer_phone,payment_method,subtotal,discount,platform_fee,shipping_fee,total,order_status,fulfillment_status,ordered_at,created_at,updated_at,sales_channels(name,code)").eq("business_id",bid).gte("created_at",from).lte("created_at",to).order("created_at",{ascending:false}).limit(5000);
  const [salesRes,extRes,prodRes,movRes,purRes,chanRes]=await Promise.all([
    salesQ,extQ,
    sb.from("products").select("id,name,barcode,category_id,cost_price,price,stock").eq("business_id",bid).order("name"),
    sb.from("stock_movements").select("id,product_id,product_name,movement_type,quantity,stock_before,stock_after,reason,reference_type,reference_id,user_id,created_at").eq("business_id",bid).gte("created_at",from).lte("created_at",to).order("created_at",{ascending:false}).limit(10000),
    sb.from("purchases").select("id,reference_no,purchase_date,subtotal,notes,status,created_at,suppliers(name)").eq("business_id",bid).gte("created_at",from).lte("created_at",to).order("created_at",{ascending:false}).limit(5000),
    sb.from("sales_channels").select("id,name,code,channel_type,enabled").eq("business_id",bid).order("name")
  ]);
  if(salesRes.error)throw salesRes.error;
  if(extRes.error)throw extRes.error;
  const channels=chanRes.data||[];
  let externalOrders=extRes.data||[];
  if(channel!=="all")externalOrders=externalOrders.filter(o=>o.sales_channels?.code===channel||o.sales_channels?.name===channel||o.sales_channel_id===channel);
  const sales=salesRes.data||[];
  const extIds=externalOrders.map(o=>o.id);
  const saleIds=sales.map(s=>s.id);
  const [saleItemsRes,extItemsRes,shipRes]=await Promise.all([
    saleIds.length?sb.from("sale_items").select("id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total,cost_price,line_cost,gross_profit").in("sale_id",saleIds):Promise.resolve({data:[],error:null}),
    extIds.length?sb.from("external_order_items").select("id,external_order_id,product_id,product_name,external_sku,external_product_id,quantity,unit_price,line_total").in("external_order_id",extIds):Promise.resolve({data:[],error:null}),
    extIds.length?sb.from("order_shipments").select("id,external_order_id,carrier,service,tracking_no,waybill_no,status,recipient_name,recipient_phone,created_at,updated_at,printed_at").in("external_order_id",extIds):Promise.resolve({data:[],error:null})
  ]);
  if(saleItemsRes.error)throw saleItemsRes.error;
  if(extItemsRes.error)throw extItemsRes.error;
  if(shipRes.error)throw shipRes.error;
  return {sales,externalOrders,products:prodRes.data||[],movements:movRes.data||[],purchases:purRes.data||[],channels,saleItems:saleItemsRes.data||[],externalItems:extItemsRes.data||[],shipments:shipRes.data||[]};
}

function rows(data,mapper){return data.map(mapper)}
function exportData(ctx,data,start,end,channel){
  if(!window.SmallBizExport)throw new Error("Excel export engine is unavailable.");
  const sales=data.sales.filter(s=>s.status==="completed");
  const posSales=sales.reduce((a,s)=>a+Number(s.total||0),0);
  const onlineSales=data.externalOrders.filter(o=>!['cancelled','canceled'].includes(String(o.order_status||'').toLowerCase())).reduce((a,o)=>a+Number(o.total||0),0);
  const platformFees=data.externalOrders.reduce((a,o)=>a+Number(o.platform_fee||0),0);
  const cogs=data.saleItems.reduce((a,i)=>a+Number(i.line_cost||0),0);
  const summary=[
    {Metric:"Report Period",Value:`${start} to ${end}`},{Metric:"Channel Filter",Value:channel||"all"},{Metric:"POS Completed Sales",Value:posSales},{Metric:"Online Order Sales",Value:onlineSales},{Metric:"Marketplace Fees",Value:platformFees},{Metric:"POS COGS",Value:cogs},{Metric:"POS Gross Profit",Value:posSales-cogs},{Metric:"Total Transactions",Value:sales.length},{Metric:"Online Orders",Value:data.externalOrders.length}
  ];
  const channelSales={POS:posSales};
  data.externalOrders.forEach(o=>{const n=o.sales_channels?.name||"Online";channelSales[n]=(channelSales[n]||0)+Number(o.total||0)});
  const channelRows=Object.entries(channelSales).map(([name,total])=>({Channel:name,Sales:total}));
  const info={"Business Name":ctx.businessName,"TIN":ctx.tin,"Address":ctx.address,"Phone":ctx.phone,"Generated By":ctx.profile.full_name||ctx.profile.role||"User","Generated At":dateTime(new Date()),"Period":`${start} to ${end}`,"Channel":channel||"All Channels"};
  window.SmallBizExport.exportWorkbook({filename:`SmallBiz_POS_Report_${ctx.businessName}_${start}_${end}`,metadata:info,sheets:[
    {name:"Summary",rows:summary},{name:"Sales by Channel",rows:channelRows},
    {name:"POS Sales",rows:rows(sales,s=>({Invoice:s.invoice_no,Date:dateTime(s.created_at),Payment:s.payment_method,Reference:s.payment_reference||"",Subtotal:Number(s.subtotal||0),Discount:Number(s.discount||0),Total:Number(s.total||0),Status:s.status}))},
    {name:"POS Sale Items",rows:rows(data.saleItems,i=>({SaleID:i.sale_id,Product:i.product_name,Barcode:i.barcode||"",Qty:Number(i.quantity||0),UnitPrice:Number(i.unit_price||0),LineTotal:Number(i.line_total||0),Cost:Number(i.line_cost||0),GrossProfit:Number(i.gross_profit||0)}))},
    {name:"Online Orders",rows:rows(data.externalOrders,o=>({Order:o.external_order_no,Channel:o.sales_channels?.name||"",Customer:o.customer_name||"",Payment:o.payment_method||"",Subtotal:Number(o.subtotal||0),Discount:Number(o.discount||0),PlatformFee:Number(o.platform_fee||0),ShippingFee:Number(o.shipping_fee||0),Total:Number(o.total||0),OrderStatus:o.order_status||"",Fulfillment:o.fulfillment_status||"",OrderedAt:dateTime(o.ordered_at||o.created_at)}))},
    {name:"Online Items",rows:rows(data.externalItems,i=>({OrderID:i.external_order_id,Product:i.product_name,SKU:i.external_sku||"",ExternalProductID:i.external_product_id||"",Qty:Number(i.quantity||0),UnitPrice:Number(i.unit_price||0),LineTotal:Number(i.line_total||0)}))},
    {name:"Shipments",rows:rows(data.shipments,s=>({OrderID:s.external_order_id,Carrier:s.carrier||"",Service:s.service||"",Tracking:s.tracking_no||"",Waybill:s.waybill_no||"",Status:s.status||"",Recipient:s.recipient_name||"",PrintedAt:dateTime(s.printed_at)}))},
    {name:"Inventory",rows:rows(data.products,p=>({Product:p.name,Barcode:p.barcode||"",CostPrice:Number(p.cost_price||0),SellingPrice:Number(p.price||0),Stock:Number(p.stock||0),InventoryCost:Number(p.stock||0)*Number(p.cost_price||0),InventoryRetail:Number(p.stock||0)*Number(p.price||0)}))},
    {name:"Stock Movements",rows:rows(data.movements,m=>({Date:dateTime(m.created_at),Product:m.product_name,Type:m.movement_type,Quantity:Number(m.quantity||0),StockBefore:Number(m.stock_before||0),StockAfter:Number(m.stock_after||0),Reason:m.reason||"",Reference:m.reference_type||""}))},
    {name:"Purchases",rows:rows(data.purchases,p=>({Reference:p.reference_no||"",Date:p.purchase_date||dateOnly(p.created_at),Supplier:p.suppliers?.name||"",Subtotal:Number(p.subtotal||0),Status:p.status||"",Notes:p.notes||""}))}
  ]});
}

function findReportPanel(){
  const heading=[...document.querySelectorAll("h1,h2,h3,h4,h5,div,section")].find(el=>el.children.length<8&&/\bDownload Reports\b/i.test(el.textContent||""));
  if(!heading)return null;
  let node=heading;
  for(let i=0;i<6&&node;i++,node=node.parentElement){
    const buttons=node.querySelectorAll("button");
    if(buttons.length>=4&&/Transactions/i.test(node.textContent||"")&&/Inventory/i.test(node.textContent||""))return node;
  }
  return heading.parentElement||heading;
}

function inject(){
  const panel=findReportPanel();
  if(!panel||panel.querySelector(".sb-report-center")||document.querySelector(".sb-report-modal"))return;
  const box=document.createElement("div");
  box.className="sb-report-center";
  box.innerHTML=`<div class="sb-report-head"><div><h3>📊 Complete Report Center</h3><p>Export POS, online orders, inventory, stock movements, purchases and shipment data in one Excel workbook.</p></div><button type="button" class="excel-btn sb-report-open">Open Report Center</button></div>`;
  panel.appendChild(box);
  box.querySelector(".sb-report-open").addEventListener("click",openModal);
}

async function openModal(){
  if(document.querySelector(".sb-report-modal"))return;
  const modal=document.createElement("div");modal.className="sb-report-modal";
  modal.innerHTML=`<div class="sb-report-dialog"><div class="sb-report-title"><div><span>SMALLBIZ POS</span><h2>📊 Report Center</h2><p>Generate one complete Excel workbook from your business data.</p></div><button class="sb-report-close">✕</button></div><div class="sb-report-form"><label>From <input id="sb-r-from" type="date" value="${firstDay()}"></label><label>To <input id="sb-r-to" type="date" value="${todayPH()}"></label><label>Channel <select id="sb-r-channel"><option value="all">All Channels</option></select></label></div><div id="sb-r-status" class="sb-report-status">Loading business data...</div><div class="sb-report-actions"><button class="excel-btn" id="sb-r-export">⬇️ Export Complete Excel</button><button class="refresh-btn" id="sb-r-refresh">↻ Refresh Preview</button></div><div id="sb-r-preview" class="sb-report-preview"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector(".sb-report-close").onclick=()=>modal.remove();
  const status=modal.querySelector("#sb-r-status"),preview=modal.querySelector("#sb-r-preview"),channelSelect=modal.querySelector("#sb-r-channel");
  let ctx=null;
  async function refresh(){
    try{
      status.textContent="Loading report data...";
      ctx=await getBusinessContext();
      const start=modal.querySelector("#sb-r-from").value,end=modal.querySelector("#sb-r-to").value,channel=channelSelect.value;
      if(!start||!end||start>end)throw new Error("Please select a valid date range.");
      const data=await loadData(ctx,start,end,channel);
      if(channelSelect.options.length===1)(data.channels||[]).forEach(c=>{const o=document.createElement("option");o.value=c.code||c.name;o.textContent=c.name;channelSelect.appendChild(o)});
      const pos=data.sales.filter(s=>s.status==="completed").reduce((a,s)=>a+Number(s.total||0),0),online=data.externalOrders.reduce((a,o)=>a+Number(o.total||0),0),fees=data.externalOrders.reduce((a,o)=>a+Number(o.platform_fee||0),0);
      preview.innerHTML=`<div class="sb-report-cards"><div><small>POS Sales</small><b>${money(pos)}</b></div><div><small>Online Sales</small><b>${money(online)}</b></div><div><small>Marketplace Fees</small><b>${money(fees)}</b></div><div><small>Orders</small><b>${data.sales.length+data.externalOrders.length}</b></div></div><div class="sb-report-note">Includes ${data.products.length} products, ${data.movements.length} stock movements, ${data.purchases.length} purchases, ${data.externalOrders.length} online orders and ${data.shipments.length} shipments.</div>`;
      status.textContent=`Ready • ${ctx.businessName}`;
    }catch(e){status.textContent="Report error: "+(e?.message||e);preview.innerHTML=""}
  }
  modal.querySelector("#sb-r-refresh").onclick=refresh;
  modal.querySelector("#sb-r-export").onclick=async()=>{try{const start=modal.querySelector("#sb-r-from").value,end=modal.querySelector("#sb-r-to").value,channel=channelSelect.value;ctx=ctx||await getBusinessContext();const data=await loadData(ctx,start,end,channel);exportData(ctx,data,start,end,channel);status.textContent="Excel report generated successfully."}catch(e){status.textContent="Export failed: "+(e?.message||e)}};
  channelSelect.onchange=refresh;
  await refresh();
}

const observer=new MutationObserver(inject);
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(inject,500);
