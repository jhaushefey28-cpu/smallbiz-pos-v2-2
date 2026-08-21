// SMALLBIZ_OWNER_MODULES_LOADER_V2
// Vite-native, post-auth module loader. Optional modules never block login/core POS.
// Employee/Attendance is loaded here so its existing sidebar + Kiosk remain available
// on desktop and mobile without touching the core POS/auth path.
let started = false;

const MODULES = [
  () => import("./reprint-modal-fix.js"),
  () => import("./void-reason-enhancement.js"),
  () => import("./transaction-audit-enhancement.js"),
  () => import("./team-management.js"),
  () => import("./sales-channels.jsx"),
  () => import("./product-channel-mapping.jsx"),
  () => import("./order-management-shipment-hotfix.js"),
  () => import("./order-management.jsx"),
  () => import("./platform-channel-admin.js"),
  () => import("./marketplace-connections.jsx"),
  () => import("./marketplace-oauth-connect.js"),
  () => import("./marketplace-sync-readiness.jsx"),
  () => import("./marketplace-stock-reservation.jsx"),
  () => import("./marketplace-fulfillment.jsx"),
  () => import("./report-export-engine.js"),
  () => import("./reports-center.js"),
  () => import("./business-controls.jsx"),
  () => import("./inventory-center.jsx"),
  () => import("./growth-center.jsx"),
  () => import("./growth-center-sidebar-fix.js"),
  () => import("./cashier-shift.jsx"),
  () => import("./attendance-center.js"),
  () => import("./employee-attendance.js"),
  () => import("./attendance-sidebar-fix.js")
];

const STYLES = [
  "./sidebar-fix.css",
  "./platform-channel-admin.css",
  "./responsive-pos.css",
  "./reports-center.css",
  "./mobile-cart-float.css",
  "./business-controls-scroll-fix.css",
  "./cashier-shift.css",
  "./attendance-center.css",
  "./attendance-log-enhancement.css",
  "./employee-attendance.css"
];

export function startOwnerModules() {
  if (started) return;
  started = true;
  STYLES.forEach(src => import(src).catch(() => {}));
  Promise.allSettled(MODULES.map(load => load())).then(results => {
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed) console.warn(`[SmallBiz] ${failed} optional module(s) failed; core app remains active.`);
    else console.info("[SmallBiz] Owner modules loaded through Vite after authentication.");
  });
}
