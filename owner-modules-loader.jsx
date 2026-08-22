// SMALLBIZ_OWNER_MODULES_LOADER_V6
// Lazy owner-module loader. Sidebar entries render immediately; heavy modules load only on click.
// Core POS/auth is never blocked by optional owner modules.
let started = false;

import "./attendance-center.css";
import "./attendance-log-enhancement.css";
import "./employee-attendance.css";

const SUPPORT_MODULES = [
  () => import("./reprint-modal-fix.js"),
  () => import("./void-reason-enhancement.js"),
  () => import("./transaction-audit-enhancement.js")
];

const OWNER_MENU = [
  { key: "team", icon: "👥", label: "Team", patterns: [/^Team$/i], load: () => import("./team-management.js") },
  { key: "channels", icon: "🌐", label: "Online Channels", patterns: [/Online Channels/i], load: () => import("./sales-channels.jsx") },
  { key: "marketplace-connections", icon: "🔌", label: "Marketplace Connections", patterns: [/Marketplace Connections/i], load: () => import("./marketplace-connections.jsx") },
  { key: "marketplace-stock", icon: "📦", label: "Marketplace Stock", patterns: [/Marketplace Stock/i], load: () => import("./marketplace-stock-reservation.jsx") },
  { key: "marketplace-fulfillment", icon: "🚚", label: "Marketplace Fulfillment", patterns: [/Marketplace Fulfillment/i], load: () => import("./marketplace-fulfillment.jsx") },
  { key: "reports", icon: "📊", label: "Reports", patterns: [/^Reports$/i], load: () => import("./reports-center.js") },
  { key: "business-controls", icon: "⚙️", label: "Business Controls", patterns: [/Business Controls/i], load: () => import("./business-controls.jsx") },
  { key: "inventory", icon: "📦", label: "Inventory", patterns: [/^Inventory$/i], load: () => import("./inventory-center.jsx") },
  { key: "growth", icon: "📈", label: "Growth", patterns: [/^Growth$/i], load: () => import("./growth-center.jsx") },
  { key: "cashier-shift", icon: "💵", label: "Cashier Shift", patterns: [/Cashier Shift/i], load: () => import("./cashier-shift.jsx") }
];

const loaded = new Set();
const loading = new Set();

const yieldToBrowser = (callback) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 300 });
  } else {
    setTimeout(callback, 0);
  }
};

function nav() { return document.querySelector(".sidebar-nav"); }
function textOf(el) { return String(el?.textContent || "").replace(/\s+/g, " ").trim(); }

function findNativeButton(item) {
  const root = nav();
  if (!root) return null;
  return Array.from(root.querySelectorAll("button,a,[role='button']")).find(el => {
    if (el.dataset?.smallbizLazyOwner) return false;
    const text = textOf(el);
    return item.patterns.some(pattern => pattern.test(text));
  }) || null;
}

function openLoadedModule(item) {
  const native = findNativeButton(item);
  if (native) { native.click(); return; }
  window.dispatchEvent(new CustomEvent(`smallbiz:open-${item.key}`));
}

async function loadOwnerModule(item, placeholder) {
  if (loading.has(item.key)) return;
  if (loaded.has(item.key)) { openLoadedModule(item); return; }
  loading.add(item.key);
  placeholder.dataset.loading = "1";
  placeholder.querySelector("b")?.replaceChildren(document.createTextNode(`${item.label}…`));
  try {
    await item.load();
    loaded.add(item.key);
    placeholder.remove();
    setTimeout(() => openLoadedModule(item), 40);
  } catch (error) {
    console.warn(`[SmallBiz] ${item.label} failed to load.`, error);
    placeholder.dataset.loading = "0";
    placeholder.querySelector("b")?.replaceChildren(document.createTextNode(item.label));
  } finally { loading.delete(item.key); }
}

function ensureOwnerMenu() {
  const root = nav();
  if (!root) return false;
  OWNER_MENU.forEach(item => {
    if (findNativeButton(item)) return;
    if (root.querySelector(`[data-smallbiz-lazy-owner='${item.key}']`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.smallbizLazyOwner = item.key;
    button.innerHTML = `<span aria-hidden="true">${item.icon}</span><b>${item.label}</b>`;
    button.setAttribute("aria-label", item.label);
    button.addEventListener("click", () => loadOwnerModule(item, button));
    root.appendChild(button);
  });
  return true;
}

async function loadAttendance() {
  try {
    await import("./attendance-runtime-bridge.js");
    await import("./attendance-center.js");
    await import("./employee-attendance.js");
    await import("./attendance-sidebar-fix.js");
  } catch (error) { console.warn("[SmallBiz] Attendance module failed; core app remains active.", error); }
}

function observeSidebarOnce() {
  if (ensureOwnerMenu()) return;
  const observer = new MutationObserver(() => { if (ensureOwnerMenu()) observer.disconnect(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
}

export function startOwnerModules() {
  if (started) return;
  started = true;
  observeSidebarOnce();
  loadAttendance();
  yieldToBrowser(async () => {
    for (const load of SUPPORT_MODULES) {
      try { await load(); } catch (error) { console.warn("[SmallBiz] Optional POS enhancement failed.", error); }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  });
}
