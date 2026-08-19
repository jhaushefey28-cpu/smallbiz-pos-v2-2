import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;

const STYLE = `
.sb-combo-v4-btn{border:0;border-radius:9px;padding:8px 11px;font-weight:700;cursor:pointer}.sb-combo-v4-primary{background:#111827;color:#fff}.sb-combo-v4-muted{background:#f3f4f6;color:#111827}.sb-combo-v4-danger{background:#fee2e2;color:#991b1b}.sb-combo-v4-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.52);display:none;align-items:center;justify-content:center;padding:14px}.sb-combo-v4-overlay.open{display:flex}.sb-combo-v4-panel{width:min(980px,calc(100vw - 28px));height:min(720px,calc(100dvh - 28px));background:#fff;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden}.sb-combo-v4-head{padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}.sb-combo-v4-title{font-size:19px;font-weight:800;color:#111827}.sb-combo-v4-sub{font-size:11px;color:#6b7280;margin-top:2px}.sb-combo-v4-body{padding:14px;overflow:auto;flex:1}.sb-combo-v4-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:10px}.sb-combo-v4-toolbar input{flex:1;min-width:180px;padding:8px 10px;border:1px solid #d1d5db;border-radius:9px}.sb-combo-v4-table{width:100%;border-collapse:collapse}.sb-combo-v4-table th,.sb-combo-v4-table td{padding:8px;border-bottom:1px solid #eef0f3;text-align:left;font-size:12px}.sb-combo-v4-table th{color:#6b7280}.sb-combo-v4-badge{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800}.sb-combo-v4-manual{background:#dbeafe;color:#1d4ed8}.sb-combo-v4-components{background:#dcfce7;color:#166534}.sb-combo-v4-empty{text-align:center;padding:48px 20px;color:#6b7280}.sb-combo-v4-empty strong{display:block;color:#111827;font-size:16px;margin-bottom:6px}.sb-combo-v4-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:9px 11px;border-radius:9px;margin-bottom:10px;font-size:12px}.sb-combo-v4-warning{background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:9px 11px;border-radius:9px;margin-bottom:10px;font-size:12px}.sb-combo-v4-editor{position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.5);display:none;align-items:center;justify-content:center;padding:12px}.sb-combo-v4-editor.open{display:flex}.sb-combo-v4-card{width:min(700px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;background:#fff;border-radius:14px;padding:16px}.sb-combo-v4-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.sb-combo-v4-field{display:flex;flex-direction:column;gap:4px}.sb-combo-v4-field.full{grid-column:1/-1}.sb-combo-v4-field label{font-size:11px;font-weight:700;color:#374151}.sb-combo-v4-field input,.sb-combo-v4-field select{padding:8px 9px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;min-width:0}.sb-combo-v4-component-box{margin-top:12px;border:1px solid #e5e7eb;border-radius:10px;padding:10px}.sb-combo-v4-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 70px 32px;gap:6px;margin:6px 0}.sb-combo-v4-row select,.sb-combo-v4-row input{min-width:0;padding:7px;border:1px solid #d1d5db;border-radius:7px}.sb-combo-v4-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:13px}.sb-combo-v4-sidebar{white-space:nowrap!important;min-height:52px!important;height:52px!important;padding:8px 10px!important;line-height:1.15!important;overflow:hidden!important}.sb-combo-v4-sidebar *{white-space:nowrap!important;line-height:1.15!important;font-size:14px!important}@media(max-width:700px){.sb-combo-v4-panel{width:calc(100vw - 12px);height:calc(100dvh - 12px)}.sb-combo-v4-grid{grid-template-columns:1fr}.sb-combo-v4-row{grid-template-columns:1fr 1fr 64px 32px}.sb-combo-v4-table th:nth-child(3),.sb-combo-v4-table td:nth-child(3){display:none}}
`;
if(!document.getElementById('sb-combo-v4-style')){const s=document.createElement('style');s.id='sb-combo-v4-style';s.textContent=STYLE;document.head.appendChild(s)}

let profile=null,products=[],variations=[],bundles=[],components=[];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(v||0));
const root=document.createElement('div');
root.id='sb-combo-v4-root';
root.innerHTML=`<div id="sb-combo-v4-overlay" class="sb-combo-v4-overlay"><div class="sb-combo-v4-panel"><div class="sb-combo-v4-head"><div><div class="sb-combo-v4-title">Combo / Sets</div><div class="sb-combo-v4-sub">Packs, bundles and restaurant-style sets. Inventory stays by piece on components.</div></div><button class="sb-combo-v4-btn sb-combo-v4-muted" id="sb-combo-v4-close">Close</button></div><div class="sb-combo-v4-body" id="sb-combo-v4-body"></div></div></div><div id="sb-combo-v4-editor" class="sb-combo-v4-editor"></div>`;
document.body.appendChild(root);

