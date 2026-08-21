// SMALLBIZ_POST_LOGIN_MODULES_V3
// This file is imported by the core app, but it does NOT import optional modules
// until the authenticated app shell exists. Optional-module failures are isolated.

let started = false;
let observer = null;

const OPTIONAL_MODULES = [
  () => import("./order-management.jsx"),
  () => import("./inventory-center.jsx"),
  () => import("./growth-center.jsx"),
  () => import("./marketplace-connections.jsx"),
  () => import("./marketplace-fulfillment.jsx"),
  () => import("./marketplace-stock-reservation.jsx"),
  () => import("./marketplace-sync-readiness.jsx"),
  () => import("./cashier-shift.jsx"),
  () => import("./business-controls.jsx"),
  () => import("./sales-channels.jsx"),
  () => import("./product-channel-mapping.jsx"),
  () => import("./platform-channel-admin.jsx"),
  () => import("./team-management.js"),
  () => import("./team-rbac-ui.js"),
  () => import("./system-audit-center.js"),
  () => import("./attendance-center.js"),
  () => import("./employee-attendance.js")
];

async function loadOptionalModules() {
  if (started) return;
  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  // Core app is already rendered. Optional modules can now load independently.
  started = true;
  const results = await Promise.allSettled(OPTIONAL_MODULES.map(load => load()));
  const failed = results.filter(r => r.status === "rejected");
  if (failed.length) {
    console.warn(`[SmallBiz] ${failed.length} optional module(s) failed to load; core app remains active.`);
  }
}

function start() {
  loadOptionalModules();
  if (observer) return;
  observer = new MutationObserver(() => loadOptionalModules());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
