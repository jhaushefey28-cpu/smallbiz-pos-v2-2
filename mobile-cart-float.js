(() => {
  const MOBILE_MAX = 640;
  let bubble = null;
  let badge = null;
  let cartPanel = null;
  let initialized = false;

  const isMobile = () => window.matchMedia(`(max-width:${MOBILE_MAX}px)`).matches;

  function findCart() {
    return document.querySelector('.pos-layout > .right-panel');
  }

  function updateBadge() {
    if (!badge || !cartPanel) return;
    const label = cartPanel.querySelector('.right-panel-header span');
    const match = label?.textContent?.match(/\d+/);
    const count = match ? Number(match[0]) : 0;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count <= 0;
    bubble.classList.toggle('has-items', count > 0);
  }

  function closeCart() {
    document.body.classList.remove('mobile-cart-open');
    bubble?.setAttribute('aria-expanded', 'false');
  }

  function openCart() {
    document.body.classList.add('mobile-cart-open');
    bubble?.setAttribute('aria-expanded', 'true');
  }

  function toggleCart() {
    if (document.body.classList.contains('mobile-cart-open')) closeCart();
    else openCart();
  }

  function setup() {
    if (!isMobile()) {
      if (bubble) bubble.hidden = true;
      closeCart();
      return;
    }

    cartPanel = findCart();
    if (!cartPanel) return;

    if (!bubble) {
      bubble = document.createElement('button');
      bubble.type = 'button';
      bubble.className = 'mobile-cart-bubble';
      bubble.setAttribute('aria-label', 'Open shopping cart');
      bubble.setAttribute('aria-expanded', 'false');
      bubble.innerHTML = '<span class="mobile-cart-icon">🛒</span><span class="mobile-cart-badge" hidden>0</span>';
      badge = bubble.querySelector('.mobile-cart-badge');
      bubble.addEventListener('click', toggleCart);
      document.body.appendChild(bubble);
    }

    bubble.hidden = false;
    initialized = true;
    updateBadge();
  }

  function observe() {
    const observer = new MutationObserver(() => {
      if (!cartPanel || !document.body.contains(cartPanel)) setup();
      updateBadge();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('resize', setup, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-cart-open')) closeCart();
    });
  }

  function boot() {
    setup();
    observe();
    setTimeout(setup, 300);
    setTimeout(setup, 1000);
    setTimeout(setup, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
