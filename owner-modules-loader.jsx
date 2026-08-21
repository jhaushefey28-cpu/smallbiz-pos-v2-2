// SMALLBIZ_OWNER_MODULES_LOADER_V3
// Vite-native, post-auth module loader. Optional modules never block login/core POS.
let started = false;

// Attendance styles are imported statically so Vite guarantees they are present before the
// module renders. This prevents the modal from falling back to unstyled HTML at the bottom.
import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";

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
  () => import("./attendance-runtime-bridge.js"),
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
  "./cashier-shift.css"
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
