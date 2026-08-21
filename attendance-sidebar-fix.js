// SMALLBIZ_ATTENDANCE_SIDEBAR_FIX_V1
// Adds the existing Employee / Attendance entry to the authenticated sidebar.
// Intentionally isolated: does not touch auth, POS, barcode, cart, or routing.
(function () {
  const BUTTON_ID = "smallbiz-attendance-sidebar-btn";

  function install() {
    const nav = document.querySelector(".sidebar-nav");
    if (!nav || document.getElementById(BUTTON_ID)) return !!nav;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "nav-item";
    button.innerHTML = "<span>👥</span><b>Employee / Attendance</b>";
    button.addEventListener("click", () => {
      if (typeof window.__smallbizOpenAttendance === "function") {
        window.__smallbizOpenAttendance();
        return;
      }
      window.dispatchEvent(new CustomEvent("smallbiz:open-attendance"));
    });
    nav.appendChild(button);
    return true;
  }

  function waitForSidebar() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForSidebar, { once: true });
  } else {
    waitForSidebar();
  }
})();
