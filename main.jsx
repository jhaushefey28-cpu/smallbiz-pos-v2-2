import React, { useEffect, useMemo, useState } from "react";
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
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const configError = !SUPABASE_URL || !SUPABASE_KEY;

const supabase = configError
  ? null
  : createClient(SUPABASE_URL, SUPABASE_KEY);

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
  if (configError) {
    return (
      <div className="auth">
        <div className="card">
          <h1>SmallBiz POS V2.2</h1>
          <h2>Configuration missing</h2>

          <p>
            Vercel is not receiving the Supabase environment variables.
          </p>

          <pre>
            VITE_SUPABASE_URL
            {"\n"}
            VITE_SUPABASE_PUBLISHABLE_KEY
          </pre>

          <p>
            Open Vercel → Settings → Environment Variables,
            save both variables for Production, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  const [session, setSession] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);

  const [scan, setScan] = useState(false);
  const [status, setStatus] = useState("");

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
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // LOAD PRODUCTS
  // =========================

  useEffect(() => {
    if (session?.user) {
      load(session.user.id);
    }
  }, [session]);

  async function load(uid) {
    setErr("");

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("business_id,active,role")
      .eq("id", uid)
      .single();

    if (profileError) {
      setErr(profileError.message);
      return;
    }

    let query = supabase
      .from("products")
      .select("*");

    if (profile?.business_id) {
      query = query.eq(
        "business_id",
        profile.business_id
      );
    }

    const {
      data,
      error,
    } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setProducts(
      (data || []).map(norm)
    );
  }

  // =========================
  // LOGIN
  // =========================

  async function login(e) {
    e.preventDefault();

    setErr("");

    const { error } =
      await supabase.auth.signInWithPassword({
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
  }

  // =========================
  // SEARCH
  // =========================

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) {
      return products;
    }

    return products.filter((p) => {
      return (
        String(p.name)
          .toLowerCase()
          .includes(q) ||
        String(p.barcode)
          .toLowerCase()
          .includes(q)
      );
    });
  }, [products, search]);

  // =========================
  // ADD TO CART
  // =========================

  function add(p) {
    if (p.stock <= 0) {
      setStatus("Out of stock: " + p.name);
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === p.id
      );

      if (existing) {
        return current.map((item) =>
          item.id === p.id
            ? {
                ...item,
                qty: Math.min(
                  item.qty + 1,
                  p.stock
                ),
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...p,
          qty: 1,
        },
      ];
    });

    setStatus("Added: " + p.name);
  }

  // =========================
  // CART QUANTITY
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

  const total = cart.reduce(
    (sum, item) =>
      sum + item.price * item.qty,
    0
  );

  // =========================
  // BARCODE SCANNER
  // =========================

  useEffect(() => {
    if (!scan) {
      return;
    }

    const scanner = new Html5Qrcode("reader");

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 120,
          },
        },
        (code) => {
          const product = products.find(
            (p) =>
              String(p.barcode) ===
              String(code)
          );

          if (product) {
            add(product);
            setStatus(
              "Added: " + product.name
            );
          } else {
            setStatus(
              "Barcode not found: " + code
            );
            setSearch(code);
          }
        },
        () => {}
      )
      .catch((error) => {
        setStatus(
          "Camera error: " + error
        );
      });

    return () => {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [scan, products]);

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!session) {
    return (
      <div className="auth">
        <form
          className="card"
          onSubmit={login}
        >
          <h1>SmallBiz POS V2.2</h1>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
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
  // POS SCREEN
  // =========================

  return (
    <div>
      <header>
        <b>
          SmallBiz POS{" "}
          <small>V2.2</small>
        </b>

        <button onClick={logout}>
          Logout
        </button>
      </header>

      <main>
        {/* ================= PRODUCTS ================= */}

        <section className="card">
          <div className="head">
            <h2>Products</h2>

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
                Allow camera access and point
                at a barcode.
              </small>
            </div>
          )}

          <input
            className="search"
            placeholder="Search product or barcode..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {status && (
            <div className="status">
              {status}
            </div>
          )}

          {/* PRODUCT LIST */}

          <div className="products-grid">
            {filtered.length > 0 ? (
              filtered.map((p) => (
                <div
                  className="product-card"
                  key={p.id}
                >
                  <div>
                    <b>{p.name}</b>

                    <small>
                      Barcode:{" "}
                      {p.barcode || "N/A"}
                    </small>

                    <small>
                      Stock: {p.stock}
                    </small>
                  </div>

                  <strong>
                    {money(p.price)}
                  </strong>

                  <button
                    className="primary"
                    disabled={p.stock <= 0}
                    onClick={() =>
                      add(p)
                    }
                  >
                    {p.stock > 0
                      ? "Add to Cart"
                      : "Out of Stock"}
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                {search
                  ? "No product found."
                  : "No products available."}
              </div>
            )}
          </div>
        </section>

        {/* ================= CART ================= */}

        <section className="card">
          <div className="head">
            <h2>Cart</h2>

            <span>
              {cart.reduce(
                (number, item) =>
                  number + item.qty,
                0
              )}{" "}
              item(s)
            </span>
          </div>

          {cart.length > 0 ? (
            <>
              {cart.map((item) => (
                <div
                  className="cart"
                  key={item.id}
                >
                  <span>
                    <b>
                      {item.name}
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
              ))}
            </>
          ) : (
            <div className="empty">
              Cart is empty.
            </div>
          )}

          <div className="total">
            <span>Total</span>

            <b>
              {money(total)}
            </b>
          </div>

          <button
            className="primary"
            disabled={!cart.length}
            onClick={() =>
              setStatus(
                "Payment feature ready for next step."
              )
            }
          >
            Payment
          </button>
        </section>
      </main>
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