function showMessage(type,text){const b=document.getElementById('sb-combo-v4-body');if(b)b.insertAdjacentHTML('afterbegin',`<div class="sb-combo-v4-${type}">${esc(text)}</div>`)}
function availability(b){if(b.inventory_mode==='manual')return Math.max(0,Math.floor(Number(b.manual_stock||0)));const cs=components.filter(x=>x.bundle_id===b.id);if(!cs.length)return 0;return Math.min(...cs.map(x=>{const v=x.variation_id&&variations.find(y=>y.id===x.variation_id);const p=products.find(y=>y.id===x.product_id);return Math.floor(Number(v?.stock??p?.stock??0)/Number(x.quantity||1))}))}
function productName(id){return products.find(p=>p.id===id)?.name||'Unknown product'}
function variationName(id){return variations.find(v=>v.id===id)?.name||''}
function canEdit(){const r=String(profile?.role||'').toLowerCase();return ['super_admin','owner','admin'].includes(r)}

async function loadData(){
  if(!sb)return;
  const {data:s}=await sb.auth.getSession();
  const uid=s?.session?.user?.id;
  if(!uid){showMessage('error','Please sign in first.');return}
  const {data:p,error:pe}=await sb.from('profiles').select('id,business_id,role,active').eq('id',uid).single();
  if(pe){showMessage('error',pe.message);return}
  profile=p;
  const {data:ps,error:prodErr}=await sb.from('products').select('id,name,sku,barcode,price,stock,cost_price,active').eq('business_id',p.business_id).eq('active',true).order('name');
  if(prodErr){showMessage('error','Products could not be loaded: '+prodErr.message);return}
  products=ps||[];
  const {data:vs,error:varErr}=await sb.from('product_variations').select('id,product_id,name,sku,barcode,cost,price,stock,unit,active').eq('business_id',p.business_id).eq('active',true).order('name');
  variations=vs||[];
  const {data:bs,error:bundleErr}=await sb.from('product_bundles').select('id,product_id,name,sku,barcode,price,active,inventory_mode,manual_stock,low_stock_threshold,track_components').eq('business_id',p.business_id).order('created_at',{ascending:false});
  if(bundleErr){showMessage('error','Combo/Sets could not be loaded: '+bundleErr.message);return}
  bundles=bs||[];
  const ids=bundles.map(x=>x.id);
  if(ids.length){const {data:cs,error:ce}=await sb.from('product_bundle_items').select('id,bundle_id,product_id,variation_id,quantity').in('bundle_id',ids);if(ce){showMessage('error','Set components could not be loaded: '+ce.message);return}components=cs||[]}else components=[];
  render();
  if(varErr)showMessage('warning','Product variations are temporarily unavailable. Base products are still available; fix the database permission before using variation components.');
}

function render(filter=''){
  const body=document.getElementById('sb-combo-v4-body');if(!body)return;
  const q=filter.trim().toLowerCase();
  const rows=bundles.filter(b=>!q||String(b.name||'').toLowerCase().includes(q)||String(b.sku||'').toLowerCase().includes(q));
  body.innerHTML=`<div class="sb-combo-v4-toolbar"><input id="sb-combo-v4-search" placeholder="Search Combo / Set..." value="${esc(filter)}"><button class="sb-combo-v4-btn sb-combo-v4-primary" id="sb-combo-v4-add">+ Create Combo / Set</button></div>${!rows.length?`<div class="sb-combo-v4-empty"><strong>No Combo / Sets yet.</strong>Create your first pack, Set of 2/3/6, milk tea bundle or restaurant meal set.<br><button class="sb-combo-v4-btn sb-combo-v4-primary" id="sb-combo-v4-empty-add" style="margin-top:12px">+ Create Combo / Set</button></div>`:`<table class="sb-combo-v4-table"><thead><tr><th>Combo / Set</th><th>SKU</th><th>Price</th><th>Inventory</th><th>Available</th><th></th></tr></thead><tbody>${rows.map(b=>{const av=availability(b);const cs=components.filter(c=>c.bundle_id===b.id);return `<tr><td><strong>${esc(b.name)}</strong><div class="sb-combo-v4-sub">${cs.map(c=>`${esc(productName(c.product_id))}${c.variation_id?' - '+esc(variationName(c.variation_id)):''} × ${c.quantity}`).join(' · ')||'No components'}</div></td><td>${esc(b.sku||'')}</td><td>${money(b.price)}</td><td><span class="sb-combo-v4-badge ${b.inventory_mode==='manual'?'sb-combo-v4-manual':'sb-combo-v4-components'}">${b.inventory_mode==='manual'?'Manual':'Components'}</span></td><td>${av}</td><td>${canEdit()?`<button class="sb-combo-v4-btn sb-combo-v4-muted" data-edit="${b.id}">Edit</button>`:''}</td></tr>`}).join('')}</tbody></table>`}`;
  body.querySelector('#sb-combo-v4-search').oninput=e=>render(e.target.value);
  body.querySelector('#sb-combo-v4-add').onclick=()=>openEditor();
  body.querySelector('#sb-combo-v4-empty-add')?.addEventListener('click',()=>openEditor());
  body.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>openEditor(x.dataset.edit));
}

