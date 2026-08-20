import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;
const money = v => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(v || 0));

const invoiceRx = /INV-[A-Z0-9-]+/i;
const clean = v => String(v ?? '').trim();
const labelPayment = v => clean(v) ? clean(v).replace(/^./, c => c.toUpperCase()) : '-';

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

function makeInfo(sale) {
  const box = document.createElement('div');
  box.dataset.sbPaymentFixV2 = 'info';
  box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:8px;padding:9px 11px;border:1px solid #dbe4f0;border-radius:9px;background:#f8fafc;font-size:13px;line-height:1.4;';
  box.innerHTML = `<span><span style="color:#64748b">Payment:</span> <b>${labelPayment(sale.payment_method)}</b></span><span><span style="color:#64748b">Tendered:</span> <b>${money(sale.amount_tendered)}</b></span><span><span style="color:#64748b">Change:</span> <b>${sale.payment_method === 'cash' ? money(sale.change_amount) : money(0)}</b></span>`;
  return box;
}

function enhanceTables() {
  for (const table of document.querySelectorAll('table')) {
    const head = table.querySelector('thead tr');
    const headers = [...table.querySelectorAll('thead th')];
    if (!head || !headers.some(h => /invoice/i.test(h.textContent || ''))) continue;

    if (!headers.some(h => /mode of payment|payment/i.test(h.textContent || ''))) {
      const th = document.createElement('th'); th.textContent = 'Payment'; th.dataset.sbPaymentFixV2 = 'header'; head.appendChild(th);
    }
    if (!headers.some(h => /^change$|change amount/i.test((h.textContent || '').trim()))) {
      const th = document.createElement('th'); th.textContent = 'Change'; th.dataset.sbPaymentFixV2 = 'header'; head.appendChild(th);
    }

    for (const row of table.querySelectorAll('tbody tr')) {
      const invoice = invoiceFrom(row);
      const sale = invoice && saleMap.get(invoice);
      if (!sale || row.dataset.sbPaymentFixV2 === 'done') continue;
      const cells = [...row.querySelectorAll('td')];
      const headerTexts = headers.map(h => clean(h.textContent).toLowerCase());
      const pIdx = headerTexts.findIndex(x => x.includes('payment'));
      const cIdx = headerTexts.findIndex(x => x === 'change' || x.includes('change amount'));
      const pText = labelPayment(sale.payment_method);
      const cText = sale.payment_method === 'cash' ? money(sale.change_amount) : money(0);
      if (pIdx >= 0 && cells[pIdx]) cells[pIdx].textContent = pText;
      else { const td = document.createElement('td'); td.textContent = pText; row.appendChild(td); }
      if (cIdx >= 0 && cells[cIdx]) cells[cIdx].textContent = cText;
      else { const td = document.createElement('td'); td.textContent = cText; row.appendChild(td); }
      row.dataset.sbPaymentFixV2 = 'done';
    }
  }
}

function enhanceNonTableHistory() {
  const candidates = [...document.querySelectorAll('div,li,article')].filter(el => {
    if (el.dataset.sbPaymentFixV2 === 'done') return false;
    const text = clean(el.textContent);
    return invoiceRx.test(text) && /(transaction|sale|invoice|total|cashier)/i.test(text) && text.length < 2500;
  });
  for (const el of candidates) {
    const invoice = invoiceFrom(el);
    const sale = invoice && saleMap.get(invoice);
    if (!sale) continue;
    if (el.querySelector('[data-sb-payment-fix-v2="info"]')) { el.dataset.sbPaymentFixV2 = 'done'; continue; }
    const info = makeInfo(sale);
    el.appendChild(info);
    el.dataset.sbPaymentFixV2 = 'done';
  }
}

function enhanceModal() {
  for (const modal of document.querySelectorAll('.sale-details-modal,[role="dialog"]')) {
    if (modal.dataset.sbPaymentFixV2 === 'modal-done') continue;
    const invoice = invoiceFrom(modal);
    const sale = invoice && saleMap.get(invoice);
    if (!sale) continue;
    if (modal.querySelector('[data-sb-payment-fix-v2="info"]')) { modal.dataset.sbPaymentFixV2 = 'modal-done'; continue; }
    modal.appendChild(makeInfo(sale));
    modal.dataset.sbPaymentFixV2 = 'modal-done';
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
  timer = setTimeout(() => run().catch(() => {}), 300);
});
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => run().catch(() => {}), 1000);
window.addEventListener('smallbiz:combo-sale-complete', () => setTimeout(() => run().catch(() => {}), 1200));
