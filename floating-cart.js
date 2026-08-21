/* SMALLBIZ_FLOATING_CART_V1
 * DOM-only companion for the existing React POS cart.
 * It never owns cart state and never runs login/auth logic.
 */
(function(){
  "use strict";
  const STYLE_ID="smallbiz-floating-cart-style";
  const ROOT_ID="smallbiz-floating-cart";
  let root=null, drawer=null, button=null, countEl=null, totalEl=null, bodyEl=null;
  let observer=null, dragState=null;

  function money(n){
    try{return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(Number(n||0));}
    catch(e){return "₱"+Number(n||0).toFixed(2)}
  }
  function isPOS(){
    const active=document.querySelector(".sidebar .nav-item.active");
    if(active && /POS/i.test(active.textContent||"")) return true;
    const h=document.querySelector(".main-area .page-header h2");
    return !!h && /Point of Sale/i.test(h.textContent||"");
  }
  function getCart(){return document.querySelector(".cart-panel");}
  function getItems(){return Array.from(document.querySelectorAll(".cart-panel .cart-item"));}
  function getTotal(){
    const el=document.querySelector(".cart-panel .grand-total b");
    return el ? el.textContent.trim() : money(0);
  }
  function getCount(){
    const el=document.querySelector(".cart-panel .right-panel-header span");
    return el ? el.textContent.trim() : "0 item(s)";
  }
  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement("style");s.id=STYLE_ID;
    s.textContent=`
      #${ROOT_ID}{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:inherit}
      #${ROOT_ID} .sb-fc-button{position:fixed;right:16px;bottom:18px;min-width:76px;height:62px;border:0;border-radius:18px;background:#1769e0;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;font-weight:800;font-size:14px;cursor:grab;pointer-events:auto;touch-action:none;user-select:none}
      #${ROOT_ID} .sb-fc-button:active{cursor:grabbing}
      #${ROOT_ID} .sb-fc-badge{position:absolute;top:-7px;right:-5px;min-width:24px;height:24px;border-radius:99px;background:#ef4444;color:#fff;border:2px solid #fff;display:grid;place-items:center;font-size:11px;padding:0 5px}
      #${ROOT_ID} .sb-fc-drawer{position:fixed;right:12px;bottom:88px;width:min(390px,calc(100vw - 24px));max-height:min(72dvh,620px);background:#fff;border-radius:18px;box-shadow:0 18px 55px rgba(0,0,0,.3);overflow:hidden;display:none;pointer-events:auto;border:1px solid rgba(15,23,42,.12)}
      #${ROOT_ID}.open .sb-fc-drawer{display:flex;flex-direction:column}
      #${ROOT_ID} .sb-fc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb;background:#fff}
      #${ROOT_ID} .sb-fc-head strong{font-size:18px}
      #${ROOT_ID} .sb-fc-close{border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:18px;cursor:pointer}
      #${ROOT_ID} .sb-fc-body{overflow:auto;padding:0;background:#fff}
      #${ROOT_ID} .sb-fc-body .cart-panel{display:block!important;box-shadow:none!important;border:0!important;border-radius:0!important;margin:0!important;max-height:none!important;height:auto!important}
      #${ROOT_ID} .sb-fc-body .cart-body{max-height:38dvh;overflow:auto}
      #${ROOT_ID} .sb-fc-body .right-panel-header{display:none!important}
      #${ROOT_ID} .sb-fc-empty{padding:28px;text-align:center;color:#64748b}
      @media(max-width:600px){
        #${ROOT_ID} .sb-fc-button{right:12px;bottom:calc(14px + env(safe-area-inset-bottom));height:58px;border-radius:17px}
        #${ROOT_ID} .sb-fc-drawer{right:8px;bottom:calc(78px + env(safe-area-inset-bottom));width:calc(100vw - 16px);max-height:78dvh;border-radius:18px}
      }
      @media(min-width:900px){#${ROOT_ID} .sb-fc-button{display:none!important}#${ROOT_ID} .sb-fc-drawer{display:none!important}}
    `;
    document.head.appendChild(s);
  }
  function build(){
    if(root)return;
    injectStyle();
    root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML=`<button class="sb-fc-button" aria-label="Open cart">🛒 <span>Cart</span><i class="sb-fc-badge">0</i></button><div class="sb-fc-drawer" role="dialog" aria-label="Floating cart"><div class="sb-fc-head"><strong>🛒 Cart</strong><button class="sb-fc-close" aria-label="Close cart">✕</button></div><div class="sb-fc-body"></div></div>`;
    document.body.appendChild(root);
    button=root.querySelector(".sb-fc-button");countEl=root.querySelector(".sb-fc-badge");totalEl=null;bodyEl=root.querySelector(".sb-fc-body");drawer=root.querySelector(".sb-fc-drawer");
    root.querySelector(".sb-fc-close").addEventListener("click",()=>root.classList.remove("open"));
    button.addEventListener("click",()=>{
      if(dragState?.moved){dragState.moved=false;return}
      root.classList.toggle("open");refresh(true);
    });
    enableDrag();
  }
  function refresh(force){
    if(!root)return;
    const visible=isPOS() && !!getCart();
    root.style.display=visible?"block":"none";
    if(!visible){root.classList.remove("open");return}
    const c=getCount().match(/\d+/)?.[0]||"0";
    countEl.textContent=c;
    button.title=`Cart: ${getCount()} • ${getTotal()}`;
    if(root.classList.contains("open")||force){
      const original=getCart();
      if(original){
        const copy=original.cloneNode(true);
        copy.removeAttribute("id");
        bodyEl.innerHTML="";
        bodyEl.appendChild(copy);
        wireMirror(copy,original);
      }
    }
  }
  function wireMirror(copy,original){
    const originalQty=Array.from(original.querySelectorAll(".qty-controls button"));
    const copyQty=Array.from(copy.querySelectorAll(".qty-controls button"));
    copyQty.forEach((b,i)=>b.addEventListener("click",()=>originalQty[i]?.click()));
    const originalRecent=Array.from(original.querySelectorAll(".recent-panel button"));
    const copyRecent=Array.from(copy.querySelectorAll(".recent-panel button"));
    copyRecent.forEach((b,i)=>b.addEventListener("click",()=>originalRecent[i]?.click()));
    const originalPay=original.querySelector(".payment-btn");
    const copyPay=copy.querySelector(".payment-btn");
    if(copyPay)copyPay.addEventListener("click",()=>originalPay?.click());
  }
  function enableDrag(){
    let sx=0,sy=0,ox=0,oy=0;
    const down=e=>{
      const p=e.touches?e.touches[0]:e;sx=p.clientX;sy=p.clientY;const r=button.getBoundingClientRect();ox=r.left;oy=r.top;dragState={moved:false};
      const move=ev=>{const q=ev.touches?ev.touches[0]:ev;const dx=q.clientX-sx,dy=q.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)dragState.moved=true;const x=Math.max(4,Math.min(window.innerWidth-r.width-4,ox+dx));const y=Math.max(4,Math.min(window.innerHeight-r.height-4,oy+dy));button.style.left=x+"px";button.style.top=y+"px";button.style.right="auto";button.style.bottom="auto";if(ev.cancelable)ev.preventDefault()};
      const up=()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",move);window.removeEventListener("touchend",up)};
      window.addEventListener("mousemove",move,{passive:false});window.addEventListener("mouseup",up);window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",up);
    };
    button.addEventListener("mousedown",down);button.addEventListener("touchstart",down,{passive:false});
  }
  function start(){
    build();refresh(true);
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{window.requestAnimationFrame(()=>refresh(false))});
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
    setInterval(()=>refresh(false),700);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
