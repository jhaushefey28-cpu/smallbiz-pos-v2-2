// SMALLBIZ NAVIGATION RUNTIME FIX V1
// One navigation owner for legacy external modules. This deliberately does not
// observe/rebuild the sidebar; it only removes duplicate Product/Inventory
// entries and routes the three affected module buttons directly.
(function(){
  const removeDuplicateInventoryEntries=()=>{
    const nav=document.querySelector('.sidebar-nav');
    if(!nav)return;
    const inventory=[...nav.querySelectorAll('[data-sidebar-key="inventory"]')];
    inventory.slice(1).forEach(x=>x.remove());
    nav.querySelectorAll('[data-sidebar-key="products"]').forEach(x=>x.remove());
  };

  const closeOpenModuleOverlays=()=>{
    ['#smallbiz-team-overlay','#sb-att-overlay','.inv-overlay'].forEach(selector=>{
      document.querySelectorAll(selector).forEach(node=>node.remove());
    });
  };

  const openModule=async(key)=>{
    closeOpenModuleOverlays();
    if(key==='team'){
      await import('./team-management.js');
      if(typeof window.__smallbizOpenTeam==='function') window.__smallbizOpenTeam();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-team'));
      return;
    }
    if(key==='attendance'){
      const app=window.__SMALLBIZ_REACT_SUPABASE__||window.__SMALLBIZ_SUPABASE__;
      if(app)window.__SMALLBIZ_SUPABASE__=app;
      await import('./attendance-runtime-bridge.js');
      await import('./attendance-center.js');
      if(typeof window.__smallbizOpenAttendance==='function') window.__smallbizOpenAttendance();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
      return;
    }
    if(key==='inventory'){
      await import('./inventory-center.jsx');
      window.dispatchEvent(new CustomEvent('smallbiz:open-inventory'));
    }
  };

  document.addEventListener('click',function(event){
    const button=event.target.closest?.('[data-smallbiz-react-sidebar="true"]');
    if(!button)return;
    const key=button.getAttribute('data-sidebar-key');
    if(!['inventory','team','attendance'].includes(key))return;
    event.preventDefault();
    event.stopPropagation();
    openModule(key).catch(error=>console.error('[SmallBiz] Navigation module failed:',key,error));
  },true);

  const tidy=()=>removeDuplicateInventoryEntries();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tidy,{once:true});
  else tidy();
  setTimeout(tidy,50);
  setTimeout(tidy,250);
})();
