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
      <h1>SmallBiz POS V2.5</h1><h2>App error</h2><pre>{String(this.state.error?.stack||this.state.error)}</pre>
    </div></div>;
    return this.props.children;
  }
}

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configError=!SUPABASE_URL||!SUPABASE_KEY;
const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);

const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));

const SAMPLE_PRODUCT_IMAGES={
  "lucky-me pancit canton":"/product-images/lucky-me-pancit-canton.png",
  "selecta ice cream 1.5l":"/product-images/selecta-ice-cream-1-5l.png",
  "nescafe 3-in-1":"/product-images/nescafe-3-in-1.png",
  "century tuna 180g":"/product-images/century-tuna-180g.png",
  "bear brand 33g":"/product-images/bear-brand-33g.png",
  "coca-cola 1.5l":"/product-images/coca-cola-1-5l.png",
  "piattos 85g":"/product-images/piattos-85g.png",
  "argentina corned beef 175g":"/product-images/argentina-corned-beef-175g.png",
  "safeguard 90g":"/product-images/safeguard-90g.png",
  "surf powder 40g":"/product-images/surf-powder-40g.png"
};
const productImage=p=>{
  const direct=String(p?.imageUrl||p?.image_url||"").trim();
  if(direct)return direct;
  const key=String(p?.name||"").trim().toLowerCase();
  return SAMPLE_PRODUCT_IMAGES[key]||"";
};
const norm=p=>({...p,
  name:p.name??p.product_name??p.productName??p.title??"Unnamed Product",
  barcode:p.barcode??p.bar_code??p.barcode_number??p.sku??"",
  price:Number(p.price??p.selling_price??p.sale_price??0),
  stock:Number(p.stock??p.quantity??p.current_stock??0),
  imageUrl:p.image_url??p.imageUrl??p.image??p.product_image??p.product_image_url??p.photo_url??"",cost_price:Number(p.cost_price??p.cost??p.unit_cost??0),category_id:p.category_id??null
});

