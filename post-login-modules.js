// SMALLBIZ_POST_LOGIN_MODULES_V4
// Legacy UI modules are injected only after the authenticated React app-shell exists.
// This keeps mobile authentication isolated while restoring the existing side-effect modules.

let started = false;
let observer = null;

const MODULE_SCRIPTS = [
  "/reprint-modal-fix.js",
  "/void-reason-enhancement.js",
  "/transaction-audit-enhancement.js",
  "/team-management.js",
  "/sales-channels.jsx",
  "/product-channel-mapping.jsx",
  "/order-management-shipment-hotfix.js",
  "/order-management.jsx",
  "/platform-channel-admin.js",
  "/marketplace-connections.jsx",
  "/marketplace-oauth-connect.js",
  "/marketplace-sync-readiness.jsx",
  "/marketplace-stock-reservation.jsx",
  "/marketplace-fulfillment.jsx",
  "/report-export-engine.js",
  "/reports-center.js",
  "/mobile-cart-float.js",
  "/business-controls.jsx",
  "/inventory-center.jsx",
  "/growth-center.jsx",
  "/growth-center-sidebar-fix.js",
  "/cashier-shift.jsx"
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
    script.src = `${src}?postLogin=20260821-v4`;
    script.dataset.smallbizModule = src;
    script.onload = resolve;
    script.onerror = () => {
      console.warn(`[SmallBiz] Optional module failed: ${src}`);
      resolve();
    };
    document.body.appendChild(script);
  });
}

function loadStyle(href) {
  if (document.querySelector(`link[data-smallbiz-style="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${href}?postLogin=20260821-v4`;
  link.dataset.smallbizStyle = href;
  document.head.appendChild(link);
}

async function loadOptionalModules() {
  if (started || !document.querySelector(".app-shell")) return;
  started = true;
  STYLE_LINKS.forEach(loadStyle);
  // Preserve the old side-effect execution order so sidebar/module registration is deterministic.
  for (const src of MODULE_SCRIPTS) await loadScript(src);
  console.info("[SmallBiz] Authenticated UI modules loaded.");
}

function start() {
  loadOptionalModules();
  if (observer) return;
  observer = new MutationObserver(loadOptionalModules);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
