import { createClient } from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb=url&&key?createClient(url,key):null;

const STYLE=`
.sb-cpos5-btn{border:0;border-radius:8px;padding:8px 11px;font-weight:700;cursor:pointer}
.sb-cpos5-primary{background:#2563eb;color:#fff}.sb-cpos5-muted{background:#f3f4f6;color:#111827}.sb-cpos5-danger{background:#fee2e2;color:#991b1b}
.sb-cpos5-modal{position:fixed;inset:0;z-index:100010;background:rgba(15,23,42,.52);display:none;align-items:center;justify-content:center;padding:14px}.sb-cpos5-modal.open{display:flex}
.sb-cpos5-card{width:min(620px,calc(100vw - 28px));max-height:min(720px,calc(100dvh - 28px));overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:16px}
.sb-cpos5-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.sb-cpos5-title{font-size:18px;font-weight:800;color:#111827}.sb-cpos5-sub{font-size:11px;color:#6b7280;margin-top:3px}
.sb-cpos5-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.sb-cpos5-field label{font-size:11px;font-weight:700;color:#374151}.sb-cpos5-field input,.sb-cpos5-field select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #d1d5db;border-radius:8px;font-size:13px}
.sb-cpos5-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:9px;padding:9px 10px;font-size:12px;margin-bottom:10px}.sb-cpos5-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:9px;padding:9px 10px;font-size:12px;margin-bottom:10px}.sb-cpos5-error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:9px;padding:9px 10px;font-size:12px;margin-bottom:10px}.sb-cpos5-success{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:9px;padding:9px 10px;font-size:12px;margin-bottom:10px}
.sb-cpos5-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:12px}.sb-cpos5-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.sb-cpos5-total{display:flex;justify-content:space-between;font-size:17px;font-weight:800;padding:10px 0;border-top:1px solid #e5e7eb;margin-top:6px}.sb-cpos5-list{display:grid;gap:6px;max-height:240px;overflow:auto}.sb-cpos5-item{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #e5e7eb;border-radius:9px;padding:9px}.sb-cpos5-item strong{font-size:12px}.sb-cpos5-item span{font-size:11px;color:#6b7280}
@media(max-width:650px){.sb-cpos5-grid{grid-template-columns:1fr}.sb-cpos5-card{width:calc(100vw - 14px);max-height:calc(100dvh - 14px)}}
`;
if(!document.getElementById('sb-cpos5-style')){const s=document.createElement('style');s.id='sb-cpos5-style';s.textContent=STYLE;document.head.appendChild(s)}

const root=document.createElement('div');root.id='sb-cpos5-root';root.innerHTML=`<div id="sb-cpos5-modal" class="sb-cpos5-modal"><div class="sb-cpos5-card"><div class="sb-cpos5-head"><div><div class="sb-cpos5-title">Sell Combo / Set</div><div class="sb-cpos5-sub">Component stock is checked again at checkout and deducted atomically.</div></div><button id="sb-cpos5-close" class="sb-cpos5-btn sb-cpos5-muted">Close</button></div><div id="sb-cpos5-body"></div></div></div>`;document.body.appendChild(root);

let bundles=[];let profile=null;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(v||0));
const modal=()=>document.getElementById('sb-cpos5-modal');
const body=()=>document.getElementById('sb-cpos5-body');

async function loadProfile(){
 if(!sb)return false;
 const {data:{session}}=await sb.auth.getSession();
 if(!session?.user){return false}
 const {data,error}=await sb.from('profiles').select('id,business_id,role,active').eq('id',session.user.id).single();
 if(error||!data||!data.active){return false}
 profile=data;return true;
}

async function loadBundles(){
 if(!profile?.business_id)return;
 const {data,error}=await sb.from('product_bundles').select('id,name,sku,barcode,price,inventory_mode,manual_stock,track_components,active').eq('business_id',profile.business_id).eq('active',true).order('name');
 if(error){body().innerHTML=`<div class="sb-cpos5-error">Unable to load Combo / Sets: ${esc(error.message)}</div>`;return}
 bundles=data||[];
 render();
}

async function availability(bundleId){
 const {data,error}=await sb.rpc('get_product_bundle_availability',{p_bundle_id:bundleId});
 if(error)throw new Error(error.message);
 return data?.[0]||{available_sets:0,limiting_component:''};
}

function render(){
 const b=body();
 b.innerHTML=`<div class="sb-cpos5-field"><label>Choose Combo / Set</label><select id="sb-cpos5-bundle"><option value="">Select a Combo / Set...</option>${bundles.map(x=>`<option value="${x.id}">${esc(x.name)} — ${money(x.price)}</option>`).join('')}</select></div><div id="sb-cpos5-details"></div>`;
 const select=b.querySelector('#sb-cpos5-bundle');
 select.onchange=()=>showBundle(select.value);
}

