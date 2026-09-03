// SMALLBIZ NAVIGATION EXTERNAL-MODULE BRIDGE V5
// React remains the primary navigation owner. This bridge does not intercept clicks
// or mutate the sidebar. It only completes the existing open flow for external
// modules after React has had a chance to handle the click.
(function(){
  const pending=new Set();
  const inventoryOpen=()=>Boolean(document.querySelector('.inv-overlay'));
  const attendanceOpen=()=>Boolean(document.querySelector('#sb-att-overlay'));
  const cashierOpen=()=>Boolean(document.querySelector('.shift-overlay'));

  async function openInventory(){
    if(pending.has('inventory')||inventoryOpen())return;
    pending.add('inventory');
    try{
      await import('./inventory-center.jsx');
      if(inventoryOpen())return;
      const started=Date.now();
      const waitForLegacyOpen=()=>{
        if(inventoryOpen())return;
        const button=document.getElementById('smallbiz-inventory-center-btn');
        if(button){button.click();return;}
        if(Date.now()-started<5000)setTimeout(waitForLegacyOpen,50);
        else console.error('[SmallBiz] Product & Inventory module loaded but its open control was not created.');
      };
      waitForLegacyOpen();
    }catch(error){console.error('[SmallBiz] Product & Inventory open failed:',error)}
    finally{pending.delete('inventory')}
  }

  async function openAttendance(){
    if(pending.has('attendance')||attendanceOpen())return;
    pending.add('attendance');
    try{
      await import('./attendance-runtime-bridge.js');
      await import('./attendance-center.js');
      if(attendanceOpen())return;
      const started=Date.now();
      const finish=()=>{
        if(attendanceOpen())return;
        if(typeof window.__smallbizOpenAttendance==='function'){window.__smallbizOpenAttendance();return}
        if(Date.now()-started<5000)setTimeout(finish,25);
        else console.error('[SmallBiz] Employee/Attendance module loaded but its open control was not created.');
      };
      finish();
    }catch(error){console.error('[SmallBiz] Employee/Attendance open failed:',error)}
    finally{pending.delete('attendance')}
  }

  async function openCashier(){
    if(pending.has('cashier')||cashierOpen())return;
    pending.add('cashier');
    try{
      await import('./cashier-shift.jsx');
      if(cashierOpen())return;
      const started=Date.now();
      const finish=()=>{
        if(cashierOpen())return;
        if(typeof window.__smallbizOpenCashierShift==='function'){window.__smallbizOpenCashierShift();return}
        if(Date.now()-started<5000)setTimeout(finish,25);
        else console.error('[SmallBiz] Cashier Shift module loaded but its open control was not created.');
      };
      finish();
    }catch(error){console.error('[SmallBiz] Cashier Shift open failed:',error)}
    finally{pending.delete('cashier')}
  }

  document.addEventListener('click',function(event){
    const button=event.target.closest?.('[data-smallbiz-react-sidebar="true"]');
    if(!button)return;
    const key=button.getAttribute('data-sidebar-key');
    if(key==='inventory')setTimeout(()=>{if(!inventoryOpen())openInventory()},250);
    if(key==='attendance')setTimeout(()=>{if(!attendanceOpen())openAttendance()},250);
    if(key==='cashier-shift')setTimeout(()=>{if(!cashierOpen())openCashier()},150);
  },false);
})();
