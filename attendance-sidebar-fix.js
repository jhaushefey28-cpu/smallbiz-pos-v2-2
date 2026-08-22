// SMALLBIZ_ATTENDANCE_SIDEBAR_FIX_V6
// Tenant-permission aware Employee / Attendance sidebar entry.
(function () {
  const ID = 'smallbiz-attendance-sidebar-btn';

  function hasPermission() {
    return typeof window.__smallbizHasPermission === 'function' && window.__smallbizHasPermission('attendance.view');
  }

  function openAttendance(event) {
    event?.preventDefault?.();
    if (!hasPermission()) return;
    if (typeof window.__smallbizOpenAttendance === 'function') {
      window.__smallbizOpenAttendance();
      return;
    }
    window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
  }

  function findAutoPrint(nav) {
    const direct = Array.from(nav.children).find(el => /Auto Print/i.test(el.textContent || ''));
    if (direct) return direct;
    const candidate = Array.from(nav.querySelectorAll('button,a,[role="button"]')).find(el => /^\s*(🖨️?\s*)?Auto Print\b/i.test(el.textContent || ''));
    return candidate?.parentElement === nav ? candidate : null;
  }

  function install() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || !window.__smallbizPermissionsReady) return false;

    const existing = nav.querySelector('#' + ID + ',[data-smallbiz-attendance]');
    if (!hasPermission()) {
      existing?.remove();
      return true;
    }

    let button = existing;
    if (!button) {
      button = document.createElement('button');
      button.id = ID;
      button.type = 'button';
      button.className = 'nav-item';
      button.innerHTML = '<span aria-hidden="true">👥</span><b>Employees / Attendance</b>';
      button.setAttribute('aria-label', 'Open Employee and Attendance');
      button.dataset.smallbizAttendance = '1';
      const autoPrint = findAutoPrint(nav);
      if (autoPrint) nav.insertBefore(button, autoPrint);
      else nav.appendChild(button);
    }

    nav.querySelectorAll('[data-smallbiz-attendance-legacy]').forEach(el => el.remove());
    button.type = 'button';
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.removeAttribute('disabled');
    button.onclick = openAttendance;
    button.dataset.smallbizSidebarFix = 'v6';
    return true;
  }

  function waitForSidebar() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('smallbiz:permissions-ready', () => install(), { once: true });
    setTimeout(() => observer.disconnect(), 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForSidebar, { once: true });
  else waitForSidebar();
})();
