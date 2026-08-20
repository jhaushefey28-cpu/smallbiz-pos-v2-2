import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;
const money = v => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(v || 0));
const esc = v => String(v ?? '').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

const withTimeout = (promise, ms=1200) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Availability check timed out')), ms))
]);

async function profile(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session?.user) throw new Error('Authentication required');
  const {data,error} = await sb.from('profiles').select('id,business_id,active').eq('id',session.user.id).single();
  if(error) throw error;
  if(!data?.active) throw new Error('User account is inactive');
  return data;
}

async function directAvailability(bundleId){
  const {data:items,error:itemError} = await sb.from('product_bundle_items')
    .select('product_id,variation_id,quantity').eq('bundle_id',bundleId);
  if(itemError) throw itemError;
  if(!items?.length) return {available_sets:0,limiting_component:'No components configured'};

  const checks = items.filter(item => Number(item.quantity || 0) > 0).map(async item => {
    const needed = Number(item.quantity || 0);
    if(item.variation_id){
      const {data:v,error} = await sb.from('product_variations').select('name,stock').eq('id',item.variation_id).single();
      if(error) throw error;
      return {sets:Math.floor(Number(v?.stock || 0) / needed),label:v?.name || 'Variation'};
    }
    const {data:p,error} = await sb.from('products').select('name,stock').eq('id',item.product_id).single();
    if(error) throw error;
    return {sets:Math.floor(Number(p?.stock || 0) / needed),label:p?.name || 'Product'};
  });
  const results = await Promise.all(checks);
  const limiting = results.reduce((best,row) => row.sets < best.sets ? row : best, results[0]);
  return {available_sets:Math.max(0,Number(limiting?.sets || 0)),limiting_component:limiting?.label || ''};
}

