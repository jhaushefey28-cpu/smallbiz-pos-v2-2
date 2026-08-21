// SMALLBIZ_ATTENDANCE_SIDEBAR_FIX_V4
// Reuses the native attendance button, places it inside the existing sidebar flow,
// and never creates a second sidebar entry.
(function () {
  const NATIVE_SELECTOR = '.sidebar-nav [data-smallbiz-attendance]';

  function openAttendance(event) {
    event?.preventDefault?.();
    if (typeof window.__smallbizOpenAttendance === 'function') {
      window.__smallbizOpenAttendance();
      return;
    }
    window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
  }

  function install() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return false;

    // Remove only legacy injected duplicates; preserve the native module button.
    document.getElementById('smallbiz-attendance-sidebar-btn')?.remove();
    nav.querySelectorAll('[data-smallbiz-attendance-legacy]').forEach(el => el.remove());

    const button = nav.querySelector(NATIVE_SELECTOR);
    if (!button) return false;

    button.type = 'button';
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.removeAttribute('disabled');

    // Put Employee / Attendance before Auto Print (the last utility control),
    // instead of appending it after the whole sidebar.
    const autoPrint = Array.from(nav.children).find(el => /Auto Print/i.test(el.textContent || ''));
    if (autoPrint && button.parentElement === nav && button !== autoPrint.previousElementSibling) {
      nav.insertBefore(button, autoPrint);
    }

    if (button.dataset.smallbizSidebarFix !== 'v4') {
      button.onclick = openAttendance;
      button.dataset.smallbizSidebarFix = 'v4';
      button.setAttribute('aria-label', 'Open Employee and Attendance');
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
