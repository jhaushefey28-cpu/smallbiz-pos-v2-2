import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=url&&key?createClient(url,key):null;
const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));
const fmtDate=v=>v?new Date(v).toLocaleString("en-PH",{timeZone:"Asia/Manila"}):"—";
const OWNER_ROLES=["owner"];

function BusinessControls({profile,onClose}){
  const [tab,setTab]=useState("overview");
  const [loading,setLoading]=useState(false),[error,setError]=useState(""),[status,setStatus]=useState("");
  const [shift,setShift]=useState(null),[shifts,setShifts]=useState([]),[beginningCash,setBeginningCash]=useState(""),[actualCash,setActualCash]=useState(""),[shiftNotes,setShiftNotes]=useState("");
  const [drawer,setDrawer]=useState([]),[drawerType,setDrawerType]=useState("cash_in"),[drawerAmount,setDrawerAmount]=useState(""),[drawerReason,setDrawerReason]=useState("");
  const [expenses,setExpenses]=useState([]),[expenseForm,setExpenseForm]=useState({category:"",description:"",amount:"",expense_date:new Date().toISOString().slice(0,10)});
  const [sales,setSales]=useState([]),[channels,setChannels]=useState([]),[orders,setOrders]=useState([]),[movements,setMovements]=useState([]),[purchases,setPurchases]=useState([]),[audit,setAudit]=useState([]);
  const [range,setRange]=useState("month");
  const [saving,setSaving]=useState(false);
  const owner=OWNER_ROLES.includes(String(profile?.role||"").toLowerCase());

  async function loadAll(){
    if(!sb||!profile?.business_id||!owner)return;
    setLoading(true);setError("");
    try{
      const b=profile.business_id;
      const [sh,dr,ex,sa,ch,or,mv,pu,au]=await Promise.all([
        sb.from("cashier_shifts").select("*").eq("business_id",b).order("opened_at",{ascending:false}).limit(100),
        sb.from("cash_drawer_movements").select("*").eq("business_id",b).order("created_at",{ascending:false}).limit(500),
        sb.from("expenses").select("id,business_id,category,description,amount,expense_date,created_by,status,created_at").eq("business_id",b).order("expense_date",{ascending:false}).limit(500),
        sb.from("sales").select("id,invoice_no,cashier_id,subtotal,discount,total,payment_method,payment_reference,status,cogs,gross_profit,sales_channel_id,external_order_no,created_at,voided_at,voided_by,void_reason").eq("business_id",b).order("created_at",{ascending:false}).limit(1000),
        sb.from("sales_channels").select("id,code,name,channel_type,enabled,platform_enabled").eq("business_id",b).order("name"),
        sb.from("external_orders").select("id,sales_channel_id,external_order_no,customer_name,subtotal,discount,platform_fee,shipping_fee,total,order_status,fulfillment_status,ordered_at,created_at").eq("business_id",b).order("created_at",{ascending:false}).limit(1000),
        sb.from("stock_movements").select("id,product_id,product_name,movement_type,quantity,stock_before,stock_after,reason,reference_type,reference_id,user_id,created_at").eq("business_id",b).order("created_at",{ascending:false}).limit(1000),
        sb.from("purchases").select("id,supplier_id,reference_no,purchase_date,subtotal,status,received_by,created_at,suppliers(name)").eq("business_id",b).order("created_at",{ascending:false}).limit(500),
        sb.from("audit_logs").select("id,user_id,action,details,created_at").eq("business_id",b).order("created_at",{ascending:false}).limit(500)
      ]);
      const firstError=[sh,dr,ex,sa,ch,or,mv,pu,au].find(x=>x.error);
      if(firstError?.error)throw new Error(firstError.error.message);
      const shiftsData=sh.data||[];
      setShifts(shiftsData);setShift(shiftsData.find(x=>x.status==="open"&&x.cashier_id===profile.id)||null);
      setDrawer(dr.data||[]);setExpenses(ex.data||[]);setSales(sa.data||[]);setChannels(ch.data||[]);setOrders(or.data||[]);setMovements(mv.data||[]);setPurchases(pu.data||[]);setAudit(au.data||[]);
    }catch(e){setError(e?.message||"Unable to load business controls.")}
    finally{setLoading(false)}
  }
  useEffect(()=>{loadAll()},[profile?.business_id,profile?.id,owner]);

  const periodStart=useMemo(()=>{
    const now=new Date();const d=new Date(now);
    if(range==="today")d.setHours(0,0,0,0);
    else if(range==="week"){d.setDate(now.getDate()-6);d.setHours(0,0,0,0)}
    else if(range==="month"){d.setDate(1);d.setHours(0,0,0,0)}
    else d.setTime(0);
    return d;
  },[range]);
  const periodSales=useMemo(()=>sales.filter(s=>new Date(s.created_at)>=periodStart),[sales,periodStart]);
  const completedSales=periodSales.filter(s=>s.status==="completed");
  const salesTotal=completedSales.reduce((a,s)=>a+Number(s.total||0),0);
  const profitTotal=completedSales.reduce((a,s)=>a+Number(s.gross_profit||0),0);
  const voidedTotal=periodSales.filter(s=>s.status==="voided").reduce((a,s)=>a+Number(s.total||0),0);
  const expensesTotal=expenses.filter(x=>new Date(`${x.expense_date}T00:00:00`)>=periodStart).reduce((a,x)=>a+Number(x.amount||0),0);
  const netAfterExpenses=profitTotal-expensesTotal;
  const onlineSales=completedSales.filter(s=>s.sales_channel_id);
  const channelStats=useMemo(()=>channels.map(c=>{
    const local=completedSales.filter(s=>s.sales_channel_id===c.id);
    const external=orders.filter(o=>o.sales_channel_id===c.id&&new Date(o.created_at)>=periodStart);
    const gross=local.reduce((a,s)=>a+Number(s.total||0),0)+external.reduce((a,o)=>a+Number(o.total||0),0);
    const fees=external.reduce((a,o)=>a+Number(o.platform_fee||0),0);
    return {...c,transactions:local.length,orders:external.length,gross,fees,net:gross-fees};
  }),[channels,completedSales,orders,periodStart]);
  const cashDrawerSummary=useMemo(()=>{
    const rows=shift?drawer.filter(x=>x.shift_id===shift.id):[];
    return rows.reduce((a,x)=>{const n=Number(x.amount||0);if(["opening","sale","cash_in"].includes(x.movement_type))a.in+=n;else if(["cash_out","void"].includes(x.movement_type))a.out+=n;return a},{in:0,out:0});
  },[drawer,shift]);

  async function openShift(){
    const amount=Number(beginningCash||0);if(!Number.isFinite(amount)||amount<0){setError("Enter a valid beginning cash amount.");return}
    if(shift){setError("There is already an open shift for this cashier.");return}
    setSaving(true);setError("");
    try{
      const {data,error}=await sb.from("cashier_shifts").insert({business_id:profile.business_id,cashier_id:profile.id,beginning_cash:amount,notes:shiftNotes.trim()||null,status:"open"}).select().single();
      if(error)throw new Error(error.message);
      await sb.from("cash_drawer_movements").insert({business_id:profile.business_id,shift_id:data.id,user_id:profile.id,movement_type:"opening",amount,reason:"Opening cash"});
      setBeginningCash("");setShiftNotes("");setStatus("Cashier shift opened successfully.");await loadAll();
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }
  async function addDrawerMovement(){
    if(!shift){setError("Open a cashier shift first.");return}
    const amount=Number(drawerAmount||0);if(!Number.isFinite(amount)||amount<=0||!drawerReason.trim()){setError("Enter amount and reason.");return}
    setSaving(true);setError("");
    try{
      const {error}=await sb.from("cash_drawer_movements").insert({business_id:profile.business_id,shift_id:shift.id,user_id:profile.id,movement_type:drawerType,amount,reason:drawerReason.trim()});
      if(error)throw new Error(error.message);
      setDrawerAmount("");setDrawerReason("");setStatus(`${drawerType==='cash_in'?'Cash in':'Cash out'} recorded.`);await loadAll();
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }
  async function closeShift(){
    if(!shift){setError("No open shift.");return}
    const actual=Number(actualCash||0);if(!Number.isFinite(actual)||actual<0){setError("Enter actual cash counted.");return}
    const expected=Number(shift.beginning_cash||0)+cashDrawerSummary.in-cashDrawerSummary.out;
    const diff=actual-expected;
    setSaving(true);setError("");
    try{
      const {error}=await sb.from("cashier_shifts").update({closed_at:new Date().toISOString(),expected_cash:Number(expected.toFixed(2)),actual_cash:Number(actual.toFixed(2)),cash_short_over:Number(diff.toFixed(2)),notes:shiftNotes.trim()||shift.notes||null,status:"closed"}).eq("id",shift.id).eq("business_id",profile.business_id);
      if(error)throw new Error(error.message);
      await sb.from("cash_drawer_movements").insert({business_id:profile.business_id,shift_id:shift.id,user_id:profile.id,movement_type:"closing",amount:actual,reason:"Closing cash count"});
      setActualCash("");setShiftNotes("");setStatus(`Shift closed. ${diff>=0?"Over":"Short"}: ${money(Math.abs(diff))}`);await loadAll();
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }
  async function addExpense(){
    const amount=Number(expenseForm.amount||0);if(!expenseForm.category.trim()||!Number.isFinite(amount)||amount<=0){setError("Expense category and a valid amount are required.");return}
    setSaving(true);setError("");
    try{
      const {error}=await sb.from("expenses").insert({business_id:profile.business_id,category:expenseForm.category.trim(),description:expenseForm.description.trim()||null,amount,expense_date:expenseForm.expense_date,created_by:profile.id,status:"approved"});
      if(error)throw new Error(error.message);
      setExpenseForm({category:"",description:"",amount:"",expense_date:new Date().toISOString().slice(0,10)});setStatus("Expense recorded successfully.");await loadAll();
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }

  function exportWorkbook(){
    const b=profile.business_id;
    const channelMap=Object.fromEntries(channels.map(c=>[c.id,c.name]));
    const sheets={
      "Sales Journal":periodSales.map(s=>({Invoice:s.invoice_no,Date:fmtDate(s.created_at),Channel:channelMap[s.sales_channel_id]||"POS",Payment:s.payment_method,Reference:s.payment_reference||"",Subtotal:Number(s.subtotal||0),Discount:Number(s.discount||0),Total:Number(s.total||0),COGS:Number(s.cogs||0),GrossProfit:Number(s.gross_profit||0),Status:s.status,VoidReason:s.void_reason||""})),
      "Online Channels":channelStats.map(c=>({Channel:c.name,Type:c.channel_type,Enabled:c.enabled!==false,Transactions:c.transactions,ImportedOrders:c.orders,Gross:Number(c.gross.toFixed(2)),PlatformFees:Number(c.fees.toFixed(2)),Net:Number(c.net.toFixed(2))})),
      "Purchases":purchases.map(p=>({Reference:p.reference_no||"",Date:p.purchase_date||"",Supplier:p.suppliers?.name||"",Subtotal:Number(p.subtotal||0),Status:p.status})),
      "Stock Movements":movements.map(m=>({Date:fmtDate(m.created_at),Product:m.product_name,Type:m.movement_type,Quantity:Number(m.quantity||0),Before:Number(m.stock_before||0),After:Number(m.stock_after||0),Reason:m.reason||"",Reference:m.reference_type||""})),
      "Expenses":expenses.map(x=>({Date:x.expense_date,Category:x.category,Description:x.description||"",Amount:Number(x.amount||0),Status:x.status||""})),
      "Cashier Shifts":shifts.map(x=>({Cashier:x.cashier_id,Opened:fmtDate(x.opened_at),Closed:fmtDate(x.closed_at),BeginningCash:Number(x.beginning_cash||0),ExpectedCash:Number(x.expected_cash||0),ActualCash:x.actual_cash==null?"":Number(x.actual_cash),ShortOver:x.cash_short_over==null?"":Number(x.cash_short_over),Status:x.status,Notes:x.notes||""})),
      "Audit Log":audit.map(x=>({Date:fmtDate(x.created_at),User:x.user_id||"",Action:x.action,Details:JSON.stringify(x.details||{})})),
      "BIR Summary":[{ReportPeriod:range,GeneratedAt:fmtDate(new Date()),GrossSales:Number(salesTotal.toFixed(2)),GrossProfit:Number(profitTotal.toFixed(2)),Expenses:Number(expensesTotal.toFixed(2)),NetAfterExpenses:Number(netAfterExpenses.toFixed(2)),VoidedSales:Number(voidedTotal.toFixed(2)),Note:"Operational export for record preparation; not a BIR accreditation/certificate."}]
    };
    const wb=XLSX.utils.book_new();Object.entries(sheets).forEach(([name,rows])=>{const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{}]);XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31))});
    XLSX.writeFile(wb,`SmallBiz_POS_Complete_Reports_${new Date().toISOString().slice(0,10)}.xlsx`);setStatus("Complete Excel report downloaded.");
  }

  if(!owner)return null;
  return <div className="bc-overlay"><div className="bc-panel">
    <header className="bc-header"><div><div className="bc-kicker">SMALLBIZ POS • OWNER CONTROL CENTER</div><h2>⚙️ Business Operations</h2><p>Cash control, expenses, online channels, audit trail and complete report export.</p></div><button className="bc-close" onClick={onClose}>✕</button></header>
    {status&&<div className="bc-ok">✓ {status}</div>}{error&&<div className="bc-error">{error}</div>}
    <div className="bc-tabs">{[["overview","Overview"],["shift","Cashier Shift"],["drawer","Cash Drawer"],["expenses","Expenses"],["channels","Online Channels"],["audit","Audit & BIR"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {loading?<div className="bc-empty">Loading business data...</div>:<>
      {tab==="overview"&&<section><div className="bc-cards"><div><small>Sales</small><b>{money(salesTotal)}</b></div><div><small>Gross Profit</small><b>{money(profitTotal)}</b></div><div><small>Expenses</small><b>{money(expensesTotal)}</b></div><div><small>Net After Expenses</small><b>{money(netAfterExpenses)}</b></div><div><small>Voided Sales</small><b>{money(voidedTotal)}</b></div><div><small>Online Sales</small><b>{money(onlineSales.reduce((a,s)=>a+Number(s.total||0),0))}</b></div></div><div className="bc-toolbar"><select value={range} onChange={e=>setRange(e.target.value)}><option value="today">Today</option><option value="week">Last 7 Days</option><option value="month">This Month</option><option value="all">All Time</option></select><button onClick={loadAll}>↻ Refresh</button><button className="primary" onClick={exportWorkbook}>📊 Download Complete Excel</button></div><div className="bc-grid2"><div className="bc-section"><h3>Channel Performance</h3>{channelStats.length?channelStats.map(c=><div className="bc-row" key={c.id}><span><b>{c.name}</b><small>{c.channel_type}</small></span><b>{money(c.net)}</b></div>):<p>No channels.</p>}</div><div className="bc-section"><h3>Latest Audit Activity</h3>{audit.slice(0,8).map(x=><div className="bc-row" key={x.id}><span><b>{x.action}</b><small>{fmtDate(x.created_at)}</small></span><span>Owner log</span></div>)}{!audit.length&&<p>No audit records yet.</p>}</div></div></section>}
      {tab==="shift"&&<section><div className="bc-section"><h3>Cashier Shift</h3>{shift?<><div className="bc-cards"><div><small>Beginning Cash</small><b>{money(shift.beginning_cash)}</b></div><div><small>Expected Cash</small><b>{money(Number(shift.beginning_cash||0)+cashDrawerSummary.in-cashDrawerSummary.out)}</b></div><div><small>Status</small><b>OPEN</b></div></div><label>Actual Cash Count</label><input type="number" min="0" step=".01" value={actualCash} onChange={e=>setActualCash(e.target.value)} placeholder="Count the drawer"/><label>Notes</label><textarea value={shiftNotes} onChange={e=>setShiftNotes(e.target.value)} rows="3"/><button className="primary" disabled={saving} onClick={closeShift}>{saving?"Saving...":"Close Shift"}</button></>:<><p>No open shift for this owner account.</p><label>Beginning Cash</label><input type="number" min="0" step=".01" value={beginningCash} onChange={e=>setBeginningCash(e.target.value)} placeholder="0.00"/><label>Notes</label><textarea value={shiftNotes} onChange={e=>setShiftNotes(e.target.value)} rows="3"/><button className="primary" disabled={saving} onClick={openShift}>{saving?"Opening...":"Open Shift"}</button></>}</div><div className="bc-section"><h3>Recent Shifts</h3><div className="bc-table"><table><thead><tr><th>Opened</th><th>Closed</th><th>Beginning</th><th>Expected</th><th>Actual</th><th>Short/Over</th><th>Status</th></tr></thead><tbody>{shifts.slice(0,20).map(x=><tr key={x.id}><td>{fmtDate(x.opened_at)}</td><td>{fmtDate(x.closed_at)}</td><td>{money(x.beginning_cash)}</td><td>{money(x.expected_cash)}</td><td>{x.actual_cash==null?"—":money(x.actual_cash)}</td><td>{x.cash_short_over==null?"—":money(x.cash_short_over)}</td><td>{x.status}</td></tr>)}</tbody></table></div></div></section>}
      {tab==="drawer"&&<section><div className="bc-section"><h3>Cash Drawer Movement</h3>{shift?<><div className="bc-cards"><div><small>Inflows</small><b>{money(cashDrawerSummary.in)}</b></div><div><small>Outflows</small><b>{money(cashDrawerSummary.out)}</b></div><div><small>Current Expected</small><b>{money(Number(shift.beginning_cash||0)+cashDrawerSummary.in-cashDrawerSummary.out)}</b></div></div><div className="bc-form-grid"><div><label>Type</label><select value={drawerType} onChange={e=>setDrawerType(e.target.value)}><option value="cash_in">Cash In</option><option value="cash_out">Cash Out</option></select></div><div><label>Amount</label><input type="number" min="0.01" step=".01" value={drawerAmount} onChange={e=>setDrawerAmount(e.target.value)}/></div><div className="wide"><label>Reason</label><input value={drawerReason} onChange={e=>setDrawerReason(e.target.value)} placeholder="Reason / reference"/></div></div><button className="primary" disabled={saving} onClick={addDrawerMovement}>Record Movement</button></>:<p>Open a shift before recording drawer movements.</p>}</div><div className="bc-section"><h3>Movement History</h3><div className="bc-table"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reason</th></tr></thead><tbody>{drawer.slice(0,100).map(x=><tr key={x.id}><td>{fmtDate(x.created_at)}</td><td>{x.movement_type}</td><td>{money(x.amount)}</td><td>{x.reason}</td></tr>)}</tbody></table></div></div></section>}
      {tab==="expenses"&&<section><div className="bc-section"><h3>Record Business Expense</h3><div className="bc-form-grid"><div><label>Category</label><input value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm,category:e.target.value})} placeholder="Rent, utilities, supplies..."/></div><div><label>Amount</label><input type="number" min="0.01" step=".01" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})}/></div><div><label>Date</label><input type="date" value={expenseForm.expense_date} onChange={e=>setExpenseForm({...expenseForm,expense_date:e.target.value})}/></div><div className="wide"><label>Description</label><input value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm,description:e.target.value})}/></div></div><button className="primary" disabled={saving} onClick={addExpense}>Save Expense</button></div><div className="bc-section"><h3>Expense History</h3><div className="bc-table"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>{expenses.slice(0,100).map(x=><tr key={x.id}><td>{x.expense_date}</td><td>{x.category}</td><td>{x.description||"—"}</td><td>{money(x.amount)}</td><td>{x.status}</td></tr>)}</tbody></table></div></div></section>}
      {tab==="channels"&&<section><div className="bc-cards"><div><small>Channels</small><b>{channels.length}</b></div><div><small>Online Orders</small><b>{orders.filter(o=>new Date(o.created_at)>=periodStart).length}</b></div><div><small>Online Gross</small><b>{money(channelStats.reduce((a,c)=>a+c.gross,0))}</b></div><div><small>Platform Fees</small><b>{money(channelStats.reduce((a,c)=>a+c.fees,0))}</b></div></div><div className="bc-section"><h3>All Online / Sales Channels</h3><div className="bc-table"><table><thead><tr><th>Channel</th><th>Type</th><th>Transactions</th><th>Orders</th><th>Gross</th><th>Fees</th><th>Net</th></tr></thead><tbody>{channelStats.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.channel_type}</td><td>{c.transactions}</td><td>{c.orders}</td><td>{money(c.gross)}</td><td>{money(c.fees)}</td><td><b>{money(c.net)}</b></td></tr>)}</tbody></table></div><p className="bc-note">Marketplace OAuth/connector modules already present in this project remain responsible for actual store authorization and order import. This center consolidates the resulting numbers.</p></div></section>}
      {tab==="audit"&&<section><div className="bc-section"><h3>Compliance & Complete Export</h3><p>One Excel workbook contains Sales Journal, Online Channels, Purchases, Stock Movements, Expenses, Cashier Shifts, Audit Log and a BIR Summary sheet.</p><button className="primary" onClick={exportWorkbook}>📊 Download Complete Excel Report</button><div className="bc-note"><b>BIR note:</b> This is a record/report preparation feature. It does not by itself mean the POS is BIR-accredited or a substitute for required BIR registration/accreditation processes.</div></div><div className="bc-section"><h3>Audit Trail</h3><div className="bc-table"><table><thead><tr><th>Date</th><th>Action</th><th>User</th><th>Details</th></tr></thead><tbody>{audit.slice(0,150).map(x=><tr key={x.id}><td>{fmtDate(x.created_at)}</td><td>{x.action}</td><td>{x.user_id||"—"}</td><td><code>{JSON.stringify(x.details||{})}</code></td></tr>)}</tbody></table></div></div></section>}
    </>}
  </div></div>;
}