async function showBundle(id){
 const d=document.getElementById('sb-cpos5-details');
 if(!id){d.innerHTML='';return}
 const bundle=bundles.find(x=>x.id===id);if(!bundle)return;
 d.innerHTML='<div class="sb-cpos5-info">Checking available sets...</div>';
 try{
   const av=await availability(id);
   const n=Number(av.available_sets||0);
   d.innerHTML=`<div class="sb-cpos5-info"><b>Available:</b> ${n} set(s)${av.limiting_component?` · Limiting component: ${esc(av.limiting_component)}`:''}</div><div class="sb-cpos5-grid"><div class="sb-cpos5-field"><label>Quantity (Sets)</label><input id="sb-cpos5-qty" type="number" min="1" step="1" value="1" max="${Math.max(1,n)}"></div><div class="sb-cpos5-field"><label>Payment</label><select id="sb-cpos5-payment"><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option></select></div></div><div class="sb-cpos5-field"><label>Cash Tendered (Cash only)</label><input id="sb-cpos5-cash" type="number" min="0" step="0.01" placeholder="0.00"></div><div id="sb-cpos5-total" class="sb-cpos5-total"><span>Total</span><span>${money(bundle.price)}</span></div><div id="sb-cpos5-message"></div><div class="sb-cpos5-actions"><button id="sb-cpos5-sell" class="sb-cpos5-btn sb-cpos5-primary" ${n<1?'disabled':''}>Proceed to Payment</button></div>`;
   const qty=d.querySelector('#sb-cpos5-qty');const pay=d.querySelector('#sb-cpos5-payment');const cash=d.querySelector('#sb-cpos5-cash');const total=d.querySelector('#sb-cpos5-total');
   const refreshTotal=()=>{const q=Math.max(0,Math.floor(Number(qty.value||0)));total.innerHTML=`<span>Total</span><span>${money(Number(bundle.price||0)*q)}</span>`;cash.disabled=pay.value!=='cash';};
   qty.oninput=refreshTotal;pay.onchange=refreshTotal;refreshTotal();
   d.querySelector('#sb-cpos5-sell').onclick=()=>checkout(bundle,qty,pay,cash,av);
 }catch(e){d.innerHTML=`<div class="sb-cpos5-error">Availability check failed: ${esc(e.message)}</div>`}
}

async function checkout(bundle,qtyEl,payEl,cashEl,initialAvailability){
 const message=document.getElementById('sb-cpos5-message');
 const qty=Math.floor(Number(qtyEl.value||0));const method=payEl.value;const total=Number(bundle.price||0)*qty;const cash=Number(cashEl.value||0);
 if(qty<=0){message.innerHTML='<div class="sb-cpos5-warn">Quantity must be at least 1 set.</div>';return}
 if(qty>Number(initialAvailability.available_sets||0)){message.innerHTML=`<div class="sb-cpos5-warn">Not enough stock. Only ${Number(initialAvailability.available_sets||0)} set(s) are currently available.</div>`;return}
 if(method==='cash'&&cash<total){message.innerHTML=`<div class="sb-cpos5-warn">Insufficient cash. Required ${money(total)}.</div>`;return}
 const button=document.getElementById('sb-cpos5-sell');button.disabled=true;button.textContent='Checking stock...';message.innerHTML='<div class="sb-cpos5-info">Final stock validation in progress...</div>';
 try{
   const {data:check,error:checkError}=await sb.rpc('validate_product_bundle_checkout',{p_bundle_id:bundle.id,p_requested_sets:qty});
   if(checkError)throw new Error(checkError.message);
   const validation=check?.[0];
   if(!validation?.ok){message.innerHTML=`<div class="sb-cpos5-warn">${esc(validation?.message||'Insufficient Combo/Set stock.')}</div>`;button.disabled=false;button.textContent='Proceed to Payment';return}
   button.textContent='Saving sale...';
   const {data,resultError}=await sb.rpc('complete_sale_with_bundles',{
     p_business_id:profile.business_id,p_cashier_id:profile.id,p_customer_id:null,p_discount:0,p_discount_reason:null,
     p_payment_method:method,p_payment_reference:null,p_amount_tendered:method==='cash'?cash:total,
     p_items:[{item_type:'bundle',bundle_id:bundle.id,quantity:qty,unit_price:Number(bundle.price||0)}]
   });
   if(resultError)throw new Error(resultError.message);
   const invoice=result?.invoice_no||'Sale completed';
   message.innerHTML=`<div class="sb-cpos5-success"><b>Sale completed.</b><br>${esc(invoice)} · ${qty} set(s) · ${money(total)}</div>`;
   button.textContent='Completed';
   window.dispatchEvent(new CustomEvent('smallbiz:combo-sale-complete',{detail:{bundleId:bundle.id}}));
   await loadBundles();
 }catch(e){message.innerHTML=`<div class="sb-cpos5-error">Checkout failed: ${esc(e.message)}</div>`;button.disabled=false;button.textContent='Proceed to Payment'}
}

async function open(){
 const ok=await loadProfile();
 if(!ok)return;
 modal().classList.add('open');body().innerHTML='<div class="sb-cpos5-info">Loading Combo / Sets...</div>';await loadBundles();
}
function close(){modal().classList.remove('open')}
document.getElementById('sb-cpos5-close').onclick=close;

function attachSellButton(){
 const bodyEl=document.getElementById('sb-combo-v4-body');if(!bodyEl)return false;
 if(bodyEl.querySelector('#sb-cpos5-open'))return true;
 const toolbar=bodyEl.querySelector('.sb-combo-v4-toolbar');if(!toolbar)return false;
 const btn=document.createElement('button');btn.id='sb-cpos5-open';btn.className='sb-combo-v4-btn sb-combo-v4-primary';btn.textContent='Sell Combo';btn.style.marginLeft='auto';btn.onclick=open;toolbar.appendChild(btn);return true;
}

const observer=new MutationObserver(()=>attachSellButton());observer.observe(document.body,{childList:true,subtree:true});
setInterval(attachSellButton,1000);
