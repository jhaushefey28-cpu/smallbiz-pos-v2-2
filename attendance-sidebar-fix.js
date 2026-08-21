// SMALLBIZ_ATTENDANCE_SIDEBAR_FIX_V2
// Connects the existing Employee / Attendance sidebar entry to the existing
// attendance-center module without touching auth, POS, barcode, cart, or routing.
(function () {
  const BUTTON_ID = "smallbiz-attendance-sidebar-btn";

  async function openAttendance(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      if (typeof window.__smallbizOpenAttendance === "function") {
        window.__smallbizOpenAttendance();
        return;
      }
      // The attendance module may still be finishing its post-auth load.
      await import("./attendance-center.js");
      if (typeof window.__smallbizOpenAttendance === "function") {
        window.__smallbizOpenAttendance();
        return;
      }
      window.dispatchEvent(new CustomEvent("smallbiz:open-attendance"));
    } catch (error) {
      console.error("[SmallBiz] Unable to open Employee / Attendance:", error);
    }
  }

  function install() {
    const nav = document.querySelector(".sidebar-nav");
    if (!nav) return false;

    let button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = document.createElement("button");
      button.id = BUTTON_ID;
      button.type = "button";
      button.className = "nav-item";
      button.innerHTML = "<span>👥</span><b>Employee / Attendance</b>";
      nav.appendChild(button);
    }

    button.style.pointerEvents = "auto";
    button.style.position = "relative";
    button.style.zIndex = "5";
    button.style.cursor = "pointer";

    if (button.dataset.smallbizBound !== "1") {
      button.addEventListener("click", openAttendance, true);
      button.dataset.smallbizBound = "1";
    }
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
