import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,sb=url&&key?createClient(url,key):null;
const ADMIN_ROLES=["owner","admin","super_admin"];
const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));
const esc=s=>String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const FLOW=[
 {key:"unfulfilled",label:"New",next:"processing",action:"Start Processing"},
 {key:"processing",label:"Processing",next:"packed",action:"Mark as Packed"},
 {key:"packed",label:"Packed",next:"ready_to_ship",action:"Ready to Ship"},
 {key:"ready_to_ship",label:"Ready to Ship",next:"shipped",action:"Mark as Shipped"},
 {key:"shipped",label:"Shipped",next:"completed",action:"Mark as Completed"},
 {key:"completed",label:"Completed",next:null,action:null}
];
const LABELS={unfulfilled:"New",processing:"Processing",packed:"Packed",ready_to_ship:"Ready to Ship",shipped:"Shipped",completed:"Completed",cancelled:"Cancelled"};
const ORDER_STATUS={processing:"preparing",packed:"packed",ready_to_ship:"packed",shipped:"shipped",completed:"completed",cancelled:"cancelled"};
const label=s=>LABELS[String(s||"unfulfilled").toLowerCase()]||String(s||"").replaceAll("_"," ");

function OrderManagement({profile,onClose}){
 const [orders,setOrders]=useState([]),[channels,setChannels]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [filter,setFilter]=useState("all"),[channelFilter,setChannelFilter]=useState("all"),[search,setSearch]=useState("");
 const [selected,setSelected]=useState(null),[items,setItems]=useState([]),[shipment,setShipment]=useState(null),[history,setHistory]=useState([]),[detailOpen,setDetailOpen]=useState(false),[saving,setSaving]=useState(false);
 const admin=ADMIN_ROLES.includes(String(profile?.role||"").toLowerCase());

 async function load(){
  if(!sb||!profile?.business_id)return;setLoading(true);setError("");
  const [{data:o,error:oe},{data:c,error:ce}]=await Promise.all([
   sb.from("external_orders").select("id,business_id,sales_channel_id,external_order_no,customer_name,customer_phone,payment_method,total,order_status,fulfillment_status,ordered_at,created_at,updated_at,sales_channels(name,code)").eq("business_id",profile.business_id).order("created_at",{ascending:false}).limit(500),
   sb.from("sales_channels").select("id,name,code").eq("business_id",profile.business_id).order("name")
  ]);
  if(oe)setError(oe.message);else setOrders(o||[]);
  if(ce)setError(ce.message);else setChannels(c||[]);
  setLoading(false);
 }
 useEffect(()=>{load()},[profile?.business_id]);

 const counts=useMemo(()=>{
  const c={all:orders.length,unfulfilled:0,processing:0,packed:0,ready_to_ship:0,shipped:0,completed:0,cancelled:0};
  orders.forEach(o=>{const s=String(o.fulfillment_status||"unfulfilled").toLowerCase();if(c[s]!==undefined)c[s]++});return c;
 },[orders]);
 const filtered=useMemo(()=>orders.filter(o=>{
  const q=search.trim().toLowerCase(),s=String(o.fulfillment_status||"unfulfilled").toLowerCase();
  return (!q||[o.external_order_no,o.customer_name,o.customer_phone,o.sales_channels?.name].some(v=>String(v||"").toLowerCase().includes(q)))&&(filter==="all"||s===filter)&&(channelFilter==="all"||o.sales_channel_id===channelFilter);
 }),[orders,search,filter,channelFilter]);

 async function openOrder(o){
  setSelected(o);setDetailOpen(true);setError("");setNotice("");
  const [{data:i,error:ie},{data:s,error:se},{data:h,error:he}]=await Promise.all([
   sb.from("external_order_items").select("id,product_id,product_name,external_sku,quantity,unit_price,line_total").eq("business_id",profile.business_id).eq("external_order_id",o.id).order("created_at"),
   sb.from("order_shipments").select("*").eq("business_id",profile.business_id).eq("external_order_id",o.id).maybeSingle(),
   sb.from("audit_logs").select("id,action,details,created_at").eq("business_id",profile.business_id).eq("action","external_order_fulfillment_changed").contains("details",{external_order_id:o.id}).order("created_at",{ascending:true})
  ]);
  if(ie)setError(ie.message);if(se)setError(se.message);if(he&&he.code!=="42P01")setError(he.message);
  setItems(i||[]);setShipment(s||{status:"pending",carrier:"",service:"",tracking_no:"",waybill_no:"",recipient_name:o.customer_name||"",recipient_phone:o.customer_phone||"",recipient_address:""});setHistory(h||[]);
 }

 async function transition(next){
  if(!admin||!selected||saving)return;
  const current=String(selected.fulfillment_status||"unfulfilled").toLowerCase(),step=FLOW.find(x=>x.key===current);
  if(!step||step.next!==next){setError(`Invalid transition: ${label(current)} → ${label(next)}`);return;}
  if(next==="shipped"){
   const s=shipment||{};
   if(!String(s.recipient_name||"").trim()||!String(s.recipient_address||"").trim()||(!String(s.waybill_no||"").trim()&&!String(s.tracking_no||"").trim())){
    setError("Save recipient, address, and waybill/tracking details before shipping.");return;
   }
  }
  setSaving(true);setError("");setNotice("");const now=new Date().toISOString();
  const patch={fulfillment_status:next,updated_at:now};if(ORDER_STATUS[next])patch.order_status=ORDER_STATUS[next];
  const result=await sb.from("external_orders").update(patch).eq("id",selected.id).eq("business_id",profile.business_id);
  if(result.error){setError(result.error.message);setSaving(false);return;}
  const detail={external_order_id:selected.id,external_order_no:selected.external_order_no,from_status:current,to_status:next};
  const {data:log}=await sb.from("audit_logs").insert({business_id:profile.business_id,user_id:profile.id,action:"external_order_fulfillment_changed",details:detail,created_at:now}).select("id,action,details,created_at").maybeSingle();
  if(log)setHistory(h=>[...h,log]);
  const updated={...selected,...patch};setSelected(updated);setOrders(xs=>xs.map(o=>o.id===selected.id?updated:o));setNotice(`${selected.external_order_no} → ${label(next)}`);setSaving(false);
 }

 async function saveShipment(e){
  e.preventDefault();if(!admin||!selected||saving)return;setSaving(true);setError("");setNotice("");
  const p={business_id:profile.business_id,external_order_id:selected.id,carrier:String(shipment?.carrier||"").trim()||null,service:String(shipment?.service||"").trim()||null,tracking_no:String(shipment?.tracking_no||"").trim()||null,waybill_no:String(shipment?.waybill_no||"").trim()||null,recipient_name:String(shipment?.recipient_name||"").trim()||null,recipient_phone:String(shipment?.recipient_phone||"").trim()||null,recipient_address:String(shipment?.recipient_address||"").trim()||null,status:String(shipment?.status||"pending"),updated_at:new Date().toISOString()};
  const q=shipment?.id?sb.from("order_shipments").update(p).eq("id",shipment.id).eq("business_id",profile.business_id):sb.from("order_shipments").insert(p).select("*").single();
  const r=await q;if(r.error)setError(r.error.message);else{setShipment(r.data||p);setNotice("Shipment details saved.");}setSaving(false);
 }

 function printDoc(type){
  if(!selected)return;const s=shipment||{};
  const rows=items.map(i=>`<tr><td>${esc(i.product_name)}</td><td>${esc(i.external_sku||"")}</td><td>${esc(i.quantity)}</td>${type==="waybill"?`<td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td>`:""}</tr>`).join("");
  const title=type==="waybill"?"SHIPPING WAYBILL":"PACKING SLIP";
  const extra=type==="waybill"?`<div class="grid"><div><b>SHIP TO</b><br>${esc(s.recipient_name||selected.customer_name||"")}<br>${esc(s.recipient_phone||selected.customer_phone||"")}<br>${esc(s.recipient_address||"")}</div><div><b>SHIPMENT</b><br>Carrier: ${esc(s.carrier||"—")}<br>Service: ${esc(s.service||"—")}<br>Waybill: ${esc(s.waybill_no||"—")}<br>Tracking: ${esc(s.tracking_no||"—")}</div></div>`:`<p><b>Customer:</b> ${esc(s.recipient_name||selected.customer_name||"")}</p><p>${esc(s.recipient_address||"")}</p>`;
  const head=type==="waybill"?`<tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Total</th></tr>`:`<tr><th>Product</th><th>SKU</th><th>Qty</th></tr>`;
  const win=window.open("","_blank","width=900,height=1000");if(!win){alert("Please allow pop-ups to print.");return;}
  win.document.write(`<html><head><title>${title} ${esc(selected.external_order_no)}</title><style>body{font-family:Arial;padding:25px;color:#111}.box{border:2px solid #111;padding:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0}.grid>div{border:1px solid #bbb;padding:12px;min-height:90px}table{width:100%;border-collapse:collapse;margin-top:18px}td,th{border:1px solid #aaa;padding:9px;text-align:left}th{background:#eee}.track{text-align:center;border:2px dashed #111;padding:12px;margin:18px 0;font-size:20px;font-weight:800}</style></head><body><div class="box"><h1>${title}</h1><p><b>Order:</b> ${esc(selected.external_order_no)}</p>${extra}${type==="waybill"?`<div class="track">${esc(s.tracking_no||s.waybill_no||selected.external_order_no)}</div>`:""}<table>${head}${rows||`<tr><td colspan="${type==="waybill"?5:3}">No items</td></tr>`}</table>${type==="waybill"?`<h2 style="text-align:right">Total: ${money(selected.total)}</h2>`:""}<script>window.onload=()=>setTimeout(()=>window.print(),200)</script></div></body></html>`);win.document.close();
  if(type==="waybill"&&shipment?.id)sb.from("order_shipments").update({printed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",shipment.id).eq("business_id",profile.business_id).then(()=>{});
 }

 const current=String(selected?.fulfillment_status||"unfulfilled").toLowerCase(),step=FLOW.find(x=>x.key===current),currentIndex=Math.max(0,FLOW.findIndex(x=>x.key===current));
 return <div className="om-overlay"><div className="om-panel">
  <header><div><div className="om-kicker">SMALLBIZ POS</div><h2>📦 Order Management</h2><p>Central order queue for POS, Shopee, Lazada, TikTok Shop and future online connectors.</p></div><button className="om-x" onClick={onClose}>✕</button></header>
  {notice&&<div className="om-success">✓ {notice}</div>}{error&&<div className="om-error">{error}</div>}
  <div className="om-stats">{[["all","All Orders"],["unfulfilled","New"],["processing","To Process"],["packed","To Pack"],["ready_to_ship","Ready to Ship"],["shipped","Shipped"],["completed","Completed"],["cancelled","Cancelled"]].map(([k,l])=><button key={k} className={filter===k?"active":""} onClick={()=>setFilter(k)}><b>{counts[k]||0}</b><span>{l}</span></button>)}</div>
  <div className="om-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, customer, channel..."/><select value={channelFilter} onChange={e=>setChannelFilter(e.target.value)}><option value="all">All Channels</option>{channels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={load}>↻ Refresh</button></div>
  {loading?<div className="om-empty">Loading orders...</div>:!filtered.length?<div className="om-empty"><b>No orders in this queue</b><p>Marketplace orders will appear here after connector synchronization.</p></div>:<div className="om-table"><table><thead><tr><th>Order</th><th>Channel</th><th>Customer</th><th>Total</th><th>Order Status</th><th>Fulfillment</th><th></th></tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td><b>{o.external_order_no}</b><small>{new Date(o.ordered_at||o.created_at).toLocaleString("en-PH")}</small></td><td>{o.sales_channels?.name||"Unknown"}</td><td>{o.customer_name||"—"}</td><td><b>{money(o.total)}</b></td><td>{o.order_status||"—"}</td><td><span className="om-status">{label(o.fulfillment_status)}</span></td><td><button className="om-open" onClick={()=>openOrder(o)}>Open</button></td></tr>)}</tbody></table></div>}
  {detailOpen&&selected&&<div className="om-detail-overlay"><div className="om-detail">
   <div className="om-detail-head"><div><div className="om-kicker">ORDER DETAILS</div><h3>{selected.external_order_no}</h3><p>{selected.sales_channels?.name||"Online Channel"} • {selected.customer_name||"Customer"}</p></div><button className="om-x" onClick={()=>setDetailOpen(false)}>✕</button></div>
   <section className="om-section"><h4>Order</h4><div className="om-line"><span>Total</span><b>{money(selected.total)}</b></div><div className="om-line"><span>Payment</span><b>{selected.payment_method||"—"}</b></div><div className="om-line"><span>Order Status</span><b>{selected.order_status||"—"}</b></div></section>
   <section className="om-section"><h4>Items</h4>{items.length?<div className="om-items">{items.map(i=><div key={i.id}><span>{i.product_name}<small>{i.external_sku||""}</small></span><b>x{i.quantity}</b><strong>{money(i.line_total)}</strong></div>)}</div>:<div className="om-muted">No item lines imported yet.</div>}</section>
   <section className="om-section"><div className="om-section-head"><h4>Workflow</h4><span className="om-status">{label(current)}</span></div>
    <div className="om-progress">{FLOW.map((x,i)=><div key={x.key} className={i<currentIndex?"done":i===currentIndex?"current":""}><span>{i<currentIndex?"✓":i+1}</span><small>{x.label}</small></div>)}</div>
    {step?.next?<div className="om-next"><div><b>Next step</b><span>{step.action}</span></div><button disabled={!admin||saving} className="om-primary" onClick={()=>transition(step.next)}>{saving?"Saving...":step.action}</button></div>:<div className="om-complete">✓ Order workflow completed.</div>}
   </section>
   <section className="om-section"><div className="om-section-head"><h4>🚚 Shipment / Waybill</h4><span className="om-status">{shipment?.status||"pending"}</span></div>
    <form onSubmit={saveShipment} className="om-form"><input placeholder="Recipient name" value={shipment?.recipient_name||""} onChange={e=>setShipment({...shipment,recipient_name:e.target.value})}/><input placeholder="Recipient phone" value={shipment?.recipient_phone||""} onChange={e=>setShipment({...shipment,recipient_phone:e.target.value})}/><textarea placeholder="Recipient address" value={shipment?.recipient_address||""} onChange={e=>setShipment({...shipment,recipient_address:e.target.value})}/><input placeholder="Carrier" value={shipment?.carrier||""} onChange={e=>setShipment({...shipment,carrier:e.target.value})}/><input placeholder="Service" value={shipment?.service||""} onChange={e=>setShipment({...shipment,service:e.target.value})}/><input placeholder="Waybill number" value={shipment?.waybill_no||""} onChange={e=>setShipment({...shipment,waybill_no:e.target.value})}/><input placeholder="Tracking number" value={shipment?.tracking_no||""} onChange={e=>setShipment({...shipment,tracking_no:e.target.value})}/><select value={shipment?.status||"pending"} onChange={e=>setShipment({...shipment,status:e.target.value})}><option value="pending">Pending</option><option value="packed">Packed</option><option value="ready_to_ship">Ready to Ship</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select><button disabled={!admin||saving} className="om-primary">{saving?"Saving...":"Save Shipment"}</button></form>
    <div className="om-actions"><button onClick={()=>printDoc("waybill")}>🖨️ Print Waybill</button><button onClick={()=>printDoc("packing")}>📄 Packing Slip</button></div>
   </section>
   <section className="om-section"><h4>Activity</h4>{history.length?<div className="om-history">{history.map(h=><div key={h.id}><span>✓</span><div><b>{label(h.details?.to_status)}</b><small>{new Date(h.created_at).toLocaleString("en-PH")}</small></div></div>)}</div>:<div className="om-muted">No workflow history yet. New connector orders will start here.</div>}</section>
   <div className="om-note">The workflow now uses the database's real fulfillment statuses: New → Processing → Packed → Ready to Ship → Shipped → Completed.</div>
  </div></div>}
 </div></div>;
}
function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[open,setOpen]=useState(false);
 useEffect(()=>{if(!sb)return;sb.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=sb.auth.onAuthStateChange((_,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(session?.user)sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",session.user.id).maybeSingle().then(({data})=>setProfile(data))},[session?.user?.id]);
 useEffect(()=>{if(!profile||!session||!ADMIN_ROLES.includes(String(profile.role||"").toLowerCase()))return;const id="smallbiz-order-management-button",mount=()=>{if(document.getElementById(id))return;const nav=document.querySelector(".sidebar-nav");if(!nav)return;const b=document.createElement("button");b.id=id;b.className="nav-item";b.type="button";b.innerHTML="<span>📦</span><b>Order Management</b>";b.onclick=()=>setOpen(true);nav.appendChild(b)};const ob=new MutationObserver(mount);ob.observe(document.body,{childList:true,subtree:true});const t=setTimeout(mount,300);return()=>{ob.disconnect();clearTimeout(t);document.getElementById(id)?.remove()}},[profile?.id,profile?.role,session?.user?.id]);
 return open&&profile?<OrderManagement profile={profile} onClose={()=>setOpen(false)}/>:null;
}
const style=document.createElement("style");style.textContent=`.om-overlay{position:fixed;inset:0;background:rgba(15,23,42,.66);z-index:100000;display:flex;justify-content:center;align-items:flex-start;padding:24px;overflow:auto}.om-panel{width:min(1200px,100%);background:#fff;color:#0f172a;border-radius:20px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.3);max-height:calc(100vh - 48px);overflow:auto}.om-panel header,.om-detail-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.om-panel h2{margin:2px 0 4px;font-size:26px}.om-panel header p{margin:0;color:#64748b}.om-kicker{font-size:10px;font-weight:900;letter-spacing:.15em;color:#64748b}.om-x{border:0;background:#f1f5f9;border-radius:10px;padding:9px 12px;font-size:18px;cursor:pointer}.om-success,.om-error,.om-note{margin-top:14px;padding:11px 13px;border-radius:10px;font-size:13px}.om-success{background:#f0fdf4;color:#166534}.om-error{background:#fef2f2;color:#b91c1c}.om-note{background:#eff6ff;color:#1d4ed8}.om-stats{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin:18px 0}.om-stats button{border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:10px;cursor:pointer;text-align:left}.om-stats button.active{border-color:#0f172a;background:#0f172a;color:white}.om-stats b,.om-stats span{display:block}.om-stats b{font-size:20px}.om-stats span{font-size:11px;text-transform:uppercase;opacity:.75;margin-top:3px}.om-toolbar{display:flex;gap:8px;margin:12px 0}.om-toolbar input,.om-toolbar select,.om-toolbar button,.om-form input,.om-form select,.om-form textarea,.om-form button,.om-actions button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 11px;font:inherit}.om-toolbar input{flex:1}.om-toolbar button,.om-actions button{cursor:pointer}.om-table{overflow:auto;border:1px solid #e2e8f0;border-radius:12px}.om-table table{width:100%;border-collapse:collapse;min-width:850px}.om-table th,.om-table td{padding:11px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13px}.om-table th{background:#f8fafc;font-size:11px;text-transform:uppercase;color:#64748b}.om-table td small{display:block;color:#64748b;margin-top:3px}.om-status{display:inline-block;padding:4px 8px;border-radius:999px;background:#e2e8f0;color:#475569;font-size:10px;font-weight:800}.om-open{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:700}.om-empty{text-align:center;padding:55px 20px;color:#64748b}.om-empty b{display:block;color:#0f172a;font-size:17px;margin-top:8px}.om-detail-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:100001;display:flex;justify-content:center;align-items:center;padding:20px}.om-detail{width:min(850px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:18px;padding:20px}.om-detail h3{margin:2px 0}.om-detail-head p{margin:3px 0;color:#64748b}.om-section{border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-top:12px}.om-detail h4{margin:0 0 10px}.om-line{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9}.om-muted{color:#64748b;margin-top:6px}.om-items>div{display:grid;grid-template-columns:1fr 70px 100px;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9}.om-items small{display:block;color:#64748b}.om-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.om-form textarea{grid-column:1/-1;min-height:70px;resize:vertical}.om-primary{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;font-weight:800;cursor:pointer}.om-primary:disabled{opacity:.5;cursor:not-allowed}.om-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.om-next{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0}.om-next b,.om-next span{display:block}.om-next span{font-size:18px;font-weight:800;margin-top:3px}.om-progress{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:10px}.om-progress>div{text-align:center;color:#94a3b8}.om-progress span{display:flex;width:28px;height:28px;margin:0 auto 5px;border-radius:50%;align-items:center;justify-content:center;background:#e2e8f0;font-weight:800}.om-progress small{font-size:10px}.om-progress .done,.om-progress .current{color:#0f172a}.om-progress .done span,.om-progress .current span{background:#0f172a;color:#fff}.om-complete{padding:12px;background:#f0fdf4;color:#166534;border-radius:10px;font-weight:800}.om-history>div{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9}.om-history>div>span{color:#166534;font-weight:900}.om-history small{display:block;color:#64748b;margin-top:2px}@media(max-width:850px){.om-stats{grid-template-columns:repeat(4,1fr)}.om-form{grid-template-columns:1fr}.om-progress{grid-template-columns:repeat(3,1fr)}}@media(max-width:600px){.om-overlay{padding:8px}.om-panel{padding:14px}.om-stats{grid-template-columns:repeat(2,1fr)}.om-toolbar{flex-wrap:wrap}.om-toolbar input{flex-basis:100%}.om-next{align-items:stretch;flex-direction:column}.om-progress{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(style);
const root=document.createElement("div");root.id="order-management-root";document.body.appendChild(root);createRoot(root).render(<App/>);
