import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";

import "./styles.css";

/* =========================================================
   ERROR BOUNDARY
========================================================= */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth">
          <div className="card">
            <h1>SmallBiz POS V2.2</h1>

            <h2>App Error</h2>

            <pre
              style={{
                whiteSpace: "pre-wrap",
              }}
            >
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

/* =========================================================
   SUPABASE
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

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

function downloadCSV(
  filename,
  rows
) {
  if (!rows || !rows.length) {
    return;
  }

  const headers = Object.keys(
    rows[0]
  );

  const escapeCSV = (value) => {
    const text =
      value === null ||
      value === undefined
        ? ""
        : String(value);

    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  };

  const csv = [
    headers
      .map(escapeCSV)
      .join(","),

    ...rows.map((row) =>
      headers
        .map((header) =>
          escapeCSV(
            row[header]
          )
        )
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(
    ["\ufeff" + csv],
    {
      type:
        "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download = filename;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(url);
}

/* =========================================================
   APP
========================================================= */

function App() {
  /* =======================================================
     AUTH
  ======================================================= */

  const [session, setSession] =
    useState(null);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [err, setErr] =
    useState("");

  /* =======================================================
     MAIN NAVIGATION
  ======================================================= */

  const [activePage, setActivePage] =
    useState("pos");

  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [products, setProducts] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [productSearch, setProductSearch] =
    useState("");

  const [productModalOpen, setProductModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [productForm, setProductForm] =
    useState({
      name: "",
      barcode: "",
      price: "",
      stock: "",
    });

  const [productSaving, setProductSaving] =
    useState(false);

  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] =
    useState([]);

  /* =======================================================
     SCANNER
  ======================================================= */

  const [scan, setScan] =
    useState(false);

  const [status, setStatus] =
    useState("");

  /* =======================================================
     PAYMENT
  ======================================================= */

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

  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  /* =======================================================
     PROFILE
  ======================================================= */

  const [profile, setProfile] =
    useState(null);

  /* =======================================================
     TRANSACTIONS
  ======================================================= */

  const [salesHistory, setSalesHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historySearch, setHistorySearch] =
    useState("");

  const [historyPaymentFilter, setHistoryPaymentFilter] =
    useState("all");

  const [historyDateFilter, setHistoryDateFilter] =
    useState("");

  const [historyStatusFilter, setHistoryStatusFilter] =
    useState("all");

  const [selectedSale, setSelectedSale] =
    useState(null);

  const [selectedSaleItems, setSelectedSaleItems] =
    useState([]);

  const [saleDetailsOpen, setSaleDetailsOpen] =
    useState(false);

  const [saleDetailsLoading, setSaleDetailsLoading] =
    useState(false);

  /* =======================================================
     REPORTS
  ======================================================= */

  const [reportType, setReportType] =
    useState("daily");

  const [reportDate, setReportDate] =
    useState(
      new Date()
        .toLocaleDateString(
          "en-CA",
          {
            timeZone:
              "Asia/Manila",
          }
        )
    );

  const [reportMonth, setReportMonth] =
    useState(
      new Date()
        .toLocaleDateString(
          "en-CA",
          {
            timeZone:
              "Asia/Manila",
          }
        )
        .slice(0, 7)
    );

  /* =======================================================
     CONFIG
  ======================================================= */

  if (configError) {
    return (
      <div className="auth">
        <div className="card">
          <h1>
            SmallBiz POS V2.2
          </h1>

          <h2>
            Configuration Missing
          </h2>

          <p>
            Vercel is not receiving
            the Supabase environment
            variables.
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

  /* =======================================================
     AUTH SESSION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(
            data.session
          );
        }
      });

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_, newSession) => {
          setSession(
            newSession
          );
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     LOAD DATA WHEN LOGIN
  ======================================================= */

  useEffect(() => {
    if (session?.user) {
      load(
        session.user.id
      );
    }
  }, [session]);

  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  async function load(uid) {
    setErr("");

    const {
      data: profileData,
      error: profileError,
    } =
      await supabase
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

    setProfile(
      profileData
    );

    let query =
      supabase
        .from("products")
        .select("*");

    if (
      profileData?.business_id
    ) {
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
      (data || []).map(
        norm
      )
    );

    await loadSalesHistory(
      profileData.business_id
    );
  }

  /* =======================================================
     LOAD SALES
  ======================================================= */

  async function loadSalesHistory(
    businessId
  ) {
    if (!businessId) {
      return;
    }

    setHistoryLoading(
      true
    );

    const {
      data,
      error,
    } =
      await supabase
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
        .limit(1000);

    if (error) {
      setErr(
        "Sales History error: " +
          error.message
      );

      setHistoryLoading(
        false
      );

      return;
    }

    setSalesHistory(
      data || []
    );

    setHistoryLoading(
      false
    );
  }

  /* =======================================================
     LOGIN
  ======================================================= */

  async function login(e) {
    e.preventDefault();

    setErr("");

    const {
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    if (error) {
      setErr(
        error.message
      );
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
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

    setHistorySearch("");
    setHistoryPaymentFilter(
      "all"
    );
    setHistoryDateFilter("");
    setHistoryStatusFilter(
      "all"
    );

    setSelectedSale(null);
    setSelectedSaleItems([]);
    setSaleDetailsOpen(
      false
    );

    setActivePage("pos");
  }

  /* =======================================================
     PRODUCT SEARCH - POS
  ======================================================= */

  const filtered = useMemo(() => {
    const q =
      search
        .toLowerCase()
        .trim();

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
  }, [
    products,
    search,
  ]);

  /* =======================================================
     PRODUCT SEARCH - MASTER FILE
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const q =
        productSearch
          .toLowerCase()
          .trim();

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
    }, [
      products,
      productSearch,
    ]);

  /* =======================================================
     ADD TO CART
  ======================================================= */

  function add(product) {
    if (product.stock <= 0) {
      setStatus(
        "Out of stock: " +
          product.name
      );

      return;
    }

    setCart(
      (current) => {
        const existing =
          current.find(
            (item) =>
              item.id ===
              product.id
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
              item.id ===
              product.id
                ? {
                    ...item,
                    qty:
                      item.qty +
                      1,
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
      }
    );

    setStatus(
      "Added: " +
        product.name
    );
  }

  /* =======================================================
     CART QUANTITY
  ======================================================= */

  function qty(
    id,
    difference
  ) {
    setCart(
      (current) =>
        current.flatMap(
          (item) => {
            if (
              item.id !== id
            ) {
              return [item];
            }

            const newQty =
              Math.min(
                item.stock ||
                  999999,
                item.qty +
                  difference
              );

            if (
              newQty <= 0
            ) {
              return [];
            }

            return [
              {
                ...item,
                qty: newQty,
              },
            ];
          }
        )
    );
  }

  /* =======================================================
     TOTALS
  ======================================================= */

  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(
          item.price
        ) *
          Number(
            item.qty
          ),
      0
    );

  const discount = 0;

  const total =
    subtotal -
    discount;

  const change =
    Number(cash || 0) -
    total;

  /* =======================================================
     BARCODE SCANNER
  ======================================================= */

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

            setScan(false);
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
      .catch(
        (error) => {
          setStatus(
            "Camera error: " +
              error
          );
        }
      );

    return () => {
      scanner
        .stop()
        .then(() =>
          scanner.clear()
        )
        .catch(() => {});
    };
  }, [
    scan,
    products,
  ]);

  /* =======================================================
     PAYMENT LABEL
  ======================================================= */

  function paymentLabel(
    method
  ) {
    if (
      method === "gcash"
    ) {
      return "GCash";
    }

    if (
      method === "card"
    ) {
      return "Card";
    }

    return "Cash";
  }

  /* =======================================================
     COMPLETE PAYMENT
  ======================================================= */

  async function completePayment() {
    if (savingPayment) {
      return;
    }

    if (
      paymentMethod ===
        "cash" &&
      (!cash ||
        Number(cash) <
          total)
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

    if (
      !profile?.business_id
    ) {
      setErr(
        "Business ID not found in profile."
      );

      return;
    }

    setSavingPayment(
      true
    );

    setErr("");

    setStatus(
      "Saving payment..."
    );

    const invoiceNumber =
      "INV-" +
      Date.now();

    const amountTendered =
      paymentMethod ===
      "cash"
        ? Number(
            Number(
              cash
            ).toFixed(2)
          )
        : Number(
            total.toFixed(2)
          );

    const changeAmount =
      paymentMethod ===
      "cash"
        ? Number(
            change.toFixed(2)
          )
        : 0;

    try {
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
                subtotal.toFixed(
                  2
                )
              ),

            discount:
              Number(
                discount.toFixed(
                  2
                )
              ),

            total:
              Number(
                total.toFixed(
                  2
                )
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

      const saleItems =
        cart.map(
          (item) => ({
            sale_id:
              sale.id,

            product_id:
              item.id,

            product_name:
              item.name,

            barcode:
              item.barcode ||
              "",

            quantity:
              Number(
                item.qty
              ),

            unit_price:
              Number(
                item.price
              ),

            line_total:
              Number(
                (
                  Number(
                    item.price
                  ) *
                  Number(
                    item.qty
                  )
                ).toFixed(2)
              ),
          })
        );

      const {
        error:
          itemsError,
      } =
        await supabase
          .from(
            "sale_items"
          )
          .insert(
            saleItems
          );

      if (itemsError) {
        throw new Error(
          "Unable to save sale items: " +
            itemsError.message
        );
      }

      for (
        const item of cart
      ) {
        const currentStock =
          Number(
            item.stock ||
              0
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
          error:
            stockError,
        } =
          await supabase
            .from(
              "products"
            )
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

      await load(
        session.user.id
      );

      setReceiptNo(
        invoiceNumber
      );

      setPaymentOpen(
        false
      );

      setPaymentDone(
        true
      );

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
      setSavingPayment(
        false
      );
    }
  }

  /* =======================================================
     NEW SALE
  ======================================================= */

  function newSale() {
    setCart([]);
    setCash("");
    setPaymentMethod(
      "cash"
    );
    setReceiptNo("");
    setPaymentDone(
      false
    );
    setPaymentOpen(
      false
    );
    setErr("");

    setStatus(
      "Ready for new sale."
    );
  }

  /* =======================================================
     PRINT CURRENT RECEIPT
  ======================================================= */

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
              <td style="text-align:center">${item.qty}</td>
              <td style="text-align:right">${money(
                item.price
              )}</td>
              <td style="text-align:right">${money(
                item.price *
                  item.qty
              )}</td>
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
            Cashier: ${cashierName}
          </div>
        </div>

        <div class="line"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">Item</th>
              <th>Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>

          <tbody>
            ${receiptItems}
          </tbody>
        </table>

        <div class="line"></div>

        <div class="row">
          <span>Subtotal</span>
          <span>${money(
            subtotal
          )}</span>
        </div>

        <div class="row">
          <span>Discount</span>
          <span>${money(
            discount
          )}</span>
        </div>

        <div class="row total">
          <span>TOTAL</span>
          <span>${money(
            total
          )}</span>
        </div>

        <div class="line"></div>

        <div class="row">
          <span>Payment Method</span>
          <span>${paymentLabel(
            paymentMethod
          )}</span>
        </div>

        <div class="row">
          <span>Amount Paid</span>
          <span>${money(
            paymentMethod ===
              "cash"
              ? cash
              : total
          )}</span>
        </div>

        ${
          paymentMethod ===
          "cash"
            ? `
              <div class="row">
                <span>Change</span>
                <span>${money(
                  change
                )}</span>
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

    receiptWindow.document.close();
  }

  /* =======================================================
     FILTER TRANSACTIONS
  ======================================================= */

  const filteredSales =
    useMemo(() => {
      const q =
        historySearch
          .toLowerCase()
          .trim();

      return salesHistory.filter(
        (sale) => {
          const invoice =
            String(
              sale.invoice_no ||
                ""
            ).toLowerCase();

          const payment =
            String(
              sale.payment_method ||
                ""
            ).toLowerCase();

          const saleStatus =
            String(
              sale.status ||
                ""
            ).toLowerCase();

          const saleDate =
            sale.created_at
              ? new Date(
                  sale.created_at
                )
                  .toLocaleDateString(
                    "en-CA",
                    {
                      timeZone:
                        "Asia/Manila",
                    }
                  )
              : "";

          return (
            (!q ||
              invoice.includes(
                q
              )) &&
            (historyPaymentFilter ===
              "all" ||
              payment ===
                historyPaymentFilter) &&
            (!historyDateFilter ||
              saleDate ===
                historyDateFilter) &&
            (historyStatusFilter ===
              "all" ||
              saleStatus ===
                historyStatusFilter)
          );
        }
      );
    }, [
      salesHistory,
      historySearch,
      historyPaymentFilter,
      historyDateFilter,
      historyStatusFilter,
    ]);

  /* =======================================================
     TRANSACTION SUMMARY
  ======================================================= */

  const transactionCount =
    filteredSales.length;

  const transactionTotal =
    filteredSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total || 0
        ),
      0
    );

  const cashTotal =
    filteredSales
      .filter(
        (sale) =>
          sale.payment_method ===
          "cash"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0
          ),
        0
      );

  const gcashTotal =
    filteredSales
      .filter(
        (sale) =>
          sale.payment_method ===
          "gcash"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0
          ),
        0
      );

  const cardTotal =
    filteredSales
      .filter(
        (sale) =>
          sale.payment_method ===
          "card"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0
          ),
        0
      );

  /* =======================================================
     REPORT SALES
  ======================================================= */

  const reportSales =
    useMemo(() => {
      if (
        reportType ===
        "daily"
      ) {
        return salesHistory.filter(
          (sale) => {
            if (
              !sale.created_at
            ) {
              return false;
            }

            const date =
              new Date(
                sale.created_at
              ).toLocaleDateString(
                "en-CA",
                {
                  timeZone:
                    "Asia/Manila",
                }
              );

            return (
              date ===
              reportDate
            );
          }
        );
      }

      return salesHistory.filter(
        (sale) => {
          if (
            !sale.created_at
          ) {
            return false;
          }

          const month =
            new Date(
              sale.created_at
            )
              .toLocaleDateString(
                "en-CA",
                {
                  timeZone:
                    "Asia/Manila",
                }
              )
              .slice(0, 7);

          return (
            month ===
            reportMonth
          );
        }
      );
    }, [
      salesHistory,
      reportType,
      reportDate,
      reportMonth,
    ]);

  const reportTotal =
    reportSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total || 0
        ),
      0
    );

  const reportCash =
    reportSales
      .filter(
        (sale) =>
          sale.payment_method ===
          "cash"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0
          ),
        0
      );

  const reportGCash =
    reportSales
      .filter(
        (sale) =>
          sale.payment_method ===
          "gcash"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0
          ),
        0
      );

  const reportCard =
    reportSales
      .filter(
        (sale) =>
          sale.payment_method ===
          "card"
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0
          ),
        0
      );

  /* =======================================================
     REPORT EXPORT
  ======================================================= */

  function exportReport() {
    if (!reportSales.length) {
      setStatus(
        "No report data to export."
      );

      return;
    }

    const rows =
      reportSales.map(
        (sale) => ({
          Invoice:
            sale.invoice_no,

          Date:
            sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleString(
                  "en-PH"
                )
              : "",

          Payment:
            paymentLabel(
              sale.payment_method
            ),

          Subtotal:
            Number(
              sale.subtotal ||
                0
            ).toFixed(2),

          Discount:
            Number(
              sale.discount ||
                0
            ).toFixed(2),

          Total:
            Number(
              sale.total ||
                0
            ).toFixed(2),

          Amount_Paid:
            Number(
              sale.amount_tendered ||
                0
            ).toFixed(2),

          Change:
            Number(
              sale.change_amount ||
                0
            ).toFixed(2),

          Status:
            sale.status ||
            "",
        })
      );

    const filename =
      reportType ===
      "daily"
        ? `SmallBiz_POS_Daily_Report_${reportDate}.csv`
        : `SmallBiz_POS_Monthly_Report_${reportMonth}.csv`;

    downloadCSV(
      filename,
      rows
    );
  }

  /* =======================================================
     EXPORT TRANSACTIONS
  ======================================================= */

  function exportTransactions() {
    if (
      !filteredSales.length
    ) {
      setStatus(
        "No transaction data to export."
      );

      return;
    }

    const rows =
      filteredSales.map(
        (sale) => ({
          Invoice:
            sale.invoice_no,

          Date:
            sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleString(
                  "en-PH"
                )
              : "",

          Payment:
            paymentLabel(
              sale.payment_method
            ),

          Subtotal:
            Number(
              sale.subtotal ||
                0
            ).toFixed(2),

          Discount:
            Number(
              sale.discount ||
                0
            ).toFixed(2),

          Total:
            Number(
              sale.total ||
                0
            ).toFixed(2),

          Status:
            sale.status ||
            "",
        })
      );

    downloadCSV(
      "SmallBiz_POS_Transactions.csv",
      rows
    );
  }

  /* =======================================================
     EXPORT PRODUCTS
  ======================================================= */

  function exportProducts() {
    if (
      !products.length
    ) {
      setStatus(
        "No products to export."
      );

      return;
    }

    const rows =
      products.map(
        (product) => ({
          Product:
            product.name,

          Barcode:
            product.barcode,

          Price:
            Number(
              product.price ||
                0
            ).toFixed(2),

          Stock:
            Number(
              product.stock ||
                0
            ),

          Stock_Value:
            Number(
              product.price *
                product.stock
            ).toFixed(2),
        })
      );

    downloadCSV(
      "SmallBiz_POS_Product_Master.csv",
      rows
    );
  }

  /* =======================================================
     OPEN ADD PRODUCT
  ======================================================= */

  function openAddProduct() {
    setEditingProduct(
      null
    );

    setProductForm({
      name: "",
      barcode: "",
      price: "",
      stock: "",
    });

    setProductModalOpen(
      true
    );

    setErr("");
  }

  /* =======================================================
     OPEN EDIT PRODUCT
  ======================================================= */

  function openEditProduct(
    product
  ) {
    setEditingProduct(
      product
    );

    setProductForm({
      name:
        product.name ||
        "",

      barcode:
        product.barcode ||
        "",

      price:
        product.price ??
        "",

      stock:
        product.stock ??
        "",
    });

    setProductModalOpen(
      true
    );

    setErr("");
  }

  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  async function saveProduct(
    e
  ) {
    e.preventDefault();

    if (
      productSaving
    ) {
      return;
    }

    if (
      !profile?.business_id
    ) {
      setErr(
        "Business ID not found."
      );

      return;
    }

    if (
      !productForm.name.trim()
    ) {
      setErr(
        "Product name is required."
      );

      return;
    }

    setProductSaving(
      true
    );

    setErr("");

    try {
      const payload = {
        name:
          productForm.name.trim(),

        barcode:
          productForm.barcode.trim(),

        price:
          Number(
            productForm.price ||
              0
          ),

        stock:
          Number(
            productForm.stock ||
              0
          ),

        updated_at:
          new Date().toISOString(),
      };

      if (
        editingProduct
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "products"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingProduct.id
            )
            .eq(
              "business_id",
              profile.business_id
            );

        if (error) {
          throw error;
        }

        setStatus(
          "Product updated successfully."
        );
      } else {
        const {
          error,
        } =
          await supabase
            .from(
              "products"
            )
            .insert({
              ...payload,

              business_id:
                profile.business_id,
            });

        if (error) {
          throw error;
        }

        setStatus(
          "Product added successfully."
        );
      }

      await load(
        session.user.id
      );

      setProductModalOpen(
        false
      );
    } catch (error) {
      console.error(
        error
      );

      setErr(
        "Unable to save product: " +
          error.message
      );
    } finally {
      setProductSaving(
        false
      );
    }
  }

  /* =======================================================
     OPEN SALE DETAILS
  ======================================================= */

  async function openSaleDetails(
    sale
  ) {
    setSelectedSale(
      sale
    );

    setSelectedSaleItems(
      []
    );

    setSaleDetailsOpen(
      true
    );

    setSaleDetailsLoading(
      true
    );

    setErr("");

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "sale_items"
        )
        .select(
          "id,sale_id,product_id,product_name,barcode,quantity,unit_price,line_total"
        )
        .eq(
          "sale_id",
          sale.id
        )
        .order(
          "id",
          {
            ascending: true,
          }
        );

    if (error) {
      setErr(
        "Unable to load sale items: " +
          error.message
      );

      setSaleDetailsLoading(
        false
      );

      return;
    }

    setSelectedSaleItems(
      data || []
    );

    setSaleDetailsLoading(
      false
    );
  }

  /* =======================================================
     PRINT OLD SALE
  ======================================================= */

  function printOldSale() {
    if (
      !selectedSale
    ) {
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
              <td>${item.product_name}</td>

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
          <span>Payment</span>
          <span>
            ${paymentLabel(
              selectedSale.payment_method
            )}
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

  /* =======================================================
     LOGIN PAGE
  ======================================================= */

  if (!session) {
    return (
      <div className="auth">

        <form
          className="card"
          onSubmit={login}
          style={{
            maxWidth:
              "420px",
            width: "100%",
          }}
        >

          <h1>
            🛒 SmallBiz POS
          </h1>

          <p
            style={{
              color:
                "#64748b",
              marginBottom:
                "20px",
            }}
          >
            Small Business
            Point of Sale
          </p>

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

          <button
            className="primary"
            type="submit"
          >
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

  /* =======================================================
     MAIN APPLICATION
  ======================================================= */

  return (
    <div
      className="smallbiz-app"
      style={{
        minHeight:
          "100vh",
        background:
          "#f8fafc",
      }}
    >

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        style={{
          position:
            "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width:
            "245px",
          background:
            "#ffffff",
          borderRight:
            "1px solid #e2e8f0",
          display:
            "flex",
          flexDirection:
            "column",
          zIndex: 50,
          boxShadow:
            "4px 0 18px rgba(15,23,42,.04)",
        }}
      >

        {/* BRAND */}

        <div
          style={{
            padding:
              "22px 20px",
            borderBottom:
              "1px solid #e2e8f0",
          }}
        >

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "10px",
              fontSize:
                "19px",
              fontWeight:
                800,
              color:
                "#0f172a",
            }}
          >

            <span>
              🛒
            </span>

            <span>
              SmallBiz POS
            </span>

          </div>

          <small
            style={{
              display:
                "block",
              marginTop:
                "5px",
              color:
                "#64748b",
            }}
          >
            V2.2
          </small>

        </div>

        {/* USER */}

        <div
          style={{
            margin:
              "16px",
            padding:
              "13px",
            background:
              "#f8fafc",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              "12px",
          }}
        >

          <div
            style={{
              fontWeight:
                700,
              color:
                "#0f172a",
            }}
          >
            {profile?.full_name ||
              "User"}
          </div>

          <small
            style={{
              color:
                "#64748b",
            }}
          >
            {profile?.role ||
              "Cashier"}
          </small>

        </div>

        {/* NAVIGATION */}

        <nav
          style={{
            padding:
              "0 12px",
            display:
              "flex",
            flexDirection:
              "column",
            gap:
              "6px",
          }}
        >

          <button
            onClick={() =>
              setActivePage(
                "pos"
              )
            }
            style={{
              ...sideButton,
              ...(activePage ===
              "pos"
                ? activeSideButton
                : {}),
            }}
          >
            <span>
              🛒
            </span>

            <span>
              POS
            </span>
          </button>

          <button
            onClick={() =>
              setActivePage(
                "transactions"
              )
            }
            style={{
              ...sideButton,
              ...(activePage ===
              "transactions"
                ? activeSideButton
                : {}),
            }}
          >
            <span>
              📋
            </span>

            <span>
              Transactions
            </span>
          </button>

          <button
            onClick={() =>
              setActivePage(
                "reports"
              )
            }
            style={{
              ...sideButton,
              ...(activePage ===
              "reports"
                ? activeSideButton
                : {}),
            }}
          >
            <span>
              📊
            </span>

            <span>
              Reports
            </span>
          </button>

          <button
            onClick={() =>
              setActivePage(
                "products"
              )
            }
            style={{
              ...sideButton,
              ...(activePage ===
              "products"
                ? activeSideButton
                : {}),
            }}
          >
            <span>
              📦
            </span>

            <span>
              Products
            </span>
          </button>

        </nav>

        {/* LOGOUT */}

        <div
          style={{
            marginTop:
              "auto",
            padding:
              "16px 12px",
            borderTop:
              "1px solid #e2e8f0",
          }}
        >

          <button
            onClick={logout}
            style={{
              ...sideButton,
              color:
                "#dc2626",
            }}
          >
            <span>
              🚪
            </span>

            <span>
              Logout
            </span>
          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main
        style={{
          marginLeft:
            "245px",
          minHeight:
            "100vh",
          padding:
            "28px",
        }}
      >

        {/* =================================================
            TOP HEADER
        ================================================= */}

        <div
          style={{
            marginBottom:
              "22px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "15px",
          }}
        >

          <div>

            <h1
              style={{
                margin:
                  0,
                fontSize:
                  "26px",
                color:
                  "#0f172a",
              }}
            >
              {activePage ===
              "pos"
                ? "🛒 Point of Sale"
                : activePage ===
                  "transactions"
                ? "📋 Transactions"
                : activePage ===
                  "reports"
                ? "📊 Reports"
                : "📦 Products"}
            </h1>

            <p
              style={{
                margin:
                  "5px 0 0",
                color:
                  "#64748b",
              }}
            >
              {profile?.full_name ||
                "SmallBiz User"}
            </p>

          </div>

          <button
            onClick={() =>
              loadSalesHistory(
                profile?.business_id
              )
            }
          >
            🔄 Refresh
          </button>

        </div>

        {/* =================================================
            STATUS / ERROR
        ================================================= */}

        {status && (
          <div
            className="status"
            style={{
              marginBottom:
                "15px",
            }}
          >
            {status}
          </div>
        )}

        {err && (
          <div
            className="error"
            style={{
              marginBottom:
                "15px",
            }}
          >
            {err}
          </div>
        )}

        {/* =================================================
            POS PAGE
        ================================================= */}

        {activePage ===
          "pos" && (
          <>

            {/* PRODUCTS */}

            <section
              className="card"
            >

              <div className="head">

                <div>

                  <h2>
                    Products
                  </h2>

                  <small>
                    Search or scan a
                    product.
                  </small>

                </div>

                <button
                  onClick={() => {
                    setScan(
                      !scan
                    );

                    setStatus(
                      ""
                    );
                  }}
                >
                  {scan
                    ? "Close Scanner"
                    : "📷 Scan Barcode"}
                </button>

              </div>

              {scan && (
                <div
                  className="scanner"
                  style={{
                    marginBottom:
                      "15px",
                  }}
                >

                  <div id="reader"></div>

                  <small>
                    Allow camera access
                    and point at a
                    barcode.
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

              <div className="products-grid">

                {filtered.length >
                0 ? (
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
                    No products
                    available.
                  </div>
                )}

              </div>

            </section>

            {/* CART */}

            <section
              className="card"
              style={{
                marginTop:
                  "20px",
              }}
            >

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

              {cart.length >
              0 ? (
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
                          {
                            item.qty
                          }{" "}

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
                  {money(
                    total
                  )}
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
                💳 Payment
              </button>

            </section>

          </>
        )}

        {/* =================================================
            TRANSACTIONS PAGE
        ================================================= */}

        {activePage ===
          "transactions" && (
          <section
            className="card"
          >

            <div className="head">

              <div>

                <h2>
                  📋 Sales History /
                  Transactions
                </h2>

                <small>
                  View, search, filter
                  and reprint completed
                  transactions.
                </small>

              </div>

              <button
                onClick={
                  exportTransactions
                }
              >
                📥 Export Excel
              </button>

            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap:
                  "10px",
                marginTop:
                  "15px",
              }}
            >

              <input
                placeholder="Search invoice..."
                value={
                  historySearch
                }
                onChange={(e) =>
                  setHistorySearch(
                    e.target.value
                  )
                }
              />

              <select
                value={
                  historyPaymentFilter
                }
                onChange={(e) =>
                  setHistoryPaymentFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  All Payments
                </option>

                <option value="cash">
                  💵 Cash
                </option>

                <option value="gcash">
                  📱 GCash
                </option>

                <option value="card">
                  💳 Card
                </option>
              </select>

              <input
                type="date"
                value={
                  historyDateFilter
                }
                onChange={(e) =>
                  setHistoryDateFilter(
                    e.target.value
                  )
                }
              />

              <select
                value={
                  historyStatusFilter
                }
                onChange={(e) =>
                  setHistoryStatusFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  All Status
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>

            </div>

            {/* SUMMARY */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(150px,1fr))",
                gap:
                  "10px",
                marginTop:
                  "15px",
              }}
            >

              <SummaryCard
                title="Transactions"
                value={
                  transactionCount
                }
              />

              <SummaryCard
                title="Total Sales"
                value={money(
                  transactionTotal
                )}
              />

              <SummaryCard
                title="💵 Cash"
                value={money(
                  cashTotal
                )}
              />

              <SummaryCard
                title="📱 GCash"
                value={money(
                  gcashTotal
                )}
              />

              <SummaryCard
                title="💳 Card"
                value={money(
                  cardTotal
                )}
              />

            </div>

            {/* TABLE */}

            <div
              style={{
                overflowX:
                  "auto",
                marginTop:
                  "20px",
              }}
            >

              {filteredSales.length >
              0 ? (
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

                      <th>
                        Invoice
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Payment
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        Total
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
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

                          <td>
                            <b>
                              {
                                sale.invoice_no
                              }
                            </b>
                          </td>

                          <td>
                            {sale.created_at
                              ? new Date(
                                  sale.created_at
                                ).toLocaleString(
                                  "en-PH"
                                )
                              : "-"}
                          </td>

                          <td>
                            {paymentLabel(
                              sale.payment_method
                            )}
                          </td>

                          <td
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            <b>
                              {money(
                                sale.total
                              )}
                            </b>
                          </td>

                          <td>
                            {sale.status ||
                              "-"}
                          </td>

                          <td>

                            <button
                              onClick={() =>
                                openSaleDetails(
                                  sale
                                )
                              }
                            >
                              🧾 View
                            </button>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>
              ) : (
                <div className="empty">
                  No matching
                  transactions.
                </div>
              )}

            </div>

          </section>
        )}

        {/* =================================================
            REPORTS PAGE
        ================================================= */}

        {activePage ===
          "reports" && (
          <section
            className="card"
          >

            <div className="head">

              <div>

                <h2>
                  📊 Sales Reports
                </h2>

                <small>
                  Daily and monthly sales
                  summary.
                </small>

              </div>

              <button
                onClick={
                  exportReport
                }
              >
                📥 Export Excel
              </button>

            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap:
                  "10px",
                marginTop:
                  "20px",
              }}
            >

              <select
                value={
                  reportType
                }
                onChange={(e) =>
                  setReportType(
                    e.target.value
                  )
                }
              >

                <option value="daily">
                  Daily Report
                </option>

                <option value="monthly">
                  Monthly Report
                </option>

              </select>

              {reportType ===
              "daily" ? (
                <input
                  type="date"
                  value={
                    reportDate
                  }
                  onChange={(e) =>
                    setReportDate(
                      e.target.value
                    )
                  }
                />
              ) : (
                <input
                  type="month"
                  value={
                    reportMonth
                  }
                  onChange={(e) =>
                    setReportMonth(
                      e.target.value
                    )
                  }
                />
              )}

            </div>

            {/* REPORT SUMMARY */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(170px,1fr))",
                gap:
                  "10px",
                marginTop:
                  "20px",
              }}
            >

              <SummaryCard
                title="Transactions"
                value={
                  reportSales.length
                }
              />

              <SummaryCard
                title="Total Sales"
                value={money(
                  reportTotal
                )}
              />

              <SummaryCard
                title="💵 Cash"
                value={money(
                  reportCash
                )}
              />

              <SummaryCard
                title="📱 GCash"
                value={money(
                  reportGCash
                )}
              />

              <SummaryCard
                title="💳 Card"
                value={money(
                  reportCard
                )}
              />

            </div>

            {/* REPORT TABLE */}

            <div
              style={{
                overflowX:
                  "auto",
                marginTop:
                  "25px",
              }}
            >

              {reportSales.length >
              0 ? (
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

                      <th>
                        Invoice
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Payment
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        Total
                      </th>

                      <th>
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {reportSales.map(
                      (sale) => (
                        <tr
                          key={
                            sale.id
                          }
                        >

                          <td>
                            {
                              sale.invoice_no
                            }
                          </td>

                          <td>
                            {new Date(
                              sale.created_at
                            ).toLocaleString(
                              "en-PH"
                            )}
                          </td>

                          <td>
                            {paymentLabel(
                              sale.payment_method
                            )}
                          </td>

                          <td
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            {money(
                              sale.total
                            )}
                          </td>

                          <td>
                            {
                              sale.status
                            }
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>
              ) : (
                <div className="empty">
                  No sales recorded for
                  this period.
                </div>
              )}

            </div>

          </section>
        )}

        {/* =================================================
            PRODUCTS PAGE
        ================================================= */}

        {activePage ===
          "products" && (
          <section
            className="card"
          >

            <div className="head">

              <div>

                <h2>
                  📦 Product Master File
                </h2>

                <small>
                  Manage products,
                  barcode, price and
                  inventory.
                </small>

              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "8px",
                  flexWrap:
                    "wrap",
                }}
              >

                <button
                  onClick={
                    exportProducts
                  }
                >
                  📥 Export Excel
                </button>

                <button
                  className="primary"
                  onClick={
                    openAddProduct
                  }
                >
                  ➕ Add Product
                </button>

              </div>

            </div>

            <input
              className="search"
              style={{
                marginTop:
                  "18px",
              }}
              placeholder="Search product or barcode..."
              value={
                productSearch
              }
              onChange={(e) =>
                setProductSearch(
                  e.target.value
                )
              }
            />

            <div
              style={{
                overflowX:
                  "auto",
                marginTop:
                  "20px",
              }}
            >

              {filteredProducts.length >
              0 ? (
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

                      <th>
                        Product
                      </th>

                      <th>
                        Barcode
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        Price
                      </th>

                      <th
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        Stock
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        Stock Value
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredProducts.map(
                      (product) => (
                        <tr
                          key={
                            product.id
                          }
                        >

                          <td>
                            <b>
                              {
                                product.name
                              }
                            </b>
                          </td>

                          <td>
                            {
                              product.barcode ||
                              "-"
                            }
                          </td>

                          <td
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            {money(
                              product.price
                            )}
                          </td>

                          <td
                            style={{
                              textAlign:
                                "center",
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              product.stock
                            }
                          </td>

                          <td
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            {money(
                              product.price *
                                product.stock
                            )}
                          </td>

                          <td>

                            <button
                              onClick={() =>
                                openEditProduct(
                                  product
                                )
                              }
                            >
                              ✏️ Edit
                            </button>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>
              ) : (
                <div className="empty">
                  No products found.
                </div>
              )}

            </div>

          </section>
        )}

      </main>

      {/* ===================================================
          PAYMENT MODAL
      =================================================== */}

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
                {money(
                  total
                )}
              </b>

            </div>

            <label>
              Payment Method
            </label>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "10px",
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
                  value={
                    cash
                  }
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
                  Number(
                    cash
                  ) <
                    total && (
                    <p className="error">
                      Insufficient
                      cash.
                    </p>
                  )}

                {cash &&
                  Number(
                    cash
                  ) >=
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

            {paymentMethod !==
              "cash" && (
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
                  {paymentLabel(
                    paymentMethod
                  )}
                </b>

              </div>
            )}

            {err && (
              <p className="error">
                {err}
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
                      Number(
                        cash
                      ) <
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

      {/* ===================================================
          PAYMENT COMPLETE
      =================================================== */}

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
                  {money(
                    total
                  )}
                </b>
              </p>

              {paymentMethod ===
              "cash" ? (
                <>
                  <p>
                    Cash Received:{" "}
                    <b>
                      {money(
                        cash
                      )}
                    </b>
                  </p>

                  <p>
                    Change:{" "}
                    <b>
                      {money(
                        change
                      )}
                    </b>
                  </p>
                </>
              ) : (
                <p>
                  Amount Paid:{" "}
                  <b>
                    {money(
                      total
                    )}
                  </b>
                </p>
              )}

            </div>

            <div>

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
                      padding:
                        "6px 0",
                    }}
                  >

                    <span>
                      {
                        item.name
                      }{" "}
                      ×{" "}
                      {
                        item.qty
                      }
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

      {/* ===================================================
          SALE DETAILS
      =================================================== */}

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
                  Loading sale
                  details...
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

                          <th>
                            Product
                          </th>

                          <th>
                            Qty
                          </th>

                          <th>
                            Price
                          </th>

                          <th>
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

                              <td>
                                {
                                  item.product_name
                                }
                              </td>

                              <td>
                                {
                                  item.quantity
                                }
                              </td>

                              <td>
                                {money(
                                  item.unit_price
                                )}
                              </td>

                              <td>
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

                  <div className="modal-buttons">

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

      {/* ===================================================
          PRODUCT MODAL
      =================================================== */}

      {productModalOpen && (
        <div className="modal-backdrop">

          <form
            className="modal card"
            onSubmit={
              saveProduct
            }
            style={{
              maxWidth:
                "500px",
              width:
                "95%",
            }}
          >

            <div className="head">

              <h2>
                {editingProduct
                  ? "✏️ Edit Product"
                  : "➕ Add Product"}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setProductModalOpen(
                    false
                  )
                }
              >
                ✕
              </button>

            </div>

            <label>
              Product Name
            </label>

            <input
              type="text"
              placeholder="Product name"
              value={
                productForm.name
              }
              onChange={(e) =>
                setProductForm(
                  (current) => ({
                    ...current,
                    name:
                      e.target
                        .value,
                  })
                )
              }
              required
            />

            <label>
              Barcode
            </label>

            <input
              type="text"
              placeholder="Barcode"
              value={
                productForm.barcode
              }
              onChange={(e) =>
                setProductForm(
                  (current) => ({
                    ...current,
                    barcode:
                      e.target
                        .value,
                  })
                )
              }
            />

            <label>
              Selling Price
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={
                productForm.price
              }
              onChange={(e) =>
                setProductForm(
                  (current) => ({
                    ...current,
                    price:
                      e.target
                        .value,
                  })
                )
              }
            />

            <label>
              Stock
            </label>

            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={
                productForm.stock
              }
              onChange={(e) =>
                setProductForm(
                  (current) => ({
                    ...current,
                    stock:
                      e.target
                        .value,
                  })
                )
              }
            />

            {err && (
              <p className="error">
                {err}
              </p>
            )}

            <div className="modal-buttons">

              <button
                type="button"
                onClick={() =>
                  setProductModalOpen(
                    false
                  )
                }
                disabled={
                  productSaving
                }
              >
                Cancel
              </button>

              <button
                className="primary"
                type="submit"
                disabled={
                  productSaving
                }
              >
                {productSaving
                  ? "Saving..."
                  : editingProduct
                  ? "Save Changes"
                  : "Add Product"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* ===================================================
          RESPONSIVE STYLE OVERRIDE
      =================================================== */}

      <style>{`
        @media (max-width: 800px) {
          .smallbiz-app aside {
            width: 82px !important;
          }

          .smallbiz-app aside > div:first-child {
            padding: 18px 10px !important;
            text-align: center;
          }

          .smallbiz-app aside > div:first-child span:last-child,
          .smallbiz-app aside > div:first-child small,
          .smallbiz-app aside .user-box,
          .smallbiz-app aside nav button span:last-child,
          .smallbiz-app aside > div:last-child button span:last-child {
            display: none !important;
          }

          .smallbiz-app aside nav button,
          .smallbiz-app aside > div:last-child button {
            justify-content: center !important;
          }

          .smallbiz-app main {
            margin-left: 82px !important;
            padding: 18px !important;
          }
        }

        table th,
        table td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }

        table th {
          text-align: left;
          background: #f8fafc;
          color: #475569;
          font-size: 13px;
        }

        table tr:hover td {
          background: #f8fafc;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
          overflow-y: auto;
        }

        .modal {
          max-height: calc(100vh - 40px);
          overflow-y: auto;
        }

        input,
        select,
        button {
          min-height: 40px;
        }
      `}</style>

    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
}) {
  return (
    <div
      className="card"
      style={{
        margin: 0,
        padding:
          "15px",
      }}
    >

      <small
        style={{
          color:
            "#64748b",
        }}
      >
        {title}
      </small>

      <h2
        style={{
          margin:
            "5px 0 0",
          color:
            "#0f172a",
        }}
      >
        {value}
      </h2>

    </div>
  );
}

/* =========================================================
   SIDEBAR STYLES
========================================================= */

const sideButton = {
  width: "100%",
  border: "0",
  background: "transparent",
  color: "#475569",
  padding: "12px 14px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "14px",
};

const activeSideButton = {
  background:
    "#2563eb",
  color: "#ffffff",
};

/* =========================================================
   ROOT
========================================================= */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
