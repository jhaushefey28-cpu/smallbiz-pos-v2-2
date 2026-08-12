import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import * as XLSX from "xlsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(error){ return {error}; }
  render(){
    if(this.state.error) return <div className="auth"><div className="card error-card">
      <h1>SmallBiz POS V2.3</h1><h2>App error</h2><pre>{String(this.state.error?.stack||this.state.error)}</pre>
    </div></div>;
    return this.props.children;
  }
}

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configError=!SUPABASE_URL||!SUPABASE_KEY;
const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);

const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));
const norm=p=>({...p,
  name:p.name??p.product_name??p.productName??p.title??"Unnamed Product",
  barcode:p.barcode??p.bar_code??p.barcode_number??p.sku??"",
  price:Number(p.price??p.selling_price??p.sale_price??0),
  stock:Number(p.stock??p.quantity??p.current_stock??0),
  imageUrl:p.image_url??p.imageUrl??p.image??p.product_image??p.product_image_url??p.photo_url??""
});

function App(){
  const [session,setSession]=useState(null),[email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [products,setProducts]=useState([]),[search,setSearch]=useState(""),[cart,setCart]=useState([]);
  const [scan,setScan]=useState(false),[status,setStatus]=useState(""),[err,setErr]=useState("");
  const [profile,setProfile]=useState(null),[activePage,setActivePage]=useState("pos");
  const [autoPrintReceipt,setAutoPrintReceipt]=useState(()=>localStorage.getItem("smallbiz_auto_print_receipt")==="true");
  const [paymentOpen,setPaymentOpen]=useState(false),[paymentDone,setPaymentDone]=useState(false);
  const [cash,setCash]=useState(""),[receiptNo,setReceiptNo]=useState(""),[savingPayment,setSavingPayment]=useState(false);
  const [paymentMethod,setPaymentMethod]=useState("cash"),[salesHistory,setSalesHistory]=useState([]),[historyLoading,setHistoryLoading]=useState(false);
  const [historySearch,setHistorySearch]=useState(""),[historyPaymentFilter,setHistoryPaymentFilter]=useState("all");
  const [historyDateFilter,setHistoryDateFilter]=useState(""),[historyStatusFilter,setHistoryStatusFilter]=useState("all");
  const [selectedSale,setSelectedSale]=useState(null),[selectedSaleItems,setSelectedSaleItems]=useState([]);
  const [saleDetailsOpen,setSaleDetailsOpen]=useState(false),[saleDetailsLoading,setSaleDetailsLoading]=useState(false);
  const [recentScanned,setRecentScanned]=useState([]);
  const [productModal,setProductModal]=useState(false),[editingProduct,setEditingProduct]=useState(null);
  const [productForm,setProductForm]=useState({name:"",barcode:"",price:"",stock:"",image_url:""});
  const [savingProduct,setSavingProduct]=useState(false);
  const [restockProduct,setRestockProduct]=useState(null),[restockQty,setRestockQty]=useState(""),[restockReason,setRestockReason]=useState("Restock");
  const [movements,setMovements]=useState([]),[movementLoading,setMovementLoading]=useState(false);
  const [voidSale,setVoidSale]=useState(null),[voidReason,setVoidReason]=useState(""),[voiding,setVoiding]=useState(false);

  useEffect(()=>{
    if(!supabase)return;
    let mounted=true;
    supabase.auth.getSession().then(({data})=>mounted&&setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>{mounted=false;subscription.unsubscribe()};
  },[]);

  useEffect(()=>{if(session?.user)load(session.user.id)},[session]);

  async function load(uid){
    if(!supabase)return;
    setErr("");
    const {data:p,error:pe}=await supabase.from("profiles").select("id,business_id,full_name,role,active,created_at").eq("id",uid).single();
    if(pe){setErr("Profile error: "+pe.message);return}
    setProfile(p);
    const {data,error}=await supabase.from("products").select("*").eq("business_id",p.business_id).order("created_at",{ascending:false});
    if(error){setErr("Products error: "+error.message);return}
    setProducts((data||[]).map(norm));
    await Promise.all([loadSalesHistory(p.business_id),loadMovements(p.business_id)]);
  }

  async function loadSalesHistory(businessId){
    if(!businessId)return;
    setHistoryLoading(true);
    const {data,error}=await supabase.from("sales")
      .select("id,business_id,invoice_no,cashier_id,subtotal,discount,total,payment_method,amount_tendered,change_amount,status,created_at")
      .eq("business_id",businessId).order("created_at",{ascending:false}).limit(500);
    if(error)setErr("Sales History error: "+error.message); else setSalesHistory(data||[]);
    setHistoryLoading(false);
  }

  async function loadMovements(businessId){
    if(!businessId)return;
    setMovementLoading(true);
    const {data,error}=await supabase.from("stock_movements")
      .select("id,business_id,product_id,product_name,movement_type,quantity,stock_before,stock_after,reason,reference_type,reference_id,user_id,created_at")
      .eq("business_id",businessId).order("created_at",{ascending:false}).limit(1000);
    if(error)setErr("Stock Movement error: "+error.message); else setMovements(data||[]);
    setMovementLoading(false);
  }

  async function login(e){
    e.preventDefault(); if(!supabase)return; setErr("");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setErr(error.message);
  }
  async function logout(){
    await supabase?.auth.signOut(); setSession(null); setProfile(null); setCart([]); setSalesHistory([]); setMovements([]);
    setPaymentOpen(false);setPaymentDone(false);setCash("");setReceiptNo("");setRecentScanned([]);setSelectedSale(null);setSaleDetailsOpen(false);
  }

  const filtered=useMemo(()=>{
    const q=search.toLowerCase().trim();
    return !q?products:products.filter(p=>String(p.name).toLowerCase().includes(q)||String(p.barcode).toLowerCase().includes(q));
  },[products,search]);

  function add(product){
    if(product.stock<=0){setStatus("Out of stock: "+product.name);return}
    setCart(c=>{
      const x=c.find(i=>i.id===product.id);
      if(x){
        if(x.qty>=product.stock){setStatus("Maximum available stock reached: "+product.name);return c}
        return c.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i)
      }
      return [...c,{...product,qty:1}]
    });
    setStatus("Added: "+product.name);
  }

  function qty(id,d){
    setCart(c=>c.flatMap(i=>{
      if(i.id!==id)return[i];
      const n=Math.min(i.stock||999999,i.qty+d);
      return n<=0?[]:[{...i,qty:n}]
    }))
  }

  function handleScannedProduct(p){
    setRecentScanned(c=>[{...p,scannedAt:new Date().toISOString()},...c.filter(x=>x.id!==p.id)].slice(0,6));
    add(p);
  }

  useEffect(()=>{
    if(!scan)return;
    const reader=document.getElementById("reader"); if(!reader)return;
    const scanner=new Html5Qrcode("reader");
    scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},code=>{
      const p=products.find(x=>String(x.barcode)===String(code));
      if(p){handleScannedProduct(p);setSearch(p.barcode);setStatus("Scanned: "+p.name)}
      else{setStatus("Barcode not found: "+code);setSearch(code)}
    },()=>{}).catch(e=>setStatus("Camera error: "+e));
    return()=>{scanner.stop().then(()=>scanner.clear()).catch(()=>{})}
  },[scan,products]);

  const subtotal=cart.reduce((s,i)=>s+Number(i.price)*Number(i.qty),0);
  const discount=0,total=subtotal-discount;
  const change=Number(cash||0)-total;

  function paymentLabel(m){return m==="gcash"?"GCash":m==="card"?"Card":"Cash"}

  async function recordMovement({product,quantity,before,after,type,reason,referenceType=null,referenceId=null}){
    const {error}=await supabase.from("stock_movements").insert({
      business_id:profile.business_id,product_id:product.id,product_name:product.name,
      movement_type:type,quantity:Number(quantity),stock_before:Number(before),stock_after:Number(after),
      reason:reason||null,reference_type:referenceType,reference_id:referenceId,user_id:profile.id
    });
    if(error)throw new Error("Stock movement failed: "+error.message);
  }

  async function completePayment(){
    if(savingPayment||!cart.length||!profile?.id||!profile?.business_id)return;
    if(paymentMethod==="cash"&&(!cash||Number(cash)<total))return;
    let w=null;
    if(autoPrintReceipt)w=window.open("","_blank","width=420,height=700");
    setSavingPayment(true);setErr("");setStatus("Saving payment...");
    const invoiceNumber="INV-"+Date.now();
    try{
      const {data:sale,error:se}=await supabase.from("sales").insert({
        business_id:profile.business_id,invoice_no:invoiceNumber,cashier_id:profile.id,
        subtotal:Number(subtotal.toFixed(2)),discount:Number(discount.toFixed(2)),total:Number(total.toFixed(2)),
        payment_method:paymentMethod,amount_tendered:paymentMethod==="cash"?Number(Number(cash).toFixed(2)):Number(total.toFixed(2)),
        change_amount:paymentMethod==="cash"?Number(change.toFixed(2)):0,status:"completed"
      }).select().single();
      if(se)throw new Error("Unable to save sale: "+se.message);
      const items=cart.map(i=>({sale_id:sale.id,product_id:i.id,product_name:i.name,barcode:i.barcode||"",quantity:Number(i.qty),unit_price:Number(i.price),line_total:Number((i.price*i.qty).toFixed(2))}));
      const {error:ie}=await supabase.from("sale_items").insert(items);
      if(ie)throw new Error("Unable to save sale items: "+ie.message);

      for(const item of cart){
        const before=Number(item.stock||0),sold=Number(item.qty||0);
        if(sold>before)throw new Error("Not enough stock for "+item.name);
        const after=before-sold;
        const {error:ue}=await supabase.from("products").update({stock:after,updated_at:new Date().toISOString()}).eq("id",item.id).eq("business_id",profile.business_id);
        if(ue)throw new Error("Unable to update stock for "+item.name+": "+ue.message);
        await recordMovement({product:item,quantity:-sold,before,after,type:"SALE",reason:"Sale",referenceType:"sale",referenceId:sale.id});
      }
      await load(session.user.id);
      setReceiptNo(invoiceNumber);setPaymentOpen(false);setPaymentDone(true);setStatus("Payment saved successfully.");
      if(autoPrintReceipt)printReceipt({receiptNo:invoiceNumber,printWindow:w});
    }catch(e){
      if(w&&!w.closed)w.close();console.error(e);setErr(e.message||"Payment failed.");setStatus("");
    }finally{setSavingPayment(false)}
  }

  function newSale(){
    setCart([]);setCash("");setPaymentMethod("cash");setReceiptNo("");setPaymentDone(false);setPaymentOpen(false);setRecentScanned([]);setErr("");setStatus("Ready for new sale.");
  }

  async function openSaleDetails(sale){
    setSelectedSale(sale);setSelectedSaleItems([]);setSaleDetailsOpen(true);setSaleDetailsLoading(true);
    const {data,error}=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total").eq("sale_id",sale.id).order("id");
    if(error)setErr("Unable to load sale items: "+error.message);else setSelectedSaleItems(data||[]);
    setSaleDetailsLoading(false);
  }

  async function performVoid(){
    if(!voidSale||!profile?.id)return;
    if(!voidReason.trim()){setErr("Please enter a void reason.");return}
    setVoiding(true);setErr("");
    try{
      const {error}=await supabase.rpc("void_sale",{p_sale_id:voidSale.id,p_reason:voidReason.trim()});
      if(error)throw new Error(error.message);
      setStatus("Transaction "+voidSale.invoice_no+" voided successfully.");
      setVoidSale(null);setVoidReason("");await load(session.user.id);
    }catch(e){setErr("Void failed: "+e.message)}finally{setVoiding(false)}
  }

  function openProduct(p=null){
    setEditingProduct(p);
    setProductForm(p?{name:p.name,barcode:p.barcode||"",price:String(p.price),stock:String(p.stock),image_url:p.imageUrl||""}:{name:"",barcode:"",price:"",stock:"",image_url:""});
    setProductModal(true);setErr("");
  }

  async function saveProduct(e){
    e.preventDefault();if(!profile?.business_id)return;
    setSavingProduct(true);setErr("");
    try{
      const payload={business_id:profile.business_id,name:productForm.name.trim(),barcode:productForm.barcode.trim(),
        price:Number(productForm.price||0),stock:Number(productForm.stock||0),image_url:productForm.image_url.trim()||null,updated_at:new Date().toISOString()};
      if(!payload.name)throw new Error("Product name is required.");
      if(editingProduct){
        const before=Number(editingProduct.stock||0),after=payload.stock;
        const {error}=await supabase.from("products").update(payload).eq("id",editingProduct.id).eq("business_id",profile.business_id);
        if(error)throw new Error(error.message);
        if(before!==after)await recordMovement({product:{...editingProduct,name:payload.name,id:editingProduct.id},quantity:after-before,before,after,type:"ADJUSTMENT",reason:"Product edit / stock adjustment"});
        setStatus("Product updated successfully.");
      }else{
        const {data,error}=await supabase.from("products").insert(payload).select().single();
        if(error)throw new Error(error.message);
        if(payload.stock>0)await recordMovement({product:{...data,name:payload.name,id:data.id},quantity:payload.stock,before:0,after:payload.stock,type:"STOCK_IN",reason:"Initial stock"});
        setStatus("Product added successfully.");
      }
      setProductModal(false);await load(session.user.id);
    }catch(e){setErr("Product save failed: "+e.message)}finally{setSavingProduct(false)}
  }

  async function deleteProduct(p){
    if(!confirm(`Delete "${p.name}"? This should only be used for products with no dependent records.`))return;
    setErr("");
    const {error}=await supabase.from("products").delete().eq("id",p.id).eq("business_id",profile.business_id);
    if(error){setErr("Delete failed: "+error.message);return}
    setStatus("Product deleted.");await load(session.user.id);
  }

  async function doRestock(e){
    e.preventDefault();if(!restockProduct)return;
    const n=Number(restockQty);
    if(!Number.isFinite(n)||n<=0){setErr("Enter a valid quantity.");return}
    setSavingProduct(true);setErr("");
    try{
      const before=Number(restockProduct.stock||0),after=before+n;
      const {error}=await supabase.from("products").update({stock:after,updated_at:new Date().toISOString()})
        .eq("id",restockProduct.id).eq("business_id",profile.business_id);
      if(error)throw new Error(error.message);
      await recordMovement({product:restockProduct,quantity:n,before,after,type:"STOCK_IN",reason:restockReason||"Restock"});
      setRestockProduct(null);setRestockQty("");setRestockReason("Restock");setStatus("Stock added successfully.");await load(session.user.id);
    }catch(e){setErr("Restock failed: "+e.message)}finally{setSavingProduct(false)}
  }

  const filteredSales=useMemo(()=>{
    const q=historySearch.toLowerCase().trim();
    return salesHistory.filter(s=>{
      const inv=String(s.invoice_no||"").toLowerCase(),pm=String(s.payment_method||"").toLowerCase(),st=String(s.status||"").toLowerCase();
      const d=s.created_at?new Date(s.created_at).toLocaleDateString("en-CA",{timeZone:"Asia/Manila"}):"";
      return(!q||inv.includes(q))&&(historyPaymentFilter==="all"||pm===historyPaymentFilter)&&(!historyDateFilter||d===historyDateFilter)&&(historyStatusFilter==="all"||st===historyStatusFilter)
    })
  },[salesHistory,historySearch,historyPaymentFilter,historyDateFilter,historyStatusFilter]);

  const lowStock=products.filter(p=>p.stock<=5&&p.stock>0),outStock=products.filter(p=>p.stock<=0);
  const transactionTotal=filteredSales.reduce((s,x)=>s+Number(x.total||0),0);

  function downloadExcel(data,fileName,sheetName="Sheet1"){
    if(!data.length){setStatus("No data available.");return}
    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${fileName}.xlsx`);
    setStatus(`Downloaded: ${fileName}.xlsx`);
  }

  function exportProducts(){downloadExcel(products.map(p=>({Product:p.name,Barcode:p.barcode,Price:p.price,Stock:p.stock,Image:p.imageUrl||""})),`SmallBiz_POS_Inventory_${new Date().toISOString().slice(0,10)}`,"Inventory")}
  function exportTransactions(){downloadExcel(filteredSales.map(s=>({Invoice:s.invoice_no,Date:s.created_at?new Date(s.created_at).toLocaleString("en-PH"):"",Payment:paymentLabel(s.payment_method),Subtotal:Number(s.subtotal||0),Discount:Number(s.discount||0),Total:Number(s.total||0),AmountTendered:Number(s.amount_tendered||0),Change:Number(s.change_amount||0),Status:s.status})),`SmallBiz_POS_Transactions_${new Date().toISOString().slice(0,10)}`,"Transactions")}
  function exportMovements(){downloadExcel(movements.map(m=>({Date:new Date(m.created_at).toLocaleString("en-PH"),Product:m.product_name,Type:m.movement_type,Quantity:Number(m.quantity),StockBefore:Number(m.stock_before),StockAfter:Number(m.stock_after),Reason:m.reason||"",Reference:m.reference_type||""})),`SmallBiz_POS_Stock_Movements_${new Date().toISOString().slice(0,10)}`,"Stock Movements")}

  function printReceipt({receiptNo:rn=receiptNo,printWindow=null}={}){
    const win=printWindow||window.open("","_blank","width=420,height=700");
    if(!win){setErr("Please allow pop-ups to print.");return}
    const cashier=profile?.full_name||"Cashier";
    const rows=cart.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td style="text-align:right">${money(i.price)}</td><td style="text-align:right">${money(i.price*i.qty)}</td></tr>`).join("");
    win.document.write(`<!doctype html><html><head><title>${rn}</title><style>
      body{font-family:Arial;width:360px;margin:auto;padding:20px;color:#111}h1{text-align:center;font-size:22px}.center{text-align:center}.line{border-top:1px dashed #000;margin:12px 0}
      table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:5px 0}.row{display:flex;justify-content:space-between;margin:7px 0}.total{font-size:18px;font-weight:bold}.footer{text-align:center;margin-top:25px}
    </style></head><body><h1>SmallBiz POS</h1><div class="center">Sales Receipt<br>${rn}<br>${new Date().toLocaleString("en-PH")}<br>Cashier: ${cashier}</div><div class="line"></div>
    <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="row"><span>Discount</span><span>${money(discount)}</span></div><div class="row total"><span>TOTAL</span><span>${money(total)}</span></div><div class="line"></div>
    <div class="row"><span>Payment</span><span>${paymentLabel(paymentMethod)}</span></div><div class="row"><span>Amount Paid</span><span>${money(paymentMethod==="cash"?cash:total)}</span></div>
    ${paymentMethod==="cash"?`<div class="row"><span>Change</span><span>${money(change)}</span></div>`:""}<div class="footer">Thank you for your purchase!<br>SmallBiz POS V2.3</div>
    <script>window.onload=()=>window.print()</script></body></html>`);win.document.close();
  }

  if(configError)return <div className="auth"><div className="card"><h1>SmallBiz POS V2.3</h1><h2>Configuration missing</h2><p>Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY</p></div></div>;
  if(!session)return <div className="auth"><form className="login-card" onSubmit={login}><div className="login-logo">🛒</div><h1>SmallBiz POS</h1><p>Sign in to your business account</p><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary">Login</button>{err&&<p className="error">{err}</p>}</form></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon">🛒</div><div><h1>SmallBiz POS</h1><span>V2.3</span></div></div>
      <div className="profile-box"><div className="profile-avatar">👤</div><div><b>{profile?.full_name||"Business Owner"}</b><small>{profile?.role||"owner"}</small><small className="online">● Online</small></div></div>
      <nav className="sidebar-nav">
        {[["pos","🛒","POS"],["transactions","📋","Transactions"],["reports","📊","Reports"],["products","📦","Products"],["movements","🔄","Stock History"]].map(([key,icon,label])=>
          <button key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>setActivePage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>
      <div className="sidebar-bottom">
        <div style={{padding:12,marginBottom:10,borderRadius:12,background:"rgba(255,255,255,.06)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div><b style={{display:"block"}}>🖨️ Auto Print</b><small style={{opacity:.7}}>Print receipt after payment</small></div>
          <button type="button" onClick={()=>{const n=!autoPrintReceipt;setAutoPrintReceipt(n);localStorage.setItem("smallbiz_auto_print_receipt",String(n));setStatus(n?"Auto Print Receipt: ON":"Auto Print Receipt: OFF")}}>{autoPrintReceipt?"ON":"OFF"}</button></div>
        </div>
        <button className="logout-btn" onClick={logout}>↪ Logout</button>
      </div>
    </aside>

    <div className="main-area">
      {status&&<div className="success-status" style={{margin:"12px 20px"}}>✓ {status}</div>}
      {err&&<div className="error-status" style={{margin:"12px 20px"}}>{err}</div>}

      {activePage==="pos"&&<><div className="page-header"><div><h2>🛒 Point of Sale</h2><p>{profile?.full_name||"Business"}</p></div><button className="refresh-btn" onClick={()=>load(session.user.id)}>🔄 Refresh</button></div>
      <div className="pos-layout">
        <section className="products-panel"><div className="panel-title"><div><h2>Products</h2><p>Search or scan a product.</p></div><button className={scan?"scan-btn scanning":"scan-btn"} onClick={()=>{setScan(!scan);setStatus("")}}>📷 {scan?"Close Scanner":"Scan Barcode"}</button></div>
        {scan&&<div className="scanner-box"><div id="reader"></div><small>Allow camera access and point at the barcode.</small></div>}
        <div className="search-row"><span>🔍</span><input className="product-search" placeholder="Search product or barcode..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="products-grid">{filtered.length?filtered.map(p=><div className="product-card" key={p.id}>
          <div className="product-image">{p.imageUrl?<img src={p.imageUrl} alt={p.name}/>:<div className="image-placeholder">📦</div>}</div>
          <div className="product-info"><h3>{p.name}</h3><small>Barcode: {p.barcode||"N/A"}</small><small>Stock: {p.stock}</small></div>
          <div className="product-bottom"><strong>{money(p.price)}</strong><button className="add-cart-btn" disabled={p.stock<=0} onClick={()=>add(p)}>{p.stock>0?"Add to Cart":"Out of Stock"}</button></div>
        </div>):<div className="empty-products">No product found.</div>}</div></section>
        <aside className="right-panel">
          <section className="cart-panel"><div className="right-panel-header"><h2>Cart</h2><span>{cart.reduce((n,i)=>n+i.qty,0)} item(s)</span></div>
            <div className="cart-body">{cart.length?cart.map(i=><div className="cart-item" key={i.id}><div className="cart-item-image">{i.imageUrl?<img src={i.imageUrl} alt={i.name}/>:<span>📦</span>}</div><div className="cart-item-info"><b>{i.name}</b><small>{money(i.price)}</small><div className="qty-controls"><button onClick={()=>qty(i.id,-1)}>−</button><span>{i.qty}</span><button onClick={()=>qty(i.id,1)}>+</button></div></div><strong>{money(i.price*i.qty)}</strong></div>):<div className="cart-empty"><div className="cart-empty-icon">🛒</div><p>Cart is empty.</p></div>}</div>
            <div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>{money(discount)}</b></div><div className="grand-total"><span>TOTAL</span><b>{money(total)}</b></div><button className="payment-btn" disabled={!cart.length} onClick={()=>{setCash("");setPaymentMethod("cash");setErr("");setPaymentOpen(true)}}>💳 Payment</button></div>
          </section>
          <section className="recent-panel"><div className="right-panel-header"><h2>🕘 Recent Scanned</h2></div>{recentScanned.length?<div className="recent-list">{recentScanned.map(i=><div className="recent-item" key={i.id}><div className="recent-image">{i.imageUrl?<img src={i.imageUrl} alt={i.name}/>:<span>📦</span>}</div><div><b>{i.name}</b><small>{i.barcode||"No barcode"}</small></div><button onClick={()=>add(i)}>+</button></div>)}</div>:<div className="recent-empty"><div className="barcode-icon">▥</div><p>No scanned items yet.</p></div>}</section>
        </aside>
      </div></>}

      {activePage==="transactions"&&<section className="page-card"><div className="page-header"><div><h2>📋 Transactions</h2><p>Sales History / Transactions</p></div><div><button className="refresh-btn" onClick={()=>loadSalesHistory(profile.business_id)}>🔄 Refresh</button> <button className="excel-btn" onClick={exportTransactions}>📊 Excel</button></div></div>
        <div className="filters"><input placeholder="Search invoice..." value={historySearch} onChange={e=>setHistorySearch(e.target.value)}/><select value={historyPaymentFilter} onChange={e=>setHistoryPaymentFilter(e.target.value)}><option value="all">All Payments</option><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option></select><input type="date" value={historyDateFilter} onChange={e=>setHistoryDateFilter(e.target.value)}/><select value={historyStatusFilter} onChange={e=>setHistoryStatusFilter(e.target.value)}><option value="all">All Status</option><option value="completed">Completed</option><option value="voided">Voided</option><option value="cancelled">Cancelled</option></select></div>
        <div className="summary-grid"><div><small>Transactions</small><strong>{filteredSales.length}</strong></div><div><small>Total Sales</small><strong>{money(transactionTotal)}</strong></div><div><small>Cash</small><strong>{money(filteredSales.filter(s=>s.payment_method==="cash").reduce((a,s)=>a+Number(s.total||0),0))}</strong></div><div><small>GCash</small><strong>{money(filteredSales.filter(s=>s.payment_method==="gcash").reduce((a,s)=>a+Number(s.total||0),0))}</strong></div><div><small>Card</small><strong>{money(filteredSales.filter(s=>s.payment_method==="card").reduce((a,s)=>a+Number(s.total||0),0))}</strong></div></div>
        {historyLoading?<div className="empty-page">Loading transactions...</div>:<div className="table-wrapper"><table><thead><tr><th>Invoice</th><th>Date</th><th>Payment</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredSales.map(s=><tr key={s.id}><td><b>{s.invoice_no}</b></td><td>{s.created_at?new Date(s.created_at).toLocaleString("en-PH"):"-"}</td><td>{paymentLabel(s.payment_method)}</td><td><b>{money(s.total)}</b></td><td><span className="status-badge">{s.status}</span></td><td><button onClick={()=>openSaleDetails(s)}>🧾 View</button>{s.status==="completed"&&<button onClick={()=>{setVoidSale(s);setVoidReason("");setErr("")}} style={{marginLeft:6}}>↩ Void</button>}</td></tr>)}</tbody></table></div>}</section>}

      {activePage==="reports"&&<section className="page-card"><div className="page-header"><div><h2>📊 Reports</h2><p>Sales and inventory performance.</p></div><button className="refresh-btn" onClick={()=>load(session.user.id)}>🔄 Refresh</button></div>
        <div className="report-grid"><div className="report-card"><small>Total Transactions</small><strong>{salesHistory.length}</strong></div><div className="report-card"><small>Total Sales</small><strong>{money(salesHistory.reduce((a,s)=>a+Number(s.total||0),0))}</strong></div><div className="report-card"><small>Products</small><strong>{products.length}</strong></div><div className="report-card"><small>Low Stock</small><strong>{lowStock.length}</strong></div><div className="report-card"><small>Out of Stock</small><strong>{outStock.length}</strong></div></div>
        <div className="report-download-panel"><div><h3>📥 Download Reports</h3><p>Export your POS data to Excel.</p></div><div className="download-buttons"><button className="excel-btn" onClick={exportTransactions}>📊 Transactions</button><button className="excel-btn" onClick={exportProducts}>📦 Inventory</button><button className="excel-btn" onClick={exportMovements}>🔄 Stock Movements</button></div></div>
      </section>}

      {activePage==="products"&&<section className="page-card"><div className="page-header"><div><h2>📦 Inventory Management</h2><p>Add, edit, restock and manage products.</p></div><div><button className="excel-btn" onClick={exportProducts}>📥 Excel</button> <button className="primary" onClick={()=>openProduct()}>+ Add Product</button></div></div>
        {(lowStock.length||outStock.length)&&<div className="info-box"><b>⚠ Inventory Alert:</b> {lowStock.length} low-stock and {outStock.length} out-of-stock product(s).</div>}
        <div className="table-wrapper"><table><thead><tr><th>Product</th><th>Barcode</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.barcode||"N/A"}</td><td>{money(p.price)}</td><td><b>{p.stock}</b></td><td><button onClick={()=>openProduct(p)}>✏ Edit</button><button onClick={()=>{setRestockProduct(p);setRestockQty("");setRestockReason("Restock")}} style={{marginLeft:5}}>➕ Stock In</button><button onClick={()=>deleteProduct(p)} style={{marginLeft:5}}>🗑 Delete</button></td></tr>)}</tbody></table></div>
      </section>}

      {activePage==="movements"&&<section className="page-card"><div className="page-header"><div><h2>🔄 Stock Movement History</h2><p>Track sales, stock-in and adjustments.</p></div><div><button className="refresh-btn" onClick={()=>loadMovements(profile.business_id)}>🔄 Refresh</button><button className="excel-btn" onClick={exportMovements}>📊 Excel</button></div></div>
        {movementLoading?<div className="empty-page">Loading...</div>:<div className="table-wrapper"><table><thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reason</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString("en-PH")}</td><td>{m.product_name}</td><td>{m.movement_type}</td><td>{m.quantity}</td><td>{m.stock_before}</td><td>{m.stock_after}</td><td>{m.reason||"-"}</td></tr>)}</tbody></table></div>}
      </section>}
    </div>

    {paymentOpen&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>Payment</h2><button onClick={()=>setPaymentOpen(false)}>✕</button></div><div className="payment-total"><span>Total</span><b>{money(total)}</b></div><label>Payment Method</label><div className="payment-methods"><button className={paymentMethod==="cash"?"primary":""} onClick={()=>{setPaymentMethod("cash");setCash("")}}>💵 Cash</button><button className={paymentMethod==="gcash"?"primary":""} onClick={()=>{setPaymentMethod("gcash");setCash("")}}>📱 GCash</button><button className={paymentMethod==="card"?"primary":""} onClick={()=>{setPaymentMethod("card");setCash("")}}>💳 Card</button></div>{paymentMethod==="cash"&&<><label>Cash Received</label><input type="number" min="0" step=".01" value={cash} onChange={e=>setCash(e.target.value)} placeholder="Enter cash amount"/>{cash&&Number(cash)>=total&&<div className="change-box"><span>Change</span><b>{money(change)}</b></div>}</>}{err&&<p className="error">{err}</p>}<div className="modal-buttons"><button onClick={()=>setPaymentOpen(false)}>Cancel</button><button className="primary" disabled={savingPayment||(paymentMethod==="cash"&&(!cash||Number(cash)<total))} onClick={completePayment}>{savingPayment?"Saving...":"Complete Payment"}</button></div></div></div>}

    {paymentDone&&<div className="modal-backdrop"><div className="modal"><div className="success-icon">✓</div><h2>Payment Complete</h2><div className="receipt-summary"><p>Invoice: <b>{receiptNo}</b></p><p>Payment: <b>{paymentLabel(paymentMethod)}</b></p><p>Total: <b>{money(total)}</b></p>{paymentMethod==="cash"&&<><p>Cash: <b>{money(cash)}</b></p><p>Change: <b>{money(change)}</b></p></>}</div><div className="modal-buttons"><button onClick={()=>printReceipt({})}>🖨️ Print Receipt</button><button className="primary" onClick={newSale}>New Sale</button></div></div></div>}

    {productModal&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>{editingProduct?"✏ Edit Product":"➕ Add Product"}</h2><button onClick={()=>setProductModal(false)}>✕</button></div><form onSubmit={saveProduct}><label>Product Name</label><input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} required/><label>Barcode</label><input value={productForm.barcode} onChange={e=>setProductForm({...productForm,barcode:e.target.value})}/><label>Selling Price</label><input type="number" min="0" step=".01" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} required/><label>Stock</label><input type="number" min="0" step="1" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})} required/><label>Image URL</label><input value={productForm.image_url} onChange={e=>setProductForm({...productForm,image_url:e.target.value})} placeholder="https://..."/><div className="modal-buttons"><button type="button" onClick={()=>setProductModal(false)}>Cancel</button><button className="primary" disabled={savingProduct}>{savingProduct?"Saving...":"Save Product"}</button></div></form></div></div>}

    {restockProduct&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>➕ Stock In</h2><button onClick={()=>setRestockProduct(null)}>✕</button></div><p><b>{restockProduct.name}</b><br/>Current stock: {restockProduct.stock}</p><form onSubmit={doRestock}><label>Quantity to Add</label><input type="number" min="1" step="1" value={restockQty} onChange={e=>setRestockQty(e.target.value)} required/><label>Reason</label><input value={restockReason} onChange={e=>setRestockReason(e.target.value)}/><div className="modal-buttons"><button type="button" onClick={()=>setRestockProduct(null)}>Cancel</button><button className="primary" disabled={savingProduct}>{savingProduct?"Saving...":"Add Stock"}</button></div></form></div></div>}

    {voidSale&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>↩ Void Transaction</h2><button onClick={()=>setVoidSale(null)}>✕</button></div><p>Void invoice <b>{voidSale.invoice_no}</b>?</p><p>This will execute the existing <b>void_sale</b> RPC and restore inventory.</p><label>Void Reason</label><textarea value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder="Enter reason..." rows="4"/>{err&&<p className="error">{err}</p>}<div className="modal-buttons"><button onClick={()=>setVoidSale(null)}>Cancel</button><button className="primary" disabled={voiding||!voidReason.trim()} onClick={performVoid}>{voiding?"Voiding...":"Confirm Void"}</button></div></div></div>}

    {saleDetailsOpen&&selectedSale&&<div className="modal-backdrop"><div className="modal sale-details-modal"><div className="modal-header"><h2>🧾 Sale Details</h2><button onClick={()=>setSaleDetailsOpen(false)}>✕</button></div>{saleDetailsLoading?<div>Loading...</div>:<><p>Invoice: <b>{selectedSale.invoice_no}</b></p><p>Status: <b>{selectedSale.status}</b></p><div className="table-wrapper"><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{selectedSaleItems.map(i=><tr key={i.id}><td>{i.product_name}</td><td>{i.quantity}</td><td>{money(i.unit_price)}</td><td>{money(i.line_total)}</td></tr>)}</tbody></table></div><div className="sale-total"><div><span>Subtotal</span><b>{money(selectedSale.subtotal)}</b></div><div className="grand-total"><span>TOTAL</span><b>{money(selectedSale.total)}</b></div></div></>}</div></div>}
  </div>
}

createRoot(document.getElementById("root")).render(<ErrorBoundary><App/></ErrorBoundary>);
