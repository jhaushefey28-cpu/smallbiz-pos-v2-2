import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import * as XLSX from "xlsx";

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
          <div className="card error-card">
            <h1>SmallBiz POS V2.3</h1>

            <h2>App error</h2>

            <pre>
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
  !SUPABASE_URL ||
  !SUPABASE_KEY;

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


function norm(product) {
  return {
    ...product,

    name:
      product.name ??
      product.product_name ??
      product.productName ??
      product.title ??
      "Unnamed Product",

    barcode:
      product.barcode ??
      product.bar_code ??
      product.barcode_number ??
      product.sku ??
      "",

    price: Number(
      product.price ??
        product.selling_price ??
        product.sale_price ??
        0
    ),

    stock: Number(
      product.stock ??
        product.quantity ??
        product.current_stock ??
        0
    ),

    imageUrl:
      product.image_url ??
      product.imageUrl ??
      product.image ??
      product.product_image ??
      product.product_image_url ??
      product.photo_url ??
      "",
  };
}


/* =========================================================
   APP
========================================================= */

function App() {

  /* =======================================================
     SESSION
  ======================================================= */

  const [session, setSession] =
    useState(null);


  /* =======================================================
     LOGIN
  ======================================================= */

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");


  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [products, setProducts] =
    useState([]);

  const [search, setSearch] =
    useState("");


  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] =
    useState([]);


  /* =======================================================
     GENERAL STATUS
  ======================================================= */

  const [scan, setScan] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [err, setErr] =
    useState("");


  /* =======================================================
     PROFILE
  ======================================================= */

  const [profile, setProfile] =
    useState(null);


  /* =======================================================
     PAGE
  ======================================================= */

  const [activePage, setActivePage] =
    useState("pos");


  /* =======================================================
     AUTO PRINT
  ======================================================= */

  const [
    autoPrintReceipt,
    setAutoPrintReceipt,
  ] = useState(() => {
    return (
      localStorage.getItem(
        "smallbiz_auto_print_receipt"
      ) === "true"
    );
  });


  /* =======================================================
     PAYMENT
  ======================================================= */

  const [
    paymentOpen,
    setPaymentOpen,
  ] = useState(false);

  const [
    paymentDone,
    setPaymentDone,
  ] = useState(false);

  const [cash, setCash] =
    useState("");

  const [receiptNo, setReceiptNo] =
    useState("");

  const [
    savingPayment,
    setSavingPayment,
  ] = useState(false);

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("cash");


  /* =======================================================
     SALES HISTORY
  ======================================================= */

  const [
    salesHistory,
    setSalesHistory,
  ] = useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    historySearch,
    setHistorySearch,
  ] = useState("");

  const [
    historyPaymentFilter,
    setHistoryPaymentFilter,
  ] = useState("all");

  const [
    historyDateFilter,
    setHistoryDateFilter,
  ] = useState("");

  const [
    historyStatusFilter,
    setHistoryStatusFilter,
  ] = useState("all");


  /* =======================================================
     SALE DETAILS
  ======================================================= */

  const [
    selectedSale,
    setSelectedSale,
  ] = useState(null);

  const [
    selectedSaleItems,
    setSelectedSaleItems,
  ] = useState([]);

  const [
    saleDetailsOpen,
    setSaleDetailsOpen,
  ] = useState(false);

  const [
    saleDetailsLoading,
    setSaleDetailsLoading,
  ] = useState(false);


  /* =======================================================
     RECENT SCANNED
  ======================================================= */

  const [
    recentScanned,
    setRecentScanned,
  ] = useState([]);


  /* =======================================================
     VOID
  ======================================================= */

  const [
    voidOpen,
    setVoidOpen,
  ] = useState(false);

  const [
    voidingSale,
    setVoidingSale,
  ] = useState(null);

  const [
    voidReason,
    setVoidReason,
  ] = useState("");

  const [
    voiding,
    setVoiding,
  ] = useState(false);


  /* =======================================================
     LOGIN SESSION
  ======================================================= */

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session);
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
      load(session.user.id);
    }
  }, [session]);


  async function load(uid) {
    if (!supabase) {
      return;
    }

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
      (data || []).map(norm)
    );

    await loadSalesHistory(
      profileData.business_id
    );
  }


  /* =======================================================
     SALES HISTORY
  ======================================================= */

  async function loadSalesHistory(
    businessId
  ) {
    if (
      !supabase ||
      !businessId
    ) {
      return;
    }

    setHistoryLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("sales")
      .select(
        "id,business_id,invoice_no,cashier_id,subtotal,discount,total,payment_method,amount_tendered,change_amount,status,created_at,voided_at,voided_by,void_reason"
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
      .limit(500);

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

    if (!supabase) {
      return;
    }

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
    if (supabase) {
      await supabase.auth.signOut();
    }

    setCart([]);

    setPaymentOpen(
      false
    );

    setPaymentDone(
      false
    );

    setCash("");

    setReceiptNo("");

    setProfile(null);

    setStatus("");

    setErr("");

    setPaymentMethod(
      "cash"
    );

    setRecentScanned([]);

    setSalesHistory([]);

    setSelectedSale(null);

    setSelectedSaleItems([]);

    setSaleDetailsOpen(
      false
    );

    setVoidOpen(false);

    setVoidingSale(null);

    setVoidReason("");
  }


  /* =======================================================
     PRODUCT SEARCH
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
        (product) =>
          String(
            product.name
          )
            .toLowerCase()
            .includes(q) ||
          String(
            product.barcode
          )
            .toLowerCase()
            .includes(q)
      );
    }, [
      products,
      search,
    ]);


  /* =======================================================
     ADD PRODUCT
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
     SCANNED PRODUCT
  ======================================================= */

  function handleScannedProduct(
    product
  ) {
    setRecentScanned(
      (current) => {
        const filteredRecent =
          current.filter(
            (item) =>
              item.id !==
              product.id
          );

        return [
          {
            ...product,
            scannedAt:
              new Date().toISOString(),
          },
          ...filteredRecent,
        ].slice(0, 6);
      }
    );

    add(product);
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

    const reader =
      document.getElementById(
        "reader"
      );

    if (!reader) {
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
            handleScannedProduct(
              product
            );

            setSearch(
              product.barcode
            );

            setStatus(
              "Scanned: " +
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
      method ===
      "gcash"
    ) {
      return "GCash";
    }

    if (
      method ===
      "card"
    ) {
      return "Card";
    }

    return "Cash";
  }


  /* =======================================================
     COMPLETE PAYMENT
  ======================================================= */

  async function completePayment() {
    if (
      savingPayment ||
      !cart.length ||
      !profile?.id ||
      !profile?.business_id
    ) {
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

    let autoPrintWindow =
      null;

    if (
      autoPrintReceipt
    ) {
      autoPrintWindow =
        window.open(
          "",
          "_blank",
          "width=420,height=700"
        );
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
            change.toFixed(
              2
            )
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

      if (
        autoPrintReceipt
      ) {
        printReceipt({
          receiptNo:
            invoiceNumber,

          printWindow:
            autoPrintWindow,
        });
      }

    } catch (error) {

      if (
        autoPrintWindow &&
        !autoPrintWindow.closed
      ) {
        autoPrintWindow.close();
      }

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

    setRecentScanned([]);

    setErr("");

    setStatus(
      "Ready for new sale."
    );
  }


  /* =======================================================
     FILTER SALES
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

            (
              historyPaymentFilter ===
                "all" ||
              payment ===
                historyPaymentFilter
            ) &&

            (
              !historyDateFilter ||
              saleDate ===
                historyDateFilter
            ) &&

            (
              historyStatusFilter ===
                "all" ||
              status ===
                historyStatusFilter
            )
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
     COMPLETED SALES ONLY
  ======================================================= */

  const completedSales =
    useMemo(() => {
      return salesHistory.filter(
        (sale) =>
          String(
            sale.status ||
              ""
          ).toLowerCase() ===
          "completed"
      );
    }, [
      salesHistory,
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
          "cash" &&
          String(
            sale.status ||
              ""
          ).toLowerCase() ===
            "completed"
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
          "gcash" &&
          String(
            sale.status ||
              ""
          ).toLowerCase() ===
            "completed"
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
          "card" &&
          String(
            sale.status ||
              ""
          ).toLowerCase() ===
            "completed"
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
     EXCEL EXPORT
  ======================================================= */

  function downloadExcel(
    data,
    fileName,
    sheetName = "Sheet1"
  ) {
    if (
      !data ||
      data.length === 0
    ) {
      setStatus(
        "No data available to download."
      );

      return;
    }

    const worksheet =
      XLSX.utils.json_to_sheet(
        data
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheetName
    );

    XLSX.writeFile(
      workbook,
      `${fileName}.xlsx`
    );

    setStatus(
      `Downloaded: ${fileName}.xlsx`
    );
  }


  function downloadTransactionsExcel() {
    const data =
      filteredSales.map(
        (sale) => ({
          Invoice:
            sale.invoice_no ||
            "",

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
            ),

          Discount:
            Number(
              sale.discount ||
                0
            ),

          Total:
            Number(
              sale.total ||
                0
            ),

          AmountTendered:
            Number(
              sale.amount_tendered ||
                0
            ),

          Change:
            Number(
              sale.change_amount ||
                0
            ),

          Status:
            sale.status ||
            "",

          VoidReason:
            sale.void_reason ||
            "",
        })
      );

    downloadExcel(
      data,
      `SmallBiz_POS_Transactions_${new Date()
        .toISOString()
        .slice(0, 10)}`,
      "Transactions"
    );
  }


  async function downloadSalesItemsExcel() {
    if (
      !supabase ||
      !profile?.business_id
    ) {
      return;
    }

    setStatus(
      "Preparing Sales Items Excel..."
    );

    const saleIds =
      salesHistory.map(
        (sale) =>
          sale.id
      );

    if (
      !saleIds.length
    ) {
      setStatus(
        "No sales available."
      );

      return;
    }

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
        .in(
          "sale_id",
          saleIds
        )
        .order(
          "id",
          {
            ascending: true,
          }
        );

    if (error) {
      setErr(
        "Unable to export sale items: " +
          error.message
      );

      return;
    }

    const saleMap = {};

    salesHistory.forEach(
      (sale) => {
        saleMap[sale.id] =
          sale;
      }
    );

    const exportData =
      (data || []).map(
        (item) => {
          const sale =
            saleMap[
              item.sale_id
            ];

          return {
            Invoice:
              sale?.invoice_no ||
              "",

            Date:
              sale?.created_at
                ? new Date(
                    sale.created_at
                  ).toLocaleString(
                    "en-PH"
                  )
                : "",

            Payment:
              paymentLabel(
                sale?.payment_method
              ),

            Product:
              item.product_name ||
              "",

            Barcode:
              item.barcode ||
              "",

            Quantity:
              Number(
                item.quantity ||
                  0
              ),

            UnitPrice:
              Number(
                item.unit_price ||
                  0
              ),

            LineTotal:
              Number(
                item.line_total ||
                  0
              ),

            Status:
              sale?.status ||
              "",
          };
        }
      );

    downloadExcel(
      exportData,
      `SmallBiz_POS_Sales_Items_${new Date()
        .toISOString()
        .slice(0, 10)}`,
      "Sales Items"
    );
  }


  function downloadProductsExcel() {
    const data =
      products.map(
        (product) => ({
          Product:
            product.name ||
            "",

          Barcode:
            product.barcode ||
            "",

          Price:
            Number(
              product.price ||
                0
            ),

          Stock:
            Number(
              product.stock ||
                0
            ),

          Image:
            product.imageUrl ||
            "",
        })
      );

    downloadExcel(
      data,
      `SmallBiz_POS_Inventory_${new Date()
        .toISOString()
        .slice(0, 10)}`,
      "Inventory"
    );
  }


  /* =======================================================
     SALE DETAILS
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
     VOID SALE
  ======================================================= */

  function canVoidSale(
    sale
  ) {
    return (
      sale &&
      sale.id &&
      String(
        sale.status ||
          ""
      ).toLowerCase() ===
        "completed"
    );
  }


  function openVoidModal(
    sale
  ) {
    if (
      !canVoidSale(sale)
    ) {
      setStatus(
        "Only completed transactions can be voided."
      );

      return;
    }

    setVoidingSale(
      sale
    );

    setVoidReason("");

    setVoidOpen(true);

    setErr("");
  }


  async function confirmVoidSale() {
    if (
      voiding ||
      !canVoidSale(
        voidingSale
      ) ||
      !supabase
    ) {
      return;
    }

    setVoiding(true);

    setErr("");

    setStatus(
      "Voiding transaction..."
    );

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "void_sale",
          {
            p_sale_id:
              voidingSale.id,

            p_reason:
              voidReason.trim() ||
              "Voided transaction",
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (
        !data?.success
      ) {
        throw new Error(
          "Unable to void transaction."
        );
      }

      setVoidOpen(
        false
      );

      setVoidingSale(
        null
      );

      setVoidReason("");

      await load(
        session.user.id
      );

      if (
        selectedSale?.id ===
        data.sale_id
      ) {
        setSelectedSale(
          (current) =>
            current
              ? {
                  ...current,

                  status:
                    "voided",

                  void_reason:
                    voidReason.trim() ||
                    "Voided transaction",

                  voided_at:
                    new Date().toISOString(),
                }
              : current
        );
      }

      setStatus(
        `Transaction ${
          data.invoice_no ||
          ""
        } successfully voided. Inventory restored.`
      );

    } catch (error) {

      console.error(
        "Void sale error:",
        error
      );

      setErr(
        error?.message ||
          "Unable to void transaction."
      );

      setStatus("");

    } finally {

      setVoiding(
        false
      );
    }
  }


  /* =======================================================
     PRINT RECEIPT
  ======================================================= */

  function printReceipt(
    options = {}
  ) {
    const receiptNumber =
      options.receiptNo ||
      receiptNo;

    const printWindow =
      options.printWindow ||
      null;

    const cashierName =
      profile?.full_name ||
      profile?.role ||
      "Cashier";

    const itemsHtml =
      cart
        .map(
          (item) => `
            <tr>
              <td>
                ${item.name}
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

    const win =
      printWindow ||
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

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          ${receiptNumber}
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

          td,
          th {
            padding: 5px 0;
          }

          th {
            border-bottom: 1px solid #000;
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
            ${receiptNumber}
          </div>

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

            ${itemsHtml}

          </tbody>

        </table>

        <div class="line"></div>

        <div class="row">

          <span>
            Subtotal
          </span>

          <span>
            ${money(
              subtotal
            )}
          </span>

        </div>

        <div class="row">

          <span>
            Discount
          </span>

          <span>
            ${money(
              discount
            )}
          </span>

        </div>

        <div class="row total">

          <span>
            TOTAL
          </span>

          <span>
            ${money(
              total
            )}
          </span>

        </div>

        <div class="line"></div>

        <div class="row">

          <span>
            Payment
          </span>

          <span>
            ${paymentLabel(
              paymentMethod
            )}
          </span>

        </div>

        <div class="row">

          <span>
            Amount Paid
          </span>

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

                <span>
                  Change
                </span>

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

          Thank you for your purchase!

          <br />

          SmallBiz POS V2.3

        </div>

        <script>

          window.onload =
            function() {
              window.print();
            };

        </script>

      </body>

      </html>
    `);

    win.document.close();
  }


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
            Supabase environment
            variables are missing.
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
     LOGIN SCREEN
  ======================================================= */

  if (!session) {
    return (
      <div className="auth">

        <form
          className="login-card"
          onSubmit={login}
        >

          <div className="login-logo">
            🛒
          </div>

          <h1>
            SmallBiz POS
          </h1>

          <p>
            Sign in to your
            business account
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


  /* =======================================================
     MAIN APP
  ======================================================= */

  return (
    <div className="app-shell">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            🛒
          </div>

          <div>

            <h1>
              SmallBiz POS
            </h1>

            <span>
              V2.3
            </span>

          </div>

        </div>


        {/* PROFILE */}

        <div className="profile-box">

          <div className="profile-avatar">
            👤
          </div>

          <div>

            <b>
              {profile?.full_name ||
                "Business Owner"}
            </b>

            <small>
              {profile?.role ||
                "owner"}
            </small>

            <small className="online">
              ● Online
            </small>

          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="sidebar-nav">

          <button
            className={
              activePage ===
              "pos"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "pos"
              )
            }
          >
            <span>
              🛒
            </span>

            <b>
              POS
            </b>

          </button>


          <button
            className={
              activePage ===
              "transactions"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "transactions"
              )
            }
          >
            <span>
              📋
            </span>

            <b>
              Transactions
            </b>

          </button>


          <button
            className={
              activePage ===
              "reports"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "reports"
              )
            }
          >
            <span>
              📊
            </span>

            <b>
              Reports
            </b>

          </button>


          <button
            className={
              activePage ===
              "products"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "products"
              )
            }
          >
            <span>
              📦
            </span>

            <b>
              Products
            </b>

          </button>

        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          {/* AUTO PRINT */}

          <div
            style={{
              padding:
                "12px",

              marginBottom:
                "10px",

              borderRadius:
                "12px",

              background:
                "rgba(255,255,255,0.06)",
            }}
          >

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap: "10px",
              }}
            >

              <div>

                <b
                  style={{
                    display:
                      "block",
                  }}
                >
                  🖨️ Auto Print
                </b>

                <small
                  style={{
                    opacity:
                      0.7,
                  }}
                >
                  Print receipt after payment
                </small>

              </div>


              <button
                type="button"
                onClick={() => {
                  const next =
                    !autoPrintReceipt;

                  setAutoPrintReceipt(
                    next
                  );

                  localStorage.setItem(
                    "smallbiz_auto_print_receipt",
                    String(next)
                  );

                  setStatus(
                    next
                      ? "Auto Print Receipt: ON"
                      : "Auto Print Receipt: OFF"
                  );
                }}
                style={{
                  border:
                    "none",

                  borderRadius:
                    "999px",

                  padding:
                    "6px 10px",

                  cursor:
                    "pointer",

                  fontWeight:
                    700,
                }}
              >
                {autoPrintReceipt
                  ? "ON"
                  : "OFF"}
              </button>

            </div>

          </div>


          {/* LOGOUT */}

          <button
            className="logout-btn"
            onClick={
              logout
            }
          >

            <span>
              ↪
            </span>

            Logout

          </button>

        </div>

      </aside>


      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="main-area">


        {/* =================================================
            POS
        ================================================= */}

        {activePage ===
          "pos" && (
          <>

            <div className="page-header">

              <div>

                <h2>
                  🛒 Point of Sale
                </h2>

                <p>
                  {profile?.full_name ||
                    "Business"}
                </p>

              </div>


              <button
                className="refresh-btn"
                onClick={() =>
                  load(
                    session.user.id
                  )
                }
              >
                🔄 Refresh
              </button>

            </div>


            <div className="pos-layout">


              {/* PRODUCTS PANEL */}

              <section className="products-panel">

                <div className="panel-title">

                  <div>

                    <h2>
                      Products
                    </h2>

                    <p>
                      Search or scan a product.
                    </p>

                  </div>


                  <button
                    className={
                      scan
                        ? "scan-btn scanning"
                        : "scan-btn"
                    }
                    onClick={() => {
                      setScan(
                        !scan
                      );

                      setStatus(
                        ""
                      );
                    }}
                  >
                    📷{" "}

                    {scan
                      ? "Close Scanner"
                      : "Scan Barcode"}

                  </button>

                </div>


                {scan && (
                  <div className="scanner-box">

                    <div id="reader"></div>

                    <small>
                      Allow camera access
                      and point at the
                      barcode.
                    </small>

                  </div>
                )}


                <div className="search-row">

                  <span>
                    🔍
                  </span>

                  <input
                    className="product-search"
                    placeholder="Search product or barcode..."
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                  />

                </div>


                {status && (
                  <div className="success-status">
                    ✓ {status}
                  </div>
                )}


                {err && (
                  <div className="error-status">
                    {err}
                  </div>
                )}


                <div className="products-grid">

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

                          <div className="product-image">

                            {product.imageUrl ? (
                              <img
                                src={
                                  product.imageUrl
                                }
                                alt={
                                  product.name
                                }
                                onError={(
                                  e
                                ) => {
                                  e.currentTarget.style.display =
                                    "none";

                                  e.currentTarget.parentElement.classList.add(
                                    "image-error"
                                  );
                                }}
                              />
                            ) : (
                              <div className="image-placeholder">
                                📦
                              </div>
                            )}

                          </div>


                          <div className="product-info">

                            <h3>
                              {
                                product.name
                              }
                            </h3>

                            <small>
                              Barcode:{" "}
                              {
                                product.barcode ||
                                  "N/A"
                              }
                            </small>

                            <small>
                              Stock:{" "}
                              {
                                product.stock
                              }
                            </small>

                          </div>


                          <div className="product-bottom">

                            <strong>
                              {money(
                                product.price
                              )}
                            </strong>

                            <button
                              className="add-cart-btn"
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

                        </div>

                      )
                    )

                  ) : (

                    <div className="empty-products">

                      {search
                        ? "No product found."
                        : "No products available."}

                    </div>

                  )}

                </div>

              </section>


              {/* RIGHT PANEL */}

              <aside className="right-panel">


                {/* CART */}

                <section className="cart-panel">

                  <div className="right-panel-header">

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


                  <div className="cart-body">

                    {cart.length >
                    0 ? (

                      cart.map(
                        (
                          item
                        ) => (

                          <div
                            className="cart-item"
                            key={
                              item.id
                            }
                          >

                            <div className="cart-item-image">

                              {item.imageUrl ? (
                                <img
                                  src={
                                    item.imageUrl
                                  }
                                  alt={
                                    item.name
                                  }
                                />
                              ) : (
                                <span>
                                  📦
                                </span>
                              )}

                            </div>


                            <div className="cart-item-info">

                              <b>
                                {
                                  item.name
                                }
                              </b>

                              <small>
                                {money(
                                  item.price
                                )}
                              </small>


                              <div className="qty-controls">

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

                                <span>
                                  {
                                    item.qty
                                  }
                                </span>

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

                              </div>

                            </div>


                            <strong>
                              {money(
                                item.price *
                                  item.qty
                              )}
                            </strong>

                          </div>

                        )
                      )

                    ) : (

                      <div className="cart-empty">

                        <div className="cart-empty-icon">
                          🛒
                        </div>

                        <p>
                          Cart is empty.
                        </p>

                      </div>

                    )}

                  </div>


                  <div className="cart-summary">

                    <div>

                      <span>
                        Subtotal
                      </span>

                      <b>
                        {money(
                          subtotal
                        )}
                      </b>

                    </div>


                    <div>

                      <span>
                        Discount
                      </span>

                      <b>
                        {money(
                          discount
                        )}
                      </b>

                    </div>


                    <div className="grand-total">

                      <span>
                        TOTAL
                      </span>

                      <b>
                        {money(
                          total
                        )}
                      </b>

                    </div>


                    <button
                      className="payment-btn"
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

                  </div>

                </section>


                {/* RECENT SCANNED */}

                <section className="recent-panel">

                  <div className="right-panel-header">

                    <h2>
                      🕘 Recent Scanned
                    </h2>

                  </div>


                  {recentScanned.length >
                  0 ? (

                    <div className="recent-list">

                      {recentScanned.map(
                        (
                          item
                        ) => (

                          <div
                            className="recent-item"
                            key={
                              item.id
                            }
                          >

                            <div className="recent-image">

                              {item.imageUrl ? (
                                <img
                                  src={
                                    item.imageUrl
                                  }
                                  alt={
                                    item.name
                                  }
                                />
                              ) : (
                                <span>
                                  📦
                                </span>
                              )}

                            </div>


                            <div>

                              <b>
                                {
                                  item.name
                                }
                              </b>

                              <small>
                                {
                                  item.barcode ||
                                    "No barcode"
                                }
                              </small>

                            </div>


                            <button
                              onClick={() =>
                                add(
                                  item
                                )
                              }
                            >
                              +
                            </button>

                          </div>

                        )
                      )}

                    </div>

                  ) : (

                    <div className="recent-empty">

                      <div className="barcode-icon">
                        ▥
                      </div>

                      <p>
                        No scanned
                        items yet.
                      </p>

                      <small>
                        Scan a barcode
                        to see recently
                        scanned items
                        here.
                      </small>

                    </div>

                  )}

                </section>

              </aside>

            </div>

          </>
        )}


        {/* =================================================
            TRANSACTIONS
        ================================================= */}

        {activePage ===
          "transactions" && (

          <section className="page-card">

            <div className="page-header">

              <div>

                <h2>
                  📋 Transactions
                </h2>

                <p>
                  Sales History / Transactions
                </p>

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
                  className="refresh-btn"
                  onClick={() =>
                    loadSalesHistory(
                      profile?.business_id
                    )
                  }
                >
                  🔄 Refresh
                </button>


                <button
                  className="excel-btn"
                  onClick={
                    downloadTransactionsExcel
                  }
                >
                  📊 Excel
                </button>

              </div>

            </div>


            {/* FILTERS */}

            <div className="filters">

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
                  Cash
                </option>

                <option value="gcash">
                  GCash
                </option>

                <option value="card">
                  Card
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

                <option value="voided">
                  Voided
                </option>

              </select>

            </div>


            {/* SUMMARY */}

            <div className="summary-grid">

              <div>

                <small>
                  Transactions
                </small>

                <strong>
                  {
                    transactionCount
                  }
                </strong>

              </div>


              <div>

                <small>
                  Total Sales
                </small>

                <strong>
                  {money(
                    filteredSales
                      .filter(
                        (sale) =>
                          String(
                            sale.status ||
                              ""
                          ).toLowerCase() ===
                          "completed"
                      )
                      .reduce(
                        (
                          sum,
                          sale
                        ) =>
                          sum +
                          Number(
                            sale.total ||
                              0
                          ),
                        0
                      )
                  )}
                </strong>

              </div>


              <div>

                <small>
                  Cash
                </small>

                <strong>
                  {money(
                    cashTotal
                  )}
                </strong>

              </div>


              <div>

                <small>
                  GCash
                </small>

                <strong>
                  {money(
                    gcashTotal
                  )}
                </strong>

              </div>


              <div>

                <small>
                  Card
                </small>

                <strong>
                  {money(
                    cardTotal
                  )}
                </strong>

              </div>

            </div>


            {/* TABLE */}

            {historyLoading ? (

              <div className="empty-page">
                Loading transactions...
              </div>

            ) : filteredSales.length >
              0 ? (

              <div className="table-wrapper">

                <table>

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


                          <td>
                            <b>
                              {money(
                                sale.total
                              )}
                            </b>
                          </td>


                          <td>

                            <span
                              className={
                                String(
                                  sale.status ||
                                    ""
                                ).toLowerCase() ===
                                "voided"
                                  ? "status-badge voided"
                                  : "status-badge"
                              }
                            >
                              {String(
                                sale.status ||
                                  ""
                              ).toUpperCase()}
                            </span>

                          </td>


                          <td>

                            <div
                              style={{
                                display:
                                  "flex",

                                gap:
                                  "6px",

                                flexWrap:
                                  "wrap",
                              }}
                            >

                              <button
                                onClick={() =>
                                  openSaleDetails(
                                    sale
                                  )
                                }
                              >
                                🧾 View
                              </button>


                              {String(
                                sale.status ||
                                  ""
                              ).toLowerCase() ===
                                "completed" && (

                                <button
                                  className="danger-btn"
                                  onClick={() =>
                                    openVoidModal(
                                      sale
                                    )
                                  }
                                >
                                  🚫 Void
                                </button>

                              )}

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="empty-page">
                No transactions found.
              </div>

            )}

          </section>

        )}


        {/* =================================================
            REPORTS
        ================================================= */}

        {activePage ===
          "reports" && (

          <section className="page-card">

            <div className="page-header">

              <div>

                <h2>
                  📊 Reports
                </h2>

                <p>
                  Sales and business performance summary.
                </p>

              </div>


              <button
                className="refresh-btn"
                onClick={() =>
                  loadSalesHistory(
                    profile?.business_id
                  )
                }
              >
                🔄 Refresh
              </button>

            </div>


            <div className="report-grid">


              <div className="report-card">

                <small>
                  Completed Transactions
                </small>

                <strong>
                  {
                    completedSales.length
                  }
                </strong>

              </div>


              <div className="report-card">

                <small>
                  Total Sales
                </small>

                <strong>
                  {money(
                    completedSales.reduce(
                      (
                        sum,
                        sale
                      ) =>
                        sum +
                        Number(
                          sale.total ||
                            0
                        ),
                      0
                    )
                  )}
                </strong>

              </div>


              <div className="report-card">

                <small>
                  Cash Sales
                </small>

                <strong>
                  {money(
                    completedSales
                      .filter(
                        (
                          sale
                        ) =>
                          sale.payment_method ===
                          "cash"
                      )
                      .reduce(
                        (
                          sum,
                          sale
                        ) =>
                          sum +
                          Number(
                            sale.total ||
                              0
                          ),
                        0
                      )
                  )}
                </strong>

              </div>


              <div className="report-card">

                <small>
                  GCash Sales
                </small>

                <strong>
                  {money(
                    completedSales
                      .filter(
                        (
                          sale
                        ) =>
                          sale.payment_method ===
                          "gcash"
                      )
                      .reduce(
                        (
                          sum,
                          sale
                        ) =>
                          sum +
                          Number(
                            sale.total ||
                              0
                          ),
                        0
                      )
                  )}
                </strong>

              </div>


              <div className="report-card">

                <small>
                  Card Sales
                </small>

                <strong>
                  {money(
                    completedSales
                      .filter(
                        (
                          sale
                        ) =>
                          sale.payment_method ===
                          "card"
                      )
                      .reduce(
                        (
                          sum,
                          sale
                        ) =>
                          sum +
                          Number(
                            sale.total ||
                              0
                          ),
                        0
                      )
                  )}
                </strong>

              </div>


              <div className="report-card">

                <small>
                  Voided Transactions
                </small>

                <strong>
                  {
                    salesHistory.filter(
                      (
                        sale
                      ) =>
                        String(
                          sale.status ||
                            ""
                        ).toLowerCase() ===
                        "voided"
                    ).length
                  }
                </strong>

              </div>

            </div>


            {/* DOWNLOAD */}

            <div className="report-download-panel">

              <div>

                <h3>
                  📥 Download Reports
                </h3>

                <p>
                  Export your POS data to Excel.
                </p>

              </div>


              <div className="download-buttons">

                <button
                  className="excel-btn"
                  onClick={
                    downloadTransactionsExcel
                  }
                >
                  📊 Transactions Excel
                </button>


                <button
                  className="excel-btn"
                  onClick={
                    downloadSalesItemsExcel
                  }
                >
                  🧾 Sales Items Excel
                </button>


                <button
                  className="excel-btn"
                  onClick={
                    downloadProductsExcel
                  }
                >
                  📦 Inventory Excel
                </button>

              </div>

            </div>


            <div className="info-box">

              <h3>
                📈 Sales Report
              </h3>

              <p>
                Your current sales history contains{" "}
                <b>
                  {
                    salesHistory.length
                  }
                </b>{" "}
                transaction(s).
              </p>


              <p>
                Completed transactions:{" "}
                <b>
                  {
                    completedSales.length
                  }
                </b>
              </p>


              <p>
                Total recorded sales:{" "}
                <b>
                  {money(
                    completedSales.reduce(
                      (
                        sum,
                        sale
                      ) =>
                        sum +
                        Number(
                          sale.total ||
                            0
                        ),
                      0
                    )
                  )}
                </b>
              </p>


              <p>
                Voided transactions:{" "}
                <b>
                  {
                    salesHistory.filter(
                      (
                        sale
                      ) =>
                        String(
                          sale.status ||
                            ""
                        ).toLowerCase() ===
                        "voided"
                    ).length
                  }
                </b>
              </p>

            </div>

          </section>

        )}


        {/* =================================================
            PRODUCTS
        ================================================= */}

        {activePage ===
          "products" && (

          <section className="page-card">

            <div className="page-header">

              <div>

                <h2>
                  📦 Products
                </h2>

                <p>
                  Product master file and inventory.
                </p>

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
                  className="excel-btn"
                  onClick={
                    downloadProductsExcel
                  }
                >
                  📥 Excel
                </button>


                <button
                  className="primary"
                  onClick={() =>
                    setStatus(
                      "Product management form can be connected here."
                    )
                  }
                >
                  + Add Product
                </button>

              </div>

            </div>


            <div className="master-products">

              {products.map(
                (
                  product
                ) => (

                  <div
                    className="master-product"
                    key={
                      product.id
                    }
                  >

                    <div className="master-image">

                      {product.imageUrl ? (
                        <img
                          src={
                            product.imageUrl
                          }
                          alt={
                            product.name
                          }
                        />
                      ) : (
                        <span>
                          📦
                        </span>
                      )}

                    </div>


                    <div>

                      <h3>
                        {
                          product.name
                        }
                      </h3>

                      <p>
                        Barcode:{" "}
                        {
                          product.barcode ||
                            "N/A"
                        }
                      </p>

                      <p>
                        Stock:{" "}
                        {
                          product.stock
                        }
                      </p>

                    </div>


                    <strong>
                      {money(
                        product.price
                      )}
                    </strong>

                  </div>

                )
              )}

            </div>

          </section>

        )}

      </div>


      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

      {paymentOpen && (

        <div className="modal-backdrop">

          <div className="modal">

            <div className="modal-header">

              <h2>
                Payment
              </h2>

              <button
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


            <div className="payment-methods">

              <button
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

                }}
              >
                💵 Cash
              </button>


              <button
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

                }}
              >
                📱 GCash
              </button>


              <button
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
                  value={cash}
                  onChange={(e) =>
                    setCash(
                      e.target.value
                    )
                  }
                  placeholder="Enter cash amount"
                />


                {cash &&
                  Number(cash) >=
                    total && (

                    <div className="change-box">

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


                {cash &&
                  Number(cash) <
                    total && (

                    <p className="error">
                      Insufficient cash.
                    </p>

                  )}

              </>

            )}


            {err && (
              <p className="error">
                {err}
              </p>
            )}


            <div className="modal-buttons">

              <button
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

          <div className="modal">

            <div className="success-icon">
              ✓
            </div>


            <h2>
              Payment Complete
            </h2>


            <div className="receipt-summary">

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
                Payment:{" "}
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
                "cash" && (

                <>

                  <p>
                    Cash:{" "}
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


      {/* =================================================
          SALE DETAILS
      ================================================= */}

      {saleDetailsOpen &&
        selectedSale && (

        <div className="modal-backdrop">

          <div className="modal sale-details-modal">

            <div className="modal-header">

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

              <div className="empty-page">
                Loading sale details...
              </div>

            ) : (

              <>

                <div className="sale-info">

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

                    <span
                      className={
                        String(
                          selectedSale.status ||
                            ""
                        ).toLowerCase() ===
                        "voided"
                          ? "status-badge voided"
                          : "status-badge"
                      }
                    >
                      {String(
                        selectedSale.status ||
                          ""
                      ).toUpperCase()}
                    </span>

                  </p>


                  {String(
                    selectedSale.status ||
                      ""
                  ).toLowerCase() ===
                    "voided" && (

                    <>

                      <p>

                        <b>
                          Void Reason:
                        </b>{" "}

                        {
                          selectedSale.void_reason ||
                          "No reason provided"
                        }

                      </p>


                      <p>

                        <b>
                          Voided At:
                        </b>{" "}

                        {selectedSale.voided_at
                          ? new Date(
                              selectedSale.voided_at
                            ).toLocaleString(
                              "en-PH"
                            )
                          : "-"}

                      </p>

                    </>

                  )}

                </div>


                <div className="table-wrapper">

                  <table>

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


                <div className="sale-total">

                  <div>

                    <span>
                      Subtotal
                    </span>

                    <b>
                      {money(
                        selectedSale.subtotal
                      )}
                    </b>

                  </div>


                  <div>

                    <span>
                      Discount
                    </span>

                    <b>
                      {money(
                        selectedSale.discount
                      )}
                    </b>

                  </div>


                  <div className="grand-total">

                    <span>
                      TOTAL
                    </span>

                    <b>
                      {money(
                        selectedSale.total
                      )}
                    </b>

                  </div>

                </div>


                <div className="modal-buttons">

                  {String(
                    selectedSale.status ||
                      ""
                  ).toLowerCase() ===
                    "completed" && (

                    <button
                      className="danger-btn"
                      onClick={() =>
                        openVoidModal(
                          selectedSale
                        )
                      }
                    >
                      🚫 Void Transaction
                    </button>

                  )}


                  <button
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


      {/* =================================================
          VOID MODAL
      ================================================= */}

      {voidOpen &&
        voidingSale && (

        <div className="modal-backdrop">

          <div className="modal">

            <div className="modal-header">

              <h2>
                🚫 Void Transaction
              </h2>

              <button
                disabled={
                  voiding
                }
                onClick={() => {

                  if (
                    !voiding
                  ) {
                    setVoidOpen(
                      false
                    );

                    setVoidingSale(
                      null
                    );

                    setVoidReason(
                      ""
                    );
                  }

                }}
              >
                ✕
              </button>

            </div>


            <div className="warning-box">

              <strong>
                Are you sure you want to void this transaction?
              </strong>

              <p>
                The transaction will remain in
                the history, but the inventory
                quantity will be restored.
              </p>

            </div>


            <div className="sale-info">

              <p>

                <b>
                  Invoice:
                </b>{" "}

                {
                  voidingSale.invoice_no
                }

              </p>


              <p>

                <b>
                  Total:
                </b>{" "}

                {money(
                  voidingSale.total
                )}

              </p>


              <p>

                <b>
                  Payment:
                </b>{" "}

                {paymentLabel(
                  voidingSale.payment_method
                )}

              </p>

            </div>


            <label>
              Void Reason
            </label>


            <textarea
              value={
                voidReason
              }
              onChange={(e) =>
                setVoidReason(
                  e.target.value
                )
              }
              placeholder="Enter reason for void..."
              rows={4}
              disabled={
                voiding
              }
            />


            {err && (
              <p className="error">
                {err}
              </p>
            )}


            <div className="modal-buttons">

              <button
                disabled={
                  voiding
                }
                onClick={() => {

                  setVoidOpen(
                    false
                  );

                  setVoidingSale(
                    null
                  );

                  setVoidReason(
                    ""
                  );

                }}
              >
                Cancel
              </button>


              <button
                className="danger-btn"
                disabled={
                  voiding
                }
                onClick={
                  confirmVoidSale
                }
              >
                {voiding
                  ? "Voiding..."
                  : "🚫 Confirm Void"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


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