function App(){
  const [session,setSession]=useState(null),[email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [products,setProducts]=useState([]),[search,setSearch]=useState(""),[posCategoryFilter,setPosCategoryFilter]=useState("all"),[cart,setCart]=useState([]);
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
  const [productForm,setProductForm]=useState({name:"",barcode:"",price:"",stock:"",cost_price:"",category_id:"",image_url:""});
  const [savingProduct,setSavingProduct]=useState(false),[productSearch,setProductSearch]=useState("");
  const [uploadingProductImage,setUploadingProductImage]=useState(false);
  const [productImageFile,setProductImageFile]=useState(null);
  const [productImagePreview,setProductImagePreview]=useState("");
  const [restockProduct,setRestockProduct]=useState(null),[restockQty,setRestockQty]=useState(""),[restockReason,setRestockReason]=useState("Restock");
  const [movements,setMovements]=useState([]),[movementLoading,setMovementLoading]=useState(false);
  const [voidSale,setVoidSale]=useState(null),[voidReason,setVoidReason]=useState(""),[voiding,setVoiding]=useState(false);
  const [suppliers,setSuppliers]=useState([]),[supplierLoading,setSupplierLoading]=useState(false);
  const [supplierModal,setSupplierModal]=useState(false),[editingSupplier,setEditingSupplier]=useState(null);
  const [supplierForm,setSupplierForm]=useState({name:"",contact_person:"",phone:"",email:"",address:"",tin:""});
  const [savingSupplier,setSavingSupplier]=useState(false),[supplierSearch,setSupplierSearch]=useState("");
  const [purchaseHistory,setPurchaseHistory]=useState([]),[purchaseLoading,setPurchaseLoading]=useState(false);
  const [purchaseSearch,setPurchaseSearch]=useState(""),[purchaseStatusFilter,setPurchaseStatusFilter]=useState("all");
  const [purchaseModal,setPurchaseModal]=useState(false),[receivingPurchase,setReceivingPurchase]=useState(false);
  const [purchaseForm,setPurchaseForm]=useState({supplier_id:"",reference_no:"",purchase_date:new Date().toISOString().slice(0,10),notes:""});
  const [purchaseItems,setPurchaseItems]=useState([{product_id:"",quantity:"",unit_cost:""}]);
  const [selectedPurchase,setSelectedPurchase]=useState(null),[selectedPurchaseItems,setSelectedPurchaseItems]=useState([]),[purchaseDetailsOpen,setPurchaseDetailsOpen]=useState(false),[purchaseDetailsLoading,setPurchaseDetailsLoading]=useState(false);
  const [categories,setCategories]=useState([]),[categoryModal,setCategoryModal]=useState(false),[categoryForm,setCategoryForm]=useState({name:"",description:""}),[savingCategory,setSavingCategory]=useState(false);
  const [customers,setCustomers]=useState([]),[customerModal,setCustomerModal]=useState(false),[editingCustomer,setEditingCustomer]=useState(null),[customerForm,setCustomerForm]=useState({name:"",phone:"",email:"",address:"",tin:""}),[savingCustomer,setSavingCustomer]=useState(false),[customerSearch,setCustomerSearch]=useState("");
  const [selectedCustomerId,setSelectedCustomerId]=useState(""),[paymentReference,setPaymentReference]=useState(""),[discountAmount,setDiscountAmount]=useState(""),[discountReason,setDiscountReason]=useState("");
  const [dashboardRange,setDashboardRange]=useState("today"),[saleItemsHistory,setSaleItemsHistory]=useState([]);
  const [receiptSettings,setReceiptSettings]=useState({businessName:"",tin:"",address:"",phone:""});
  const [receiptSettingsOpen,setReceiptSettingsOpen]=useState(false);
  const [receiptForm,setReceiptForm]=useState({businessName:"",tin:"",address:"",phone:""});
  const [savingReceiptSettings,setSavingReceiptSettings]=useState(false);

  useEffect(()=>{
    if(!supabase)return;
    let mounted=true;
    supabase.auth.getSession().then(({data})=>mounted&&setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>{mounted=false;subscription.unsubscribe()};
  },[]);

  useEffect(()=>{if(session?.user)load(session.user.id)},[session]);
  useEffect(()=>{if(profile?.business_id)loadSaleItemsHistory()},[salesHistory,profile?.business_id]);

  async function load(uid){
    if(!supabase)return;
    setErr("");
    const {data:p,error:pe}=await supabase.from("profiles").select("id,business_id,full_name,role,active,created_at").eq("id",uid).single();
    if(pe){setErr("Profile error: "+pe.message);return}
    setProfile(p);

    const [{data:businessData,error:businessError},{data:settingsData,error:settingsError}]=await Promise.all([
      supabase.from("businesses").select("id,name").eq("id",p.business_id).maybeSingle(),
      supabase.from("business_settings").select("business_id,business_name,tin,address,phone").eq("business_id",p.business_id).maybeSingle()
    ]);
    if(businessError){setErr("Business error: "+businessError.message);return}
    if(settingsError){setErr("Business settings error: "+settingsError.message);return}
    const nextReceiptSettings={
      businessName:String(settingsData?.business_name||businessData?.name||"SmallBiz POS").trim()||"SmallBiz POS",
      tin:String(settingsData?.tin||"").trim(),
      address:String(settingsData?.address||"").trim(),
      phone:String(settingsData?.phone||"").trim()
    };
    setReceiptSettings(nextReceiptSettings);
    setReceiptForm(nextReceiptSettings);

    const {data,error}=await supabase.from("products").select("*").eq("business_id",p.business_id).order("created_at",{ascending:false});
    if(error){setErr("Products error: "+error.message);return}
    setProducts((data||[]).map(norm));
    await Promise.all([loadSalesHistory(p.business_id),loadMovements(p.business_id),loadSuppliers(p.business_id),loadPurchaseHistory(p.business_id),loadCategories(p.business_id),loadCustomers(p.business_id)]);
  }

  async function loadSalesHistory(businessId){
    if(!businessId)return;
    setHistoryLoading(true);
    const {data,error}=await supabase.from("sales")
      .select("id,business_id,invoice_no,cashier_id,customer_id,subtotal,discount,discount_reason,total,payment_method,payment_reference,amount_tendered,change_amount,status,created_at")
      .eq("business_id",businessId).order("created_at",{ascending:false}).limit(500);
    if(error)setErr("Sales History error: "+error.message); else setSalesHistory(data||[]);
    setHistoryLoading(false);
  }

  async function loadSaleItemsHistory(){
    const ids=salesHistory.map(s=>s.id);
    if(!ids.length){setSaleItemsHistory([]);return}
    const {data,error}=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,quantity,unit_price,line_total,cost_price,line_cost,gross_profit").in("sale_id",ids);
    if(!error)setSaleItemsHistory(data||[]);
    else {const fallback=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,quantity,unit_price,line_total").in("sale_id",ids);setSaleItemsHistory(fallback.data||[])}
  }

  async function loadCategories(businessId){const {data,error}=await supabase.from("product_categories").select("id,business_id,name,description,active,created_at,updated_at").eq("business_id",businessId).order("name");if(!error)setCategories(data||[]);}
  async function loadCustomers(businessId){const {data,error}=await supabase.from("customers").select("id,business_id,name,phone,email,address,tin,active,created_at,updated_at").eq("business_id",businessId).order("name");if(!error)setCustomers(data||[]);}

  async function saveReceiptSettings(e){
    e.preventDefault();
    if(!profile?.business_id||!isOwner){setErr("Only the business owner/admin can change receipt business information.");return}
    const businessName=String(receiptForm.businessName||"").trim();
    if(!businessName){setErr("Business Name is required.");return}
    setSavingReceiptSettings(true);setErr("");
    try{
      const payload={
        business_id:profile.business_id,
        business_name:businessName,
        tin:String(receiptForm.tin||"").trim()||null,
        address:String(receiptForm.address||"").trim()||null,
        phone:String(receiptForm.phone||"").trim()||null,
        updated_at:new Date().toISOString()
      };
      const {error}=await supabase.from("business_settings").upsert(payload,{onConflict:"business_id"});
      if(error)throw new Error(error.message);
      const next={businessName,tin:payload.tin||"",address:payload.address||"",phone:payload.phone||""};
      setReceiptSettings(next);
      setReceiptForm(next);
      setReceiptSettingsOpen(false);
      setStatus("Receipt business information saved for this business.");
    }catch(e){setErr("Receipt settings save failed: "+(e?.message||"Unknown error"))}
    finally{setSavingReceiptSettings(false)}
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

  async function loadSuppliers(businessId){
    if(!businessId)return;
    setSupplierLoading(true);
    const {data,error}=await supabase.from("suppliers").select("id,business_id,name,contact_person,phone,email,address,tin,active,created_at,updated_at").eq("business_id",businessId).order("name",{ascending:true});
    if(error)setErr("Supplier error: "+error.message);else setSuppliers(data||[]);
    setSupplierLoading(false);
  }

  async function loadPurchaseHistory(businessId){
    if(!businessId)return;
    setPurchaseLoading(true);
    const {data,error}=await supabase.from("purchases").select("id,business_id,supplier_id,reference_no,purchase_date,subtotal,notes,status,received_by,created_at,updated_at,suppliers(name)").eq("business_id",businessId).order("created_at",{ascending:false}).limit(500);
    if(error)setErr("Purchase History error: "+error.message);else setPurchaseHistory(data||[]);
    setPurchaseLoading(false);
  }

  async function login(e){
    e.preventDefault(); if(!supabase)return; setErr("");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setErr(error.message);
  }
  async function logout(){
    await supabase?.auth.signOut(); setSession(null); setProfile(null); setCart([]); setSalesHistory([]); setMovements([]); setSuppliers([]); setPurchaseHistory([]);
    setPaymentOpen(false);setPaymentDone(false);setCash("");setReceiptNo("");setRecentScanned([]);setSelectedSale(null);setSaleDetailsOpen(false);
  }

  const filtered=useMemo(()=>{
    const q=search.toLowerCase().trim();
    return products.filter(p=>{
      const matchesSearch=!q||String(p.name||"").toLowerCase().includes(q)||String(p.barcode||"").toLowerCase().includes(q);
      const matchesCategory=posCategoryFilter==="all"||String(p.category_id||"")===String(posCategoryFilter);
      return matchesSearch&&matchesCategory;
    });
  },[products,search,posCategoryFilter]);

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
  const discount=Math.max(0,Math.min(subtotal,Number(discountAmount||0)));
  const total=Math.max(0,subtotal-discount);
  const change=Number(cash||0)-total;
  const role=String(profile?.role||"owner").toLowerCase();
  const isOwner=role==="super_admin"||role==="owner"||role==="admin";
  const canSell=isOwner||role==="manager"||role==="cashier";
  const canViewReports=isOwner||role==="manager";
  const canManageInventory=isOwner||role==="manager";
  const canManagePurchasing=isOwner||role==="manager";
  const canManageMasters=isOwner||role==="manager";

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
    if(!canSell){setErr("Your role is not allowed to process sales.");return}
    if(paymentMethod==="cash"&&(!cash||Number(cash)<total))return;
    let w=null;
    if(autoPrintReceipt)w=window.open("","_blank","width=420,height=700");
    setSavingPayment(true);setErr("");setStatus("Saving payment atomically...");
    const invoiceNumber="INV-"+Date.now();
    try{
      // The existing Supabase complete_sale() RPC performs the entire sale
      // as one database transaction: sale + sale items + stock deduction +
      // stock movement. If any step fails, PostgreSQL rolls everything back.
      const items=cart.map(i=>({
        product_id:i.id,
        quantity:Number(i.qty),
        unit_price:Number(Number(i.price).toFixed(2))
      }));

      const {data:saleId,error}=await supabase.rpc("complete_sale",{
        p_business_id:profile.business_id,
        p_invoice_no:invoiceNumber,
        p_cashier_id:profile.id,
        p_customer_id:selectedCustomerId||null,
        p_subtotal:Number(subtotal.toFixed(2)),
        p_discount:Number(discount.toFixed(2)),
        p_discount_reason:discountReason.trim()||null,
        p_total:Number(total.toFixed(2)),
        p_payment_method:paymentMethod,
        p_payment_reference:paymentReference.trim()||null,
        p_amount_tendered:paymentMethod==="cash"?Number(Number(cash).toFixed(2)):Number(total.toFixed(2)),
        p_change_amount:paymentMethod==="cash"?Number(change.toFixed(2)):0,
        p_items:items
      });

      if(error)throw new Error(error.message||"Unable to complete sale.");
      if(!saleId)throw new Error("Sale completed without a sale ID.");

      await load(session.user.id);
      setReceiptNo(invoiceNumber);setPaymentOpen(false);setPaymentDone(true);setStatus("Payment saved successfully. Sale + stock completed atomically.");
      if(autoPrintReceipt)printReceipt({receiptNo:invoiceNumber,printWindow:w});
    }catch(e){
      if(w&&!w.closed)w.close();
      console.error("Atomic sale failed:",e);
      setErr(e?.message||"Payment failed. No sale or stock changes were committed.");
      setStatus("");
    }finally{setSavingPayment(false)}
  }

  function newSale(){
    setCart([]);setCash("");setPaymentMethod("cash");setPaymentReference("");setSelectedCustomerId("");setDiscountAmount("");setDiscountReason("");setReceiptNo("");setPaymentDone(false);setPaymentOpen(false);setRecentScanned([]);setErr("");setStatus("Ready for new sale.");
  }

  async function openSaleDetails(sale){
    setSelectedSale(sale);setSelectedSaleItems([]);setSaleDetailsOpen(true);setSaleDetailsLoading(true);
    const {data,error}=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total").eq("sale_id",sale.id).order("id");
    if(error)setErr("Unable to load sale items: "+error.message);else setSelectedSaleItems(data||[]);
    setSaleDetailsLoading(false);
  }

  async function performVoid(){
    if(!voidSale||!profile?.id)return;if(!isOwner){setErr("Only an owner/admin can void a transaction.");return}
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
    setProductForm(p?{name:p.name,barcode:p.barcode||"",price:String(p.price),stock:String(p.stock),cost_price:String(p.cost_price||0),category_id:p.category_id||"",image_url:p.imageUrl||""}:{name:"",barcode:"",price:"",stock:"",cost_price:"",category_id:"",image_url:""});
    setProductImageFile(null);
    setProductImagePreview(p?.imageUrl||"");
    setProductModal(true);setErr("");
  }

  function selectProductImage(file){
    if(!file)return;
    setErr("");
    if(!file.type.startsWith("image/")){setErr("Please select an image file.");return;}
    if(file.size>5*1024*1024){setErr("Image is too large. Maximum size is 5MB.");return;}
    setProductImageFile(file);
    const preview=URL.createObjectURL(file);
    setProductImagePreview(preview);
  }

  async function uploadProductImage(file){
    if(!file||!profile?.business_id||!supabase)return;

    setErr("");

    if(!file.type.startsWith("image/")){
      setErr("Please select an image file.");
      return;
    }

    if(file.size>5*1024*1024){
      setErr("Image is too large. Maximum size is 5MB.");
      return;
    }

    setUploadingProductImage(true);
    const localPreview=URL.createObjectURL(file);

    try{
      // Keep the selected image visible while the upload is running.
      setProductForm(prev=>({...prev,image_url:localPreview}));

      const ext=(file.name.split(".").pop()||"jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g,"")||"jpg";

      const safeName=file.name
        .replace(/\.[^/\.]+$/,"")
        .replace(/[^a-zA-Z0-9-_]/g,"-")
        .toLowerCase()
        .slice(0,60)||"product";

      const filePath=`${profile.business_id}/${Date.now()}-${safeName}.${ext}`;

      const {error:uploadError}=await supabase.storage
        .from("product-images")
        .upload(filePath,file,{
          cacheControl:"3600",
          upsert:false,
          contentType:file.type
        });

      if(uploadError)throw new Error(uploadError.message);

      // Use a signed URL so the upload also works with a PRIVATE bucket.
      const {data:signedData,error:signedError}=await supabase.storage
        .from("product-images")
        .createSignedUrl(filePath,60*60*24*365);

      if(signedError||!signedData?.signedUrl){
        throw new Error(signedError?.message||"Unable to generate image URL.");
      }

      // Replace the temporary preview with the Supabase URL.
      setProductForm(prev=>({
        ...prev,
        image_url:signedData.signedUrl
      }));

      setStatus("Product image uploaded successfully.");
    }catch(e){
      console.error("Product image upload failed:",e);
      setProductForm(prev=>({...prev,image_url:""}));
      setErr("Image upload failed: "+(e?.message||"Unknown error"));
    }finally{
      URL.revokeObjectURL(localPreview);
      setUploadingProductImage(false);
    }
  }

  async function saveProduct(e){
    e.preventDefault();if(!profile?.business_id||!supabase)return;
    if(!canManageInventory){setErr("Your role is not allowed to manage products.");return}
    setSavingProduct(true);setErr("");
    try{
      let imageUrl=productForm.image_url.trim()||null;

      // Upload only when the user clicks Save Product. This prevents the image
      // from disappearing while the modal is still being edited.
      if(productImageFile){
        setUploadingProductImage(true);
        const file=productImageFile;
        const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
        const safeName=file.name.replace(/\.[^/\.]+$/,"").replace(/[^a-zA-Z0-9-_]/g,"-").toLowerCase().slice(0,60)||"product";
        const filePath=`${profile.business_id}/${Date.now()}-${safeName}.${ext}`;

        const {error:uploadError}=await supabase.storage.from("product-images").upload(filePath,file,{
          cacheControl:"3600",upsert:false,contentType:file.type
        });
        if(uploadError)throw new Error("Image upload failed: "+uploadError.message);

        const {data:signedData,error:signedError}=await supabase.storage.from("product-images").createSignedUrl(filePath,60*60*24*365);
        if(signedError||!signedData?.signedUrl){
          throw new Error("Image URL failed: "+(signedError?.message||"Unable to generate image URL."));
        }
        imageUrl=signedData.signedUrl;
      }

      const payload={business_id:profile.business_id,name:productForm.name.trim(),barcode:productForm.barcode.trim(),
        price:Number(productForm.price||0),cost_price:Number(productForm.cost_price||0),category_id:productForm.category_id||null,stock:Number(productForm.stock||0),image_url:imageUrl,updated_at:new Date().toISOString()};
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
      if(productImagePreview.startsWith("blob:"))URL.revokeObjectURL(productImagePreview);
      setProductImageFile(null);setProductImagePreview("");
      setProductModal(false);await load(session.user.id);
    }catch(e){
      console.error("Product save failed:",e);
      setErr(e?.message||"Product save failed.");
    }finally{setUploadingProductImage(false);setSavingProduct(false)}
  }
  async function deleteProduct(p){
    if(!canManageInventory){setErr("Your role is not allowed to delete products.");return}
    if(!confirm(`Delete "${p.name}"? This should only be used for products with no dependent records.`))return;
    setErr("");
    const {error}=await supabase.from("products").delete().eq("id",p.id).eq("business_id",profile.business_id);
    if(error){setErr("Delete failed: "+error.message);return}
    setStatus("Product deleted.");await load(session.user.id);
  }

  async function doRestock(e){
    e.preventDefault();
    if(!canManageInventory){setErr("Your role is not allowed to restock products.");return}
    if(!restockProduct)return;
    const n=Number(restockQty);
    if(!Number.isFinite(n)||n<=0){setErr("Enter a valid quantity.");return}
    setSavingProduct(true);setErr("");setStatus("Restocking atomically...");
    try{
      // The existing Supabase restock_product() RPC performs the stock
      // increase and stock movement in one database transaction.
      const {data,error}=await supabase.rpc("restock_product",{
        p_business_id:profile.business_id,
        p_product_id:restockProduct.id,
        p_quantity:n,
        p_reason:restockReason.trim()||"Restock"
      });
      if(error)throw new Error(error.message||"Restock failed.");
      if(!data?.success)throw new Error("Restock was not completed.");

      setRestockProduct(null);setRestockQty("");setRestockReason("Restock");
      setStatus("Stock added successfully. Stock + movement completed atomically.");
      await load(session.user.id);
    }catch(e){
      console.error("Atomic restock failed:",e);
      setErr(e?.message||"Restock failed. No stock change was committed.");
      setStatus("");
    }finally{setSavingProduct(false)}
  }

  function openCustomer(c=null){setEditingCustomer(c);setCustomerForm(c?{name:c.name||"",phone:c.phone||"",email:c.email||"",address:c.address||"",tin:c.tin||""}:{name:"",phone:"",email:"",address:"",tin:""});setCustomerModal(true);setErr("");}
  async function saveCustomer(e){e.preventDefault();if(!canManageMasters){setErr("Your role is not allowed to manage customers.");return}setSavingCustomer(true);setErr("");try{const payload={business_id:profile.business_id,name:customerForm.name.trim(),phone:customerForm.phone.trim()||null,email:customerForm.email.trim()||null,address:customerForm.address.trim()||null,tin:customerForm.tin.trim()||null,updated_at:new Date().toISOString()};if(!payload.name)throw new Error("Customer name is required.");if(editingCustomer){const {error}=await supabase.from("customers").update(payload).eq("id",editingCustomer.id).eq("business_id",profile.business_id);if(error)throw new Error(error.message)}else{const {error}=await supabase.from("customers").insert(payload);if(error)throw new Error(error.message)}setCustomerModal(false);setStatus("Customer saved successfully.");await loadCustomers(profile.business_id)}catch(e){setErr(e.message)}finally{setSavingCustomer(false)}}
  async function deactivateCustomer(c){if(!canManageMasters){setErr("Your role is not allowed to deactivate customers.");return}if(!confirm(`Deactivate customer "${c.name}"?`))return;const {error}=await supabase.from("customers").update({active:false,updated_at:new Date().toISOString()}).eq("id",c.id).eq("business_id",profile.business_id);if(error){setErr(error.message);return}await loadCustomers(profile.business_id);setStatus("Customer deactivated.")}
  async function saveCategory(e){e.preventDefault();if(!canManageMasters){setErr("Your role is not allowed to manage categories.");return}setSavingCategory(true);try{const name=categoryForm.name.trim();if(!name)throw new Error("Category name is required.");const {error}=await supabase.from("product_categories").insert({business_id:profile.business_id,name,description:categoryForm.description.trim()||null});if(error)throw new Error(error.message);setCategoryModal(false);setCategoryForm({name:"",description:""});await loadCategories(profile.business_id);setStatus("Category added successfully.")}catch(e){setErr(e.message)}finally{setSavingCategory(false)}}
  const activeCategories=categories.filter(c=>c.active!==false);
  const filteredCustomers=useMemo(()=>{const q=customerSearch.toLowerCase().trim();return customers.filter(c=>!q||[c.name,c.phone,c.email].some(v=>String(v||"").toLowerCase().includes(q)))},[customers,customerSearch]);

  function openSupplier(s=null){
    setEditingSupplier(s);
    setSupplierForm(s?{name:s.name||"",contact_person:s.contact_person||"",phone:s.phone||"",email:s.email||"",address:s.address||"",tin:s.tin||""}:{name:"",contact_person:"",phone:"",email:"",address:"",tin:""});
    setSupplierModal(true);setErr("");
  }

  async function saveSupplier(e){
    e.preventDefault();if(!canManageMasters){setErr("Your role is not allowed to manage suppliers.");return}if(!profile?.business_id)return;
    setSavingSupplier(true);setErr("");
    try{
      const payload={business_id:profile.business_id,name:supplierForm.name.trim(),contact_person:supplierForm.contact_person.trim()||null,phone:supplierForm.phone.trim()||null,email:supplierForm.email.trim()||null,address:supplierForm.address.trim()||null,tin:supplierForm.tin.trim()||null,updated_at:new Date().toISOString()};
      if(!payload.name)throw new Error("Supplier name is required.");
      if(editingSupplier){
        const {error}=await supabase.from("suppliers").update(payload).eq("id",editingSupplier.id).eq("business_id",profile.business_id);
        if(error)throw new Error(error.message);
        setStatus("Supplier updated successfully.");
      }else{
        const {error}=await supabase.from("suppliers").insert(payload);
        if(error)throw new Error(error.message);
        setStatus("Supplier added successfully.");
      }
      setSupplierModal(false);await loadSuppliers(profile.business_id);
    }catch(e){setErr("Supplier save failed: "+e.message)}finally{setSavingSupplier(false)}
  }

  async function deleteSupplier(s){
    if(!canManageMasters){setErr("Your role is not allowed to deactivate suppliers.");return}
    if(!confirm(`Deactivate supplier "${s.name}"?`))return;
    const {error}=await supabase.from("suppliers").update({active:false,updated_at:new Date().toISOString()}).eq("id",s.id).eq("business_id",profile.business_id);
    if(error){setErr("Supplier update failed: "+error.message);return}
    setStatus("Supplier deactivated.");await loadSuppliers(profile.business_id);
  }

  function openPurchase(){
    setPurchaseForm({supplier_id:suppliers.find(s=>s.active!==false)?.id||"",reference_no:"",purchase_date:new Date().toISOString().slice(0,10),notes:""});
    setPurchaseItems([{product_id:products[0]?.id||"",quantity:"",unit_cost:""}]);
    setPurchaseModal(true);setErr("");
  }

  function updatePurchaseItem(index,key,value){setPurchaseItems(items=>items.map((item,i)=>i===index?{...item,[key]:value}:item));}
  function addPurchaseItem(){setPurchaseItems(items=>[...items,{product_id:products[0]?.id||"",quantity:"",unit_cost:""}])}
  function removePurchaseItem(index){setPurchaseItems(items=>items.length<=1?items:items.filter((_,i)=>i!==index))}
  const purchaseSubtotal=purchaseItems.reduce((sum,item)=>sum+(Number(item.quantity||0)*Number(item.unit_cost||0)),0);

  async function receivePurchase(e){
    e.preventDefault();if(!canManagePurchasing){setErr("Your role is not allowed to receive purchases.");return}if(!profile?.business_id||!profile?.id)return;
    if(!purchaseForm.supplier_id){setErr("Please select a supplier.");return}
    const validItems=purchaseItems.filter(i=>i.product_id&&Number(i.quantity)>0&&Number(i.unit_cost)>=0);
    if(!validItems.length){setErr("Add at least one valid purchase item.");return}
    setReceivingPurchase(true);setErr("");setStatus("Receiving purchase...");
    try{
      const {data,error}=await supabase.rpc("receive_purchase",{p_business_id:profile.business_id,p_supplier_id:purchaseForm.supplier_id,p_reference_no:purchaseForm.reference_no.trim()||null,p_purchase_date:purchaseForm.purchase_date,p_notes:purchaseForm.notes.trim()||null,p_received_by:profile.id,p_items:validItems.map(i=>({product_id:i.product_id,quantity:Number(i.quantity),unit_cost:Number(Number(i.unit_cost).toFixed(2))}))});
      if(error)throw new Error(error.message);
      setPurchaseModal(false);setPurchaseForm({supplier_id:"",reference_no:"",purchase_date:new Date().toISOString().slice(0,10),notes:""});setPurchaseItems([{product_id:"",quantity:"",unit_cost:""}]);
      setStatus(`Purchase received successfully. Reference: ${purchaseForm.reference_no||data}`);await load(session.user.id);
    }catch(e){setErr("Receiving failed: "+e.message);setStatus("")}finally{setReceivingPurchase(false)}
  }

  const filteredSuppliers=useMemo(()=>{const q=supplierSearch.toLowerCase().trim();return suppliers.filter(s=>!q||String(s.name||"").toLowerCase().includes(q)||String(s.contact_person||"").toLowerCase().includes(q)||String(s.phone||"").toLowerCase().includes(q))},[suppliers,supplierSearch]);
  const filteredPurchases=useMemo(()=>{const q=purchaseSearch.toLowerCase().trim();return purchaseHistory.filter(p=>{const ref=String(p.reference_no||"").toLowerCase(),supplier=String(p.suppliers?.name||"").toLowerCase(),status=String(p.status||"").toLowerCase();return(!q||ref.includes(q)||supplier.includes(q))&&(purchaseStatusFilter==="all"||status===purchaseStatusFilter)})},[purchaseHistory,purchaseSearch,purchaseStatusFilter]);

  async function openPurchaseDetails(purchase){
    setSelectedPurchase(purchase);setSelectedPurchaseItems([]);setPurchaseDetailsOpen(true);setPurchaseDetailsLoading(true);setErr("");
    const {data,error}=await supabase.from("purchase_items").select("id,purchase_id,product_id,product_name,barcode,quantity,unit_cost,line_total").eq("purchase_id",purchase.id).order("id",{ascending:true});
    if(error)setErr("Unable to load purchase items: "+error.message);else setSelectedPurchaseItems(data||[]);setPurchaseDetailsLoading(false);
  }

  function exportPurchases(){downloadExcel(filteredPurchases.map(p=>({Reference:p.reference_no||"",Date:p.purchase_date||"",Supplier:p.suppliers?.name||"",Subtotal:Number(p.subtotal||0),Status:p.status||"",Notes:p.notes||""})),`SmallBiz_POS_Purchases_${new Date().toISOString().slice(0,10)}`,"Purchases")}

  const filteredSales=useMemo(()=>{
    const q=historySearch.toLowerCase().trim();
    return salesHistory.filter(s=>{
      const inv=String(s.invoice_no||"").toLowerCase(),pm=String(s.payment_method||"").toLowerCase(),st=String(s.status||"").toLowerCase();
      const d=s.created_at?new Date(s.created_at).toLocaleDateString("en-CA",{timeZone:"Asia/Manila"}):"";
      return(!q||inv.includes(q))&&(historyPaymentFilter==="all"||pm===historyPaymentFilter)&&(!historyDateFilter||d===historyDateFilter)&&(historyStatusFilter==="all"||st===historyStatusFilter)
    })
  },[salesHistory,historySearch,historyPaymentFilter,historyDateFilter,historyStatusFilter]);

  const lowStock=products.filter(p=>p.stock<=5&&p.stock>0),outStock=products.filter(p=>p.stock<=0);
  const dashboardSales=useMemo(()=>{const now=new Date();return salesHistory.filter(s=>{if(s.status!=="completed")return false;const d=new Date(s.created_at);if(dashboardRange==="today")return d.toDateString()===now.toDateString();if(dashboardRange==="week"){const st=new Date(now);st.setDate(now.getDate()-6);st.setHours(0,0,0,0);return d>=st}if(dashboardRange==="month")return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();return true})},[salesHistory,dashboardRange]);
  const dashboardIds=new Set(dashboardSales.map(s=>s.id));
  const dashboardItems=saleItemsHistory.filter(i=>dashboardIds.has(i.sale_id));
  const dashboardSalesTotal=dashboardSales.reduce((a,s)=>a+Number(s.total||0),0);
  const dashboardCOGS=dashboardItems.reduce((a,i)=>a+Number(i.line_cost||0),0);
  const dashboardProfit=dashboardSalesTotal-dashboardCOGS;
  const inventoryCostValue=products.reduce((a,p)=>a+Number(p.stock||0)*Number(p.cost_price||0),0);
  const inventoryRetailValue=products.reduce((a,p)=>a+Number(p.stock||0)*Number(p.price||0),0);
  const topProducts=useMemo(()=>{const m={};dashboardItems.forEach(i=>m[i.product_name]=(m[i.product_name]||0)+Number(i.quantity||0));return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8)},[dashboardItems]);
  const filteredMasterProducts=useMemo(()=>{
    const q=productSearch.toLowerCase().trim();
    if(!q)return products;
    return products.filter(p=>
      String(p.name||"").toLowerCase().includes(q) ||
      String(p.barcode||"").toLowerCase().includes(q)
    );
  },[products,productSearch]);
  const transactionTotal=filteredSales.reduce((s,x)=>s+Number(x.total||0),0);

  function downloadExcel(data,fileName,sheetName="Sheet1"){
    if(!data.length){setStatus("No data available.");return}
    const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`${fileName}.xlsx`);
    setStatus(`Downloaded: ${fileName}.xlsx`);
  }

  function exportProducts(){downloadExcel(products.map(p=>({Product:p.name,Category:categories.find(c=>c.id===p.category_id)?.name||"Uncategorized",Barcode:p.barcode,CostPrice:Number(p.cost_price||0),SellingPrice:Number(p.price||0),Stock:p.stock,InventoryCost:Number(p.stock||0)*Number(p.cost_price||0),InventoryRetail:Number(p.stock||0)*Number(p.price||0),Image:p.imageUrl||""})),`SmallBiz_POS_Inventory_${new Date().toISOString().slice(0,10)}`,"Inventory")}
  function exportTransactions(){downloadExcel(filteredSales.map(s=>({Invoice:s.invoice_no,Date:s.created_at?new Date(s.created_at).toLocaleString("en-PH"):"",Payment:paymentLabel(s.payment_method),Reference:s.payment_reference||"",Customer:customers.find(c=>c.id===s.customer_id)?.name||"Walk-in",Subtotal:Number(s.subtotal||0),Discount:Number(s.discount||0),Total:Number(s.total||0),AmountTendered:Number(s.amount_tendered||0),Change:Number(s.change_amount||0),Status:s.status})),`SmallBiz_POS_Transactions_${new Date().toISOString().slice(0,10)}`,"Transactions")}
  function exportMovements(){downloadExcel(movements.map(m=>({Date:new Date(m.created_at).toLocaleString("en-PH"),Product:m.product_name,Type:m.movement_type,Quantity:Number(m.quantity),StockBefore:Number(m.stock_before),StockAfter:Number(m.stock_after),Reason:m.reason||"",Reference:m.reference_type||""})),`SmallBiz_POS_Stock_Movements_${new Date().toISOString().slice(0,10)}`,"Stock Movements")}

  async function reprintSale(sale){
    /* HISTORICAL_REPRINT_V1 */
    if(!canSell){setErr("Your role is not allowed to print receipts.");return}
    if(!sale?.id){setErr("Invalid transaction selected.");return}

    const win=window.open("","_blank","width=420,height=700");
    if(!win){setErr("Please allow pop-ups to print.");return}

    setErr("");
    try{
      const [{data:items,error:itemError},{data:cashierProfile,error:cashierError}]=await Promise.all([
        supabase.from("sale_items")
          .select("id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total")
          .eq("sale_id",sale.id)
          .order("id",{ascending:true}),
        sale.cashier_id
          ? supabase.from("profiles").select("id,full_name").eq("id",sale.cashier_id).eq("business_id",profile.business_id).maybeSingle()
          : Promise.resolve({data:null,error:null})
      ]);

      if(itemError)throw new Error(itemError.message||"Unable to load transaction items.");
      if(cashierError)throw new Error(cashierError.message||"Unable to load cashier information.");
      if(!items?.length)throw new Error("This transaction has no saved line items.");

      const esc=v=>String(v??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/\"/g,"&quot;")
        .replace(/'/g,"&#39;");

      const businessName=esc(String(receiptSettings.businessName||"SmallBiz POS").trim()||"SmallBiz POS");
      const businessTin=esc(String(receiptSettings.tin||"").trim());
      const businessAddress=esc(String(receiptSettings.address||"").trim());
      const businessPhone=esc(String(receiptSettings.phone||"").trim());
      const invoice=esc(sale.invoice_no||sale.id);
      const cashier=esc(cashierProfile?.full_name||"Cashier");
      const customer=esc(customers.find(c=>c.id===sale.customer_id)?.name||"Walk-in Customer");
      const saleDate=sale.created_at?new Date(sale.created_at).toLocaleString("en-PH"):"-";
      const statusText=String(sale.status||"").toLowerCase()==="completed"?"":`<div class="status">${esc(String(sale.status||"").toUpperCase())}</div>`;
      const rows=items.map(i=>`<tr><td>${esc(i.product_name)}</td><td>${Number(i.quantity||0)}</td><td style="text-align:right">${money(i.unit_price)}</td><td style="text-align:right">${money(i.line_total)}</td></tr>`).join("");
      const paymentMethodText=paymentLabel(sale.payment_method);
      const amountPaid=Number(sale.amount_tendered||0);
      const changeAmount=Number(sale.change_amount||0);

      win.document.write(`<!doctype html><html><head><title>${invoice}</title><style>
        body{font-family:Arial,sans-serif;width:360px;margin:auto;padding:20px;color:#111;font-size:12px}
        h1{text-align:center;font-size:22px;margin:0 0 8px}.center{text-align:center}.line{border-top:1px dashed #000;margin:12px 0}
        table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:5px 0;vertical-align:top}.row{display:flex;justify-content:space-between;gap:10px;margin:7px 0}.total{font-size:18px;font-weight:bold}
        .status{text-align:center;font-weight:bold;border:1px solid #000;padding:5px;margin:8px 0}.footer{text-align:center;margin-top:25px}
      </style></head><body>
        <h1>${businessName}</h1>
        <div class="center">${businessAddress?`${businessAddress}<br>`:""}${businessPhone?`Tel: ${businessPhone}<br>`:""}${businessTin?`TIN: ${businessTin}<br>`:""}Sales Receipt<br>${invoice}<br>${esc(saleDate)}<br>Cashier: ${cashier}<br>Customer: ${customer}</div>
        ${statusText}<div class="line"></div>
        <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
        <div class="row"><span>Discount</span><span>${money(sale.discount)}</span></div>
        ${sale.discount_reason?`<div class="row"><span>Reason</span><span>${esc(sale.discount_reason)}</span></div>`:""}
        <div class="row total"><span>TOTAL</span><span>${money(sale.total)}</span></div><div class="line"></div>
        <div class="row"><span>Payment</span><span>${paymentMethodText}</span></div>
        ${sale.payment_reference?`<div class="row"><span>Reference</span><span>${esc(sale.payment_reference)}</span></div>`:""}
        <div class="row"><span>Amount Paid</span><span>${money(amountPaid||sale.total)}</span></div>
        ${String(sale.payment_method||"").toLowerCase()==="cash"?`<div class="row"><span>Change</span><span>${money(changeAmount)}</span></div>`:""}
        <div class="footer">Historical reprint<br>${businessName}</div>
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
      win.document.close();
    }catch(e){
      if(win&&!win.closed)win.close();
      console.error("Historical receipt reprint failed:",e);
      setErr("Reprint failed: "+(e?.message||"Unable to load transaction."));
    }
  }

  function printReceipt({receiptNo:rn=receiptNo,printWindow=null}={}){
    const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
    const win=printWindow||window.open("","_blank","width=420,height=700");
    if(!win){setErr("Please allow pop-ups to print.");return}
    const cashier=profile?.full_name||"Cashier";
    const businessName=esc(String(receiptSettings.businessName||"SmallBiz POS").trim()||"SmallBiz POS");
    const businessTin=esc(String(receiptSettings.tin||"").trim());
    const businessAddress=esc(String(receiptSettings.address||"").trim());
    const businessPhone=esc(String(receiptSettings.phone||"").trim());
    const cashierEsc=esc(cashier);
    const rnEsc=esc(rn);
    const rows=cart.map(i=>`<tr><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td style="text-align:right">${money(i.price)}</td><td style="text-align:right">${money(i.price*i.qty)}</td></tr>`).join("");
    win.document.write(`<!doctype html><html><head><title>${rn}</title><style>
      body{font-family:Arial;width:360px;margin:auto;padding:20px;color:#111}h1{text-align:center;font-size:22px}.center{text-align:center}.line{border-top:1px dashed #000;margin:12px 0}
      table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:5px 0}.row{display:flex;justify-content:space-between;margin:7px 0}.total{font-size:18px;font-weight:bold}.footer{text-align:center;margin-top:25px}
    </style></head><body><h1>${businessName}</h1><div class="center">${businessAddress?`${businessAddress}<br>`:""}${businessPhone?`Tel: ${businessPhone}<br>`:""}${businessTin?`TIN: ${businessTin}<br>`:""}Sales Receipt<br>${rnEsc}<br>${esc(new Date().toLocaleString("en-PH"))}<br>Cashier: ${cashierEsc}</div><div class="line"></div>
    <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="row"><span>Discount</span><span>${money(discount)}</span></div><div class="row total"><span>TOTAL</span><span>${money(total)}</span></div><div class="line"></div>
    <div class="row"><span>Payment</span><span>${paymentLabel(paymentMethod)}</span></div>
    ${paymentMethod!=="cash"&&paymentReference.trim()?`<div class="row"><span>${paymentMethod==="gcash"?"GCash Reference":"Card Approval No."}</span><span>${paymentReference.trim()}</span></div>`:""}
    <div class="row"><span>Amount Paid</span><span>${money(paymentMethod==="cash"?cash:total)}</span></div>
    ${paymentMethod==="cash"?`<div class="row"><span>Change</span><span>${money(change)}</span></div>`:""}<div class="footer">Thank you for your purchase!<br>${businessName}</div>
    <script>window.onload=()=>window.print()</script></body></html>`);win.document.close();
  }

  if(configError)return <div className="auth"><div className="card"><h1>SmallBiz POS V2.5</h1><h2>Configuration missing</h2><p>Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY</p></div></div>;
  if(!session)return <div className="auth"><form className="login-card" onSubmit={login}><div className="login-logo">🛒</div><h1>SmallBiz POS</h1><p>Sign in to your business account</p><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary">Login</button>{err&&<p className="error">{err}</p>}</form></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon">🛒</div><div><h1>SmallBiz POS</h1><span>V2.5</span></div></div>
      <div className="profile-box"><div className="profile-avatar">👤</div><div><b>{profile?.full_name||"Business Owner"}</b><small>{profile?.role||"owner"}</small><small className="online">● Online</small></div></div>
      <nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>setActivePage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>
      <div className="sidebar-bottom">
        <div style={{padding:12,marginBottom:10,borderRadius:12,background:"rgba(255,255,255,.06)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div><b style={{display:"block"}}>🖨️ Auto Print</b><small style={{opacity:.7}}>Print receipt after payment</small></div>
          <button type="button" onClick={()=>{const n=!autoPrintReceipt;setAutoPrintReceipt(n);localStorage.setItem("smallbiz_auto_print_receipt",String(n));setStatus(n?"Auto Print Receipt: ON":"Auto Print Receipt: OFF")}}>{autoPrintReceipt?"ON":"OFF"}</button></div>
        </div>
        {isOwner&&<button className="logout-btn" onClick={()=>{setReceiptForm({...receiptSettings});setReceiptSettingsOpen(true)}}>🧾 Receipt Settings</button>}
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
        <div className="search-row">
          <span>🔍</span>
          <input className="product-search" placeholder="Search product or barcode..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select value={posCategoryFilter} onChange={e=>setPosCategoryFilter(e.target.value)} aria-label="Filter products by category">
            <option value="all">All Categories</option>
            {activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="products-grid">{filtered.length?filtered.map(p=><div className="product-card" key={p.id} style={{overflow:"hidden"}}>
          <div className="product-image" style={{height:170,background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{productImage(p)?<img src={productImage(p)} alt={p.name} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>:<div className="image-placeholder" style={{fontSize:42}}>📦</div>}</div>
          <div className="product-info"><h3>{p.name}</h3><small>Category: {activeCategories.find(c=>c.id===p.category_id)?.name||"Uncategorized"}</small><small>Barcode: {p.barcode||"N/A"}</small><small>Stock: {p.stock}</small></div>
          <div className="product-bottom"><strong>{money(p.price)}</strong><button className="add-cart-btn" disabled={p.stock<=0} onClick={()=>add(p)}>{p.stock>0?"Add to Cart":"Out of Stock"}</button></div>
        </div>):<div className="empty-products">No product found.</div>}</div></section>
        <aside className="right-panel">
          <section className="cart-panel"><div className="right-panel-header"><h2>Cart</h2><span>{cart.reduce((n,i)=>n+i.qty,0)} item(s)</span></div>
            <div className="cart-body">{cart.length?cart.map(i=><div className="cart-item" key={i.id}><div className="cart-item-image">{productImage(i)?<img src={productImage(i)} alt={i.name} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>:<span>📦</span>}</div><div className="cart-item-info"><b>{i.name}</b><small>{money(i.price)}</small><div className="qty-controls"><button onClick={()=>qty(i.id,-1)}>−</button><span>{i.qty}</span><button onClick={()=>qty(i.id,1)}>+</button></div></div><strong>{money(i.price*i.qty)}</strong></div>):<div className="cart-empty"><div className="cart-empty-icon">🛒</div><p>Cart is empty.</p></div>}</div>
            <div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>{money(discount)}</b></div><div className="grand-total"><span>TOTAL</span><b>{money(total)}</b></div><button className="payment-btn" disabled={!cart.length} onClick={()=>{setCash("");setPaymentMethod("cash");setErr("");setPaymentOpen(true)}}>💳 Payment</button></div>
          </section>
          <section className="recent-panel"><div className="right-panel-header"><h2>🕘 Recent Scanned</h2></div>{recentScanned.length?<div className="recent-list">{recentScanned.map(i=><div className="recent-item" key={i.id}><div className="recent-image">{productImage(i)?<img src={productImage(i)} alt={i.name} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>:<span>📦</span>}</div><div><b>{i.name}</b><small>{i.barcode||"No barcode"}</small></div><button onClick={()=>add(i)}>+</button></div>)}</div>:<div className="recent-empty"><div className="barcode-icon">▥</div><p>No scanned items yet.</p></div>}</section>
        </aside>
      </div></>}

      {activePage==="dashboard"&&<section className="page-card"><div className="page-header"><div><h2>📈 Business Dashboard</h2><p>Sales, profit and inventory overview.</p></div><div style={{display:"flex",gap:8}}><select value={dashboardRange} onChange={e=>setDashboardRange(e.target.value)}><option value="today">Today</option><option value="week">Last 7 Days</option><option value="month">This Month</option><option value="all">All Time</option></select><button className="refresh-btn" onClick={()=>load(session.user.id)}>🔄 Refresh</button></div></div><div className="report-grid"><div className="report-card"><small>Sales</small><strong>{money(dashboardSalesTotal)}</strong></div><div className="report-card"><small>Gross Profit</small><strong>{money(dashboardProfit)}</strong></div><div className="report-card"><small>COGS</small><strong>{money(dashboardCOGS)}</strong></div><div className="report-card"><small>Transactions</small><strong>{dashboardSales.length}</strong></div><div className="report-card"><small>Inventory Cost</small><strong>{money(inventoryCostValue)}</strong></div><div className="report-card"><small>Inventory Retail</small><strong>{money(inventoryRetailValue)}</strong></div><div className="report-card"><small>Low Stock</small><strong>{lowStock.length}</strong></div><div className="report-card"><small>Out of Stock</small><strong>{outStock.length}</strong></div></div><div className="info-box" style={{marginTop:18}}><h3>🔥 Top Selling Products</h3>{topProducts.length?topProducts.map(([n,q],i)=><div className="row" key={n}><span>{i+1}. {n}</span><b>{q} pcs</b></div>):<p>No sales data.</p>}</div></section>}

      {activePage==="transactions"&&<section className="page-card"><div className="page-header"><div><h2>📋 Transactions</h2><p>Sales History / Transactions</p></div><div><button className="refresh-btn" onClick={()=>loadSalesHistory(profile.business_id)}>🔄 Refresh</button> <button className="excel-btn" onClick={exportTransactions}>📊 Excel</button></div></div>
        <div className="filters"><input placeholder="Search invoice..." value={historySearch} onChange={e=>setHistorySearch(e.target.value)}/><select value={historyPaymentFilter} onChange={e=>setHistoryPaymentFilter(e.target.value)}><option value="all">All Payments</option><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option></select><input type="date" value={historyDateFilter} onChange={e=>setHistoryDateFilter(e.target.value)}/><select value={historyStatusFilter} onChange={e=>setHistoryStatusFilter(e.target.value)}><option value="all">All Status</option><option value="completed">Completed</option><option value="voided">Voided</option><option value="cancelled">Cancelled</option></select></div>
        <div className="summary-grid"><div><small>Transactions</small><strong>{filteredSales.length}</strong></div><div><small>Total Sales</small><strong>{money(transactionTotal)}</strong></div><div><small>Cash</small><strong>{money(filteredSales.filter(s=>s.payment_method==="cash").reduce((a,s)=>a+Number(s.total||0),0))}</strong></div><div><small>GCash</small><strong>{money(filteredSales.filter(s=>s.payment_method==="gcash").reduce((a,s)=>a+Number(s.total||0),0))}</strong></div><div><small>Card</small><strong>{money(filteredSales.filter(s=>s.payment_method==="card").reduce((a,s)=>a+Number(s.total||0),0))}</strong></div></div>
        {historyLoading?<div className="empty-page">Loading transactions...</div>:<div className="table-wrapper"><table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Reference</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredSales.map(s=><tr key={s.id}><td><b>{s.invoice_no}</b></td><td>{s.created_at?new Date(s.created_at).toLocaleString("en-PH"):"-"}</td><td>{customers.find(c=>c.id===s.customer_id)?.name||"Walk-in"}</td><td>{paymentLabel(s.payment_method)}</td><td>{s.payment_reference||"-"}</td><td><b>{money(s.total)}</b></td><td><span className="status-badge">{s.status}</span></td><td><button onClick={()=>openSaleDetails(s)}>🧾 View</button><button onClick={()=>reprintSale(s)} style={{marginLeft:6}}>🖨️ Reprint</button>{s.status==="completed"&&<button onClick={()=>{setVoidSale(s);setVoidReason("");setErr("")}} style={{marginLeft:6}}>↩ Void</button>}</td></tr>)}</tbody></table></div>}</section>}

      {activePage==="reports"&&<section className="page-card"><div className="page-header"><div><h2>📊 Reports</h2><p>Sales and inventory performance.</p></div><button className="refresh-btn" onClick={()=>load(session.user.id)}>🔄 Refresh</button></div>
        <div className="report-grid"><div className="report-card"><small>Total Transactions</small><strong>{salesHistory.length}</strong></div><div className="report-card"><small>Total Sales</small><strong>{money(salesHistory.reduce((a,s)=>a+Number(s.total||0),0))}</strong></div><div className="report-card"><small>Total Purchases</small><strong>{money(purchaseHistory.reduce((a,p)=>a+Number(p.subtotal||0),0))}</strong></div><div className="report-card"><small>Gross Profit</small><strong>{money(saleItemsHistory.reduce((a,i)=>a+Number(i.gross_profit||0),0))}</strong></div><div className="report-card"><small>Products</small><strong>{products.length}</strong></div><div className="report-card"><small>Low Stock</small><strong>{lowStock.length}</strong></div><div className="report-card"><small>Out of Stock</small><strong>{outStock.length}</strong></div></div>
        <div className="report-download-panel"><div><h3>📥 Download Reports</h3><p>Export your POS data to Excel.</p></div><div className="download-buttons"><button className="excel-btn" onClick={exportTransactions}>📊 Transactions</button><button className="excel-btn" onClick={exportProducts}>📦 Inventory</button><button className="excel-btn" onClick={exportMovements}>🔄 Stock Movements</button><button className="excel-btn" onClick={exportPurchases}>🚚 Purchases</button></div></div>
      </section>}

      {activePage==="products"&&<section className="page-card">
        <div className="page-header">
          <div>
            <h2>📦 Product Management</h2>
            <p>Add, edit, restock, search and manage your inventory.</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="excel-btn" onClick={exportProducts}>📥 Excel</button>
            <button className="primary" onClick={()=>openProduct()}>➕ Add Product</button>
          </div>
        </div>

        <div className="summary-grid">
          <div><small>Total Products</small><strong>{products.length}</strong></div>
          <div><small>Low Stock</small><strong>{lowStock.length}</strong></div>
          <div><small>Out of Stock</small><strong>{outStock.length}</strong></div>
          <div><small>Inventory Units</small><strong>{products.reduce((a,p)=>a+Number(p.stock||0),0)}</strong></div>
        </div>

        {(lowStock.length||outStock.length)&&
          <div className="info-box">
            <b>⚠ Inventory Alert:</b>{" "}
            {lowStock.length} low-stock and {outStock.length} out-of-stock product(s).
          </div>
        }

        <div className="filters" style={{marginTop:16}}>
          <input
            placeholder="🔍 Search product name or barcode..."
            value={productSearch}
            onChange={e=>setProductSearch(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Stock Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMasterProducts.length ? filteredMasterProducts.map(p=>
                <tr key={p.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:42,height:42,borderRadius:8,overflow:"hidden",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {productImage(p) ? <img src={productImage(p)} alt={p.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/> : "📦"}
                      </div>
                      <b>{p.name}</b>
                    </div>
                  </td>
                  <td>{p.barcode||"N/A"}</td>
                  <td>{money(p.price)}</td>
                  <td>
                    <b>{p.stock}</b>{" "}
                    {p.stock<=0 ? <span className="status-badge">OUT</span> :
                     p.stock<=5 ? <span className="status-badge">LOW</span> : null}
                  </td>
                  <td>{money(Number(p.price||0)*Number(p.stock||0))}</td>
                  <td>
                    <button onClick={()=>openProduct(p)}>✏ Edit</button>
                    <button onClick={()=>{setRestockProduct(p);setRestockQty("");setRestockReason("Restock")}} style={{marginLeft:5}}>➕ Stock In</button>
                    <button onClick={()=>deleteProduct(p)} style={{marginLeft:5}}>🗑 Delete</button>
                  </td>
                </tr>
              ) : (
                <tr><td colSpan="6" style={{textAlign:"center",padding:30}}>No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>}

      {activePage==="categories"&&<section className="page-card"><div className="page-header"><div><h2>🏷️ Product Categories</h2><p>Organize your products.</p></div><button className="primary" onClick={()=>{setCategoryForm({name:"",description:""});setCategoryModal(true)}}>➕ Add Category</button></div><div className="table-wrapper"><table><thead><tr><th>Category</th><th>Description</th></tr></thead><tbody>{activeCategories.length?activeCategories.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.description||"-"}</td></tr>):<tr><td colSpan="2" style={{textAlign:"center",padding:30}}>No categories yet.</td></tr>}</tbody></table></div></section>}

      {activePage==="customers"&&<section className="page-card"><div className="page-header"><div><h2>👥 Customers</h2><p>Customer master list.</p></div><button className="primary" onClick={()=>openCustomer()}>➕ Add Customer</button></div><div className="filters"><input placeholder="🔍 Search customer..." value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/></div><div className="table-wrapper"><table><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Action</th></tr></thead><tbody>{filteredCustomers.length?filteredCustomers.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.phone||"-"}</td><td>{c.email||"-"}</td><td><button onClick={()=>openCustomer(c)}>✏ Edit</button></td></tr>):<tr><td colSpan="4" style={{textAlign:"center",padding:30}}>No customers found.</td></tr>}</tbody></table></div></section>}

      {activePage==="purchases"&&<section className="page-card"><div className="page-header"><div><h2>🚚 Purchasing / Receiving</h2><p>Receive new inventory from suppliers and keep a purchase history.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="excel-btn" onClick={exportPurchases}>📊 Excel</button><button className="refresh-btn" onClick={()=>loadPurchaseHistory(profile.business_id)}>🔄 Refresh</button><button className="primary" onClick={openPurchase}>➕ Receive Purchase</button></div></div><div className="summary-grid"><div><small>Total Purchases</small><strong>{purchaseHistory.length}</strong></div><div><small>Received</small><strong>{purchaseHistory.filter(p=>p.status==="received").length}</strong></div><div><small>Purchase Value</small><strong>{money(purchaseHistory.reduce((a,p)=>a+Number(p.subtotal||0),0))}</strong></div><div><small>Active Suppliers</small><strong>{suppliers.filter(s=>s.active!==false).length}</strong></div></div><div className="filters" style={{marginTop:16}}><input placeholder="🔍 Search reference or supplier..." value={purchaseSearch} onChange={e=>setPurchaseSearch(e.target.value)}/><select value={purchaseStatusFilter} onChange={e=>setPurchaseStatusFilter(e.target.value)}><option value="all">All Status</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select></div>{purchaseLoading?<div className="empty-page">Loading purchases...</div>:<div className="table-wrapper"><table><thead><tr><th>Date</th><th>Reference</th><th>Supplier</th><th>Subtotal</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredPurchases.length?filteredPurchases.map(p=><tr key={p.id}><td>{p.purchase_date||"-"}</td><td><b>{p.reference_no||p.id.slice(0,8)}</b></td><td>{p.suppliers?.name||"-"}</td><td><b>{money(p.subtotal)}</b></td><td><span className="status-badge">{p.status}</span></td><td><button onClick={()=>openPurchaseDetails(p)}>🧾 View</button></td></tr>):<tr><td colSpan="6" style={{textAlign:"center",padding:30}}>No purchases found.</td></tr>}</tbody></table></div>}</section>}

      {activePage==="suppliers"&&<section className="page-card"><div className="page-header"><div><h2>🏢 Suppliers</h2><p>Manage your supplier master list.</p></div><button className="primary" onClick={()=>openSupplier()}>➕ Add Supplier</button></div><div className="filters"><input placeholder="🔍 Search supplier, contact or phone..." value={supplierSearch} onChange={e=>setSupplierSearch(e.target.value)}/></div>{supplierLoading?<div className="empty-page">Loading suppliers...</div>:<div className="table-wrapper"><table><thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th>Action</th></tr></thead><tbody>{filteredSuppliers.length?filteredSuppliers.map(s=><tr key={s.id}><td><b>{s.name}</b>{s.active===false&&<span className="status-badge" style={{marginLeft:6}}>INACTIVE</span>}</td><td>{s.contact_person||"-"}</td><td>{s.phone||"-"}</td><td>{s.email||"-"}</td><td>{s.address||"-"}</td><td><button onClick={()=>openSupplier(s)}>✏ Edit</button>{s.active!==false&&<button onClick={()=>deleteSupplier(s)} style={{marginLeft:6}}>⛔ Deactivate</button>}</td></tr>):<tr><td colSpan="6" style={{textAlign:"center",padding:30}}>No suppliers found.</td></tr>}</tbody></table></div>}</section>}

      {activePage==="movements"&&<section className="page-card"><div className="page-header"><div><h2>🔄 Stock Movement History</h2><p>Track sales, stock-in and adjustments.</p></div><div><button className="refresh-btn" onClick={()=>loadMovements(profile.business_id)}>🔄 Refresh</button><button className="excel-btn" onClick={exportMovements}>📊 Excel</button></div></div>
        {movementLoading?<div className="empty-page">Loading...</div>:<div className="table-wrapper"><table><thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reason</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString("en-PH")}</td><td>{m.product_name}</td><td>{m.movement_type}</td><td>{m.quantity}</td><td>{m.stock_before}</td><td>{m.stock_after}</td><td>{m.reason||"-"}</td></tr>)}</tbody></table></div>}
      </section>}
    </div>

    {paymentOpen&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>Payment</h2><button onClick={()=>setPaymentOpen(false)}>✕</button></div><div className="payment-total"><span>Total</span><b>{money(total)}</b></div><label>Payment Method</label><div className="payment-methods"><button className={paymentMethod==="cash"?"primary":""} onClick={()=>{setPaymentMethod("cash");setCash("")}}>💵 Cash</button><button className={paymentMethod==="gcash"?"primary":""} onClick={()=>{setPaymentMethod("gcash");setCash("")}}>📱 GCash</button><button className={paymentMethod==="card"?"primary":""} onClick={()=>{setPaymentMethod("card");setCash("")}}>💳 Card</button></div><label>Customer</label><select value={selectedCustomerId} onChange={e=>setSelectedCustomerId(e.target.value)}><option value="">Walk-in Customer</option>{customers.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label>Discount</label><input type="number" min="0" max={subtotal} step=".01" value={discountAmount} onChange={e=>setDiscountAmount(e.target.value)} placeholder="0.00"/>{discount>0&&<><label>Discount Reason</label><input value={discountReason} onChange={e=>setDiscountReason(e.target.value)} placeholder="Promo / Senior / Manager approval"/></>}{paymentMethod!=="cash"&&<><label>Payment Reference</label><input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="GCash reference / card approval no."/></>}{paymentMethod==="cash"&&<><label>Cash Received</label><input type="number" min="0" step=".01" value={cash} onChange={e=>setCash(e.target.value)} placeholder="Enter cash amount"/>{cash&&Number(cash)>=total&&<div className="change-box"><span>Change</span><b>{money(change)}</b></div>}</>}{err&&<p className="error">{err}</p>}<div className="modal-buttons"><button onClick={()=>setPaymentOpen(false)}>Cancel</button><button className="primary" disabled={savingPayment||(paymentMethod==="cash"&&(!cash||Number(cash)<total))} onClick={completePayment}>{savingPayment?"Saving...":"Complete Payment"}</button></div></div></div>}

    {paymentDone&&<div className="modal-backdrop"><div className="modal"><div className="success-icon">✓</div><h2>Payment Complete</h2><div className="receipt-summary"><p>Invoice: <b>{receiptNo}</b></p><p>Payment: <b>{paymentLabel(paymentMethod)}</b></p>{paymentMethod!=="cash"&&paymentReference.trim()&&<p>{paymentMethod==="gcash"?"GCash Reference":"Card Approval No."}: <b>{paymentReference}</b></p>}<p>Total: <b>{money(total)}</b></p>{paymentMethod==="cash"&&<><p>Cash: <b>{money(cash)}</b></p><p>Change: <b>{money(change)}</b></p></>}</div><div className="modal-buttons"><button onClick={()=>printReceipt({})}>🖨️ Print Receipt</button><button className="primary" onClick={newSale}>New Sale</button></div></div></div>}

    {productModal&&<div className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <h2>{editingProduct?"✏ Edit Product":"➕ Add Product"}</h2>
            <button onClick={()=>setProductModal(false)}>✕</button>
          </div>

          <form onSubmit={saveProduct}>
            <label>Product Name</label>
            <input
              value={productForm.name}
              onChange={e=>setProductForm({...productForm,name:e.target.value})}
              placeholder="e.g. Coca-Cola 1.5L"
              required
            />

            <label>Barcode / SKU</label>
            <input
              value={productForm.barcode}
              onChange={e=>setProductForm({...productForm,barcode:e.target.value})}
              placeholder="Scan or type barcode"
            />

            <label>Cost Price</label><input type="number" min="0" step=".01" value={productForm.cost_price} onChange={e=>setProductForm({...productForm,cost_price:e.target.value})} placeholder="Purchase cost / unit" />
            <label>Category</label><select value={productForm.category_id} onChange={e=>setProductForm({...productForm,category_id:e.target.value})}><option value="">Uncategorized</option>{activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <label>Selling Price</label>
            <input
              type="number"
              min="0"
              step=".01"
              value={productForm.price}
              onChange={e=>setProductForm({...productForm,price:e.target.value})}
              placeholder="0.00"
              required
            />

            <label>Current Stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={productForm.stock}
              onChange={e=>setProductForm({...productForm,stock:e.target.value})}
              required
            />

            <label>Product Image</label>
            <div style={{border:"1px dashed #cbd5e1",borderRadius:12,padding:14,background:"#f8fafc"}}>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingProductImage||savingProduct}
                onChange={e=>{
                  const file=e.target.files?.[0];
                  if(file)selectProductImage(file);
                  e.target.value="";
                }}
              />
              <small style={{display:"block",marginTop:7,color:"#7b8794"}}>
                Select a product image from your device. Maximum 5MB. The image will upload when you click Save Product.
              </small>
              {uploadingProductImage&&
                <div style={{marginTop:10,color:"#1769e0",fontWeight:700}}>
                  ⏳ Uploading image...
                </div>
              }
            </div>

            {(productImagePreview||productForm.image_url)&&
              <div style={{margin:"12px 0",textAlign:"center"}}>
                <img
                  src={productImagePreview||productForm.image_url}
                  alt="Product Preview"
                  style={{width:120,height:120,objectFit:"contain",borderRadius:12,border:"1px solid #ddd",background:"#fff"}}
                />
                <small style={{display:"block",marginTop:6,color:"#14733d"}}>✓ Image selected</small>
              </div>
            }

            {editingProduct&&
              <div className="info-box" style={{marginTop:10}}>
                Editing this product's stock will automatically create a stock adjustment history record.
              </div>
            }

            <div className="modal-buttons">
              <button type="button" onClick={()=>setProductModal(false)}>Cancel</button>
              <button className="primary" disabled={savingProduct||uploadingProductImage}>
                {uploadingProductImage?"Uploading image...":savingProduct?"Saving...":"Save Product"}
              </button>
            </div>
          </form>
        </div>
      </div>}

    {restockProduct&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>➕ Stock In</h2><button onClick={()=>setRestockProduct(null)}>✕</button></div><p><b>{restockProduct.name}</b><br/>Current stock: {restockProduct.stock}</p><form onSubmit={doRestock}><label>Quantity to Add</label><input type="number" min="1" step="1" value={restockQty} onChange={e=>setRestockQty(e.target.value)} required/><label>Reason</label><input value={restockReason} onChange={e=>setRestockReason(e.target.value)}/><div className="modal-buttons"><button type="button" onClick={()=>setRestockProduct(null)}>Cancel</button><button className="primary" disabled={savingProduct}>{savingProduct?"Saving...":"Add Stock"}</button></div></form></div></div>}

    {voidSale&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>↩ Void Transaction</h2><button onClick={()=>setVoidSale(null)}>✕</button></div><p>Void invoice <b>{voidSale.invoice_no}</b>?</p><p>This will execute the existing <b>void_sale</b> RPC and restore inventory.</p><label>Void Reason</label><textarea value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder="Enter reason..." rows="4"/>{err&&<p className="error">{err}</p>}<div className="modal-buttons"><button onClick={()=>setVoidSale(null)}>Cancel</button><button className="primary" disabled={voiding||!voidReason.trim()} onClick={performVoid}>{voiding?"Voiding...":"Confirm Void"}</button></div></div></div>}

    {supplierModal&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>{editingSupplier?"✏ Edit Supplier":"➕ Add Supplier"}</h2><button onClick={()=>setSupplierModal(false)}>✕</button></div><form onSubmit={saveSupplier}><label>Supplier Name</label><input value={supplierForm.name} onChange={e=>setSupplierForm({...supplierForm,name:e.target.value})} placeholder="e.g. ABC Trading" required/><label>Contact Person</label><input value={supplierForm.contact_person} onChange={e=>setSupplierForm({...supplierForm,contact_person:e.target.value})}/><label>Phone</label><input value={supplierForm.phone} onChange={e=>setSupplierForm({...supplierForm,phone:e.target.value})}/><label>Email</label><input type="email" value={supplierForm.email} onChange={e=>setSupplierForm({...supplierForm,email:e.target.value})}/><label>Address</label><textarea rows="2" value={supplierForm.address} onChange={e=>setSupplierForm({...supplierForm,address:e.target.value})}/><label>TIN</label><input value={supplierForm.tin} onChange={e=>setSupplierForm({...supplierForm,tin:e.target.value})}/><div className="modal-buttons"><button type="button" onClick={()=>setSupplierModal(false)}>Cancel</button><button className="primary" disabled={savingSupplier}>{savingSupplier?"Saving...":"Save Supplier"}</button></div></form></div></div>}

    {customerModal&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>{editingCustomer?"✏ Edit Customer":"➕ Add Customer"}</h2><button onClick={()=>setCustomerModal(false)}>✕</button></div><form onSubmit={saveCustomer}><label>Name</label><input value={customerForm.name} onChange={e=>setCustomerForm({...customerForm,name:e.target.value})} required/><label>Phone</label><input value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm,phone:e.target.value})}/><label>Email</label><input type="email" value={customerForm.email} onChange={e=>setCustomerForm({...customerForm,email:e.target.value})}/><label>Address</label><textarea rows="2" value={customerForm.address} onChange={e=>setCustomerForm({...customerForm,address:e.target.value})}/><div className="modal-buttons"><button type="button" onClick={()=>setCustomerModal(false)}>Cancel</button><button className="primary" disabled={savingCustomer}>{savingCustomer?"Saving...":"Save Customer"}</button></div></form></div></div>}
    {categoryModal&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>🏷️ Add Category</h2><button onClick={()=>setCategoryModal(false)}>✕</button></div><form onSubmit={saveCategory}><label>Category Name</label><input value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required/><label>Description</label><textarea rows="3" value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/><div className="modal-buttons"><button type="button" onClick={()=>setCategoryModal(false)}>Cancel</button><button className="primary" disabled={savingCategory}>{savingCategory?"Saving...":"Save Category"}</button></div></form></div></div>}
    {receiptSettingsOpen&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><h2>🧾 Receipt / Business Information</h2><button onClick={()=>setReceiptSettingsOpen(false)}>✕</button></div><p>These details are stored per business in Supabase and will appear on printed receipts for every cashier under this business.</p><form onSubmit={saveReceiptSettings}><label>Business Name</label><input value={receiptForm.businessName||""} onChange={e=>setReceiptForm({...receiptForm,businessName:e.target.value})} placeholder="Your registered business name" required/><label>TIN</label><input value={receiptForm.tin||""} onChange={e=>setReceiptForm({...receiptForm,tin:e.target.value})} placeholder="000-000-000-000"/><label>Business Address</label><textarea rows="2" value={receiptForm.address||""} onChange={e=>setReceiptForm({...receiptForm,address:e.target.value})} placeholder="Complete business address"/><label>Contact Number</label><input value={receiptForm.phone||""} onChange={e=>setReceiptForm({...receiptForm,phone:e.target.value})} placeholder="09xx xxx xxxx"/><div className="modal-buttons"><button type="button" onClick={()=>setReceiptSettingsOpen(false)}>Cancel</button><button className="primary" disabled={savingReceiptSettings}>{savingReceiptSettings?"Saving...":"Save Receipt Settings"}</button></div></form></div></div>}
    {purchaseModal&&<div className="modal-backdrop"><div className="modal" style={{maxWidth:850}}><div className="modal-header"><h2>🚚 Receive Purchase</h2><button onClick={()=>setPurchaseModal(false)}>✕</button></div><form onSubmit={receivePurchase}><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}><div><label>Supplier</label><select value={purchaseForm.supplier_id} onChange={e=>setPurchaseForm({...purchaseForm,supplier_id:e.target.value})} required><option value="">Select supplier</option>{suppliers.filter(s=>s.active!==false).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label>Purchase Date</label><input type="date" value={purchaseForm.purchase_date} onChange={e=>setPurchaseForm({...purchaseForm,purchase_date:e.target.value})} required/></div><div><label>Reference / Invoice No.</label><input value={purchaseForm.reference_no} onChange={e=>setPurchaseForm({...purchaseForm,reference_no:e.target.value})} placeholder="Supplier invoice no."/></div><div><label>Notes</label><input value={purchaseForm.notes} onChange={e=>setPurchaseForm({...purchaseForm,notes:e.target.value})} placeholder="Optional notes"/></div></div><div className="table-wrapper" style={{marginTop:14}}><table><thead><tr><th style={{minWidth:220}}>Product</th><th>Qty</th><th>Unit Cost</th><th>Line Total</th><th></th></tr></thead><tbody>{purchaseItems.map((item,index)=><tr key={index}><td><select value={item.product_id} onChange={e=>updatePurchaseItem(index,"product_id",e.target.value)} required><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}{p.barcode?` (${p.barcode})`:""}</option>)}</select></td><td><input type="number" min="1" step="1" value={item.quantity} onChange={e=>updatePurchaseItem(index,"quantity",e.target.value)} required/></td><td><input type="number" min="0" step="0.01" value={item.unit_cost} onChange={e=>updatePurchaseItem(index,"unit_cost",e.target.value)} required/></td><td><b>{money(Number(item.quantity||0)*Number(item.unit_cost||0))}</b></td><td><button type="button" onClick={()=>removePurchaseItem(index)}>🗑</button></td></tr>)}</tbody></table></div><button type="button" onClick={addPurchaseItem} style={{marginTop:10}}>➕ Add Item</button><div className="sale-total" style={{marginTop:14}}><div className="grand-total"><span>TOTAL PURCHASE</span><b>{money(purchaseSubtotal)}</b></div></div>{err&&<p className="error">{err}</p>}<div className="modal-buttons"><button type="button" onClick={()=>setPurchaseModal(false)}>Cancel</button><button className="primary" disabled={receivingPurchase||!purchaseItems.length}>{receivingPurchase?"Receiving...":"Receive & Add Stock"}</button></div></form></div></div>}

    {purchaseDetailsOpen&&selectedPurchase&&<div className="modal-backdrop"><div className="modal sale-details-modal"><div className="modal-header"><h2>🧾 Purchase Details</h2><button onClick={()=>setPurchaseDetailsOpen(false)}>✕</button></div>{purchaseDetailsLoading?<div>Loading...</div>:<><p><b>Reference:</b> {selectedPurchase.reference_no||selectedPurchase.id}</p><p><b>Date:</b> {selectedPurchase.purchase_date||"-"}</p><p><b>Supplier:</b> {selectedPurchase.suppliers?.name||"-"}</p><p><b>Status:</b> {selectedPurchase.status}</p><div className="table-wrapper"><table><thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>{selectedPurchaseItems.map(i=><tr key={i.id}><td>{i.product_name}</td><td>{i.quantity}</td><td>{money(i.unit_cost)}</td><td>{money(i.line_total)}</td></tr>)}</tbody></table></div><div className="sale-total"><div className="grand-total"><span>TOTAL PURCHASE</span><b>{money(selectedPurchase.subtotal)}</b></div></div></>}</div></div>}

    {saleDetailsOpen&&selectedSale&&<div className="modal-backdrop"><div className="modal sale-details-modal"><div className="modal-header"><h2>🧾 Sale Details</h2><button onClick={()=>setSaleDetailsOpen(false)}>✕</button></div>{saleDetailsLoading?<div>Loading...</div>:<><p>Invoice: <b>{selectedSale.invoice_no}</b></p><p>Status: <b>{selectedSale.status}</b></p><div className="table-wrapper"><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{selectedSaleItems.map(i=><tr key={i.id}><td>{i.product_name}</td><td>{i.quantity}</td><td>{money(i.unit_price)}</td><td>{money(i.line_total)}</td></tr>)}</tbody></table></div><div className="sale-total"><div><span>Subtotal</span><b>{money(selectedSale.subtotal)}</b></div><div className="grand-total"><span>TOTAL</span><b>{money(selectedSale.total)}</b></div></div></>}</div></div>}
  </div>
}

createRoot(document.getElementById("root")).render(<ErrorBoundary><App/></ErrorBoundary>);
