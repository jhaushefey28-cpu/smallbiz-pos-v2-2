import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=url&&key?createClient(url,key):null;
const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));
const ADMIN=["owner","admin","super_admin"];

function ShiftPanel({profile,onClose}){
 const [current,setCurrent]=useState(null),[history,setHistory]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [beginning,setBeginning]=useState(""),[actual,setActual]=useState(""),[notes,setNotes]=useState("");
 const [movementType,setMovementType]=useState("cash_in"),[movementAmount,setMovementAmount]=useState(""),[movementReason,setMovementReason]=useState("");
 const cashierId=profile?.id;
 async function load(){
  if(!sb||!profile?.business_id||!cashierId)return;
  setLoading(true);setError("");
  const {data,error}=await sb.from("cashier_shifts").select("*").eq("business_id",profile.business_id).eq("cashier_id",cashierId).order("created_at",{ascending:false}).limit(20);
  if(error){setError(error.message);setLoading(false);return;}
  const rows=data||[];setCurrent(rows.find(x=>x.status==="open")||null);setHistory(rows.filter(x=>x.status!=="open"));setLoading(false);
 }
 useEffect(()=>{load()},[profile?.business_id,cashierId]);
 async function metrics(shift){
  const opened=shift.opened_at;
  const [{data:sales,error:se},{data:moves,error:me}]=await Promise.all([
   sb.from("sales").select("id,total,payment_method,status,created_at,voided_at").eq("business_id",profile.business_id).eq("cashier_id",shift.cashier_id).gte("created_at",opened).eq("payment_method","cash"),
   sb.from("cash_drawer_movements").select("movement_type,amount,created_at").eq("business_id",profile.business_id).eq("shift_id",shift.id).order("created_at")
  ]);
  if(se)throw new Error(se.message);if(me)throw new Error(me.message);
  const saleRows=sales||[];
  const completed=saleRows.filter(s=>s.status==="completed").reduce((a,s)=>a+Number(s.total||0),0);
  const voided=saleRows.filter(s=>s.status==="voided"&&s.voided_at&&new Date(s.voided_at)>=new Date(opened)).reduce((a,s)=>a+Number(s.total||0),0);
  const cashIn=(moves||[]).filter(m=>m.movement_type==="cash_in").reduce((a,m)=>a+Number(m.amount||0),0);
  const cashOut=(moves||[]).filter(m=>m.movement_type==="cash_out").reduce((a,m)=>a+Number(m.amount||0),0);
  return {expected:Number(shift.beginning_cash||0)+completed-voided+cashIn-cashOut};
 }
 async function openShift(){
  const amount=Number(beginning);if(!Number.isFinite(amount)||amount<0){setError("Enter a valid beginning cash amount.");return;}
  setBusy(true);setError("");setMessage("");
  try{const {data,error}=await sb.from("cashier_shifts").insert({business_id:profile.business_id,cashier_id:cashierId,beginning_cash:Number(amount.toFixed(2)),status:"open"}).select("*").single();if(error)throw new Error(error.message);const {error:me}=await sb.from("cash_drawer_movements").insert({business_id:profile.business_id,shift_id:data.id,user_id:cashierId,movement_type:"opening",amount:Number(amount.toFixed(2)),reason:"Opening cash"});if(me)throw new Error(me.message);setBeginning("");setMessage("Shift opened successfully.");await load()}catch(e){setError(e.message||"Unable to open shift")}finally{setBusy(false)}
 }
 async function addMovement(){
  if(!current)return;const amount=Number(movementAmount),reason=String(movementReason||"").trim();if(!Number.isFinite(amount)||amount<=0){setError("Enter a valid cash amount.");return}if(!reason){setError("A reason is required for cash in/out.");return}
  setBusy(true);setError("");setMessage("");try{const {error}=await sb.from("cash_drawer_movements").insert({business_id:profile.business_id,shift_id:current.id,user_id:cashierId,movement_type:movementType,amount:Number(amount.toFixed(2)),reason});if(error)throw new Error(error.message);setMovementAmount("");setMovementReason("");setMessage(movementType==="cash_in"?"Cash added to drawer.":"Cash removed from drawer.")}catch(e){setError(e.message||"Unable to record cash movement")}finally{setBusy(false)}
 }
 async function closeShift(){
  if(!current)return;const cash=Number(actual);if(!Number.isFinite(cash)||cash<0){setError("Enter the actual cash counted in the drawer.");return}
  setBusy(true);setError("");setMessage("");try{const m=await metrics(current),diff=Number((cash-m.expected).toFixed(2));const {error}=await sb.from("cashier_shifts").update({closed_at:new Date().toISOString(),expected_cash:Number(m.expected.toFixed(2)),actual_cash:Number(cash.toFixed(2)),cash_short_over:diff,notes:notes.trim()||null,status:"closed"}).eq("id",current.id).eq("business_id",profile.business_id);if(error)throw new Error(error.message);const {error:me}=await sb.from("cash_drawer_movements").insert({business_id:profile.business_id,shift_id:current.id,user_id:cashierId,movement_type:"closing",amount:Number(cash.toFixed(2)),reason:"Closing cash count"});if(me)throw new Error(me.message);setActual("");setNotes("");setMessage(`Shift closed. ${diff===0?"No variance.":diff>0?`Over by ${money(diff)}.`:`Short by ${money(Math.abs(diff))}.`}`);await load()}catch(e){setError(e.message||"Unable to close shift")}finally{setBusy(false)}
 }
 return <div className="shift-overlay"><div className="shift-panel"><header className="shift-head"><div><div className="shift-kicker">SMALLBIZ POS</div><h2>💵 Cashier Shift & Cash Drawer</h2><p>Open a shift, record cash movements, and close with expected vs actual cash.</p></div><button className="shift-close" onClick={onClose}>✕</button></header>{error&&<div className="shift-error">{error}</div>}{message&&<div className="shift-success">✓ {message}</div>}{loading?<div className="shift-empty">Loading shift...</div>:current?<><div className="shift-status"><div><small>Current Shift</small><b>OPEN</b></div><div><small>Opened</small><strong>{new Date(current.opened_at).toLocaleString("en-PH")}</strong></div><div><small>Beginning Cash</small><strong>{money(current.beginning_cash)}</strong></div></div><div className="shift-actions"><section><h3>💰 Cash Movement</h3><div className="shift-form"><select value={movementType} onChange={e=>setMovementType(e.target.value)}><option value="cash_in">Cash In</option><option value="cash_out">Cash Out</option></select><input inputMode="decimal" placeholder="Amount" value={movementAmount} onChange={e=>setMovementAmount(e.target.value)}/><input placeholder="Reason" value={movementReason} onChange={e=>setMovementReason(e.target.value)}/><button disabled={busy} onClick={addMovement}>Record</button></div></section><section><h3>🔒 Close Shift</h3><div className="shift-form"><input inputMode="decimal" placeholder="Actual cash counted" value={actual} onChange={e=>setActual(e.target.value)}/><input placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/><button className="danger" disabled={busy} onClick={closeShift}>Close Shift</button></div><small className="shift-help">Expected cash = beginning cash + cash sales − voided cash sales + cash in − cash out.</small></section></div></>:<section className="shift-open-card"><div className="shift-big-icon">💵</div><h3>No Open Shift</h3><p>Start a cashier shift before taking counter sales so the owner can reconcile the drawer at closing.</p><div className="shift-open-form"><input inputMode="decimal" placeholder="Beginning cash (₱)" value={beginning} onChange={e=>setBeginning(e.target.value)}/><button disabled={busy} onClick={openShift}>Open Shift</button></div></section>}<section className="shift-history"><h3>Recent Shifts</h3>{history.length?<div className="shift-table"><table><thead><tr><th>Opened</th><th>Closed</th><th>Beginning</th><th>Expected</th><th>Actual</th><th>Variance</th></tr></thead><tbody>{history.map(s=><tr key={s.id}><td>{new Date(s.opened_at).toLocaleString("en-PH")}</td><td>{s.closed_at?new Date(s.closed_at).toLocaleString("en-PH"):"—"}</td><td>{money(s.beginning_cash)}</td><td>{money(s.expected_cash)}</td><td>{s.actual_cash==null?"—":money(s.actual_cash)}</td><td className={Number(s.cash_short_over||0)<0?"short":Number(s.cash_short_over||0)>0?"over":"ok"}>{s.cash_short_over==null?"—":Number(s.cash_short_over)===0?"₱0.00":Number(s.cash_short_over)>0?`+${money(s.cash_short_over)}`:`-${money(Math.abs(s.cash_short_over))}`}</td></tr>)}</tbody></table></div>:<div className="shift-empty">No closed shifts yet.</div>}</section><div className="shift-note">Cashier shifts are business-scoped. Cashiers can manage their own shift; Owner/Admin can review business shift records. All drawer movements are stored with a reason.</div></div></div>
}
function App(){const [profile,setProfile]=useState(null),[open,setOpen]=useState(false);useEffect(()=>{if(!sb)return;let active=true;const load=async()=>{const {data}=await sb.auth.getSession();if(!active)return;const uid=data.session?.user?.id;if(!uid){setProfile(null);return}const {data:p}=await sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",uid).maybeSingle();if(active)setProfile(p||null)};load();const {data:{subscription}}=sb.auth.onAuthStateChange(()=>load());return()=>{active=false;subscription.unsubscribe()}},[]);useEffect(()=>{if(!profile)return;const id="smallbiz-cashier-shift-button";const mount=()=>{if(document.getElementById(id))return;const nav=document.querySelector(".sidebar-nav");if(!nav)return;const b=document.createElement("button");b.id=id;b.type="button";b.className="nav-item";b.innerHTML='<span>💵</span><b>Cashier Shift</b>';b.onclick=()=>setOpen(true);nav.appendChild(b)};const ob=new MutationObserver(mount);ob.observe(document.body,{childList:true,subtree:true});const t=setTimeout(mount,250);return()=>{ob.disconnect();clearTimeout(t);document.getElementById(id)?.remove()}},[profile?.id]);return open&&profile?<ShiftPanel profile={profile} onClose={()=>setOpen(false)}/>:null}
const root=document.createElement("div");root.id="cashier-shift-root";document.body.appendChild(root);createRoot(root).render(<App/>);
