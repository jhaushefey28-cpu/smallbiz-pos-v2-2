(() => {
  const ID = 'smallbiz-growth-center-button';
  const LABEL = 'Growth Center';
  function attach() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const existing = document.getElementById(ID);
    if (existing && existing.parentElement === nav) return;
    if (existing) existing.remove();
    const b = document.createElement('button');
    b.id = ID;
    b.type = 'button';
    b.className = 'nav-item growth-center-persistent';
    b.innerHTML = '<span>🚀</span><b>' + LABEL + '</b>';
    b.addEventListener('click', () => window.dispatchEvent(new CustomEvent('smallbiz:open-growth-center')));
    nav.appendChild(b);
  }
  let lastNav = null;
  const observe = new MutationObserver(() => {
    const nav = document.querySelector('.sidebar-nav');
    if (nav !== lastNav) {
      lastNav = nav;
      if (nav) new MutationObserver(attach).observe(nav, {childList:true, subtree:true});
    }
    attach();
  });
  observe.observe(document.body, {childList:true, subtree:true});
  const timer = setInterval(attach, 500);
  attach();
  window.addEventListener('beforeunload', () => { clearInterval(timer); observe.disconnect(); });
})();
