import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=url&&key?createClient(url,key):null;
const MARKETPLACES=["shopee","lazada","tiktok_shop"];
const icon=c=>c==="shopee"?"🛍️":c==="lazada"?"🛒":"🎵";

function Panel({profile,onClose}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[msg,setMsg]=useState(""),[err,setErr]=useState("");
 const admin=["owner","admin","super_admin"].includes(String(profile?.role||"").toLowerCase());
 async function load(){
  if(!sb||!profile?.business_id)return;
  setLoading(true);setErr("");
  const {data:channels,error:ce}=await sb.from("sales_channels").select("id,code,name,channel_type,enabled,platform_enabled").eq("business_id",profile.business_id).in("code",MARKETPLACES).order("name");
  if(ce){setErr(ce.message);setLoading(false);return;}
  const ids=(channels||[]).map(x=>x.id);
  let conns=[];
  if(ids.length){const {data,error}=await sb.from("channel_connections").select("id,sales_channel_id,connection_status,external_store_id,external_store_name,last_synced_at,last_sync_status,last_sync_error,authorized_at,sync_enabled").eq("business_id",profile.business_id).in("sales_channel_id",ids);if(error)setErr(error.message);else conns=data||[];}
  setRows((channels||[]).map(c=>({...c,connection:conns.find(x=>x.sales_channel_id===c.id)||null})));
  setLoading(false);
 }
 useEffect(()=>{load()},[profile?.business_id]);
 async function prepare(channel){
  if(!admin||!channel.platform_enabled){return;}
  setBusy(channel.code);setMsg("");setErr("");
  const existing=channel.connection;
  const payload={business_id:profile.business_id,sales_channel_id:channel.id,provider:channel.code,connection_status:"pending_authorization",sync_enabled:true,metadata:existing?.metadata||{}};
  const q=existing?sb.from("channel_connections").update(payload).eq("id",existing.id).eq("business_id",profile.business_id):sb.from("channel_connections").insert(payload).select("id,sales_channel_id,connection_status,sync_enabled").single();
  const {error}=await q;
  if(error)setErr(error.message);else setMsg(`${channel.name}: authorization is ready. The marketplace OAuth credentials/endpoints still need to be configured before a seller account can be connected.`);
  setBusy("");await load();
 }
 async function toggleSync(channel){
  if(!admin||!channel.connection)return;
  setBusy(channel.code);setErr("");
  const {error}=await sb.from("channel_connections").update({sync_enabled:!channel.connection.sync_enabled}).eq("id",channel.connection.id).eq("business_id",profile.business_id);
  if(error)setErr(error.message);else setMsg(`${channel.name} order sync: ${!channel.connection.sync_enabled?"ON":"OFF"}`);
  setBusy("");await load();
 }
 const connected=useMemo(()=>rows.filter(x=>x.connection?.connection_status==="connected").length,[rows]);
 return <div className="mcp-overlay"><div className="mcp-panel">
  <header className="mcp-head"><div><div className="mcp-kicker">SMALLBIZ POS</div><h2>🔌 Marketplace Connections</h2><p>Connect approved marketplace stores to the tenant order engine.</p></div><button className="mcp-close" onClick={onClose}>✕</button></header>
  <div className="mcp-stats"><div><b>{rows.length}</b><span>Available</span></div><div><b>{connected}</b><span>Connected</span></div><div><b>{rows.filter(x=>x.platform_enabled).length}</b><span>Platform Enabled</span></div></div>
  {msg&&<div className="mcp-ok">✓ {msg}</div>}{err&&<div className="mcp-error">{err}</div>}
  {!admin&&<div className="mcp-info">Your platform administrator controls which marketplaces are available. This page does not grant platform authorization.</div>}
  <div className="mcp-list">{loading?<div className="mcp-empty">Loading marketplace connections...</div>:rows.length===0?<div className="mcp-empty">No marketplace channels are enabled for this business yet.</div>:rows.map(c=>{const x=c.connection;const status=x?.connection_status||"not_connected";return <article className="mcp-card" key={c.id}>
   <div className="mcp-icon">{icon(c.code)}</div><div className="mcp-main"><div className="mcp-title"><b>{c.name}</b><span className={c.platform_enabled?"mcp-pill on":"mcp-pill off"}>{c.platform_enabled?"Platform Enabled":"Platform Disabled"}</span></div>
   <small>{x?.external_store_name||"No seller store connected"}{x?.external_store_id?` • ${x.external_store_id}`:""}</small>
   <div className="mcp-meta"><span>Status: <b>{status.replaceAll("_"," ")}</b></span><span>Sync: <b>{x?.sync_enabled===false?"OFF":"ON"}</b></span>{x?.last_synced_at&&<span>Last sync: {new Date(x.last_synced_at).toLocaleString()}</span>}</div>
   {x?.last_sync_error&&<div className="mcp-warn">Last sync error: {x.last_sync_error}</div>}
   </div><div className="mcp-actions"><button disabled={!admin||!c.platform_enabled||busy===c.code} onClick={()=>prepare(c)}>{x?.connection_status==="pending_authorization"?"Retry Setup":"Connect Store"}</button>{x&&<button className="secondary" disabled={!admin||busy===c.code} onClick={()=>toggleSync(c)}>{x.sync_enabled===false?"Enable Sync":"Disable Sync"}</button>}</div>
  </article>})}</div>
  <div className="mcp-note"><b>Security:</b> seller access tokens must be handled server-side. This UI intentionally does not store marketplace secrets in browser/localStorage.</div>
  <button className="mcp-refresh" onClick={load}>↻ Refresh connections</button>
 </div></div>
}

