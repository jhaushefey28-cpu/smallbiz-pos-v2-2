// SMALLBIZ NAVIGATION RUNTIME FIX V2
// Fixes three verified navigation problems without rebuilding the sidebar.
(function(){
  const tidySidebar=()=>{
    const nav=document.querySelector('.sidebar-nav');
    if(!nav)return;
    nav.querySelectorAll('[data-sidebar-key="products"]').forEach(x=>x.remove());
    const inventory=[...nav.querySelectorAll('[data-sidebar-key="inventory"]')];
    inventory.slice(1).forEach(x=>x.remove());
    const legacyInventory=document.getElementById('smallbiz-inventory-center-btn');
    if(legacyInventory)legacyInventory.style.display='none';
  };

  const closeOpenModuleOverlays=()=>{
    ['#smallbiz-team-overlay','#sb-att-overlay','.inv-overlay'].forEach(selector=>{
      document.querySelectorAll(selector).forEach(node=>node.remove());
    });
  };

  const openModule=async(key)=>{
    closeOpenModuleOverlays();
    if(key==='inventory'){
      await import('./inventory-center.jsx');
      // inventory-center.jsx owns the actual panel; its legacy sidebar button
      // is hidden and used only as the module's stable open command.
      const legacyButton=document.getElementById('smallbiz-inventory-center-btn');
      if(legacyButton)legacyButton.click();
      tidySidebar();
      return;
    }
    if(key==='team'){
      await import('./team-management.js');
      if(typeof window.__smallbizOpenTeam==='function')await window.__smallbizOpenTeam();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-team'));
      return;
    }
    if(key==='attendance'){
      await import('./attendance-runtime-bridge.js');
      await import('./attendance-center.js');
      if(typeof window.__smallbizOpenAttendance==='function')window.__smallbizOpenAttendance();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
      return;
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

  const tidy=()=>{tidySidebar();setTimeout(tidySidebar,100);setTimeout(tidySidebar,500)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tidy,{once:true});
  else tidy();
})();
