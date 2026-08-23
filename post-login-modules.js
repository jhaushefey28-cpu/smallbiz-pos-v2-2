// SMALLBIZ_POST_LOGIN_MODULES_V6
// Optional UI enhancements start only after the authenticated React app-shell exists.
// Sidebar/module ownership is handled by owner-modules-loader.jsx.
// This loader must NOT execute the same sidebar-owning modules a second time.
// Mobile/sidebar layout CSS is intentionally untouched.

let started = false;
let observer = null;

// Only load enhancements that do not own/register sidebar entries.
// Sidebar-owning modules are loaded on demand by owner-modules-loader.jsx.
const MODULE_SCRIPTS = [
  "/order-management-shipment-hotfix.js",
  "/marketplace-oauth-connect.js",
  "/report-export-engine.js",
  "/growth-center-sidebar-fix.js"
];

const STYLE_LINKS = [
  "/sidebar-fix.css",
  "/platform-channel-admin.css",
  "/responsive-pos.css",
  "/reports-center.css",
  "/mobile-cart-float.css",
  "/business-controls-scroll-fix.css",
  "/cashier-shift.css"
];

function loadScript(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[data-smallbiz-module="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.type = "module";
    script.src = `${src}?postLogin=20260823-v6`;
    script.dataset.smallbizModule = src;
    script.onload = resolve;
    script.onerror = () => {
      console.warn(`[SmallBiz] Optional enhancement failed: ${src}`);
      resolve();
    };
    document.body.appendChild(script);
  });
}

function loadStyle(href) {
  if (document.querySelector(`link[data-smallbiz-style="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${href}?postLogin=20260823-v6`;
  link.dataset.smallbizStyle = href;
  document.head.appendChild(link);
}

async function loadOptionalModules() {
  if (started || !document.querySelector(".app-shell")) return;
  started = true;
  STYLE_LINKS.forEach(loadStyle);
  for (const src of MODULE_SCRIPTS) await loadScript(src);
  console.info("[SmallBiz] Authenticated UI enhancements loaded safely.");
}

function start() {
  loadOptionalModules();
  if (observer) return;
  observer = new MutationObserver(loadOptionalModules);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(loadOptionalModules, 250);
  setTimeout(loadOptionalModules, 1000);
  setTimeout(loadOptionalModules, 2500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
