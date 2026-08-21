// SMALLBIZ_ATTENDANCE_SIDEBAR_FIX_V3
// Uses the sidebar entry created by attendance-center.js instead of creating a second button.
// This keeps the existing sidebar architecture intact and does not touch auth/POS.
(function () {
  const NATIVE_SELECTOR = '.sidebar-nav [data-smallbiz-attendance]';

  async function openAttendance(event) {
    event?.preventDefault?.();
    try {
      if (typeof window.__smallbizOpenAttendance === 'function') {
        window.__smallbizOpenAttendance();
        return;
      }
      await import('./attendance-center.js');
      if (typeof window.__smallbizOpenAttendance === 'function') {
        window.__smallbizOpenAttendance();
        return;
      }
      window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
    } catch (error) {
      console.error('[SmallBiz] Unable to open Employee / Attendance:', error);
    }
  }

  function install() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return false;

    // Remove the old injected duplicate from V2 if it exists.
    document.getElementById('smallbiz-attendance-sidebar-btn')?.remove();

    // attendance-center.js already creates the correct native sidebar entry.
    const button = nav.querySelector(NATIVE_SELECTOR);
    if (!button) return false;

    button.type = 'button';
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.removeAttribute('disabled');

    if (button.dataset.smallbizSidebarFix !== 'v3') {
      button.onclick = openAttendance;
      button.dataset.smallbizSidebarFix = 'v3';
    }
    return true;
  }

  function waitForSidebar() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 20000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSidebar, { once: true });
  } else {
    waitForSidebar();
  }
})();
