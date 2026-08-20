(() => {
  const MOBILE_MAX = 640;
  const POS_KEY = 'smallbiz_mobile_cart_position_v1';
  let bubble = null, badge = null, cartPanel = null, drag = null;
  const isMobile = () => window.matchMedia(`(max-width:${MOBILE_MAX}px)`).matches;
  const findCart = () => document.querySelector('.pos-layout > .right-panel');
  function updateBadge(){if(!badge||!cartPanel)return;const label=cartPanel.querySelector('.right-panel-header span');const m=label?.textContent?.match(/\d+/);const count=m?Number(m[0]):0;badge.textContent=count>99?'99+':String(count);badge.hidden=count<=0;bubble.classList.toggle('has-items',count>0)}
  function closeCart(){document.body.classList.remove('mobile-cart-open');bubble?.setAttribute('aria-expanded','false')}
  function openCart(){document.body.classList.add('mobile-cart-open');bubble?.setAttribute('aria-expanded','true')}
  function toggleCart(){document.body.classList.contains('mobile-cart-open')?closeCart():openCart()}
  function clamp(x,y){const w=bubble?.offsetWidth||58,h=bubble?.offsetHeight||58;return{x:Math.max(6,Math.min(innerWidth-w-6,x)),y:Math.max(6,Math.min(innerHeight-h-6,y))}}
  function saved(){if(!bubble)return;try{const p=JSON.parse(localStorage.getItem(POS_KEY)||'null');if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){const q=clamp(p.x,p.y);bubble.style.left=q.x+'px';bubble.style.top=q.y+'px';bubble.style.right='auto';bubble.style.bottom='auto'}}catch{}}
  function down(e){if(!isMobile()||!bubble||(e.pointerType==='mouse'&&e.button!==0))return;const r=bubble.getBoundingClientRect();drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:r.left,y:r.top,moved:false};bubble.setPointerCapture?.(e.pointerId)}
  function move(e){if(!drag||e.pointerId!==drag.id||!bubble)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;if(!drag.moved)return;const p=clamp(drag.x+dx,drag.y+dy);bubble.style.left=p.x+'px';bubble.style.top=p.y+'px';bubble.style.right='auto';bubble.style.bottom='auto';e.preventDefault()}
  function up(e){if(!drag||e.pointerId!==drag.id||!bubble)return;const moved=drag.moved;if(moved){const r=bubble.getBoundingClientRect(),p=clamp(r.left,r.top);bubble.style.left=p.x+'px';bubble.style.top=p.y+'px';bubble.style.right='auto';bubble.style.bottom='auto';try{localStorage.setItem(POS_KEY,JSON.stringify(p))}catch{}bubble.dataset.dragged='1';setTimeout(()=>{if(bubble)bubble.dataset.dragged='0'},0)}drag=null}
  function click(e){if(bubble?.dataset.dragged==='1'){e.preventDefault();e.stopPropagation();return}toggleCart()}
  function setup(){if(!isMobile()){if(bubble)bubble.hidden=true;closeCart();return}cartPanel=findCart();if(!cartPanel)return;if(!bubble){bubble=document.createElement('button');bubble.type='button';bubble.className='mobile-cart-bubble';bubble.setAttribute('aria-label','Open shopping cart');bubble.setAttribute('aria-expanded','false');bubble.innerHTML='<span class="mobile-cart-icon">🛒</span><span class="mobile-cart-badge" hidden>0</span>';badge=bubble.querySelector('.mobile-cart-badge');bubble.addEventListener('click',click);bubble.addEventListener('pointerdown',down,{passive:true});bubble.addEventListener('pointermove',move,{passive:false});bubble.addEventListener('pointerup',up,{passive:true});bubble.addEventListener('pointercancel',up,{passive:true});document.body.appendChild(bubble);saved()}bubble.hidden=false;updateBadge()}
  function boot(){setup();const observer=new MutationObserver(()=>{if(!cartPanel||!document.body.contains(cartPanel))setup();updateBadge()});observer.observe(document.body,{childList:true,subtree:true,characterData:true});addEventListener('resize',setup,{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('mobile-cart-open'))closeCart()});setTimeout(setup,300);setTimeout(setup,1000);setTimeout(setup,2000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
