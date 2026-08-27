import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;

const groups = {
  physical: "Physical Store",
  marketplace: "Marketplaces",
  social: "Social Commerce",
  website: "Online Store",
  manual: "Direct / Manual",
  wholesale: "Wholesale",
  other: "Other"
};

const platformCodes = new Set(["shopee", "lazada", "tiktok_shop", "shopify", "woocommerce"]);

function Panel({onClose, profile}){
  const [channels,setChannels]=useState([]);
  const [cashDrawer,setCashDrawer]=useState(true);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [filter,setFilter]=useState("all");

  const admin=["owner","admin","super_admin"].includes(String(profile?.role||"").toLowerCase());

  async function load(){
    if(!sb||!profile?.business_id)return;
    setLoading(true);setError("");
    const [{data:c,error:ce},{data:s,error:se}]=await Promise.all([
      sb.from("sales_channels").select("id,code,name,channel_type,enabled,platform_enabled,platform_enabled_at,platform_enabled_by").eq("business_id",profile.business_id).order("channel_type").order("name"),
      sb.from("business_settings").select("cash_drawer_enabled").eq("business_id",profile.business_id).maybeSingle()
    ]);
    if(ce)setError(ce.message);else setChannels(c||[]);
    if(se)setError(se.message);else setCashDrawer(s?.cash_drawer_enabled!==false);
    setLoading(false);
  }

  useEffect(()=>{load()},[profile?.business_id]);

  async function toggleChannel(channel){
    if(!admin||platformCodes.has(channel.code))return;
    setSaving(true);setError("");
    const {error:e}=await sb.from("sales_channels").update({enabled:!channel.enabled,updated_at:new Date().toISOString()}).eq("id",channel.id).eq("business_id",profile.business_id);
    if(e)setError(e.message);else{setChannels(x=>x.map(c=>c.id===channel.id?{...c,enabled:!channel.enabled}:c));setStatus(`${channel.name}: ${!channel.enabled?"ON":"OFF"}`)}
    setSaving(false);
  }

  async function saveCashDrawer(enabled){
    if(!admin)return;
    setSaving(true);setError("");
    const {error:e}=await sb.from("business_settings").update({cash_drawer_enabled:enabled,updated_at:new Date().toISOString()}).eq("business_id",profile.business_id);
    if(e)setError(e.message);else{setCashDrawer(enabled);setStatus(`Cash Drawer: ${enabled?"ON":"OFF"}`)}
    setSaving(false);
  }

  const visible=useMemo(()=>filter==="all"?channels:channels.filter(c=>c.channel_type===filter),[channels,filter]);

  return <div className="sbc-overlay">
    <div className="sbc-panel">
      <div className="sbc-header"><div><div className="sbc-kicker">SMALLBIZ POS</div><h2>🌐 Sales Channels</h2><p>Configure where this business receives orders and sales.</p></div><button className="sbc-x" onClick={onClose}>✕</button></div>
      {status&&<div className="sbc-success">✓ {status}</div>}
      {error&&<div className="sbc-error">{error}</div>}

      <div className="sbc-info"><b>🔐 Online-platform authorization is controlled by SmallBiz Platform Admin.</b><span> Tenant admins can manage physical/direct channels, but cannot turn online platforms ON or OFF.</span></div>

      <section className="sbc-card">
        <div className="sbc-setting-row"><div><b>💰 Cash Drawer</b><small>Required for physical-store cashier shifts. Turn OFF for online-only businesses.</small></div><button disabled={!admin||saving} className={cashDrawer?"sbc-toggle on":"sbc-toggle"} onClick={()=>saveCashDrawer(!cashDrawer)}>{cashDrawer?"ON":"OFF"}</button></div>
        <div className="sbc-help">ON = Beginning Cash / cashier shift can be used. OFF = online-only mode; no opening cash is required.</div>
      </section>

      <div className="sbc-toolbar"><div className="sbc-tabs"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>All</button>{Object.entries(groups).map(([k,v])=><button key={k} className={filter===k?"active":""} onClick={()=>setFilter(k)}>{v}</button>)}</div><button className="sbc-refresh" onClick={load}>↻ Refresh</button></div>

      {loading?<div className="sbc-empty">Loading channels...</div>:<div className="sbc-grid">{visible.map(c=>{
        const platform=platformCodes.has(c.code);
        const available=platform && c.platform_enabled===true;
        return <div className={c.enabled&&(!platform||available)?"sbc-channel enabled":"sbc-channel"} key={c.id}>
          <div className="sbc-channel-icon">{c.code==="pos"?"🏪":c.code==="shopee"?"🛍️":c.code==="lazada"?"🛒":c.code==="tiktok_shop"?"🎵":c.channel_type==="social"?"💬":c.channel_type==="website"?"🌐":c.channel_type==="wholesale"?"📦":"🧾"}</div>
          <div className="sbc-channel-main"><b>{c.name}</b><small>{groups[c.channel_type]||"Other"}</small>{platform?<span className={available?"sbc-pill on":"sbc-pill"}>{available?"Authorized by Platform":"Disabled by Platform"}</span>:<span className={c.enabled?"sbc-pill on":"sbc-pill"}>{c.enabled?"Enabled":"Disabled"}</span>}</div>
          {platform?<button disabled className={available?"sbc-small-toggle on":"sbc-small-toggle"}>{available?"AVAILABLE":"LOCKED"}</button>:<button disabled={!admin||saving} className={c.enabled?"sbc-small-toggle on":"sbc-small-toggle"} onClick={()=>toggleChannel(c)}>{c.enabled?"ON":"OFF"}</button>}
        </div>;
      })}</div>}

      <section className="sbc-card" style={{marginTop:16}}><div className="sbc-section-title"><div><h3>🔌 Platform Connections</h3><p>Only platforms authorized by SmallBiz can be connected. Marketplace OAuth will be added next; tokens remain server-side and tenant-scoped.</p></div></div><div className="sbc-connection-list">{channels.filter(c=>platformCodes.has(c.code)).map(c=>{const available=c.platform_enabled===true;return <div className="sbc-connection" key={c.id}><span>{c.name}</span><span className={available?"sbc-pill on":"sbc-pill"}>{available?"Platform Authorized":"Disabled by Platform"}</span><button disabled={!available}>Connect Store</button></div>})}</div></section>
    </div>
  </div>;
}

