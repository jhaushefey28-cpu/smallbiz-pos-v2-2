class ErrorBoundary extends React.Component {
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return {error}}
 render(){
  if(this.state.error)return <div className="auth"><div className="card"><h1>SmallBiz POS V2.2</h1><h2>App error</h2><pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.error?.stack||this.state.error)}</pre><p>Send this message to ChatGPT so we can fix the exact problem.</p></div></div>;
  return this.props.children;
 }
}

import React,{useEffect,useMemo,useState} from "react";
import{createRoot}from"react-dom/client";
import{createClient}from"@supabase/supabase-js";
import{Html5Qrcode}from"html5-qrcode";
import"./styles.css";

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configError=!SUPABASE_URL||!SUPABASE_KEY;
const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);
const money=v=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(v||0));
const norm=p=>({...p,name:p.name??p.product_name??p.productName??p.title??"Unnamed Product",barcode:p.barcode??p.bar_code??p.barcode_number??p.sku??"",price:Number(p.price??p.selling_price??p.sale_price??0),stock:Number(p.stock??p.quantity??p.current_stock??0)});

function App(){
 if(configError)return <div className="auth"><div className="card"><h1>SmallBiz POS V2.2</h1><h2>Configuration missing</h2><p>Vercel is not receiving the Supabase environment variables.</p><pre>VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY</pre><p>Open Vercel → Settings → Environment Variables, save both variables for Production, then redeploy.</p></div></div>;
 const[session,setSession]=useState(null),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[err,setErr]=useState("");
 const[products,setProducts]=useState([]),[search,setSearch]=useState(""),[cart,setCart]=useState([]),[scan,setScan]=useState(false),[status,setStatus]=useState(""),[cash,setCash]=useState(""),[paymentOpen,setPaymentOpen]=useState(false),[paymentDone,setPaymentDone]=useState(false);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const x=supabase.auth.onAuthStateChange((_,s)=>setSession(s));return()=>x.data.subcription.unsubscribe()},[]);
 useEffect(()=>{if(session?.user)load(session.user.id)},[session]);
 async function load(uid){
   const {data:pr,error:pe}=await supabase.from("profiles").select("business_id,active,role").eq("id",uid).single();
   if(pe){setErr(pe.message);return}
   let q=supabase.from("products").select("*"); if(pr.business_id)q=q.eq("business_id",pr.business_id);
   const {data,error}=await q.order("created_at",{ascending:false});
   if(error)setErr(error.message);else setProducts((data||[]).map(norm));
 }
 async function login(e){e.preventDefault();setErr("");const{error}=await supabase.auth.signInWithPassword({email,password});if(error)setErr(error.message)}
 async function logout(){await supabase.auth.signOut();setCart([])}
 const filtered=useMemo(()=>{const q=search.toLowerCase().trim();return q?products.filter(p=>String(p.name).toLowerCase().includes(q)||String(p.barcode).toLowerCase().includes(q)):products},[products,search]);
 function add(p){setCart(c=>{const x=c.find(i=>i.id===p.id);return x?c.map(i=>i.id===p.id?{...i,qty:Math.min(i.qty+1,p.stock||i.qty+1)}:i):[...c,{...p,qty:1}]})}
 function qty(id,d){setCart(c=>c.flatMap(i=>{if(i.id!==id)return[i];const n=Math.min(i.stock||999999,i.qty+d);return n>0?[{...i,qty:n}]:[]}))}
 const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
 useEffect(()=>{if(!scan)return;const s=new Html5Qrcode("reader");s.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},code=>{const p=products.find(x=>String(x.barcode)===String(code));if(p){add(p);setStatus("Added: "+p.name)}else{setStatus("Barcode not found: "+code);setSearch(code)}},()=>{}).catch(e=>setStatus("Camera error: "+e));return()=>{s.stop().then(()=>s.clear()).catch(()=>{})}},[scan,products]);
 if(!session)return <div className="auth"><form className="card" onSubmit={login}><h1>SmallBiz POS V2.2</h1><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary">Login</button>{err&&<p className="error">{err}</p>}</form></div>;
 return <div><header><b>SmallBiz POS <small>V2.2</small></b><button onClick={logout}>Logout</button></header><main>
 <section className="card"><div className="head"><h2>Products</h2><button onClick={()=>setScan(!scan)}>{scan?"Close Scanner":"Scan Barcode"}</button></div>
 {scan&&<div className="scanner"><div id="reader"></div><small>Allow camera access and point at a barcode.</small></div>}
 <input className="search" placeholder="Search product or barcode..." value={search} onChange={e=>setSearch(e.target.value)}/>
 {status&&<div className="status">{status}</div>}
 <div>{filtered.map(p=><button className="row" key={p.id} onClick={()=>add(p)}><span><b>{p.name}</b><small>{p.barcode||"No barcode"} · Stock {p.stock}</small></span><b>{money(p.price)}</b></button>)}</div>
 </section>
 <section className="card"><div className="head"><h2>Cart</h2><span>{cart.reduce((n,i)=>n+i.qty,0)} item(s)</span></div>
 {cart.length?<>{cart.map(i=><div className="cart" key={i.id}><span><b>{i.name}</b><small>{money(i.price)} each</small></span><span><button onClick={()=>qty(i.id,-1)}>−</button> {i.qty} <button onClick={()=>qty(i.id,1)}>+</button></span><b>{money(i.price*i.qty)}</b></div>)}</>:<div className="empty">Cart is empty.</div>}
 <div className="total"><span>Total</span><b>{money(total)}</b></div><button className="primary" disabled={!cart.length} onClick={()=>{setCash("");setPaymentOpen(true)}}>Payment</button>
}
createRoot(document.getElementById("root")).render(<ErrorBoundary><App/></ErrorBoundary>);
