// SMALLBIZ_OWNER_MODULES_LOADER_V5
// Vite-native, post-auth module loader. Optional modules never block login/core POS.
// Modules are staged to keep the POS responsive while preserving the full sidebar.
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
  () => import("./cashier-shift.jsx")
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

const yieldToBrowser = (callback) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 250 });
  } else {
    setTimeout(callback, 0);
  }
};

async function loadAttendanceFirst() {
  try {
    await import("./attendance-runtime-bridge.js");
    await import("./attendance-center.js");
    await import("./employee-attendance.js");
    await import("./attendance-sidebar-fix.js");
  } catch (error) {
    console.warn("[SmallBiz] Attendance module failed; core app remains active.", error);
  }
}

function loadRemainingModulesInBatches() {
  let index = 0;
  let failed = 0;
  const batchSize = 3;

  const next = () => {
    if (index >= MODULES.length) {
      if (failed) console.warn(`[SmallBiz] ${failed} optional module(s) failed; core app remains active.`);
      else console.info("[SmallBiz] Owner modules loaded through staged Vite authentication loader.");
      return;
    }

    const batch = MODULES.slice(index, index + batchSize);
    index += batch.length;

    yieldToBrowser(async () => {
      const results = await Promise.allSettled(batch.map(load => load()));
      failed += results.filter(result => result.status === "rejected").length;
      yieldToBrowser(next);
    });
  };

  next();
}

export function startOwnerModules() {
  if (started) return;
  started = true;

  // CSS is cheap and needed immediately for the independent sidebar scroll layout.
  STYLES.forEach(src => import(src).catch(() => {}));

  // Attendance gets first priority so its sidebar entry is available without waiting for
  // marketplace/report/inventory modules. Everything else yields to the browser in small batches.
  loadAttendanceFirst().finally(loadRemainingModulesInBatches);
}
