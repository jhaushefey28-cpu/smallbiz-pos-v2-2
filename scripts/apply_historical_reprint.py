from pathlib import Path

path = Path('main.jsx')
text = path.read_text(encoding='utf-8')
marker = 'HISTORICAL_REPRINT_V1'

if marker in text:
    print('Historical reprint already applied; nothing to do.')
    raise SystemExit(0)

insert_at = text.index('  function printReceipt(')

new_function = r'''  async function reprintSale(sale){
    /* HISTORICAL_REPRINT_V1 */
    if(!canSell){setErr("Your role is not allowed to print receipts.");return}
    if(!sale?.id){setErr("Invalid transaction selected.");return}

    const win=window.open("","_blank","width=420,height=700");
    if(!win){setErr("Please allow pop-ups to print.");return}

    setErr("");
    try{
      const [{data:items,error:itemError},{data:cashierProfile,error:cashierError}]=await Promise.all([
        supabase.from("sale_items")
          .select("id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total")
          .eq("sale_id",sale.id)
          .order("id",{ascending:true}),
        sale.cashier_id
          ? supabase.from("profiles").select("id,full_name").eq("id",sale.cashier_id).eq("business_id",profile.business_id).maybeSingle()
          : Promise.resolve({data:null,error:null})
      ]);

      if(itemError)throw new Error(itemError.message||"Unable to load transaction items.");
      if(cashierError)throw new Error(cashierError.message||"Unable to load cashier information.");
      if(!items?.length)throw new Error("This transaction has no saved line items.");

      const esc=v=>String(v??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/\"/g,"&quot;")
        .replace(/'/g,"&#39;");

      const businessName=esc(String(receiptSettings.businessName||"SmallBiz POS").trim()||"SmallBiz POS");
      const businessTin=esc(String(receiptSettings.tin||"").trim());
      const businessAddress=esc(String(receiptSettings.address||"").trim());
      const businessPhone=esc(String(receiptSettings.phone||"").trim());
      const invoice=esc(sale.invoice_no||sale.id);
      const cashier=esc(cashierProfile?.full_name||"Cashier");
      const customer=esc(customers.find(c=>c.id===sale.customer_id)?.name||"Walk-in Customer");
      const saleDate=sale.created_at?new Date(sale.created_at).toLocaleString("en-PH"):"-";
      const statusText=String(sale.status||"").toLowerCase()==="completed"?"":`<div class="status">${esc(String(sale.status||"").toUpperCase())}</div>`;
      const rows=items.map(i=>`<tr><td>${esc(i.product_name)}</td><td>${Number(i.quantity||0)}</td><td style="text-align:right">${money(i.unit_price)}</td><td style="text-align:right">${money(i.line_total)}</td></tr>`).join("");
      const paymentMethodText=paymentLabel(sale.payment_method);
      const amountPaid=Number(sale.amount_tendered||0);
      const changeAmount=Number(sale.change_amount||0);

      win.document.write(`<!doctype html><html><head><title>${invoice}</title><style>
        body{font-family:Arial,sans-serif;width:360px;margin:auto;padding:20px;color:#111;font-size:12px}
        h1{text-align:center;font-size:22px;margin:0 0 8px}.center{text-align:center}.line{border-top:1px dashed #000;margin:12px 0}
        table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:5px 0;vertical-align:top}.row{display:flex;justify-content:space-between;gap:10px;margin:7px 0}.total{font-size:18px;font-weight:bold}
        .status{text-align:center;font-weight:bold;border:1px solid #000;padding:5px;margin:8px 0}.footer{text-align:center;margin-top:25px}
      </style></head><body>
        <h1>${businessName}</h1>
        <div class="center">${businessAddress?`${businessAddress}<br>`:""}${businessPhone?`Tel: ${businessPhone}<br>`:""}${businessTin?`TIN: ${businessTin}<br>`:""}Sales Receipt<br>${invoice}<br>${esc(saleDate)}<br>Cashier: ${cashier}<br>Customer: ${customer}</div>
        ${statusText}<div class="line"></div>
        <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
        <div class="row"><span>Discount</span><span>${money(sale.discount)}</span></div>
        ${sale.discount_reason?`<div class="row"><span>Reason</span><span>${esc(sale.discount_reason)}</span></div>`:""}
        <div class="row total"><span>TOTAL</span><span>${money(sale.total)}</span></div><div class="line"></div>
        <div class="row"><span>Payment</span><span>${paymentMethodText}</span></div>
        ${sale.payment_reference?`<div class="row"><span>Reference</span><span>${esc(sale.payment_reference)}</span></div>`:""}
        <div class="row"><span>Amount Paid</span><span>${money(amountPaid||sale.total)}</span></div>
        ${String(sale.payment_method||"").toLowerCase()==="cash"?`<div class="row"><span>Change</span><span>${money(changeAmount)}</span></div>`:""}
        <div class="footer">Historical reprint<br>${businessName}</div>
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
      win.document.close();
    }catch(e){
      if(win&&!win.closed)win.close();
      console.error("Historical receipt reprint failed:",e);
      setErr("Reprint failed: "+(e?.message||"Unable to load transaction."));
    }
  }

'''

text = text[:insert_at] + new_function + text[insert_at:]

old_action = '<td><button onClick={()=>openSaleDetails(s)}>🧾 View</button>{s.status==="completed"&&<button onClick={()=>{setVoidSale(s);setVoidReason("");setErr("")}} style={{marginLeft:6}}>↩ Void</button>}</td>'
new_action = '<td><button onClick={()=>openSaleDetails(s)}>🧾 View</button><button onClick={()=>reprintSale(s)} style={{marginLeft:6}}>🖨️ Reprint</button>{s.status==="completed"&&<button onClick={()=>{setVoidSale(s);setVoidReason("");setErr("")}} style={{marginLeft:6}}>↩ Void</button>}</td>'
if old_action not in text:
    raise SystemExit('Transaction action block not found; refusing to modify the file.')
text = text.replace(old_action,new_action,1)

path.write_text(text,encoding='utf-8')
print('Applied historical receipt reprint patch.')
