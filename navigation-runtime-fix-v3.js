// SMALLBIZ NAVIGATION FALLBACK V1
// React remains the primary navigation owner. This listener runs in bubble phase
// and only falls back when Product & Inventory or Employee/Attendance did not
// open after the canonical React click handler had a chance to run.
(function(){
  const pending=new Set();

  const inventoryOpen=()=>Boolean(document.querySelector('.inv-overlay'));
  const attendanceOpen=()=>Boolean(document.querySelector('#sb-att-overlay'));

  async function openInventoryFallback(){
    if(pending.has('inventory')||inventoryOpen())return;
    pending.add('inventory');
    try{
      await import('./inventory-center.jsx');
      if(inventoryOpen())return;
      const button=document.getElementById('smallbiz-inventory-center-btn');
      if(button)button.click();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-inventory'));
    }catch(error){
      console.error('[SmallBiz] Product & Inventory fallback failed:',error);
    }finally{
      pending.delete('inventory');
    }
  }

  async function openAttendanceFallback(){
    if(pending.has('attendance')||attendanceOpen())return;
    pending.add('attendance');
    try{
      await import('./attendance-runtime-bridge.js');
      await import('./attendance-center.js');
      if(attendanceOpen())return;
      if(typeof window.__smallbizOpenAttendance==='function')window.__smallbizOpenAttendance();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
    }catch(error){
      console.error('[SmallBiz] Employee/Attendance fallback failed:',error);
    }finally{
      pending.delete('attendance');
    }
  }

  document.addEventListener('click',function(event){
    const button=event.target.closest?.('[data-smallbiz-react-sidebar="true"]');
    if(!button)return;
    const key=button.getAttribute('data-sidebar-key');
    if(key==='inventory')setTimeout(()=>{if(!inventoryOpen())openInventoryFallback()},250);
    if(key==='attendance')setTimeout(()=>{if(!attendanceOpen())openAttendanceFallback()},250);
  },false);
})();
