// SMALLBIZ INVENTORY OPEN BRIDGE V3
// React owns sidebar navigation. This bridge only completes the existing
// Product & Inventory event flow after the legacy module is lazy-loaded.
(function(){
  window.addEventListener('smallbiz:open-inventory', async function(){
    try{
      await import('./inventory-center.jsx');
      const started=Date.now();
      const waitForLegacyButton=()=>{
        const button=document.getElementById('smallbiz-inventory-center-btn');
        if(button){button.click();return;}
        if(Date.now()-started<3000)setTimeout(waitForLegacyButton,25);
      };
      waitForLegacyButton();
    }catch(error){console.error('[SmallBiz] Inventory module failed to open:',error);}
  });
})();
