(() => {
  const ID='smallbiz-growth-center-button';
  const LABEL='Growth Center';
  const EVENT='smallbiz:open-growth-center';
  function makeClickable(button){if(!button)return;button.type='button';button.classList.add('growth-center-persistent');button.style.setProperty('position','relative','important');button.style.setProperty('z-index','999999','important');button.style.setProperty('pointer-events','auto','important');button.setAttribute('aria-label',LABEL);button.dataset.growthCenterButton='true';}
  function open(){
    try{
      if(typeof window.__smallbizOpenGrowthCenter==='function'){window.__smallbizOpenGrowthCenter();return;}
      window.dispatchEvent(new CustomEvent(EVENT));
    }catch(e){window.dispatchEvent(new CustomEvent(EVENT));}
  }
  document.addEventListener('click',event=>{const button=event.target?.closest?.(`#${ID}`);if(!button)return;event.preventDefault();event.stopPropagation();open();},true);
  function attach(){const nav=document.querySelector('.sidebar-nav');if(!nav)return;let button=document.getElementById(ID);if(button&&button.parentElement!==nav){button.remove();button=null;}if(!button){button=document.createElement('button');button.id=ID;button.type='button';button.className='nav-item growth-center-persistent';button.innerHTML='<span>🚀</span><b>'+LABEL+'</b>';nav.appendChild(button);}makeClickable(button);}
  let observedNav=null,navObserver=null;
  const bodyObserver=new MutationObserver(()=>{const nav=document.querySelector('.sidebar-nav');if(nav!==observedNav){observedNav=nav;navObserver?.disconnect();if(nav){navObserver=new MutationObserver(attach);navObserver.observe(nav,{childList:true,subtree:true});}}attach();});
  bodyObserver.observe(document.body,{childList:true,subtree:true});
  const timer=setInterval(attach,500);attach();
  window.addEventListener('beforeunload',()=>{clearInterval(timer);bodyObserver.disconnect();navObserver?.disconnect();});
})();
