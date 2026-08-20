import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;
const money = v => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(v || 0));

function invoiceFromRow(row) {
  const m = String(row?.textContent || '').match(/INV-[A-Z0-9-]+/i);
  return m ? m[0] : null;
}

async function getSale(invoice) {
  if (!sb || !invoice) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return null;
  const { data: profile } = await sb.from('profiles').select('business_id').eq('id', session.user.id).single();
  if (!profile?.business_id) return null;
  const { data } = await sb.from('sales')
    .select('invoice_no,payment_method,payment_reference,amount_tendered,change_amount,total')
    .eq('business_id', profile.business_id)
    .eq('invoice_no', invoice)
    .maybeSingle();
  return data || null;
}

async function enhanceHistoryTables() {
  const tables = [...document.querySelectorAll('table')];
  for (const table of tables) {
    const headerCells = [...table.querySelectorAll('thead th')];
    if (!headerCells.length) continue;
    const headers = headerCells.map(x => String(x.textContent || '').trim().toLowerCase());
    if (!headers.some(x => x.includes('invoice'))) continue;

    const paymentIndex = headers.findIndex(x => x.includes('payment') || x.includes('mode of payment'));
    const changeIndex = headers.findIndex(x => x === 'change' || x.includes('change amount'));

    if (paymentIndex < 0) {
      const th = document.createElement('th');
      th.textContent = 'Payment';
      th.dataset.sbPaymentFix = 'header';
      table.querySelector('thead tr')?.appendChild(th);
    }
    if (changeIndex < 0) {
      const th = document.createElement('th');
      th.textContent = 'Change';
      th.dataset.sbPaymentFix = 'header';
      table.querySelector('thead tr')?.appendChild(th);
    }

    const rows = [...table.querySelectorAll('tbody tr')];
    for (const row of rows) {
      if (row.dataset.sbPaymentFix === 'done') continue;
      const invoice = invoiceFromRow(row);
      if (!invoice) continue;
      const sale = await getSale(invoice);
      if (!sale) continue;

      const cells = [...row.querySelectorAll('td')];
      const paymentCell = document.createElement('td');
      paymentCell.dataset.sbPaymentFix = 'payment';
      paymentCell.textContent = String(sale.payment_method || '-').replace(/^./, c => c.toUpperCase());

      const changeCell = document.createElement('td');
      changeCell.dataset.sbPaymentFix = 'change';
      changeCell.textContent = sale.payment_method === 'cash' ? money(sale.change_amount) : money(0);

      if (paymentIndex >= 0 && cells[paymentIndex]) cells[paymentIndex].replaceChildren(document.createTextNode(paymentCell.textContent));
      else row.appendChild(paymentCell);
      if (changeIndex >= 0 && cells[changeIndex]) cells[changeIndex].replaceChildren(document.createTextNode(changeCell.textContent));
      else row.appendChild(changeCell);
      row.dataset.sbPaymentFix = 'done';
    }
  }
}

async function enhanceSaleModal() {
  const modal = document.querySelector('.sale-details-modal');
  if (!modal || modal.dataset.sbPaymentFix === 'done') return;
  const invoice = invoiceFromRow(modal);
  if (!invoice) return;
  const sale = await getSale(invoice);
  if (!sale) return;
  const box = document.createElement('div');
  box.dataset.sbPaymentFix = 'details';
  box.style.cssText = 'margin-top:14px;padding:14px 16px;border:1px solid #dbe3ef;border-radius:12px;background:#f8fafc;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;font-size:14px;';
  box.innerHTML = `<div><div style="color:#64748b">Mode of Payment</div><strong>${String(sale.payment_method || '-').replace(/^./, c => c.toUpperCase())}</strong></div><div><div style="color:#64748b">Amount Tendered</div><strong>${money(sale.amount_tendered)}</strong></div><div><div style="color:#64748b">Change</div><strong>${sale.payment_method === 'cash' ? money(sale.change_amount) : money(0)}</strong></div>`;
  modal.appendChild(box);
  modal.dataset.sbPaymentFix = 'done';
}

let busy = false;
async function run() {
  if (busy) return;
  busy = true;
  try { await enhanceHistoryTables(); await enhanceSaleModal(); } finally { busy = false; }
}

const observer = new MutationObserver(() => { clearTimeout(window.__sbPaymentFixTimer); window.__sbPaymentFixTimer = setTimeout(run, 250); });
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(run, 700);
