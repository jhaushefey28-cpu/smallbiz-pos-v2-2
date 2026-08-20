import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;
const money = v => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(v || 0));
const clean = v => String(v ?? '').trim();
const labelPayment = v => clean(v) ? clean(v).replace(/^./, c => c.toUpperCase()) : '-';
const invoiceRx = /INV-[A-Z0-9-]+/i;
let saleMap = new Map();
let loading = false;

async function loadSales() {
  if (!sb || loading) return;
  loading = true;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return;
    const { data: profile } = await sb.from('profiles').select('business_id').eq('id', session.user.id).maybeSingle();
    if (!profile?.business_id) return;
    const { data } = await sb.from('sales')
      .select('invoice_no,payment_method,payment_reference,amount_tendered,change_amount,total')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(500);
    saleMap = new Map((data || []).map(s => [clean(s.invoice_no).toUpperCase(), s]));
  } finally {
    loading = false;
  }
}

function invoiceFrom(el) {
  const m = clean(el?.textContent).match(invoiceRx);
  return m ? m[0].toUpperCase() : null;
}

function paymentMarkup(sale) {
  const method = labelPayment(sale.payment_method);
  const tendered = Number(sale.amount_tendered || 0);
  const change = sale.payment_method === 'cash' ? Number(sale.change_amount || 0) : 0;
  const reference = clean(sale.payment_reference);
  return `<div data-sb-payment-fix-v2="inline" style="display:flex;flex-direction:column;gap:2px;line-height:1.25"><b>${method}</b><small style="color:#64748b">Paid: ${money(tendered)}${reference ? ` · Ref: ${reference}` : ''}</small><small style="color:#475569">Change: ${money(change)}</small></div>`;
}

function enhanceTables() {
  for (const table of document.querySelectorAll('table')) {
    const headers = [...table.querySelectorAll('thead th')];
    if (!headers.some(h => /invoice/i.test(h.textContent || ''))) continue;
    const paymentIndex = headers.findIndex(h => /payment/i.test(h.textContent || ''));
    if (paymentIndex < 0) continue;

    for (const row of table.querySelectorAll('tbody tr')) {
      const invoice = invoiceFrom(row);
      const sale = invoice && saleMap.get(invoice);
      if (!sale) continue;
      const cells = [...row.querySelectorAll('td')];
      const cell = cells[paymentIndex];
      if (!cell) continue;
      const existing = cell.querySelector('[data-sb-payment-fix-v2="inline"]');
      const next = paymentMarkup(sale);
      if (existing) existing.outerHTML = next;
      else cell.innerHTML = next;
    }
  }
}

function enhanceNonTableHistory() {
  const candidates = [...document.querySelectorAll('div,li,article')].filter(el => {
    const text = clean(el.textContent);
    return !el.dataset.sbPaymentFixV2 && invoiceRx.test(text) && /(transaction|sale|invoice|total|cashier)/i.test(text) && text.length < 2500;
  });
  for (const el of candidates) {
    const invoice = invoiceFrom(el);
    const sale = invoice && saleMap.get(invoice);
    if (!sale) continue;
    const info = document.createElement('div');
    info.dataset.sbPaymentFixV2 = 'info';
    info.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:8px;padding:9px 11px;border:1px solid #dbe4f0;border-radius:9px;background:#f8fafc;font-size:13px;line-height:1.4;';
    info.innerHTML = `<span><span style="color:#64748b">Mode of Payment:</span> <b>${labelPayment(sale.payment_method)}</b></span><span><span style="color:#64748b">Amount Paid:</span> <b>${money(sale.amount_tendered)}</b></span><span><span style="color:#64748b">Change:</span> <b>${money(sale.payment_method === 'cash' ? sale.change_amount : 0)}</b></span>`;
    el.appendChild(info);
    el.dataset.sbPaymentFixV2 = 'done';
  }
}

function enhanceModal() {
  for (const modal of document.querySelectorAll('.sale-details-modal,[role="dialog"]')) {
    const invoice = invoiceFrom(modal);
    const sale = invoice && saleMap.get(invoice);
    if (!sale) continue;
    const old = modal.querySelector('[data-sb-payment-fix-v2="info"]');
    if (old) old.remove();
    const info = document.createElement('div');
    info.dataset.sbPaymentFixV2 = 'info';
    info.style.cssText = 'margin-top:12px;padding:10px 12px;border:1px solid #dbe4f0;border-radius:9px;background:#f8fafc;font-size:13px;line-height:1.6;';
    info.innerHTML = `<b>Payment Details</b><br>Mode of Payment: <b>${labelPayment(sale.payment_method)}</b><br>Amount Paid: <b>${money(sale.amount_tendered)}</b><br>Change: <b>${money(sale.payment_method === 'cash' ? sale.change_amount : 0)}</b>${clean(sale.payment_reference) ? `<br>Reference: <b>${clean(sale.payment_reference)}</b>` : ''}`;
    modal.appendChild(info);
  }
}

async function run() {
  await loadSales();
  enhanceTables();
  enhanceNonTableHistory();
  enhanceModal();
}

let timer;
const observer = new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(() => run().catch(() => {}), 250);
});
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => run().catch(() => {}), 800);
window.addEventListener('smallbiz:combo-sale-complete', () => setTimeout(() => run().catch(() => {}), 900));
