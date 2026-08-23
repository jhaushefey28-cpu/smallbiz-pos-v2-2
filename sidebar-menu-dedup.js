/*
 * SmallBiz POS — Sidebar duplicate-item guard
 *
 * Functional-only safeguard: removes duplicate sidebar/menu entries by their
 * visible label while preserving the first rendered item and all existing
 * navigation handlers/classes. No mobile layout/CSS is changed.
 *
 * This is intentionally a DOM-level guard because the current sidebar is
 * rendered by main.jsx. It only acts when duplicate entries actually exist.
 */
(function () {
  "use strict";

  const normalize = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  function dedupeSidebar() {
    const navs = Array.from(document.querySelectorAll(".sidebar-nav"));
    if (!navs.length) return;

    const seen = new Set();

    navs.forEach((nav) => {
      Array.from(nav.children).forEach((item) => {
        if (!(item instanceof HTMLElement)) return;

        const label = normalize(item.textContent);
        if (!label) return;

        if (seen.has(label)) {
          item.remove();
          return;
        }

        seen.add(label);
      });
    });
  }

  function start() {
    dedupeSidebar();

    const observer = new MutationObserver(() => dedupeSidebar());
    observer.observe(document.body, { childList: true, subtree: true });

    // Keep the observer from becoming an unnecessary long-lived global on
    // pages where the POS shell is removed completely.
    window.addEventListener("beforeunload", () => observer.disconnect(), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