function App(){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[open,setOpen]=useState(false);
  useEffect(()=>{
    if(!sb)return;
    sb.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=sb.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{if(!session?.user)return;sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",session.user.id).maybeSingle().then(({data})=>setProfile(data))},[session?.user?.id]);
  useEffect(()=>{
    if(!profile)return;
    const owner=OWNER_ROLES.includes(String(profile.role||"").toLowerCase());
    if(!owner)return;
    const id="smallbiz-business-controls-button";
    const mount=()=>{
      if(document.getElementById(id))return;
      const nav=document.querySelector(".sidebar-nav");if(!nav)return;
      const b=document.createElement("button");b.id=id;b.type="button";b.className="nav-item";b.innerHTML='<span>⚙️</span><b>Business Controls</b>';b.onclick=()=>setOpen(true);nav.appendChild(b);
    };
    const ob=new MutationObserver(mount);ob.observe(document.body,{childList:true,subtree:true});const t=setTimeout(mount,250);
    return()=>{ob.disconnect();clearTimeout(t);document.getElementById(id)?.remove()};
  },[profile?.id,profile?.role]);
  return open&&profile?<BusinessControls profile={profile} onClose={()=>setOpen(false)}/>:null;
}

const style=document.createElement("style");style.textContent=`.bc-overlay{position:fixed;inset:0;z-index:110000;background:rgba(15,23,42,.72);padding:24px;overflow:auto;display:flex;justify-content:center}.bc-panel{width:min(1180px,100%);background:#fff;border-radius:22px;padding:24px;color:#0f172a;box-shadow:0 35px 100px rgba(0,0,0,.35)}.bc-header{display:flex;justify-content:space-between;gap:20px}.bc-kicker{font-size:11px;font-weight:900;letter-spacing:.14em;color:#64748b}.bc-header h2{margin:5px 0}.bc-header p{margin:0;color:#64748b}.bc-close{border:0;background:#f1f5f9;border-radius:10px;padding:8px 12px;font-size:18px;height:42px}.bc-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:20px 0}.bc-tabs button{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}.bc-tabs button.active{background:#1769e0;color:#fff;border-color:#1769e0}.bc-ok,.bc-error,.bc-note{padding:11px 13px;border-radius:11px;margin:10px 0;font-size:13px}.bc-ok{background:#f0fdf4;color:#166534}.bc-error{background:#fef2f2;color:#b91c1c}.bc-note{background:#eff6ff;color:#1e3a8a}.bc-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}.bc-cards>div{border:1px solid #e2e8f0;border-radius:14px;padding:15px;background:#f8fafc}.bc-cards small{display:block;color:#64748b}.bc-cards b{display:block;font-size:21px;margin-top:5px}.bc-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.bc-toolbar button,.bc-toolbar select,.bc-section button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 11px;font-weight:700}.bc-toolbar .primary,.bc-section .primary{background:#1769e0;color:#fff;border-color:#1769e0}.bc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.bc-section{border:1px solid #e2e8f0;border-radius:15px;padding:16px;margin:12px 0;background:#fff}.bc-section h3{margin:0 0 12px}.bc-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eef2f7}.bc-row:last-child{border-bottom:0}.bc-row small{display:block;color:#64748b;margin-top:2px}.bc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.bc-form-grid .wide{grid-column:1/-1}.bc-section label{display:block;font-size:12px;font-weight:800;color:#475569;margin:8px 0 5px}.bc-section input,.bc-section select,.bc-section textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:10px;font:inherit}.bc-table{overflow:auto}.bc-table table{width:100%;border-collapse:collapse;min-width:720px}.bc-table th,.bc-table td{padding:9px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:12px;vertical-align:top}.bc-table th{background:#f8fafc;position:sticky;top:0}.bc-empty{text-align:center;padding:50px;color:#64748b}@media(max-width:800px){.bc-overlay{padding:8px}.bc-panel{padding:15px;border-radius:16px}.bc-cards{grid-template-columns:1fr 1fr}.bc-grid2{grid-template-columns:1fr}.bc-form-grid{grid-template-columns:1fr}.bc-form-grid .wide{grid-column:auto}}@media(max-width:480px){.bc-cards{grid-template-columns:1fr}.bc-header h2{font-size:20px}.bc-tabs{overflow:auto;flex-wrap:nowrap}.bc-tabs button{white-space:nowrap}}`;document.head.appendChild(style);

const root=document.createElement("div");root.id="business-controls-root";document.body.appendChild(root);createRoot(root).render(<App/>);
