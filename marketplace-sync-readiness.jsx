import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import {buildMockMarketplaceOrder} from "./marketplace-mock-provider.js";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=url&&key?createClient(url,key):null;
const MARKETPLACES=["shopee","lazada","tiktok_shop"];
const icon=c=>c==="shopee"?"🛍️":c==="lazada"?"🛒":"🎵";
const roles=["owner","admin","super_admin"];
const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));

function Panel({profile,onClose}){
 const [rows,setRows]=useState([]),[maps,setMaps]=useState([]),[orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[demo,setDemo]=useState(null);
 const admin=roles.includes(String(profile?.role||"").toLowerCase());
 async function load(){
  if(!sb||!profile?.business_id)return;
  setLoading(true);setError("");
  try{
   const {data:c,error:ce}=await sb.from("sales_channels").select("id,code,name,platform_enabled,enabled").eq("business_id",profile.business_id).in("code",MARKETPLACES).order("name");
   if(ce)throw ce;
   const channels=c||[];const ids=channels.map(x=>x.id);
   if(!ids.length){setRows(channels);setMaps([]);setOrders([]);return;}
   const [{data:m,error:me},{data:o,error:oe}]=await Promise.all([
    sb.from("product_channel_mappings").select("id,sales_channel_id,product_id,external_sku,external_product_name,enabled").eq("business_id",profile.business_id).in("sales_channel_id",ids).order("created_at",{ascending:false}).limit(500),
    sb.from("external_orders").select("id,sales_channel_id,external_order_no,total,order_status,fulfillment_status,created_at").eq("business_id",profile.business_id).in("sales_channel_id",ids).order("created_at",{ascending:false}).limit(500)
   ]);
   if(me)throw me;if(oe)throw oe;
   setRows(channels);setMaps(m||[]);setOrders(o||[]);
  }catch(e){setRows([]);setMaps([]);setOrders([]);setError(e?.message||String(e));}
  finally{setLoading(false);}
 }
 useEffect(()=>{load()},[profile?.business_id]);
 const stats=useMemo(()=>({orders:orders.length,mapped:maps.filter(x=>x.enabled!==false&&x.product_id).length,unmapped:maps.filter(x=>!x.product_id).length,value:orders.reduce((a,x)=>a+Number(x.total||0),0)}),[orders,maps]);

 async function runMockOrder(sequence=1){
  if(!sb||!profile?.business_id||!admin)return;
  setBusy(true);setError("");setMsg("");setDemo(null);
  try{
   const {data:channel,error:ce}=await sb.from("sales_channels").select("id,code,name").eq("business_id",profile.business_id).eq("code","shopee").maybeSingle();
   if(ce)throw ce;if(!channel)throw new Error("Shopee channel record is missing for this business.");
   const {data:product,error:pe}=await sb.from("products").select("id,name,sku,barcode,price,stock,active").eq("business_id",profile.business_id).eq("active",true).gt("stock",0).order("created_at",{ascending:true}).limit(1).maybeSingle();
   if(pe)throw pe;if(!product)throw new Error("No active product with stock is available for the demo order.");
   const externalSku=product.sku||product.barcode||`DEMO-SKU-${product.id.slice(0,8)}`;
   const {data:mapping,error:me}=await sb.from("product_channel_mappings").upsert({business_id:profile.business_id,product_id:product.id,sales_channel_id:channel.id,external_product_id:`DEMO-PRODUCT-${String(sequence).padStart(4,"0")}`,external_sku:externalSku,external_product_name:product.name,enabled:true,updated_at:new Date().toISOString()},{onConflict:"business_id,product_id,sales_channel_id"}).select("id").single();
   if(me)throw me;
   const fixture=buildMockMarketplaceOrder({businessId:profile.business_id,channelCode:"shopee",productId:product.id,sku:externalSku,productName:product.name,quantity:2,unitPrice:Number(product.price||0),sequence});
   const payload={...fixture.order,sales_channel_id:channel.id,raw_payload:{source:"smallbiz_mock",idempotency_key:fixture.idempotencyKey,fixture:fixture.order}};
   let order=null;
   const {data:existing,error:ee}=await sb.from("external_orders").select("id,external_order_no,fulfillment_status,total").eq("business_id",profile.business_id).eq("sales_channel_id",channel.id).eq("external_order_no",fixture.order.external_order_no).maybeSingle();
   if(ee)throw ee;
   if(existing){order=existing;}else{
    const {data:created,error:oe}=await sb.from("external_orders").insert(payload).select("id,external_order_no,fulfillment_status,total").single();
    if(oe){
      const {data:retry}=await sb.from("external_orders").select("id,external_order_no,fulfillment_status,total").eq("business_id",profile.business_id).eq("sales_channel_id",channel.id).eq("external_order_no",fixture.order.external_order_no).maybeSingle();
      if(!retry)throw oe;order=retry;
    }else order=created;
   }
   const {data:item,error:ie}=await sb.from("external_order_items").select("id,external_order_id,product_id,quantity").eq("business_id",profile.business_id).eq("external_order_id",order.id).maybeSingle();
   if(ie)throw ie;
   if(!item){const {error:ie2}=await sb.from("external_order_items").insert({...fixture.items[0],business_id:profile.business_id,external_order_id:order.id,product_channel_mapping_id:mapping.id}).select("id").single();if(ie2)throw ie2;}
   const {data:reservation,error:re}=await sb.rpc("reserve_external_order",{p_external_order_id:order.id});
   if(re)throw re;
   setDemo({orderNo:order.external_order_no,product:product.name,stockBefore:Number(product.stock),reserved:2,reservationStatus:reservation?.status||"reserved",duplicate:!!existing});
   setMsg(existing?`Duplicate test passed: ${order.external_order_no} was reused without creating another order or reservation.`:`Mock order ${order.external_order_no} imported and stock reserved.`);
   await load();
  }catch(e){setError(e?.message||String(e));}
  finally{setBusy(false);}
 }

 return <div className="msr-overlay"><div className="msr-panel"><header><div><div className="msr-kicker">SMALLBIZ POS</div><h2>🌐 Marketplace Order Center</h2><p>One queue for Shopee, Lazada and TikTok Shop. API credentials remain server-side.</p></div><button onClick={onClose}>✕</button></header>{msg&&<div className="msr-ok">✓ {msg}</div>}{error&&<div className="msr-error">{error}</div>}
 <div className="msr-stats"><div><b>{stats.orders}</b><span>Imported Orders</span></div><div><b>{stats.mapped}</b><span>SKU Mappings</span></div><div><b>{stats.unmapped}</b><span>Needs Mapping</span></div><div><b>{money(stats.value)}</b><span>Order Value</span></div></div>
 <section><h3>Channel Readiness</h3><div className="msr-grid">{rows.map(c=><article key={c.id}><div className="msr-icon">{icon(c.code)}</div><div><b>{c.name}</b><small>{c.platform_enabled?"Platform enabled":"Platform disabled"} • {c.enabled?"Channel active":"Channel inactive"}</small><p>{c.platform_enabled?"Ready for OAuth credentials and server-side sync adapter.":"Enable this channel first from Platform Channel Admin."}</p></div></article>)}</div></section>
 <section><h3>Order Flow</h3><div className="msr-flow"><span>Marketplace API</span><i>→</i><span>Raw Order</span><i>→</i><span>SKU Mapping</span><i>→</i><span>Stock Reservation</span><i>→</i><span>Fulfillment</span><i>→</i><span>Accounting Report</span></div></section>
 {admin&&<section><h3>🧪 No-Cost Demo Test</h3><p className="msr-demo-copy">Creates a clearly tagged mock Shopee order using an existing in-stock product. It tests import, SKU mapping and the real stock-reservation RPC without contacting Shopee and without deducting physical stock.</p><div className="msr-demo-actions"><button disabled={busy} onClick={()=>runMockOrder(1)}>{busy?"Running…":"Create / Test Mock Order"}</button><button disabled={busy} onClick={()=>runMockOrder(1)}>Run Duplicate Test</button></div>{demo&&<div className="msr-demo-result"><b>Demo result</b><span>Order: {demo.orderNo}</span><span>Product: {demo.product}</span><span>Reserved: {demo.reserved}</span><span>Reservation: {demo.reservationStatus}</span><span>{demo.duplicate?"Duplicate safely reused existing order":"New order created"}</span></div>}</section>}
 <section><h3>Current Queue</h3>{loading?<div className="msr-empty">Loading...</div>:orders.length===0?<div className="msr-empty">No marketplace orders imported yet. The order database is ready for connector sync.</div>:<div className="msr-table"><table><thead><tr><th>Order</th><th>Status</th><th>Fulfillment</th><th>Total</th><th>Date</th></tr></thead><tbody>{orders.slice(0,50).map(o=><tr key={o.id}><td>{o.external_order_no}</td><td>{o.order_status||"—"}</td><td>{String(o.fulfillment_status||"new").replaceAll("_"," ")}</td><td>{money(o.total)}</td><td>{new Date(o.created_at).toLocaleString("en-PH")}</td></tr>)}</tbody></table></div>}</section>
 <div className="msr-note"><b>Next connector step:</b> configure each marketplace's official API credentials and server-side adapter. We do not fake live order synchronization. The demo uses the same <code>external_orders</code> / <code>external_order_items</code> pipeline and the real stock reservation RPC.</div>
 <button className="msr-refresh" onClick={load}>↻ Refresh</button>
 </div></div>
}
function App(){const [profile,setProfile]=useState(null),[open,setOpen]=useState(false);useEffect(()=>{if(!sb)return;sb.auth.getSession().then(async({data})=>{const uid=data.session?.user?.id;if(!uid)return;const {data:p}=await sb.from("profiles").select("id,business_id,role,active").eq("id",uid).maybeSingle();setProfile(p||null)});const {data:{subscription}}=sb.auth.onAuthStateChange(async(_,s)=>{const uid=s?.user?.id;if(!uid){setProfile(null);return}const {data:p}=await sb.from("profiles").select("id,business_id,role,active").eq("id",uid).maybeSingle();setProfile(p||null)});return()=>subscription.unsubscribe()},[]);useEffect(()=>{if(!profile||!roles.includes(String(profile.role||"").toLowerCase()))return;const id="smallbiz-marketplace-order-center";const mount=()=>{if(document.getElementById(id))return;const nav=document.querySelector(".sidebar-nav");if(!nav)return;const b=document.createElement("button");b.id=id;b.type="button";b.className="nav-item";b.innerHTML='<span>🌐</span><b>Marketplace Order Center</b>';b.onclick=()=>setOpen(true);nav.appendChild(b)};const ob=new MutationObserver(mount);ob.observe(document.body,{childList:true,subtree:true});const t=setTimeout(mount,300);return()=>{ob.disconnect();clearTimeout(t);document.getElementById(id)?.remove()}},[profile?.id,profile?.role]);return open&&profile?<Panel profile={profile} onClose={()=>setOpen(false)}/>:null}
const style=document.createElement("style");style.textContent=`.msr-overlay{position:fixed;inset:0;z-index:100002;background:rgba(15,23,42,.66);padding:20px;overflow:auto;display:flex;justify-content:center}.msr-panel{width:min(1120px,100%);background:#fff;border-radius:22px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.3);color:#0f172a}.msr-panel header{display:flex;justify-content:space-between;gap:18px}.msr-panel header button{border:0;background:#f1f5f9;border-radius:10px;padding:9px 12px;font-size:18px;height:max-content}.msr-kicker{font-size:11px;font-weight:800;letter-spacing:.15em;color:#64748b}.msr-panel h2{margin:4px 0}.msr-panel header p{margin:0;color:#64748b}.msr-ok,.msr-error,.msr-note{margin:14px 0;padding:12px;border-radius:11px;font-size:13px}.msr-ok{background:#f0fdf4;color:#166534}.msr-error{background:#fef2f2;color:#b91c1c}.msr-note{background:#eff6ff;color:#1e40af;line-height:1.5}.msr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.msr-stats div{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:14px}.msr-stats b{display:block;font-size:22px}.msr-stats span{font-size:11px;color:#64748b}.msr-panel section{border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:14px}.msr-panel h3{margin:0 0 12px}.msr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.msr-grid article{display:flex;gap:10px;padding:13px;border-radius:13px;background:#f8fafc}.msr-icon{font-size:28px}.msr-grid b{display:block}.msr-grid small{display:block;color:#64748b;margin-top:3px}.msr-grid p{font-size:12px;color:#475569;line-height:1.4}.msr-flow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.msr-flow span{background:#f1f5f9;padding:9px 11px;border-radius:9px;font-size:12px;font-weight:700}.msr-flow i{color:#64748b}.msr-table{overflow:auto}.msr-table table{width:100%;border-collapse:collapse;min-width:700px}.msr-table th,.msr-table td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:12px}.msr-table th{background:#f8fafc}.msr-empty{text-align:center;padding:28px;color:#64748b}.msr-refresh{margin-top:14px;border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 12px;font-weight:700}.msr-demo-copy{margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5}.msr-demo-actions{display:flex;gap:8px;flex-wrap:wrap}.msr-demo-actions button{border:0;background:#0f172a;color:#fff;border-radius:9px;padding:10px 13px;font-weight:800}.msr-demo-actions button:disabled{opacity:.45}.msr-demo-result{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.msr-demo-result span,.msr-demo-result b{background:#f8fafc;padding:8px 10px;border-radius:8px;font-size:12px}.msr-demo-result b{color:#166534}@media(max-width:700px){.msr-overlay{padding:8px}.msr-panel{padding:15px}.msr-stats{grid-template-columns:1fr 1fr}.msr-grid{grid-template-columns:1fr}.msr-demo-result{grid-template-columns:1fr}}`;document.head.appendChild(style);const root=document.createElement("div");root.id="marketplace-order-center-root";document.body.appendChild(root);createRoot(root).render(<App/>);