function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!sb)return;
    sb.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=sb.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user)return;
    sb.from("profiles").select("id,business_id,full_name,role,active").eq("id",session.user.id).maybeSingle().then(({data})=>setProfile(data));
  },[session?.user?.id]);

  useEffect(()=>{if(window.__SMALLBIZ_REACT_SIDEBAR_OWNER__)return;if(!profile||!session)return;
    const allowed=["owner","admin","super_admin"].includes(String(profile.role||"").toLowerCase());
    if(!allowed)return;
    const rootId="smallbiz-sales-channel-button";
    let timer=null;
    const mount=()=>{
      if(document.getElementById(rootId))return;
      const nav=document.querySelector(".sidebar-nav");
      if(!nav)return;
      const btn=document.createElement("button");
      btn.id=rootId;btn.className="nav-item";btn.type="button";btn.innerHTML='<span>🌐</span><b>Online Channels</b>';
      btn.addEventListener("click",()=>setOpen(true));
      nav.appendChild(btn);
    };
    const observer=new MutationObserver(()=>mount());
    observer.observe(document.body,{childList:true,subtree:true});
    timer=setTimeout(mount,250);
    return()=>{observer.disconnect();if(timer)clearTimeout(timer);document.getElementById(rootId)?.remove()};
  },[profile?.id,profile?.role,session?.user?.id]);

  useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener("smallbiz:open-channels",handler);return()=>window.removeEventListener("smallbiz:open-channels",handler)},[]);
 return open&&profile?<Panel profile={profile} onClose={()=>setOpen(false)}/>:null;
}

const style=document.createElement("style");
style.textContent=`
.sbc-overlay{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:99999;display:flex;justify-content:center;align-items:flex-start;padding:28px;overflow:auto}
.sbc-panel{width:min(1120px,100%);background:#fff;border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.28);padding:24px;color:#0f172a;max-height:calc(100vh - 56px);overflow:auto}
.sbc-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.sbc-header h2{margin:2px 0 5px;font-size:25px}.sbc-header p{margin:0;color:#64748b}.sbc-kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:#64748b}.sbc-x{border:0;background:#f1f5f9;border-radius:10px;padding:9px 12px;cursor:pointer;font-size:18px}
.sbc-card{margin-top:18px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.sbc-setting-row{display:flex;justify-content:space-between;align-items:center;gap:18px}.sbc-setting-row b{display:block;font-size:16px}.sbc-setting-row small{display:block;color:#64748b;margin-top:3px}.sbc-help{margin-top:10px;font-size:12px;color:#64748b}.sbc-toggle,.sbc-small-toggle{border:1px solid #cbd5e1;background:#e2e8f0;border-radius:999px;padding:7px 13px;font-weight:800;cursor:pointer}.sbc-toggle.on,.sbc-small-toggle.on{background:#166534;color:white;border-color:#166534}.sbc-toggle:disabled,.sbc-small-toggle:disabled{opacity:.5;cursor:not-allowed}
.sbc-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:18px 0 12px;overflow:auto}.sbc-tabs{display:flex;gap:6px;flex-wrap:wrap}.sbc-tabs button,.sbc-refresh{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 11px;cursor:pointer;white-space:nowrap}.sbc-tabs button.active{background:#0f172a;color:#fff;border-color:#0f172a}.sbc-refresh{font-weight:700}
.sbc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.sbc-channel{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}.sbc-channel.enabled{border-color:#bbf7d0}.sbc-channel-icon{font-size:26px;width:42px;text-align:center}.sbc-channel-main{flex:1;min-width:0}.sbc-channel-main b,.sbc-channel-main small{display:block}.sbc-channel-main small{color:#64748b;margin-top:2px}.sbc-pill{display:inline-block;margin-top:6px;font-size:10px;font-weight:800;padding:3px 7px;border-radius:999px;background:#e2e8f0;color:#475569}.sbc-pill.on{background:#dcfce7;color:#166534}.sbc-info,.sbc-success,.sbc-error{margin-top:14px;padding:11px 13px;border-radius:11px;font-size:13px}.sbc-info{background:#eff6ff;color:#1d4ed8}.sbc-success{background:#f0fdf4;color:#166534}.sbc-error{background:#fef2f2;color:#b91c1c}.sbc-section-title h3{margin:0}.sbc-section-title p{margin:4px 0;color:#64748b;font-size:12px}.sbc-connection-list{display:grid;gap:8px;margin-top:12px}.sbc-connection{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}.sbc-connection>span:first-child{flex:1;font-weight:700}.sbc-connection button{border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;padding:6px 10px}.sbc-empty{text-align:center;padding:40px;color:#64748b}
@media(max-width:700px){.sbc-overlay{padding:10px}.sbc-panel{max-height:calc(100vh - 20px);padding:16px;border-radius:16px}.sbc-toolbar{align-items:flex-start;flex-direction:column}.sbc-setting-row{align-items:flex-start}.sbc-connection{flex-wrap:wrap}}
`;
document.head.appendChild(style);

const mount=document.createElement("div");
mount.id="sales-channel-root";document.body.appendChild(mount);
createRoot(mount).render(<App/>);
