// SMALLBIZ_OWNER_MODULES_LOADER_V16
// Canonical owner sidebar. React owns the core POS navigation; this loader owns
// marketplace/owner modules that are implemented as self-mounting modules.
// Self-mounted module buttons are internal openers only. Exactly one visible
// canonical button is kept for every owner module.
import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";

const SUPPORT_MODULES = [
  () => import("./reprint-modal-fix.js"),
  () => import("./void-reason-enhancement.js"),
  () => import("./transaction-audit-enhancement.js")
];

const OWNER_MENU = [
  { key: "team", icon: "👥", label: "Team", permission: "team.view", load: () => import("./team-management.js") },
  { key: "channels", icon: "🌐", label: "Online Channels", permission: "marketplace.view", load: () => import("./sales-channels.jsx") },
  { key: "marketplace-connections", icon: "🔌", label: "Marketplace Connections", permission: "marketplace.view", load: () => import("./marketplace-connections.jsx") },
  { key: "marketplace-stock", icon: "📦", label: "Marketplace Stock", permission: "inventory.view", load: () => import("./marketplace-stock-reservation.jsx") },
  { key: "marketplace-fulfillment", icon: "🚚", label: "Marketplace Fulfillment", permission: "marketplace.manage", load: () => import("./marketplace-fulfillment.jsx") },
  { key: "order-management", icon: "🛍️", label: "Order Management", permission: "marketplace.view", load: () => import("./order-management.jsx") },
  { key: "sync-readiness", icon: "🔄", label: "Marketplace Sync Readiness", permission: "marketplace.view", load: () => import("./marketplace-sync-readiness.jsx") },
  { key: "channel-mapping", icon: "🗺️", label: "Product Channel Mapping", permission: "marketplace.manage", load: () => import("./product-channel-mapping.jsx") },
  { key: "platform-admin", icon: "🛠️", label: "Platform Channel Admin", permission: "marketplace.manage", load: () => import("./platform-channel-admin.js") },
  { key: "business-controls", icon: "⚙️", label: "Business Controls", permission: "settings.manage", load: () => import("./business-controls.jsx") },
  { key: "inventory", icon: "📦", label: "Inventory", permission: "inventory.view", load: () => import("./inventory-center.jsx") },
  { key: "growth", icon: "📈", label: "Growth", permission: "reports.view", load: () => import("./growth-center.jsx") },
  { key: "cashier-shift", icon: "💵", label: "Cashier Shift", permission: "pos.use", load: () => import("./cashier-shift.jsx") }
];

const loaded = new Set();
const loading = new Set();
const GLOBAL_KEY = "__smallbizOwnerModulesLoader";

function hasPermission(code) {
  return typeof window.__smallbizHasPermission === "function" && window.__smallbizHasPermission(code);
}
function nav() { return document.querySelector(".sidebar-nav"); }
function textOf(el) { return String(el?.textContent || "").replace(/\s+/g, " ").trim(); }
function normalizedLabel(value) { return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""); }
function isCanonical(el) { return Boolean(el?.dataset?.smallbizOwnerCanonical); }
function markInternal(el, item) {
  if (!el || isCanonical(el)) return;
  el.dataset.smallbizOwnerInternal = item.key;
  el.setAttribute("aria-hidden", "true");
  el.tabIndex = -1;
  el.style.setProperty("display", "none", "important");
  el.style.setProperty("pointer-events", "none", "important");
}
function findInternalButton(item) {
  const root = nav(); if (!root) return null;
  return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el => el.dataset?.smallbizOwnerInternal === item.key) || null;
}
function hideDuplicateModuleButtons(item) {
  const root = nav(); if (!root) return;
  const target = normalizedLabel(item.label);
  Array.from(root.querySelectorAll("button,a,[role='button']")).forEach(el => {
    if (isCanonical(el) || el.dataset?.smallbizOwnerInternal) return;
    if (normalizedLabel(textOf(el)) !== target) return;
    markInternal(el, item);
  });
}
function removeDuplicateCanonicalButtons(item, keep) {
  const root = nav(); if (!root) return;
  Array.from(root.querySelectorAll(`[data-smallbiz-owner-canonical='${item.key}']`)).forEach(el => { if (el !== keep) el.remove(); });
}

function bindCanonicalButton(item, button) {
  if (!button) return null;
  button.type = "button";
  button.setAttribute("aria-label", item.label);
  button.style.setProperty("pointer-events", "auto", "important");
  button.style.setProperty("touch-action", "manipulation", "important");
  button.style.setProperty("position", "relative", "important");
  button.style.setProperty("z-index", "3", "important");
  // Use the DOM onclick property so an existing canonical button is repaired
  // even when it was created by an older loader instance and its old listener
  // was lost during a React/nav remount.
  button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    loadOwnerModule(item, button);
  };
  button.dataset.smallbizOwnerBound = "v16";
  return button;
}

