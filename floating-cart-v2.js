/* SMALLBIZ_FLOATING_CART_V2
 * Mobile-only floating cart companion. Reads the existing React cart; never owns auth/cart state.
 */
(() => {
  "use strict";
  const ROOT="smallbiz-floating-cart-v2";
  let root=null,button=null,badge=null,drawer=null,body=null,observer=null;

  const money=n=>{try{return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(n||0))}catch{return `₱${Number(n||0).toFixed(2)}`}};
  const pos=()=>!!document.querySelector(".app-shell .products-panel") && !!document.querySelector(".app-shell .cart-panel");
  const cart=()=>document.querySelector(".app-shell .cart-panel");
  const count=()=>document.querySelector(".cart-panel .right-panel-header span")?.textContent?.trim()||"0 item(s)";
  const total=()=>document.querySelector(".cart-panel .grand-total b")?.textContent?.trim()||money(0);

  function build(){
    if(root)return;
    const style=document.createElement("style");
    style.id=ROOT+"-style";
    style.textContent=`
      #${ROOT}{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:inherit}
      #${ROOT} .fc-btn{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom));min-width:112px;height:58px;padding:0 14px;border:0;border-radius:18px;background:#1769e0;color:#fff;box-shadow:0 12px 32px rgba(15,23,42,.30);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:14px;pointer-events:auto;touch-action:manipulation;cursor:pointer}
      #${ROOT} .fc-badge{position:absolute;top:-7px;right:-6px;min-width:25px;height:25px;padding:0 6px;border-radius:999px;background:#ef4444;border:2px solid #fff;color:#fff;display:grid;place-items:center;font-size:11px}
      #${ROOT} .fc-drawer{position:fixed;right:9px;bottom:calc(82px + env(safe-area-inset-bottom));width:calc(100vw - 18px);max-height:76dvh;background:#fff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 22px 65px rgba(15,23,42,.28);overflow:hidden;display:none;pointer-events:auto}
      #${ROOT}.open .fc-drawer{display:flex;flex-direction:column}
      #${ROOT} .fc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb}
      #${ROOT} .fc-head strong{font-size:18px}
      #${ROOT} .fc-close{border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:18px}
      #${ROOT} .fc-body{overflow:auto;padding:0}
      #${ROOT} .fc-body .cart-panel{display:block!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;height:auto!important;max-height:none!important}
      #${ROOT} .fc-body .right-panel-header{display:none!important}
      #${ROOT} .fc-body .cart-body{max-height:38dvh;overflow:auto}
      @media(min-width:901px){#${ROOT}{display:none!important}}
    `;
    document.head.appendChild(style);
    root=document.createElement("div");root.id=ROOT;
    root.innerHTML=`<button class="fc-btn" aria-label="Open floating cart">🛒 <span>Cart</span><i class="fc-badge">0</i></button><div class="fc-drawer" role="dialog" aria-label="Floating cart"><div class="fc-head"><strong>🛒 Cart</strong><button class="fc-close" aria-label="Close">✕</button></div><div class="fc-body"></div></div>`;
    document.body.appendChild(root);
    button=root.querySelector(".fc-btn");badge=root.querySelector(".fc-badge");drawer=root.querySelector(".fc-drawer");body=root.querySelector(".fc-body");
    root.querySelector(".fc-close").onclick=()=>root.classList.remove("open");
    button.onclick=()=>{root.classList.toggle("open");refresh(true)};
  }

  function wire(copy,original){
    const oq=[...original.querySelectorAll(".qty-controls button")],cq=[...copy.querySelectorAll(".qty-controls button")];
    cq.forEach((b,i)=>b.onclick=e=>{e.preventDefault();oq[i]?.click();setTimeout(()=>refresh(true),30)});
    const op=original.querySelector(".payment-btn"),cp=copy.querySelector(".payment-btn");
    if(cp)cp.onclick=e=>{e.preventDefault();op?.click();root.classList.remove("open")};
  }

  function refresh(force=false){
    if(!root)return;
    const visible=pos();root.style.display=visible?"block":"none";
    if(!visible){root.classList.remove("open");return}
    badge.textContent=count().match(/\d+/)?.[0]||"0";
    button.title=`${count()} • ${total()}`;
    if(force||root.classList.contains("open")){
      const original=cart();
      if(original){const copy=original.cloneNode(true);body.replaceChildren(copy);wire(copy,original)}
    }
  }

  function start(){
    build();refresh(true);
    observer=new MutationObserver(()=>requestAnimationFrame(()=>refresh(false)));
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style"]});
    setInterval(()=>refresh(false),500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
