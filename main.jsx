import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import * as XLSX from "xlsx";
import "./styles.css";
import "./cashier-shift.css";
import "./cashier-shift.jsx";

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