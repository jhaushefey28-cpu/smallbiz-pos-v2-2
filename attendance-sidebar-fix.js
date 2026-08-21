// SMALLBIZ_ATTENDANCE_SIDEBAR_FIX_V5
// Guarantees one Employee / Attendance entry in the existing sidebar without touching auth/POS.
(function () {
  const ID = 'smallbiz-attendance-sidebar-btn';

  function openAttendance(event) {
    event?.preventDefault?.();
    if (typeof window.__smallbizOpenAttendance === 'function') {
      window.__smallbizOpenAttendance();
      return;
    }
    window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
  }

  function isAttendanceButton(el) {
    return !!el && (
      el.id === ID ||
      el.matches?.('[data-smallbiz-attendance]') ||
      /Employees?\s*\/\s*Attendance/i.test((el.textContent || '').trim())
    );
  }

  function findAutoPrint(nav) {
    const direct = Array.from(nav.children).find(el => /Auto Print/i.test(el.textContent || ''));
    if (direct) return direct;
    const candidate = Array.from(nav.querySelectorAll('button,a,[role="button"]')).find(el => /^\s*(🖨️?\s*)?Auto Print\b/i.test(el.textContent || ''));
    return candidate?.parentElement === nav ? candidate : null;
  }

  function install() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return false;

    // Prefer an existing native attendance entry if one exists.
    let button = nav.querySelector('[data-smallbiz-attendance]');

    // Otherwise create exactly one entry. Previous V4 relied on a selector that
    // the current attendance module does not actually emit, which made the item vanish.
    if (!button) {
      button = nav.querySelector('#' + ID);
    }
    if (!button) {
      button = document.createElement('button');
      button.id = ID;
      button.type = 'button';
      button.innerHTML = '<span aria-hidden="true">👥</span><b>Employees / Attendance</b>';
      button.setAttribute('aria-label', 'Open Employee and Attendance');
      button.dataset.smallbizAttendance = '1';
      button.style.width = '100%';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';
      button.style.pointerEvents = 'auto';
      button.style.position = 'relative';
      button.style.zIndex = '2';

      const autoPrint = findAutoPrint(nav);
      if (autoPrint) nav.insertBefore(button, autoPrint);
      else nav.appendChild(button);
    }

    // Remove only additional legacy duplicates; never remove the canonical button.
    nav.querySelectorAll('#' + ID + '~ #' + ID).forEach(el => el.remove());
    nav.querySelectorAll('[data-smallbiz-attendance-legacy]').forEach(el => el.remove());

    button.type = 'button';
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.removeAttribute('disabled');
    button.onclick = openAttendance;
    button.dataset.smallbizSidebarFix = 'v5';
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