function ensureCanonicalButton(item) {
  const root = nav(); if (!root) return null;
  let existing = root.querySelector(`[data-smallbiz-owner-canonical='${item.key}']`);
  if (existing) {
    removeDuplicateCanonicalButtons(item, existing);
    return bindCanonicalButton(item, existing);
  }
  const button = document.createElement("button");
  button.className = "nav-item";
  button.dataset.smallbizOwnerCanonical = item.key;
  button.innerHTML = `<span aria-hidden="true">${item.icon}</span><b>${item.label}</b>`;
  const firstMatching = Array.from(root.querySelectorAll("button,a,[role='button']")).find(el => normalizedLabel(textOf(el)) === normalizedLabel(item.label) && !isCanonical(el));
  if (firstMatching) root.insertBefore(button, firstMatching); else root.appendChild(button);
  return bindCanonicalButton(item, button);
}
function removeDuplicateReports() {
  const root = nav(); if (!root) return;
  const reports = Array.from(root.querySelectorAll("button,a,[role='button']")).filter(el => normalizedLabel(textOf(el)) === "reports");
  reports.slice(1).forEach(el => el.remove());
}
function reconcileOwnerMenu() {
  const root = nav();
  if (!root || !window.__smallbizPermissionsReady) return false;
  OWNER_MENU.forEach(item => {
    if (!hasPermission(item.permission)) { root.querySelector(`[data-smallbiz-owner-canonical='${item.key}']`)?.remove(); return; }
    const canonical = ensureCanonicalButton(item);
    hideDuplicateModuleButtons(item);
    removeDuplicateCanonicalButtons(item, canonical);
  });
  removeDuplicateReports();
  return true;
}
function openLoadedModule(item) {
  if (item.key === "team" && typeof window.__smallbizOpenTeam === "function") { window.__smallbizOpenTeam(); return true; }
  const internal = findInternalButton(item);
  if (internal) { internal.click(); return true; }
  window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
  return false;
}
async function waitForInternalButton(item, timeout = 1600) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    hideDuplicateModuleButtons(item);
    const internal = findInternalButton(item);
    if (internal) return internal;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return null;
}
async function loadOwnerModule(item, button) {
  if (!hasPermission(item.permission) || loading.has(item.key)) return;
  if (loaded.has(item.key)) { openLoadedModule(item); return; }
  loading.add(item.key);
  button?.setAttribute("aria-busy", "true");
  const labelNode = button?.querySelector("b");
  if (labelNode) labelNode.textContent = `${item.label}…`;
  try {
    await item.load();
    loaded.add(item.key);
    const internal = await waitForInternalButton(item);
    reconcileOwnerMenu();
    if (internal) internal.click(); else window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
  } catch (error) {
    console.warn(`[SmallBiz] ${item.label} failed to load.`, error);
  } finally {
    button?.removeAttribute("aria-busy");
    const currentLabel = button?.querySelector("b");
    if (currentLabel) currentLabel.textContent = item.label;
    loading.delete(item.key);
  }
}
function startObserver() {
  const state = window[GLOBAL_KEY] || {};
  if (state.observer) return state.observer;
  const observer = new MutationObserver(() => { if (document.querySelector(".app-shell")) reconcileOwnerMenu(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window[GLOBAL_KEY] = { ...state, observer };
  return observer;
}
function stopObserverIfLoggedOut() {
  if (document.querySelector(".app-shell")) return;
  const state = window[GLOBAL_KEY]; state?.observer?.disconnect?.(); state?.logoutObserver?.disconnect?.();
  if (state) { state.observer = null; state.logoutObserver = null; state.started = false; }
}
export function startOwnerModules() {
  const state = window[GLOBAL_KEY] || {};
  if (state.started) { startObserver(); reconcileOwnerMenu(); return; }
  window[GLOBAL_KEY] = { ...state, started: true };
  startObserver(); reconcileOwnerMenu();
  window.addEventListener("smallbiz:permissions-ready", () => { startObserver(); reconcileOwnerMenu(); });
  const logoutObserver = new MutationObserver(stopObserverIfLoggedOut);
  logoutObserver.observe(document.documentElement, { childList: true, subtree: true });
  window[GLOBAL_KEY].logoutObserver = logoutObserver;
  if (window.__smallbizPermissionsReady && !window[GLOBAL_KEY].supportStarted) {
    window[GLOBAL_KEY].supportStarted = true;
    setTimeout(async () => { for (const load of SUPPORT_MODULES) { try { await load(); } catch (error) { console.warn("[SmallBiz] Optional POS enhancement failed.", error); } await new Promise(resolve => setTimeout(resolve, 0)); } }, 0);
  }
}