function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[open,setOpen]=useState(()=>{const p=window.__smallbizPendingModuleOpen;const v=Boolean(p?.["smallbiz:open-marketplace-connections"]);if(v)delete p["smallbiz:open-marketplace-connections"];return v});
 useEffect(()=>{if(!sb)return;sb.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=sb.auth.onAuthStateChange((_,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!session?.user)return;sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",session.user.id).maybeSingle().then(({data})=>setProfile(data))},[session?.user?.id]);
 useEffect(()=>{if(window.__SMALLBIZ_REACT_SIDEBAR_OWNER__)return;if(!profile)return;const allowed=["owner","admin","super_admin"].includes(String(profile.role||"").toLowerCase());if(!allowed)return;const id="smallbiz-marketplace-connections-button";const mount=()=>{if(document.getElementById(id))return;const nav=document.querySelector(".sidebar-nav");if(!nav)return;const b=document.createElement("button");b.id=id;b.className="nav-item";b.type="button";b.innerHTML='<span>🔌</span><b>Marketplace Connections</b>';b.onclick=()=>setOpen(true);nav.appendChild(b)};const ob=new MutationObserver(mount);ob.observe(document.body,{childList:true,subtree:true});const t=setTimeout(mount,250);return()=>{ob.disconnect();clearTimeout(t);document.getElementById(id)?.remove()}},[profile?.id,profile?.role]);
 useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener("smallbiz:open-marketplace-connections",handler);return()=>window.removeEventListener("smallbiz:open-marketplace-connections",handler)},[]);
 return open&&profile?<Panel profile={profile} onClose={()=>setOpen(false)}/>:null;
}
const s=document.createElement("style");s.textContent=`.mcp-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.66);padding:28px;overflow:auto;display:flex;justify-content:center}.mcp-panel{width:min(1050px,100%);background:#fff;border-radius:22px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.3);color:#0f172a}.mcp-head{display:flex;justify-content:space-between;gap:18px}.mcp-kicker{font-size:11px;font-weight:800;letter-spacing:.15em;color:#64748b}.mcp-head h2{margin:4px 0}.mcp-head p{margin:0;color:#64748b}.mcp-close{border:0;background:#f1f5f9;border-radius:10px;padding:9px 12px;font-size:18px}.mcp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.mcp-stats div{padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.mcp-stats b{display:block;font-size:23px}.mcp-stats span{font-size:12px;color:#64748b}.mcp-ok,.mcp-error,.mcp-info,.mcp-note{margin:12px 0;padding:11px 13px;border-radius:11px;font-size:13px}.mcp-ok{background:#f0fdf4;color:#166534}.mcp-error{background:#fef2f2;color:#b91c1c}.mcp-info{background:#eff6ff;color:#1d4ed8}.mcp-note{background:#f8fafc;color:#475569}.mcp-list{display:grid;gap:12px}.mcp-card{display:flex;gap:14px;align-items:flex-start;border:1px solid #e2e8f0;border-radius:16px;padding:16px}.mcp-icon{font-size:30px}.mcp-main{flex:1;min-width:0}.mcp-title{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mcp-main small{display:block;color:#64748b;margin-top:5px}.mcp-pill{font-size:10px;font-weight:800;border-radius:999px;padding:4px 8px;text-transform:uppercase}.mcp-pill.on{background:#dcfce7;color:#166534}.mcp-pill.off{background:#fee2e2;color:#991b1b}.mcp-meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:#64748b}.mcp-warn{margin-top:9px;font-size:12px;color:#b91c1c}.mcp-actions{display:flex;flex-direction:column;gap:7px}.mcp-actions button,.mcp-refresh{border:1px solid #cbd5e1;background:#0f172a;color:#fff;border-radius:9px;padding:8px 11px;font-weight:700;cursor:pointer;white-space:nowrap}.mcp-actions button.secondary,.mcp-refresh{background:#fff;color:#0f172a}.mcp-actions button:disabled{opacity:.45;cursor:not-allowed}.mcp-refresh{margin-top:14px}.mcp-empty{text-align:center;padding:36px;color:#64748b}@media(max-width:700px){.mcp-overlay{padding:10px}.mcp-panel{padding:16px}.mcp-card{flex-wrap:wrap}.mcp-actions{width:100%;flex-direction:row;flex-wrap:wrap}.mcp-stats{grid-template-columns:1fr}}`;document.head.appendChild(s);
const root=document.createElement("div");root.id="marketplace-connections-root";document.body.appendChild(root);createRoot(root).render(<App/>);
