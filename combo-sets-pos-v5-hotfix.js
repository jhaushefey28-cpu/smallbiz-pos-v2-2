import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;

const esc = v => String(v ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money = v => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(v || 0));

async function getContext() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) throw new Error('Authentication required');
  const { data: profile, error } = await sb.from('profiles').select('id,business_id,role,active').eq('id', session.user.id).single();
  if (error) throw new Error(error.message);
  if (!profile?.active) throw new Error('User account is inactive');
  return profile;
}

async function checkout() {
  const body = document.getElementById('sb-cpos5-body');
  const message = document.getElementById('sb-cpos5-message');
  const button = document.getElementById('sb-cpos5-sell');
  const select = document.getElementById('sb-cpos5-bundle');
  const qtyEl = document.getElementById('sb-cpos5-qty');
  const payEl = document.getElementById('sb-cpos5-payment');
  const cashEl = document.getElementById('sb-cpos5-cash');
  if (!body || !message || !button || !select || !qtyEl || !payEl || !cashEl) return;

  const bundleId = select.value;
  const qty = Math.floor(Number(qtyEl.value || 0));
  const method = payEl.value;
  if (!bundleId) return;
  if (qty <= 0) { message.innerHTML = '<div class="sb-cpos5-warn">Quantity must be at least 1 set.</div>'; return; }

  button.disabled = true;
  button.textContent = 'Checking stock...';
  message.innerHTML = '<div class="sb-cpos5-info">Final stock validation in progress...</div>';

  try {
    const profile = await getContext();
    const { data: bundle, error: bundleError } = await sb.from('product_bundles')
      .select('id,name,price,active,business_id')
      .eq('id', bundleId).eq('business_id', profile.business_id).eq('active', true).single();
    if (bundleError) throw new Error(bundleError.message);

    const total = Number(bundle.price || 0) * qty;
    const cash = Number(cashEl.value || 0);
    if (method === 'cash' && cash < total) {
      message.innerHTML = `<div class="sb-cpos5-warn">Insufficient cash. Required ${money(total)}.</div>`;
      button.disabled = false; button.textContent = 'Proceed to Payment'; return;
    }

    const { data: check, error: checkError } = await sb.rpc('validate_product_bundle_checkout', {
      p_bundle_id: bundle.id,
      p_requested_sets: qty
    });
    if (checkError) throw new Error(checkError.message);
    const validation = Array.isArray(check) ? check[0] : check;
    if (!validation?.ok) {
      message.innerHTML = `<div class="sb-cpos5-warn">${esc(validation?.message || 'Insufficient Combo/Set stock.')}</div>`;
      button.disabled = false; button.textContent = 'Proceed to Payment'; return;
    }

    button.textContent = 'Saving sale...';
    const { data: result, error: resultError } = await sb.rpc('complete_sale_with_bundles', {
      p_business_id: profile.business_id,
      p_cashier_id: profile.id,
      p_customer_id: null,
      p_discount: 0,
      p_discount_reason: null,
      p_payment_method: method,
      p_payment_reference: null,
      p_amount_tendered: method === 'cash' ? cash : total,
      p_items: [{ item_type: 'bundle', bundle_id: bundle.id, quantity: qty, unit_price: Number(bundle.price || 0) }]
    });
    if (resultError) throw new Error(resultError.message);

    const invoice = result?.invoice_no || 'Sale completed';
    message.innerHTML = `<div class="sb-cpos5-success"><b>Sale completed.</b><br>${esc(invoice)} · ${qty} set(s) · ${money(total)}</div>`;
    button.textContent = 'Completed';
    window.dispatchEvent(new CustomEvent('smallbiz:combo-sale-complete', { detail: { bundleId: bundle.id } }));
    setTimeout(() => { const close = document.getElementById('sb-cpos5-close'); close?.click(); }, 900);
  } catch (e) {
    message.innerHTML = `<div class="sb-cpos5-error">Checkout failed: ${esc(e.message)}</div>`;
    button.disabled = false;
    button.textContent = 'Proceed to Payment';
  }
}

// v5 assigned the RPC result to `data` but checked/used an undeclared `result` variable.
// Capture the button before v5's target handler and run the corrected transaction instead.
document.addEventListener('click', e => {
  const btn = e.target?.closest?.('#sb-cpos5-sell');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  checkout();
}, true);
