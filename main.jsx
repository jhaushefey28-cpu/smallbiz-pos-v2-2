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
            <h1>SmallBiz POS V2.3</h1>
            <h2>App error</h2>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#b91c1c",
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
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

const number = (value) =>
  Number(value || 0);

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const norm = (p) => ({
  ...p,

  name:
    p.name ??
    p.product_name ??
    p.productName ??
    p.title ??
    "",

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

/* =========================================================
   EXCEL EXPORT
   Excel-compatible .xls file
========================================================= */

function downloadExcel(
  filename,
  title,
  columns,
  rows
) {
  const header = columns
    .map(
      (column) =>
        `<th>${escapeHtml(
          column.label
        )}</th>`
    )
    .join("");

  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (column) =>
              `<td>${escapeHtml(
                row[column.key] ?? ""
              )}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
      </head>

      <body>
        <h2>${escapeHtml(title)}</h2>

        <table border="1">
          <thead>
            <tr>
              ${header}
            </tr>
          </thead>

          <tbody>
            ${body}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(
    [html],
    {
      type:
        "application/vnd.ms-excel;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

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

  const [profile, setProfile] =
    useState(null);

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
     POS
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [cart, setCart] =
    useState([]);

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
     SALES HISTORY
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
        .toISOString()
        .slice(0, 7)
    );

  /* =======================================================
     CONFIG ERROR
  ======================================================= */

  if (configError) {
    return (
      <div className="auth">
        <div className="card">
          <h1>
            SmallBiz POS V2.3
          </h1>

          <h2>
            Configuration missing
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
     AUTH STATE
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
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    if (session?.user) {
      load(
        session.user.id
      );
    }
  }, [session]);

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

    if (!profileData?.business_id) {
      setErr(
        "Business ID not found in profile."
      );
      return;
    }

    await loadProducts(
      profileData.business_id
    );

    await loadSalesHistory(
      profileData.business_id
    );
  }

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  async function loadProducts(
    businessId
  ) {
    if (!businessId) {
      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("products")
        .select("*")
        .eq(
          "business_id",
          businessId
        )
        .order(
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

    setHistoryLoading(true);

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

      setHistoryLoading(false);
      return;
    }

    setSalesHistory(
      data || []
    );

    setHistoryLoading(false);
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
    setProfile(null);

    setCart([]);
    setPaymentOpen(false);
    setPaymentDone(false);

    setCash("");
    setReceiptNo("");

    setProducts([]);
    setSalesHistory([]);

    setActivePage("pos");

    setStatus("");
    setErr("");
  }

  /* =======================================================
     PRODUCT SEARCH
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
     POS PRODUCT SEARCH
  ======================================================= */

  const filtered =
    useMemo(() => {
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
     ADD CART
  ======================================================= */

  function add(product) {
    if (
      Number(product.stock) <= 0
    ) {
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
     QUANTITY
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
        "Business ID not found."
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
      paymentMethod ===
      "cash"
        ? Number(
            Number(
              cash
            ).toFixed(2)
          )
        : Number(
            total.toFixed(
              2
            )
          );

    const changeAmount =
      paymentMethod ===
      "cash"
        ? Number(
            change.toFixed(
              2
            )
          )
        : 0;

    try {
      /* SAVE SALE */

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

      /* SAVE SALE ITEMS */

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
                ).toFixed(
                  2
                )
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

      /* UPDATE STOCK */

      for (
        const item of cart
      ) {
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

    setActivePage(
      "pos"
    );

    setStatus(
      "Ready for new sale."
    );
  }

  /* =======================================================
     SALES FILTER
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

          const status =
            String(
              sale.status ||
                ""
            ).toLowerCase();

          const saleDate =
            sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleDateString(
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
              status ===
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
     DAILY REPORT
  ======================================================= */

  const dailySales =
    useMemo(() => {
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
    }, [
      salesHistory,
      reportDate,
    ]);

  /* =======================================================
     MONTHLY REPORT
  ======================================================= */

  const monthlySales =
    useMemo(() => {
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
              .slice(
                0,
                7
              );

          return (
            month ===
            reportMonth
          );
        }
      );
    }, [
      salesHistory,
      reportMonth,
    ]);

  const dailyTotal =
    dailySales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total || 0
        ),
      0
    );

  const monthlyTotal =
    monthlySales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.total || 0
        ),
      0
    );

  const dailyCash =
    dailySales
      .filter(
        (s) =>
          s.payment_method ===
          "cash"
      )
      .reduce(
        (sum, s) =>
          sum +
          Number(
            s.total || 0
          ),
        0
      );

  const dailyGcash =
    dailySales
      .filter(
        (s) =>
          s.payment_method ===
          "gcash"
      )
      .reduce(
        (sum, s) =>
          sum +
          Number(
            s.total || 0
          ),
        0
      );

  const dailyCard =
    dailySales
      .filter(
        (s) =>
          s.payment_method ===
          "card"
      )
      .reduce(
        (sum, s) =>
          sum +
          Number(
            s.total || 0
          ),
        0
      );

  const monthlyCash =
    monthlySales
      .filter(
        (s) =>
          s.payment_method ===
          "cash"
      )
      .reduce(
        (sum, s) =>
          sum +
          Number(
            s.total || 0
          ),
        0
      );

  const monthlyGcash =
    monthlySales
      .filter(
        (s) =>
          s.payment_method ===
          "gcash"
      )
      .reduce(
        (sum, s) =>
          sum +
          Number(
            s.total || 0
          ),
        0
      );

  const monthlyCard =
    monthlySales
      .filter(
        (s) =>
          s.payment_method ===
          "card"
      )
      .reduce(
        (sum, s) =>
          sum +
          Number(
            s.total || 0
          ),
        0
      );

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
            ascending:
              true,
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
     PRODUCT MODAL
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

    if (
      Number(
        productForm.price
      ) < 0
    ) {
      setErr(
        "Price cannot be negative."
      );
      return;
    }

    if (
      Number(
        productForm.stock
      ) < 0
    ) {
      setErr(
        "Stock cannot be negative."
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

        business_id:
          profile.business_id,

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
            .insert(
              payload
            );

        if (error) {
          throw error;
        }

        setStatus(
          "Product added successfully."
        );
      }

      await loadProducts(
        profile.business_id
      );

      setProductModalOpen(
        false
      );

      setEditingProduct(
        null
      );

      setProductForm({
        name: "",
        barcode: "",
        price: "",
        stock: "",
      });
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
     DELETE PRODUCT
  ======================================================= */

  async function deleteProduct(
    product
  ) {
    const confirmed =
      window.confirm(
        `Delete product "${product.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setErr("");

    const {
      error,
    } =
      await supabase
        .from(
          "products"
        )
        .delete()
        .eq(
          "id",
          product.id
        )
        .eq(
          "business_id",
          profile.business_id
        );

    if (error) {
      setErr(
        "Unable to delete product: " +
          error.message
      );
      return;
    }

    setStatus(
      "Product deleted."
    );

    await loadProducts(
      profile.business_id
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
              <td>
                ${escapeHtml(
                  item.name
                )}
              </td>

              <td style="text-align:center">
                ${item.qty}
              </td>

              <td style="text-align:right">
                ${money(
                  item.price
                )}
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

        <title>
          ${escapeHtml(
            receiptNo
          )}
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

        <h1>
          SmallBiz POS
        </h1>

        <div class="center">

          <div>
            Sales Receipt
          </div>

          <div>
            ${escapeHtml(
              receiptNo
            )}
          </div>

          <div>
            ${new Date().toLocaleString(
              "en-PH"
            )}
          </div>

          <div>
            Cashier:
            ${escapeHtml(
              cashierName
            )}
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
            ${money(
              subtotal
            )}
          </span>
        </div>

        <div class="row">
          <span>Discount</span>
          <span>
            ${money(
              discount
            )}
          </span>
        </div>

        <div class="row total">
          <span>TOTAL</span>
          <span>
            ${money(
              total
            )}
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

        <div class="row">
          <span>Amount Paid</span>
          <span>
            ${money(
              paymentMethod ===
                "cash"
                ? cash
                : total
            )}
          </span>
        </div>

        ${
          paymentMethod ===
          "cash"
            ? `
              <div class="row">
                <span>Change</span>
                <span>
                  ${money(
                    change
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
            SmallBiz POS V2.3
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
     PRINT OLD SALE
  ======================================================= */

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
                ${escapeHtml(
                  item.product_name
                )}
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

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          ${escapeHtml(
            selectedSale.invoice_no
          )}
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

        <h1>
          SmallBiz POS
        </h1>

        <div class="center">

          <div>
            Sales Receipt
          </div>

          <div>
            ${escapeHtml(
              selectedSale.invoice_no
            )}
          </div>

          <div>
            ${saleDate}
          </div>

          <div>
            Cashier:
            ${escapeHtml(
              cashierName
            )}
          </div>

        </div>

        <div class="line"></div>

        <table>

          <thead>

            <tr>

              <th>
                Item
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
          Thank you for your purchase!
          <br />
          SmallBiz POS V2.3
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
     EXPORT TRANSACTIONS
  ======================================================= */

  function exportTransactions() {
    const rows =
      filteredSales.map(
        (sale) => ({
          invoice:
            sale.invoice_no,

          date:
            sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleString(
                  "en-PH"
                )
              : "",

          payment:
            paymentLabel(
              sale.payment_method
            ),

          subtotal:
            Number(
              sale.subtotal ||
                0
            ),

          discount:
            Number(
              sale.discount ||
                0
            ),

          total:
            Number(
              sale.total ||
                0
            ),

          amount_paid:
            Number(
              sale.amount_tendered ||
                0
            ),

          change:
            Number(
              sale.change_amount ||
                0
            ),

          status:
            sale.status,
        })
      );

    downloadExcel(
      "sales_transactions.xls",
      "Sales Transactions",
      [
        {
          key: "invoice",
          label: "Invoice",
        },
        {
          key: "date",
          label: "Date",
        },
        {
          key: "payment",
          label: "Payment Method",
        },
        {
          key: "subtotal",
          label: "Subtotal",
        },
        {
          key: "discount",
          label: "Discount",
        },
        {
          key: "total",
          label: "Total",
        },
        {
          key: "amount_paid",
          label: "Amount Paid",
        },
        {
          key: "change",
          label: "Change",
        },
        {
          key: "status",
          label: "Status",
        },
      ],
      rows
    );
  }

  /* =======================================================
     EXPORT DAILY REPORT
  ======================================================= */

  function exportDailyReport() {
    const rows =
      dailySales.map(
        (sale) => ({
          invoice:
            sale.invoice_no,

          date:
            sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleString(
                  "en-PH"
                )
              : "",

          payment:
            paymentLabel(
              sale.payment_method
            ),

          total:
            Number(
              sale.total ||
                0
            ),

          status:
            sale.status,
        })
      );

    downloadExcel(
      `daily_sales_${reportDate}.xls`,
      `Daily Sales Report - ${reportDate}`,
      [
        {
          key: "invoice",
          label: "Invoice",
        },
        {
          key: "date",
          label: "Date",
        },
        {
          key: "payment",
          label: "Payment Method",
        },
        {
          key: "total",
          label: "Total Sales",
        },
        {
          key: "status",
          label: "Status",
        },
      ],
      rows
    );
  }

  /* =======================================================
     EXPORT MONTHLY REPORT
  ======================================================= */

  function exportMonthlyReport() {
    const rows =
      monthlySales.map(
        (sale) => ({
          invoice:
            sale.invoice_no,

          date:
            sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleString(
                  "en-PH"
                )
              : "",

          payment:
            paymentLabel(
              sale.payment_method
            ),

          total:
            Number(
              sale.total ||
                0
            ),

          status:
            sale.status,
        })
      );

    downloadExcel(
      `monthly_sales_${reportMonth}.xls`,
      `Monthly Sales Report - ${reportMonth}`,
      [
        {
          key: "invoice",
          label: "Invoice",
        },
        {
          key: "date",
          label: "Date",
        },
        {
          key: "payment",
          label: "Payment Method",
        },
        {
          key: "total",
          label: "Total Sales",
        },
        {
          key: "status",
          label: "Status",
        },
      ],
      rows
    );
  }

  /* =======================================================
     EXPORT PRODUCTS
  ======================================================= */

  function exportProducts() {
    const rows =
      filteredProducts.map(
        (product) => ({
          name:
            product.name,

          barcode:
            product.barcode,

          price:
            Number(
              product.price ||
                0
            ),

          stock:
            Number(
              product.stock ||
                0
            ),

          status:
            Number(
              product.stock ||
                0
            ) <= 0
              ? "Out of Stock"
              : "Available",
        })
      );

    downloadExcel(
      "product_master_file.xls",
      "Product Master File",
      [
        {
          key: "name",
          label: "Product Name",
        },
        {
          key: "barcode",
          label: "Barcode",
        },
        {
          key: "price",
          label: "Selling Price",
        },
        {
          key: "stock",
          label: "Stock",
        },
        {
          key: "status",
          label: "Status",
        },
      ],
      rows
    );
  }

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  if (!session) {
    return (
      <div className="auth">

        <form
          className="card"
          onSubmit={login}
        >

          <h1>
            SmallBiz POS V2.3
          </h1>

          <p>
            Login to continue
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
     MAIN UI
  ======================================================= */

  return (
    <div>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header
        style={{
          position:
            "sticky",
          top: 0,
          zIndex: 20,
          background:
            "white",
          borderBottom:
            "1px solid #ddd",
        }}
      >

        <div
          style={{
            maxWidth:
              "1400px",
            margin:
              "0 auto",
            padding:
              "12px 16px",
          }}
        >

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "12px",
              flexWrap:
                "wrap",
            }}
          >

            <div>

              <b
                style={{
                  fontSize:
                    "20px",
                }}
              >
                SmallBiz POS
              </b>

              <small
                style={{
                  marginLeft:
                    "6px",
                }}
              >
                V2.3
              </small>

              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#666",
                  marginTop:
                    "3px",
                }}
              >
                {profile?.full_name ||
                  profile?.role ||
                  "Cashier"}
              </div>

            </div>

            <button
              onClick={
                logout
              }
            >
              Logout
            </button>

          </div>

          {/* NAVIGATION */}

          <div
            style={{
              display:
                "flex",
              gap: "7px",
              marginTop:
                "12px",
              overflowX:
                "auto",
              paddingBottom:
                "3px",
            }}
          >

            <button
              className={
                activePage ===
                "pos"
                  ? "primary"
                  : ""
              }
              onClick={() =>
                setActivePage(
                  "pos"
                )
              }
            >
              🛒 POS
            </button>

            <button
              className={
                activePage ===
                "transactions"
                  ? "primary"
                  : ""
              }
              onClick={() => {
                setActivePage(
                  "transactions"
                );

                loadSalesHistory(
                  profile?.business_id
                );
              }}
            >
              📋 Transactions
            </button>

            <button
              className={
                activePage ===
                "reports"
                  ? "primary"
                  : ""
              }
              onClick={() => {
                setActivePage(
                  "reports"
                );

                loadSalesHistory(
                  profile?.business_id
                );
              }}
            >
              📊 Reports
            </button>

            <button
              className={
                activePage ===
                "products"
                  ? "primary"
                  : ""
              }
              onClick={() =>
                setActivePage(
                  "products"
                )
              }
            >
              📦 Products
            </button>

          </div>

        </div>

      </header>

      <main
        style={{
          maxWidth:
            "1400px",
          margin:
            "0 auto",
          padding:
            "16px",
        }}
      >

        {/* =================================================
            GLOBAL ERROR / STATUS
        ================================================= */}

        {err && (
          <div
            className="error"
            style={{
              marginBottom:
                "12px",
            }}
          >
            {err}
          </div>
        )}

        {status && (
          <div
            className="status"
            style={{
              marginBottom:
                "12px",
            }}
          >
            {status}
          </div>
        )}

        {/* =================================================
            POS PAGE
        ================================================= */}

        {activePage ===
          "pos" && (
          <>

            {/* PRODUCTS */}

            <section className="card">

              <div className="head">

                <div>

                  <h2>
                    🛒 Point of Sale
                  </h2>

                  <small>
                    Search product or scan barcode.
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
                    marginTop:
                      "12px",
                  }}
                >
                  <div id="reader"></div>

                  <small>
                    Allow camera access and point at a barcode.
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

              <div
                className="products-grid"
                style={{
                  marginTop:
                    "15px",
                }}
              >

                {filtered.length >
                0 ? (
                  filtered.map(
                    (
                      product
                    ) => (
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
                    No product found.
                  </div>
                )}

              </div>

            </section>

            {/* CART */}

            <section
              className="card"
              style={{
                marginTop:
                  "15px",
              }}
            >

              <div className="head">

                <h2>
                  Cart
                </h2>

                <span>
                  {cart.reduce(
                    (
                      n,
                      item
                    ) =>
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
                    (
                      item
                    ) => (
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
                  setCash(
                    ""
                  );

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

          </>
        )}

        {/* =================================================
            TRANSACTIONS PAGE
        ================================================= */}

        {activePage ===
          "transactions" && (
          <section className="card">

            <div className="head">

              <div>

                <h2>
                  📋 Sales History / Transactions
                </h2>

                <small>
                  View, filter and reprint completed transactions.
                </small>

              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: "8px",
                  flexWrap:
                    "wrap",
                }}
              >

                <button
                  onClick={() =>
                    loadSalesHistory(
                      profile?.business_id
                    )
                  }
                >
                  🔄 Refresh
                </button>

                <button
                  onClick={
                    exportTransactions
                  }
                >
                  📥 Excel
                </button>

              </div>

            </div>

            {/* FILTERS */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap: "10px",
                marginTop:
                  "15px",
              }}
            >

              <div>
                <label>
                  Search Invoice
                </label>

                <input
                  className="search"
                  placeholder="Invoice number..."
                  value={
                    historySearch
                  }
                  onChange={(e) =>
                    setHistorySearch(
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label>
                  Payment
                </label>

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
                    Cash
                  </option>

                  <option value="gcash">
                    GCash
                  </option>

                  <option value="card">
                    Card
                  </option>

                </select>
              </div>

              <div>
                <label>
                  Date
                </label>

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
              </div>

              <div>
                <label>
                  Status
                </label>

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

            </div>

            {/* SUMMARY */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(150px,1fr))",
                gap: "10px",
                marginTop:
                  "15px",
              }}
            >

              <div className="card">
                <small>
                  Transactions
                </small>

                <h2>
                  {
                    transactionCount
                  }
                </h2>
              </div>

              <div className="card">
                <small>
                  Total Sales
                </small>

                <h2>
                  {money(
                    transactionTotal
                  )}
                </h2>
              </div>

              <div className="card">
                <small>
                  💵 Cash
                </small>

                <h3>
                  {money(
                    cashTotal
                  )}
                </h3>
              </div>

              <div className="card">
                <small>
                  📱 GCash
                </small>

                <h3>
                  {money(
                    gcashTotal
                  )}
                </h3>
              </div>

              <div className="card">
                <small>
                  💳 Card
                </small>

                <h3>
                  {money(
                    cardTotal
                  )}
                </h3>
              </div>

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

                      <th>
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
                      (
                        sale
                      ) => (
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
                            {
                              sale.status
                            }
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
                  No transactions found.
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
          <section className="card">

            <div className="head">

              <div>

                <h2>
                  📊 Reports
                </h2>

                <small>
                  Daily and monthly sales reports.
                </small>

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

            {/* DAILY */}

            <div
              className="card"
              style={{
                marginTop:
                  "15px",
              }}
            >

              <div className="head">

                <div>

                  <h3>
                    📅 Daily Sales
                  </h3>

                  <small>
                    Sales for selected date
                  </small>

                </div>

                <button
                  onClick={
                    exportDailyReport
                  }
                >
                  📥 Download Excel
                </button>

              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: "10px",
                  alignItems:
                    "end",
                  flexWrap:
                    "wrap",
                }}
              >

                <div>

                  <label>
                    Date
                  </label>

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

                </div>

              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(160px,1fr))",
                  gap: "10px",
                  marginTop:
                    "15px",
                }}
              >

                <div className="card">
                  <small>
                    Transactions
                  </small>

                  <h2>
                    {
                      dailySales.length
                    }
                  </h2>
                </div>

                <div className="card">
                  <small>
                    Total Sales
                  </small>

                  <h2>
                    {money(
                      dailyTotal
                    )}
                  </h2>
                </div>

                <div className="card">
                  <small>
                    Cash
                  </small>

                  <h3>
                    {money(
                      dailyCash
                    )}
                  </h3>
                </div>

                <div className="card">
                  <small>
                    GCash
                  </small>

                  <h3>
                    {money(
                      dailyGcash
                    )}
                  </h3>
                </div>

                <div className="card">
                  <small>
                    Card
                  </small>

                  <h3>
                    {money(
                      dailyCard
                    )}
                  </h3>
                </div>

              </div>

              <div
                style={{
                  overflowX:
                    "auto",
                  marginTop:
                    "15px",
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
                        Invoice
                      </th>

                      <th>
                        Time
                      </th>

                      <th>
                        Payment
                      </th>

                      <th>
                        Total
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {dailySales.map(
                      (
                        sale
                      ) => (
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
                            ).toLocaleTimeString(
                              "en-PH"
                            )}
                          </td>

                          <td>
                            {paymentLabel(
                              sale.payment_method
                            )}
                          </td>

                          <td>
                            {money(
                              sale.total
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

            {/* MONTHLY */}

            <div
              className="card"
              style={{
                marginTop:
                  "15px",
              }}
            >

              <div className="head">

                <div>

                  <h3>
                    📆 Monthly Sales
                  </h3>

                  <small>
                    Sales for selected month
                  </small>

                </div>

                <button
                  onClick={
                    exportMonthlyReport
                  }
                >
                  📥 Download Excel
                </button>

              </div>

              <div>

                <label>
                  Month
                </label>

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

              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(160px,1fr))",
                  gap: "10px",
                  marginTop:
                    "15px",
                }}
              >

                <div className="card">
                  <small>
                    Transactions
                  </small>

                  <h2>
                    {
                      monthlySales.length
                    }
                  </h2>
                </div>

                <div className="card">
                  <small>
                    Total Sales
                  </small>

                  <h2>
                    {money(
                      monthlyTotal
                    )}
                  </h2>
                </div>

                <div className="card">
                  <small>
                    Cash
                  </small>

                  <h3>
                    {money(
                      monthlyCash
                    )}
                  </h3>
                </div>

                <div className="card">
                  <small>
                    GCash
                  </small>

                  <h3>
                    {money(
                      monthlyGcash
                    )}
                  </h3>
                </div>

                <div className="card">
                  <small>
                    Card
                  </small>

                  <h3>
                    {money(
                      monthlyCard
                    )}
                  </h3>
                </div>

              </div>

              <div
                style={{
                  overflowX:
                    "auto",
                  marginTop:
                    "15px",
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
                        Invoice
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Payment
                      </th>

                      <th>
                        Total
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {monthlySales.map(
                      (
                        sale
                      ) => (
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

                          <td>
                            {money(
                              sale.total
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            PRODUCTS / MASTER FILE
        ================================================= */}

        {activePage ===
          "products" && (
          <section className="card">

            <div className="head">

              <div>

                <h2>
                  📦 Product Master File
                </h2>

                <small>
                  Manage products, barcode, selling price and stock.
                </small>

              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: "8px",
                  flexWrap:
                    "wrap",
                }}
              >

                <button
                  className="primary"
                  onClick={
                    openAddProduct
                  }
                >
                  ＋ Add Product
                </button>

                <button
                  onClick={
                    exportProducts
                  }
                >
                  📥 Excel
                </button>

                <button
                  onClick={() =>
                    loadProducts(
                      profile?.business_id
                    )
                  }
                >
                  🔄 Refresh
                </button>

              </div>

            </div>

            <input
              className="search"
              placeholder="Search product or barcode..."
              value={
                productSearch
              }
              onChange={(e) =>
                setProductSearch(
                  e.target.value
                )
              }
              style={{
                marginTop:
                  "15px",
              }}
            />

            <div
              style={{
                marginTop:
                  "15px",
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
                      Barcode
                    </th>

                    <th>
                      Price
                    </th>

                    <th>
                      Stock
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

                  {filteredProducts.length >
                  0 ? (
                    filteredProducts.map(
                      (
                        product
                      ) => (
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

                          <td>
                            {money(
                              product.price
                            )}
                          </td>

                          <td>
                            {
                              product.stock
                            }
                          </td>

                          <td>

                            {product.stock <=
                            0 ? (
                              <span
                                style={{
                                  color:
                                    "#b91c1c",
                                  fontWeight:
                                    "bold",
                                }}
                              >
                                Out of Stock
                              </span>
                            ) : (
                              <span
                                style={{
                                  color:
                                    "#15803d",
                                  fontWeight:
                                    "bold",
                                }}
                              >
                                Available
                              </span>
                            )}

                          </td>

                          <td>

                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "5px",
                                flexWrap:
                                  "wrap",
                              }}
                            >

                              <button
                                onClick={() =>
                                  openEditProduct(
                                    product
                                  )
                                }
                              >
                                ✏️ Edit
                              </button>

                              <button
                                onClick={() =>
                                  deleteProduct(
                                    product
                                  )
                                }
                              >
                                🗑️ Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )
                  ) : (
                    <tr>

                      <td
                        colSpan="6"
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "30px",
                        }}
                      >
                        No products found.
                      </td>

                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </section>
        )}

      </main>

      {/* =================================================
          ADD / EDIT PRODUCT MODAL
      ================================================= */}

      {productModalOpen && (
        <div className="modal-backdrop">

          <form
            className="modal card"
            onSubmit={
              saveProduct
            }
            style={{
              maxWidth:
                "520px",
              width:
                "95%",
            }}
          >

            <div className="head">

              <h2>
                {editingProduct
                  ? "✏️ Edit Product"
                  : "＋ Add Product"}
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
                  {
                    ...productForm,
                    name:
                      e.target.value,
                  }
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
                  {
                    ...productForm,
                    barcode:
                      e.target.value,
                  }
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
                  {
                    ...productForm,
                    price:
                      e.target.value,
                  }
                )
              }
              required
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
                  {
                    ...productForm,
                    stock:
                      e.target.value,
                  }
                )
              }
              required
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
                type="submit"
                className="primary"
                disabled={
                  productSaving
                }
              >
                {productSaving
                  ? "Saving..."
                  : editingProduct
                  ? "Update Product"
                  : "Add Product"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

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
                gap: "8px",
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
                      Insufficient cash.
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
              <div className="change">

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

      {/* =================================================
          PAYMENT COMPLETE
      ================================================= */}

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
                  {
                    receiptNo
                  }
                </b>
              </p>

              <p>
                Cashier:{" "}
                <b>
                  {
                    profile?.full_name ||
                    "Cashier"
                  }
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

      {/* =================================================
          SALE DETAILS
      ================================================= */}

      {saleDetailsOpen &&
        selectedSale && (
          <div className="modal-backdrop">

            <div
              className="modal card"
              style={{
                maxWidth:
                  "760px",
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
                          (
                            item
                          ) => (
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

    </div>
  );
}

/* =========================================================
   RENDER
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