function openEditor(id){
  if(!canEdit()){showMessage('error','Cashier access is view-only for Combo / Sets.');return}
  const editing=id?bundles.find(x=>x.id===id):null;
  const b=editing||{name:'',sku:'',barcode:'',price:0,inventory_mode:'component_based',manual_stock:0,low_stock_threshold:0,track_components:true,product_id:products[0]?.id||''};
  const cs=editing?components.filter(x=>x.bundle_id===editing.id):[];
  const modal=document.getElementById('sb-combo-v4-editor');
  modal.innerHTML=`<div class="sb-combo-v4-card"><div class="sb-combo-v4-toolbar"><div style="flex:1"><div class="sb-combo-v4-title">${editing?'Edit':'Create'} Combo / Set</div><div class="sb-combo-v4-sub">Example: Coke 500ml × 3 = Set of 3. Selling one set consumes 3 pcs.</div></div><button class="sb-combo-v4-btn sb-combo-v4-muted" id="sb-combo-v4-editor-close">Close</button></div><div id="sb-combo-v4-form-msg"></div><form id="sb-combo-v4-form"><div class="sb-combo-v4-grid"><div class="sb-combo-v4-field"><label>Name *</label><input name="name" required value="${esc(b.name)}"></div><div class="sb-combo-v4-field"><label>Base Product *</label><select name="product_id">${products.map(p=>`<option value="${p.id}" ${p.id===b.product_id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="sb-combo-v4-field"><label>SKU</label><input name="sku" value="${esc(b.sku||'')}"></div><div class="sb-combo-v4-field"><label>Barcode</label><input name="barcode" value="${esc(b.barcode||'')}"></div><div class="sb-combo-v4-field"><label>Selling Price *</label><input name="price" type="number" min="0" step="0.01" required value="${Number(b.price||0)}"></div><div class="sb-combo-v4-field"><label>Inventory Mode</label><select name="inventory_mode"><option value="component_based" ${b.inventory_mode==='component_based'?'selected':''}>Component-Based</option><option value="manual" ${b.inventory_mode==='manual'?'selected':''}>Manual Stock</option></select></div><div class="sb-combo-v4-field"><label>Manual Set Stock</label><input name="manual_stock" type="number" min="0" step="1" value="${Number(b.manual_stock||0)}"></div><div class="sb-combo-v4-field"><label>Low Stock Alert</label><input name="low_stock_threshold" type="number" min="0" step="1" value="${Number(b.low_stock_threshold||0)}"></div><div class="sb-combo-v4-field full"><label><input name="track_components" type="checkbox" ${b.track_components!==false?'checked':''}> Track component inventory when sold</label></div></div><div class="sb-combo-v4-component-box"><b>Set Components</b><div class="sb-combo-v4-sub">Use pieces/units. Example: Coke 500ml × 3, Burger × 1, Fries × 1.</div><div id="sb-combo-v4-rows"></div><button type="button" class="sb-combo-v4-btn sb-combo-v4-muted" id="sb-combo-v4-add-row" style="margin-top:5px">+ Add Component</button></div><div class="sb-combo-v4-actions"><button type="button" class="sb-combo-v4-btn sb-combo-v4-danger" id="sb-combo-v4-delete" ${editing?'':'style="display:none"'}>Delete</button><button class="sb-combo-v4-btn sb-combo-v4-primary">Save Combo / Set</button></div></form></div>`;
  modal.classList.add('open');
  const list=modal.querySelector('#sb-combo-v4-rows');
  const addRow=(c={product_id:products[0]?.id||'',variation_id:'',quantity:1})=>{const row=document.createElement('div');row.className='sb-combo-v4-row';row.innerHTML=`<select data-p>${products.map(p=>`<option value="${p.id}" ${p.id===c.product_id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><select data-v><option value="">No variation</option>${variations.filter(v=>v.product_id===c.product_id).map(v=>`<option value="${v.id}" ${v.id===c.variation_id?'selected':''}>${esc(v.name)}</option>`).join('')}</select><input data-q type="number" min="0.001" step="0.001" value="${Number(c.quantity||1)}"><button type="button" class="sb-combo-v4-btn sb-combo-v4-danger">×</button>`;row.querySelector('[data-p]').onchange=e=>{const vs=variations.filter(v=>v.product_id===e.target.value);row.querySelector('[data-v]').innerHTML='<option value="">No variation</option>'+vs.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')};row.querySelector('button').onclick=()=>row.remove();list.appendChild(row)};
  (cs.length?cs:[{}]).forEach(addRow);
  modal.querySelector('#sb-combo-v4-add-row').onclick=()=>addRow();
  modal.querySelector('#sb-combo-v4-editor-close').onclick=()=>modal.classList.remove('open');
  modal.querySelector('#sb-combo-v4-form').onsubmit=async e=>{e.preventDefault();await saveEditor(e,editing?.id)};
  modal.querySelector('#sb-combo-v4-delete').onclick=()=>deleteBundle(editing?.id);
}

async function saveEditor(e,id){
  const form=e.currentTarget;const fd=new FormData(form);const name=String(fd.get('name')||'').trim();if(!name)return;
  const payload={business_id:profile.business_id,product_id:fd.get('product_id'),name,sku:String(fd.get('sku')||'').trim()||null,barcode:String(fd.get('barcode')||'').trim()||null,price:Number(fd.get('price')||0),inventory_mode:String(fd.get('inventory_mode')||'component_based'),manual_stock:Number(fd.get('manual_stock')||0),low_stock_threshold:Number(fd.get('low_stock_threshold')||0),track_components:form.querySelector('[name=track_components]').checked,active:true,updated_at:new Date().toISOString()};
  try{let bundleId=id;if(bundleId){const {error}=await sb.from('product_bundles').update(payload).eq('id',bundleId);if(error)throw error}else{const {data,error}=await sb.from('product_bundles').insert(payload).select('id').single();if(error)throw error;bundleId=data.id}const {error:de}=await sb.from('product_bundle_items').delete().eq('bundle_id',bundleId);if(de)throw de;const rows=[...form.querySelectorAll('.sb-combo-v4-row')].map(r=>({business_id:profile.business_id,bundle_id:bundleId,product_id:r.querySelector('[data-p]').value,variation_id:r.querySelector('[data-v]').value||null,quantity:Number(r.querySelector('[data-q]').value||0)})).filter(x=>x.quantity>0);if(rows.length){const {error:ie}=await sb.from('product_bundle_items').insert(rows);if(ie)throw ie}modalClose();await loadData()}catch(err){const x=document.getElementById('sb-combo-v4-form-msg');if(x)x.innerHTML=`<div class="sb-combo-v4-error">${esc(err.message||String(err))}</div>`}}
function modalClose(){document.getElementById('sb-combo-v4-editor')?.classList.remove('open')}
async function deleteBundle(id){if(!id||!confirm('Delete this Combo / Set?'))return;const {error}=await sb.from('product_bundles').delete().eq('id',id);if(error){const x=document.getElementById('sb-combo-v4-form-msg');if(x)x.innerHTML=`<div class="sb-combo-v4-error">${esc(error.message)}</div>`;return}modalClose();await loadData()}

function installSidebarButton(){
  const nav=document.querySelector('.sidebar-nav');if(!nav)return false;
  let existing=[...nav.querySelectorAll('button,a')].find(x=>/Combo\s*\/\s*Sets/i.test((x.textContent||'').replace(/\s+/g,' ').trim()));
  if(!existing){existing=document.createElement('button');existing.className='nav-item sb-combo-v4-sidebar';existing.innerHTML='<span>🎁</span><b>Combo / Sets</b>';const anchor=[...nav.querySelectorAll('button,a')].find(x=>/Employees|Attendance/i.test(x.textContent||''));if(anchor)anchor.after(existing);else nav.appendChild(existing)}
  existing.classList.add('sb-combo-v4-sidebar');existing.onclick=()=>{document.getElementById('sb-combo-v4-overlay').classList.add('open');loadData()};
  return true;
}

document.getElementById('sb-combo-v4-close').onclick=()=>document.getElementById('sb-combo-v4-overlay').classList.remove('open');
const observer=new MutationObserver(()=>{installSidebarButton();});
observer.observe(document.body,{subtree:true,childList:true});
installSidebarButton();
