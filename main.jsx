import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth">
          <div className="card">
            <h1>SmallBiz POS V2.2</h1>
            <h2>App error</h2>

            <pre style={{ whiteSpace: "pre-wrap" }}>
              {String(
                this.state.error?.stack ||
                  this.state.error
              )}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  import.meta.env
    .VITE_SUPABASE_PUBLISHABLE_KEY;

const configError =
  !SUPABASE_URL || !SUPABASE_KEY;

const supabase = configError
  ? null
  : createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

const money = (v) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(v || 0));

const norm = (p) => ({
  ...p,

  name:
    p.name ??
    p.product_name ??
    p.productName ??
    p.title ??
    "Unnamed Product",

  barcode:
    p.barcode ??
    p.bar_code ??
    p.barcode_number ??
    p.sku ??
    "",

  price: Number(
    p.price ??
      p.selling_price ??
      p.sale_price ??
      0
  ),

  stock: Number(
    p.stock ??
      p.quantity ??
      p.current_stock ??
      0
  ),
});

function App() {
  const [session, setSession] =
    useState(null);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [err, setErr] =
    useState("");

  const [products, setProducts] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [cart, setCart] =
    useState([]);

  const [scan, setScan] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [paymentOpen, setPaymentOpen] =
    useState(false);

  const [paymentDone, setPaymentDone] =
    useState(false);

  const [cash, setCash] =
    useState("");

  const [receiptNo, setReceiptNo] =
    useState("");

  const [savingPayment, setSavingPayment] =
    useState(false);

  const [profile, setProfile] =
    useState(null);

  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  // =========================
  // SALES HISTORY
  // =========================

  const [salesHistory, setSalesHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historySearch, setHistorySearch] =
    useState("");

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [selectedSale, setSelectedSale] =
    useState(null);

  const [selectedSaleItems, setSelectedSaleItems] =
    useState([]);

  const [saleDetailsOpen, setSaleDetailsOpen] =
    useState(false);

  const [saleDetailsLoading, setSaleDetailsLoading] =
    useState(false);

  // =========================
  // CONFIG
  // =========================

  if (configError) {
    return (
      <div className="auth">
        <div className="card">
          <h1>SmallBiz POS V2.2</h1>

          <h2>
            Configuration missing
          </h2>

          <p>
            Vercel is not receiving the
            Supabase environment variables.
          </p>

          <pre>
            VITE_SUPABASE_URL
            {"\n"}
            VITE_SUPABASE_PUBLISHABLE_KEY
          </pre>
        </div>
      </div>
    );
  }

  // =========================
  // AUTH
  // =========================

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session);
        }
      });

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_, newSession) => {
          setSession(newSession);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    if (session?.user) {
      load(session.user.id);
    }
  }, [session]);

  async function load(uid) {
    setErr("");

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id,business_id,full_name,role,active,created_at"
      )
      .eq("id", uid)
      .single();

    if (profileError) {
      setErr(
        "Profile error: " +
          profileError.message
      );
      return;
    }

    setProfile(profileData);

    let query = supabase
      .from("products")
      .select("*");

    if (profileData?.business_id) {
      query = query.eq(
        "business_id",
        profileData.business_id
      );
    }

    const {
      data,
      error,
    } = await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

    if (error) {
      setErr(
        "Products error: " +
          error.message
      );
      return;
    }

    setProducts(
      (data || []).map(norm)
    );

    // Load sales history
    await loadSalesHistory(
      profileData.business_id
    );
  }

  // =========================
  // LOAD SALES HISTORY
  // =========================

  async function loadSalesHistory(
    businessId
  ) {
    if (!businessId) {
      return;
    }

    setHistoryLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("sales")
      .select(
        "id,business_id,invoice_no,cashier_id,subtotal,discount,total,payment_method,amount_tendered,change_amount,status,created_at"
      )
      .eq(
        "business_id",
        businessId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(100);

    if (error) {
      setErr(
        "Sales History error: " +
          error.message
      );
      setHistoryLoading(false);
      return;
    }

    setSalesHistory(data || []);
    setHistoryLoading(false);
  }

  // =========================
  // LOGIN
  // =========================

  async function login(e) {
    e.preventDefault();

    setErr("");

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });

    if (error) {
      setErr(error.message);
    }
  }

  // =========================
  // LOGOUT
  // =========================

  async function logout() {
    await supabase.auth.signOut();

    setCart([]);
    setPaymentOpen(false);
    setPaymentDone(false);
    setCash("");
    setReceiptNo("");
    setProfile(null);
    setStatus("");
    setErr("");
    setPaymentMethod("cash");

    setSalesHistory([]);
    setHistoryOpen(false);
    setSelectedSale(null);
    setSelectedSaleItems([]);
    setSaleDetailsOpen(false);
  }

  // =========================
  // SEARCH PRODUCTS
  // =========================

  const filtered = useMemo(() => {
    const q =
      search.toLowerCase().trim();

    if (!q) {
      return products;
    }

    return products.filter(
      (p) =>
        String(p.name)
          .toLowerCase()
          .includes(q) ||
        String(p.barcode)
          .toLowerCase()
          .includes(q)
    );
  }, [products, search]);

  // =========================
  // ADD TO CART
  // =========================

  function add(product) {
    if (product.stock <= 0) {
      setStatus(
        "Out of stock: " +
          product.name
      );
      return;
    }

    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.id === product.id
        );

      if (existing) {
        if (
          existing.qty >=
          product.stock
        ) {
          setStatus(
            "Maximum available stock reached: " +
              product.name
          );

          return current;
        }

        return current.map(
          (item) =>
            item.id === product.id
              ? {
                  ...item,
                  qty:
                    item.qty + 1,
                }
              : item
        );
      }

      return [
        ...current,
        {
          ...product,
          qty: 1,
        },
      ];
    });

    setStatus(
      "Added: " +
        product.name
    );
  }

  // =========================
  // QUANTITY
  // =========================

  function qty(id, difference) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== id) {
          return [item];
        }

        const newQty = Math.min(
          item.stock || 999999,
          item.qty + difference
        );

        if (newQty <= 0) {
          return [];
        }

        return [
          {
            ...item,
            qty: newQty,
          },
        ];
      })
    );
  }

  // =========================
  // TOTAL
  // =========================

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
        Number(item.qty),
    0
  );

  const discount = 0;

  const total =
    subtotal - discount;

  const change =
    Number(cash || 0) -
    total;

  // =========================
  // BARCODE SCANNER
  // =========================

  useEffect(() => {
    if (!scan) {
      return;
    }

    const scanner =
      new Html5Qrcode(
        "reader"
      );

    scanner
      .start(
        {
          facingMode:
            "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 120,
          },
        },
        (code) => {
          const product =
            products.find(
              (p) =>
                String(
                  p.barcode
                ) ===
                String(code)
            );

          if (product) {
            add(product);

            setStatus(
              "Added: " +
                product.name
            );
          } else {
            setStatus(
              "Barcode not found: " +
                code
            );

            setSearch(code);
          }
        },
        () => {}
      )
      .catch((error) => {
        setStatus(
          "Camera error: " +
            error
        );
      });

    return () => {
      scanner
        .stop()
        .then(() =>
          scanner.clear()
        )
        .catch(() => {});
    };
  }, [scan, products]);

  // =========================
  // PAYMENT LABEL
  // =========================

  function paymentLabel(method) {
    if (method === "gcash") {
      return "GCash";
    }

    if (method === "card") {
      return "Card";
    }

    return "Cash";
  }

  // =========================
  // PRINT CURRENT RECEIPT
  // =========================

  function printReceipt() {
    const cashierName =
      profile?.full_name ||
      profile?.role ||
      "Cashier";

    const receiptItems =
      cart
        .map(
          (item) => `
            <tr>
              <td>${item.name}</td>

              <td style="text-align:center">
                ${item.qty}
              </td>

              <td style="text-align:right">
                ${money(item.price)}
              </td>

              <td style="text-align:right">
                ${money(
                  item.price *
                    item.qty
                )}
              </td>
            </tr>
          `
        )
        .join("");

    const receiptWindow =
      window.open(
        "",
        "_blank",
        "width=420,height=700"
      );

    if (!receiptWindow) {
      setErr(
        "Please allow pop-ups to print the receipt."
      );
      return;
    }

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${receiptNo}</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            width: 360px;
            margin: 0 auto;
            padding: 20px;
            color: #111;
          }

          h1 {
            text-align: center;
            font-size: 22px;
            margin-bottom: 4px;
          }

          .center {
            text-align: center;
          }

          .line {
            border-top: 1px dashed #000;
            margin: 12px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
          }

          td {
            padding: 5px 0;
            vertical-align: top;
          }

          .row {
            display: flex;
            justify-content: space-between;
            margin: 7px 0;
          }

          .total {
            font-size: 18px;
            font-weight: bold;
          }

          .footer {
            text-align: center;
            margin-top: 25px;
            font-size: 12px;
          }

          @media print {
            body {
              width: auto;
              margin: 0;
            }
          }
        </style>
      </head>

      <body>

        <h1>SmallBiz POS</h1>

        <div class="center">
          <div>Sales Receipt</div>
          <div>${receiptNo}</div>

          <div>
            ${new Date().toLocaleString(
              "en-PH"
            )}
          </div>

          <div>
            Cashier:
            ${cashierName}
          </div>
        </div>

        <div class="line"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">
                Item
              </th>

              <th>
                Qty
              </th>

              <th style="text-align:right">
                Price
              </th>

              <th style="text-align:right">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            ${receiptItems}
          </tbody>
        </table>

        <div class="line"></div>

        <div class="row">
          <span>Subtotal</span>
          <span>
            ${money(subtotal)}
          </span>
        </div>

        <div class="row">
          <span>Discount</span>
          <span>
            ${money(discount)}
          </span>
        </div>

        <div class="row total">
          <span>TOTAL</span>
          <span>
            ${money(total)}
          </span>
        </div>

        <div class="line"></div>

        <div class="row">
          <span>Payment Method</span>
          <span>
            ${paymentLabel(
              paymentMethod
            )}
          </span>
        </div>

        ${
          paymentMethod === "cash"
            ? `
              <div class="row">
                <span>Cash Received</span>
                <span>
                  ${money(cash)}
                </span>
              </div>

              <div class="row">
                <span>Change</span>
                <span>
                  ${money(change)}
                </span>
              </div>
            `
            : `
              <div class="row">
                <span>Amount Paid</span>
                <span>
                  ${money(total)}
                </span>
              </div>
            `
        }

        <div class="footer">
          <div>
            Thank you for your purchase!
          </div>

          <div>
            SmallBiz POS V2.2
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>

      </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  // =========================
  // COMPLETE PAYMENT
  // =========================

  async function completePayment() {
    if (savingPayment) {
      return;
    }

    if (
      paymentMethod === "cash" &&
      (
        !cash ||
        Number(cash) < total
      )
    ) {
      return;
    }

    if (!cart.length) {
      return;
    }

    if (!profile?.id) {
      setErr(
        "Cashier profile not found."
      );
      return;
    }

    if (!profile?.business_id) {
      setErr(
        "Business ID not found in profile."
      );
      return;
    }

    setSavingPayment(true);
    setErr("");

    setStatus(
      "Saving payment..."
    );

    const invoiceNumber =
      "INV-" +
      Date.now();

    const amountTendered =
      paymentMethod === "cash"
        ? Number(
            Number(cash).toFixed(2)
          )
        : Number(
            total.toFixed(2)
          );

    const changeAmount =
      paymentMethod === "cash"
        ? Number(
            change.toFixed(2)
          )
        : 0;

    try {
      // SAVE SALE
      const {
        data: sale,
        error: saleError,
      } =
        await supabase
          .from("sales")
          .insert({
            business_id:
              profile.business_id,

            invoice_no:
              invoiceNumber,

            cashier_id:
              profile.id,

            subtotal:
              Number(
                subtotal.toFixed(2)
              ),

            discount:
              Number(
                discount.toFixed(2)
              ),

            total:
              Number(
                total.toFixed(2)
              ),

            payment_method:
              paymentMethod,

            amount_tendered:
              amountTendered,

            change_amount:
              changeAmount,

            status:
              "completed",
          })
          .select()
          .single();

      if (saleError) {
        throw new Error(
          "Unable to save sale: " +
            saleError.message
        );
      }

      // SAVE SALE ITEMS
      const saleItems =
        cart.map((item) => ({
          sale_id:
            sale.id,

          product_id:
            item.id,

          product_name:
            item.name,

          barcode:
            item.barcode || "",

          quantity:
            Number(item.qty),

          unit_price:
            Number(item.price),

          line_total:
            Number(
              (
                Number(item.price) *
                Number(item.qty)
              ).toFixed(2)
            ),
        }));

      const {
        error: itemsError,
      } =
        await supabase
          .from("sale_items")
          .insert(
            saleItems
          );

      if (itemsError) {
        throw new Error(
          "Unable to save sale items: " +
            itemsError.message
        );
      }

      // UPDATE STOCK
      for (const item of cart) {
        const currentStock =
          Number(
            item.stock || 0
          );

        const quantitySold =
          Number(
            item.qty || 0
          );

        if (
          quantitySold >
          currentStock
        ) {
          throw new Error(
            "Not enough stock for " +
              item.name
          );
        }

        const newStock =
          currentStock -
          quantitySold;

        const {
          error: stockError,
        } =
          await supabase
            .from("products")
            .update({
              stock:
                newStock,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              item.id
            );

        if (stockError) {
          throw new Error(
            "Unable to update stock for " +
              item.name +
              ": " +
              stockError.message
          );
        }
      }

      // REFRESH PRODUCTS + HISTORY
      await load(
        session.user.id
      );

      setReceiptNo(
        invoiceNumber
      );

      setPaymentOpen(false);

      setPaymentDone(true);

      setStatus(
        "Payment saved successfully."
      );

    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      setErr(
        error?.message ||
          "Payment failed."
      );

      setStatus("");

    } finally {
      setSavingPayment(false);
    }
  }

  // =========================
  // NEW SALE
  // =========================

  function newSale() {
    setCart([]);

    setCash("");

    setPaymentMethod(
      "cash"
    );

    setReceiptNo("");

    setPaymentDone(false);

    setPaymentOpen(false);

    setErr("");

    setStatus(
      "Ready for new sale."
    );
  }

  // =========================
  // SALES HISTORY SEARCH
  // =========================

  const filteredSales =
    useMemo(() => {
      const q =
        historySearch
          .toLowerCase()
          .trim();

      if (!q) {
        return salesHistory;
      }

      return salesHistory.filter(
        (sale) =>
          String(
            sale.invoice_no || ""
          )
            .toLowerCase()
            .includes(q) ||
          String(
            sale.payment_method || ""
          )
            .toLowerCase()
            .includes(q) ||
          String(
            sale.status || ""
          )
            .toLowerCase()
            .includes(q)
      );
    }, [
      salesHistory,
      historySearch,
    ]);

  // =========================
  // OPEN SALE DETAILS
  // =========================

  async function openSaleDetails(
    sale
  ) {
    setSelectedSale(sale);
    setSelectedSaleItems([]);
    setSaleDetailsOpen(true);
    setSaleDetailsLoading(true);
    setErr("");

    const {
      data,
      error,
    } = await supabase
      .from("sale_items")
      .select(
        "id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total"
      )
      .eq(
        "sale_id",
        sale.id
      )
      .order("id", {
        ascending: true,
      });

    if (error) {
      setErr(
        "Unable to load sale items: " +
          error.message
      );
      setSaleDetailsLoading(false);
      return;
    }

    setSelectedSaleItems(
      data || []
    );

    setSaleDetailsLoading(false);
  }

  // =========================
  // PRINT OLD SALE
  // =========================

  function printOldSale() {
    if (!selectedSale) {
      return;
    }

    const cashierName =
      profile?.full_name ||
      profile?.role ||
      "Cashier";

    const itemsHtml =
      selectedSaleItems
        .map(
          (item) => `
            <tr>
              <td>
                ${item.product_name}
              </td>

              <td style="text-align:center">
                ${item.quantity}
              </td>

              <td style="text-align:right">
                ${money(
                  item.unit_price
                )}
              </td>

              <td style="text-align:right">
                ${money(
                  item.line_total
                )}
              </td>
            </tr>
          `
        )
        .join("");

    const win =
      window.open(
        "",
        "_blank",
        "width=420,height=700"
      );

    if (!win) {
      setErr(
        "Please allow pop-ups to print the receipt."
      );
      return;
    }

    const saleDate =
      selectedSale.created_at
        ? new Date(
            selectedSale.created_at
          ).toLocaleString(
            "en-PH"
          )
        : "";

    const method =
      paymentLabel(
        selectedSale.payment_method
      );

    win.document.write(`
      <!DOCTYPE html>
      <html>

      <head>

        <title>
          ${selectedSale.invoice_no}
        </title>

        <style>

          body {
            font-family: Arial, sans-serif;
            width: 360px;
            margin: 0 auto;
            padding: 20px;
            color: #111;
          }

          h1 {
            text-align: center;
            font-size: 22px;
            margin-bottom: 4px;
          }

          .center {
            text-align: center;
          }

          .line {
            border-top: 1px dashed #000;
            margin: 12px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
          }

          td {
            padding: 5px 0;
            vertical-align: top;
          }

          .row {
            display: flex;
            justify-content: space-between;
            margin: 7px 0;
          }

          .total {
            font-size: 18px;
            font-weight: bold;
          }

          .footer {
            text-align: center;
            margin-top: 25px;
            font-size: 12px;
          }

          @media print {
            body {
              width: auto;
              margin: 0;
            }
          }

        </style>

      </head>

      <body>

        <h1>SmallBiz POS</h1>

        <div class="center">

          <div>Sales Receipt</div>

          <div>
            ${selectedSale.invoice_no}
          </div>

          <div>
            ${saleDate}
          </div>

          <div>
            Cashier:
            ${cashierName}
          </div>

        </div>

        <div class="line"></div>

        <table>

          <thead>

            <tr>

              <th style="text-align:left">
                Item
              </th>

              <th>
                Qty
              </th>

              <th style="text-align:right">
                Price
              </th>

              <th style="text-align:right">
                Total
              </th>

            </tr>

          </thead>

          <tbody>

            ${itemsHtml}

          </tbody>

        </table>

        <div class="line"></div>

        <div class="row">
          <span>Subtotal</span>
          <span>
            ${money(
              selectedSale.subtotal
            )}
          </span>
        </div>

        <div class="row">
          <span>Discount</span>
          <span>
            ${money(
              selectedSale.discount
            )}
          </span>
        </div>

        <div class="row total">
          <span>TOTAL</span>
          <span>
            ${money(
              selectedSale.total
            )}
          </span>
        </div>

        <div class="line"></div>

        <div class="row">
          <span>Payment Method</span>
          <span>
            ${method}
          </span>
        </div>

        <div class="row">
          <span>Amount Paid</span>
          <span>
            ${money(
              selectedSale.amount_tendered
            )}
          </span>
        </div>

        ${
          selectedSale.payment_method ===
          "cash"
            ? `
              <div class="row">
                <span>Change</span>
                <span>
                  ${money(
                    selectedSale.change_amount
                  )}
                </span>
              </div>
            `
            : ""
        }

        <div class="footer">

          <div>
            Thank you for your purchase!
          </div>

          <div>
            SmallBiz POS V2.2
          </div>

        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>

      </body>

      </html>
    `);

    win.document.close();
  }

  // =========================
  // LOGIN PAGE
  // =========================

  if (!session) {
    return (
      <div className="auth">

        <form
          className="card"
          onSubmit={login}
        >

          <h1>
            SmallBiz POS V2.2
          </h1>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
          />

          <button className="primary">
            Login
          </button>

          {err && (
            <p className="error">
              {err}
            </p>
          )}

        </form>

      </div>
    );
  }

  // =========================
  // POS
  // =========================

  return (
    <div>

      <header>

        <b>
          SmallBiz POS{" "}
          <small>
            V2.2
          </small>
        </b>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >

          <button
            onClick={() => {
              setHistoryOpen(
                !historyOpen
              );

              if (!historyOpen) {
                loadSalesHistory(
                  profile?.business_id
                );
              }
            }}
          >
            📋 Sales History
          </button>

          <button
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      <main>

        {/* =========================
            SALES HISTORY
        ========================= */}

        {historyOpen && (

          <section className="card">

            <div className="head">

              <h2>
                📋 Sales History
              </h2>

              <button
                onClick={() =>
                  loadSalesHistory(
                    profile?.business_id
                  )
                }
                disabled={
                  historyLoading
                }
              >
                {historyLoading
                  ? "Loading..."
                  : "Refresh"}
              </button>

            </div>

            <input
              className="search"
              placeholder="Search invoice number..."
              value={historySearch}
              onChange={(e) =>
                setHistorySearch(
                  e.target.value
                )
              }
            />

            {historyLoading ? (

              <div className="empty">
                Loading sales...
              </div>

            ) : filteredSales.length >
              0 ? (

              <div
                style={{
                  overflowX:
                    "auto",
                }}
              >

                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    marginTop:
                      "15px",
                  }}
                >

                  <thead>

                    <tr>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Invoice
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Date
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "10px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Payment
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                          padding:
                            "10px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Total
                      </th>

                      <th
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "10px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredSales.map(
                      (sale) => (

                        <tr
                          key={
                            sale.id
                          }
                        >

                          <td
                            style={{
                              padding:
                                "10px",
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            <b>
                              {
                                sale.invoice_no
                              }
                            </b>
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              borderBottom:
                                "1px solid #eee",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {sale.created_at
                              ? new Date(
                                  sale.created_at
                                ).toLocaleString(
                                  "en-PH"
                                )
                              : "-"}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {paymentLabel(
                              sale.payment_method
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              borderBottom:
                                "1px solid #eee",
                              textAlign:
                                "right",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <b>
                              {money(
                                sale.total
                              )}
                            </b>
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              borderBottom:
                                "1px solid #eee",
                              textAlign:
                                "center",
                            }}
                          >
                            <button
                              onClick={() =>
                                openSaleDetails(
                                  sale
                                )
                              }
                            >
                              View
                            </button>
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="empty">

                {historySearch
                  ? "No matching sales found."
                  : "No sales recorded yet."}

              </div>

            )}

          </section>

        )}

        {/* =========================
            PRODUCTS
        ========================= */}

        <section className="card">

          <div className="head">

            <h2>
              Products
            </h2>

            <button
              onClick={() => {
                setScan(!scan);
                setStatus("");
              }}
            >
              {scan
                ? "Close Scanner"
                : "Scan Barcode"}
            </button>

          </div>

          {scan && (
            <div className="scanner">

              <div id="reader"></div>

              <small>
                Allow camera
                access and point
                at a barcode.
              </small>

            </div>
          )}

          <input
            className="search"
            placeholder="Search product or barcode..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

          {status && (
            <div className="status">
              {status}
            </div>
          )}

          {err && (
            <div className="error">
              {err}
            </div>
          )}

          <div className="products-grid">

            {filtered.length > 0 ? (

              filtered.map(
                (product) => (

                  <div
                    className="product-card"
                    key={
                      product.id
                    }
                  >

                    <div>

                      <b>
                        {
                          product.name
                        }
                      </b>

                      <small>
                        Barcode:{" "}
                        {product.barcode ||
                          "N/A"}
                      </small>

                      <small>
                        Stock:{" "}
                        {
                          product.stock
                        }
                      </small>

                    </div>

                    <strong>
                      {money(
                        product.price
                      )}
                    </strong>

                    <button
                      className="primary"
                      disabled={
                        product.stock <=
                        0
                      }
                      onClick={() =>
                        add(
                          product
                        )
                      }
                    >
                      {product.stock >
                      0
                        ? "Add to Cart"
                        : "Out of Stock"}
                    </button>

                  </div>

                )
              )

            ) : (

              <div className="empty">

                {search
                  ? "No product found."
                  : "No products available."}

              </div>

            )}

          </div>

        </section>

        {/* =========================
            CART
        ========================= */}

        <section className="card">

          <div className="head">

            <h2>
              Cart
            </h2>

            <span>

              {cart.reduce(
                (n, item) =>
                  n +
                  item.qty,
                0
              )}{" "}

              item(s)

            </span>

          </div>

          {cart.length > 0 ? (

            <>

              {cart.map(
                (item) => (

                  <div
                    className="cart"
                    key={
                      item.id
                    }
                  >

                    <span>

                      <b>
                        {
                          item.name
                        }
                      </b>

                      <small>
                        {money(
                          item.price
                        )}{" "}
                        each
                      </small>

                    </span>

                    <span>

                      <button
                        onClick={() =>
                          qty(
                            item.id,
                            -1
                          )
                        }
                      >
                        −
                      </button>

                      {" "}
                      {item.qty}
                      {" "}

                      <button
                        onClick={() =>
                          qty(
                            item.id,
                            1
                          )
                        }
                      >
                        +
                      </button>

                    </span>

                    <b>
                      {money(
                        item.price *
                          item.qty
                      )}
                    </b>

                  </div>

                )
              )}

            </>

          ) : (

            <div className="empty">
              Cart is empty.
            </div>

          )}

          <div className="total">

            <span>
              Total
            </span>

            <b>
              {money(total)}
            </b>

          </div>

          <button
            className="primary"
            disabled={
              !cart.length ||
              savingPayment
            }
            onClick={() => {

              setCash("");

              setPaymentMethod(
                "cash"
              );

              setErr("");

              setPaymentOpen(
                true
              );

            }}
          >
            Payment
          </button>

        </section>

      </main>

      {/* =========================
          PAYMENT MODAL
      ========================= */}

      {paymentOpen && (

        <div className="modal-backdrop">

          <div className="modal card">

            <div className="head">

              <h2>
                Payment
              </h2>

              <button
                disabled={
                  savingPayment
                }
                onClick={() =>
                  setPaymentOpen(
                    false
                  )
                }
              >
                ✕
              </button>

            </div>

            <div className="payment-total">

              <span>
                Total
              </span>

              <b>
                {money(total)}
              </b>

            </div>

            <label>
              Payment Method
            </label>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom:
                  "15px",
                flexWrap:
                  "wrap",
              }}
            >

              <button
                type="button"
                className={
                  paymentMethod ===
                  "cash"
                    ? "primary"
                    : ""
                }
                onClick={() => {
                  setPaymentMethod(
                    "cash"
                  );
                  setCash("");
                  setErr("");
                }}
                disabled={
                  savingPayment
                }
              >
                💵 Cash
              </button>

              <button
                type="button"
                className={
                  paymentMethod ===
                  "gcash"
                    ? "primary"
                    : ""
                }
                onClick={() => {
                  setPaymentMethod(
                    "gcash"
                  );
                  setCash("");
                  setErr("");
                }}
                disabled={
                  savingPayment
                }
              >
                📱 GCash
              </button>

              <button
                type="button"
                className={
                  paymentMethod ===
                  "card"
                    ? "primary"
                    : ""
                }
                onClick={() => {
                  setPaymentMethod(
                    "card"
                  );
                  setCash("");
                  setErr("");
                }}
                disabled={
                  savingPayment
                }
              >
                💳 Card
              </button>

            </div>

            {paymentMethod ===
              "cash" && (
              <>

                <label>
                  Cash Received
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter cash amount"
                  value={cash}
                  onChange={(e) =>
                    setCash(
                      e.target.value
                    )
                  }
                  disabled={
                    savingPayment
                  }
                  autoFocus
                />

                {cash &&
                  Number(cash) <
                    total && (
                    <p className="error">
                      Insufficient
                      cash.
                    </p>
                  )}

                {cash &&
                  Number(cash) >=
                    total && (
                    <div className="change">

                      <span>
                        Change
                      </span>

                      <b>
                        {money(
                          change
                        )}
                      </b>

                    </div>
                  )}

              </>
            )}

            {paymentMethod ===
              "gcash" && (

              <div
                className="change"
                style={{
                  marginTop:
                    "10px",
                }}
              >

                <span>
                  Payment
                </span>

                <b>
                  GCash
                </b>

              </div>

            )}

            {paymentMethod ===
              "card" && (

              <div
                className="change"
                style={{
                  marginTop:
                    "10px",
                }}
              >

                <span>
                  Payment
                </span>

                <b>
                  Card
                </b>

              </div>

            )}

            {err && (
              <p className="error">
                {err}
              </p>
            )}

            {savingPayment && (
              <p>
                Saving payment...
              </p>
            )}

            <div className="modal-buttons">

              <button
                disabled={
                  savingPayment
                }
                onClick={() =>
                  setPaymentOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className="primary"
                disabled={
                  savingPayment ||
                  (
                    paymentMethod ===
                      "cash" &&
                    (
                      !cash ||
                      Number(cash) <
                        total
                    )
                  )
                }
                onClick={
                  completePayment
                }
              >
                {savingPayment
                  ? "Saving..."
                  : "Complete Payment"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================
          PAYMENT COMPLETE
      ========================= */}

      {paymentDone && (

        <div className="modal-backdrop">

          <div className="modal card">

            <h2>
              ✓ Payment Complete
            </h2>

            <div
              style={{
                borderTop:
                  "1px solid #ddd",
                borderBottom:
                  "1px solid #ddd",
                padding:
                  "12px 0",
                margin:
                  "12px 0",
              }}
            >

              <p>
                Invoice:{" "}
                <b>
                  {receiptNo}
                </b>
              </p>

              <p>
                Cashier:{" "}
                <b>
                  {profile?.full_name ||
                    "Cashier"}
                </b>
              </p>

              <p>
                Payment Method:{" "}
                <b>
                  {paymentLabel(
                    paymentMethod
                  )}
                </b>
              </p>

              <p>
                Total:{" "}
                <b>
                  {money(total)}
                </b>
              </p>

              {paymentMethod ===
                "cash" ? (

                <>
                  <p>
                    Cash Received:{" "}
                    <b>
                      {money(cash)}
                    </b>
                  </p>

                  <p>
                    Change:{" "}
                    <b>
                      {money(change)}
                    </b>
                  </p>
                </>

              ) : (

                <p>
                  Amount Paid:{" "}
                  <b>
                    {money(total)}
                  </b>
                </p>

              )}

            </div>

            <div
              style={{
                marginBottom:
                  "12px",
              }}
            >

              <b>
                Items
              </b>

              {cart.map(
                (item) => (

                  <div
                    key={
                      item.id
                    }
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                      padding:
                        "6px 0",
                    }}
                  >

                    <span>
                      {item.name} ×{" "}
                      {item.qty}
                    </span>

                    <b>
                      {money(
                        item.price *
                          item.qty
                      )}
                    </b>

                  </div>

                )
              )}

            </div>

            <div className="modal-buttons">

              <button
                onClick={
                  printReceipt
                }
              >
                🖨️ Print Receipt
              </button>

              <button
                className="primary"
                onClick={
                  newSale
                }
              >
                New Sale
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================
          SALE DETAILS MODAL
      ========================= */}

      {saleDetailsOpen &&
        selectedSale && (

        <div className="modal-backdrop">

          <div
            className="modal card"
            style={{
              maxWidth:
                "700px",
              width:
                "95%",
            }}
          >

            <div className="head">

              <h2>
                🧾 Sale Details
              </h2>

              <button
                onClick={() =>
                  setSaleDetailsOpen(
                    false
                  )
                }
              >
                ✕
              </button>

            </div>

            {saleDetailsLoading ? (

              <div className="empty">
                Loading sale details...
              </div>

            ) : (

              <>

                <div
                  style={{
                    borderTop:
                      "1px solid #ddd",
                    borderBottom:
                      "1px solid #ddd",
                    padding:
                      "12px 0",
                    margin:
                      "12px 0",
                  }}
                >

                  <p>
                    <b>
                      Invoice:
                    </b>{" "}
                    {
                      selectedSale.invoice_no
                    }
                  </p>

                  <p>
                    <b>
                      Date:
                    </b>{" "}
                    {selectedSale.created_at
                      ? new Date(
                          selectedSale.created_at
                        ).toLocaleString(
                          "en-PH"
                        )
                      : "-"}
                  </p>

                  <p>
                    <b>
                      Cashier:
                    </b>{" "}
                    {profile?.full_name ||
                      profile?.role ||
                      "Cashier"}
                  </p>

                  <p>
                    <b>
                      Payment:
                    </b>{" "}
                    {paymentLabel(
                      selectedSale.payment_method
                    )}
                  </p>

                  <p>
                    <b>
                      Status:
                    </b>{" "}
                    {
                      selectedSale.status
                    }
                  </p>

                </div>

                <h3>
                  Items
                </h3>

                {selectedSaleItems.length >
                0 ? (

                  <div
                    style={{
                      overflowX:
                        "auto",
                    }}
                  >

                    <table
                      style={{
                        width:
                          "100%",
                        borderCollapse:
                          "collapse",
                      }}
                    >

                      <thead>

                        <tr>

                          <th
                            style={{
                              textAlign:
                                "left",
                              padding:
                                "8px",
                              borderBottom:
                                "1px solid #ddd",
                            }}
                          >
                            Product
                          </th>

                          <th
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "8px",
                              borderBottom:
                                "1px solid #ddd",
                            }}
                          >
                            Qty
                          </th>

                          <th
                            style={{
                              textAlign:
                                "right",
                              padding:
                                "8px",
                              borderBottom:
                                "1px solid #ddd",
                            }}
                          >
                            Price
                          </th>

                          <th
                            style={{
                              textAlign:
                                "right",
                              padding:
                                "8px",
                              borderBottom:
                                "1px solid #ddd",
                            }}
                          >
                            Total
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {selectedSaleItems.map(
                          (item) => (

                            <tr
                              key={
                                item.id
                              }
                            >

                              <td
                                style={{
                                  padding:
                                    "8px",
                                  borderBottom:
                                    "1px solid #eee",
                                }}
                              >
                                {
                                  item.product_name
                                }
                              </td>

                              <td
                                style={{
                                  padding:
                                    "8px",
                                  textAlign:
                                    "center",
                                  borderBottom:
                                    "1px solid #eee",
                                }}
                              >
                                {
                                  item.quantity
                                }
                              </td>

                              <td
                                style={{
                                  padding:
                                    "8px",
                                  textAlign:
                                    "right",
                                  borderBottom:
                                    "1px solid #eee",
                                }}
                              >
                                {money(
                                  item.unit_price
                                )}
                              </td>

                              <td
                                style={{
                                  padding:
                                    "8px",
                                  textAlign:
                                    "right",
                                  borderBottom:
                                    "1px solid #eee",
                                }}
                              >
                                {money(
                                  item.line_total
                                )}
                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                ) : (

                  <div className="empty">
                    No items found.
                  </div>

                )}

                <div
                  style={{
                    marginTop:
                      "15px",
                    borderTop:
                      "1px solid #ddd",
                    paddingTop:
                      "12px",
                  }}
                >

                  <div className="total">

                    <span>
                      Subtotal
                    </span>

                    <b>
                      {money(
                        selectedSale.subtotal
                      )}
                    </b>

                  </div>

                  <div className="total">

                    <span>
                      Discount
                    </span>

                    <b>
                      {money(
                        selectedSale.discount
                      )}
                    </b>

                  </div>

                  <div className="total">

                    <span>
                      TOTAL
                    </span>

                    <b>
                      {money(
                        selectedSale.total
                      )}
                    </b>

                  </div>

                  <div className="total">

                    <span>
                      Amount Paid
                    </span>

                    <b>
                      {money(
                        selectedSale.amount_tendered
                      )}
                    </b>

                  </div>

                  {selectedSale.payment_method ===
                    "cash" && (

                    <div className="total">

                      <span>
                        Change
                      </span>

                      <b>
                        {money(
                          selectedSale.change_amount
                        )}
                      </b>

                    </div>

                  )}

                </div>

                <div
                  className="modal-buttons"
                  style={{
                    marginTop:
                      "15px",
                  }}
                >

                  <button
                    onClick={
                      printOldSale
                    }
                  >
                    🖨️ Reprint Receipt
                  </button>

                  <button
                    className="primary"
                    onClick={() =>
                      setSaleDetailsOpen(
                        false
                      )
                    }
                  >
                    Close
                  </button>

                </div>

              </>

            )}

          </div>

        </div>

      )}

    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