async function getAvailability(bundleId){
  try{
    const {data,error} = await withTimeout(sb.rpc('get_product_bundle_availability',{p_bundle_id:bundleId}),800);
    if(error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if(row) return {available_sets:Number(row.available_sets||0),limiting_component:row.limiting_component||''};
  }catch(e){
    console.warn('[Combo Availability] Fast RPC fallback:',e.message);
  }
  return directAvailability(bundleId);
}

function replaceDetails(){
  const old = document.getElementById('sb-cpos5-details');
  if(!old) return null;
  const fresh = old.cloneNode(false);
  fresh.id='sb-cpos5-details-stable';
  old.replaceWith(fresh);
  return fresh;
}

async function renderStable(bundleId){
  const select=document.getElementById('sb-cpos5-bundle');
  if(!select || select.value!==bundleId) return;
  const details=replaceDetails();
  if(!details) return;
  details.innerHTML='<div class="sb-cpos5-info">Checking stock...</div>';
  try{
    const {data:bundle,error} = await sb.from('product_bundles').select('id,name,price,active,business_id').eq('id',bundleId).eq('active',true).single();
    if(error) throw error;
    const av=await getAvailability(bundleId);
    const n=Number(av.available_sets||0);
    details.innerHTML=`<div class="sb-cpos5-info"><b>Available:</b> ${n} set(s)${av.limiting_component?` · Limiting component: ${esc(av.limiting_component)}`:''}</div>
      <div class="sb-cpos5-grid"><div class="sb-cpos5-field"><label>Quantity (Sets)</label><input id="sb-cpos5-qty-stable" type="number" min="1" step="1" value="1" max="${Math.max(1,n)}"></div>
      <div class="sb-cpos5-field"><label>Payment</label><select id="sb-cpos5-payment-stable"><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option></select></div></div>
      <div class="sb-cpos5-field"><label>Cash Tendered (Cash only)</label><input id="sb-cpos5-cash-stable" type="number" min="0" step="0.01" placeholder="0.00"></div>
      <div id="sb-cpos5-total-stable" class="sb-cpos5-total"><span>Total</span><span>${money(bundle.price)}</span></div>
      <div id="sb-cpos5-change-stable" class="sb-cpos5-total" style="font-size:14px"><span>Change</span><span>${money(0)}</span></div>
      <div id="sb-cpos5-message-stable"></div>
      <div class="sb-cpos5-actions"><button id="sb-cpos5-sell-stable" class="sb-cpos5-btn sb-cpos5-primary" ${n<1?'disabled':''}>Proceed to Payment</button></div>`;

    const qty=details.querySelector('#sb-cpos5-qty-stable'), pay=details.querySelector('#sb-cpos5-payment-stable'), cash=details.querySelector('#sb-cpos5-cash-stable'), total=details.querySelector('#sb-cpos5-total-stable'), change=details.querySelector('#sb-cpos5-change-stable'), msg=details.querySelector('#sb-cpos5-message-stable'), btn=details.querySelector('#sb-cpos5-sell-stable');
    const refresh=()=>{const q=Math.max(0,Math.floor(Number(qty.value||0)));const t=Number(bundle.price||0)*q;const c=Number(cash.value||0);total.innerHTML=`<span>Total</span><span>${money(t)}</span>`;cash.disabled=pay.value!=='cash';change.innerHTML=`<span>Change</span><span>${money(pay.value==='cash'&&c>=t?c-t:0)}</span>`;};
    qty.oninput=refresh;cash.oninput=refresh;pay.onchange=refresh;refresh();
    btn.onclick=async()=>{
      const q=Math.floor(Number(qty.value||0)), method=pay.value, t=Number(bundle.price||0)*q, c=Number(cash.value||0);
      if(q<1){msg.innerHTML='<div class="sb-cpos5-warn">Quantity must be at least 1 set.</div>';return;}
      if(q>n){msg.innerHTML=`<div class="sb-cpos5-warn">Not enough stock. Only ${n} set(s) are available.</div>`;return;}
      if(method==='cash'&&c<t){msg.innerHTML=`<div class="sb-cpos5-warn">Insufficient cash. Required ${money(t)}.</div>`;return;}
      btn.disabled=true;btn.textContent='Saving sale...';msg.innerHTML='<div class="sb-cpos5-info">Saving transaction...</div>';
      try{
        const p=await profile();
        const {data:result,error:resultError}=await withTimeout(sb.rpc('complete_sale_with_bundles',{p_business_id:p.business_id,p_cashier_id:p.id,p_customer_id:null,p_discount:0,p_discount_reason:null,p_payment_method:method,p_payment_reference:null,p_amount_tendered:method==='cash'?c:t,p_items:[{item_type:'bundle',bundle_id:bundle.id,quantity:q,unit_price:Number(bundle.price||0)}]}),8000);
        if(resultError) throw resultError;
        const invoice=result?.invoice_no||'Sale completed';
        const ch=method==='cash'?c-t:0;
        msg.innerHTML=`<div class="sb-cpos5-success"><b>Sale completed.</b><br>${esc(invoice)} · ${q} set(s) · ${money(t)}<br>Payment: ${esc(method)} · Change: ${money(ch)}</div>`;
        btn.textContent='Completed';
        window.dispatchEvent(new CustomEvent('smallbiz:combo-sale-complete',{detail:{bundleId:bundle.id,invoice,paymentMethod:method,amountTendered:method==='cash'?c:t,change:ch}}));
        setTimeout(()=>document.getElementById('sb-cpos5-close')?.click(),900);
      }catch(e){msg.innerHTML=`<div class="sb-cpos5-error">Checkout failed: ${esc(e.message)}</div>`;btn.disabled=false;btn.textContent='Proceed to Payment';}
    };
  }catch(e){details.innerHTML=`<div class="sb-cpos5-error">Unable to check stock: ${esc(e.message)}</div>`;}
}

function watch(){
  const select=document.getElementById('sb-cpos5-bundle');
  if(!select || select.dataset.stabilityBound==='1') return;
  select.dataset.stabilityBound='1';
  select.addEventListener('change',()=>{
    const id=select.value;
    if(!id) return;
    setTimeout(()=>{
      const d=document.getElementById('sb-cpos5-details');
      if(d && /Checking available sets|Checking stock/i.test(d.textContent||'')) renderStable(id);
    },150);
  });
}
new MutationObserver(watch).observe(document.body,{childList:true,subtree:true});
watch();
