(function(){
  function addAttendanceNav(){
    const nav=document.querySelector('.sidebar-nav');
    if(!nav)return false;
    let button=nav.querySelector('[data-smallbiz-attendance-final]');
    if(button)return true;
    button=document.querySelector('[data-smallbiz-attendance]');
    if(button){
      button.dataset.smallbizAttendanceFinal='1';
      if(button.parentElement!==nav)nav.appendChild(button);
      return true;
    }
    button=document.createElement('button');
    button.type='button';
    button.className='nav-item';
    button.dataset.smallbizAttendanceFinal='1';
    button.setAttribute('aria-label','Employees / Attendance');
    button.innerHTML='<span>👥</span><b>Employees / Attendance</b>';
    button.addEventListener('click',function(){
      if(typeof window.__smallbizOpenAttendance==='function') window.__smallbizOpenAttendance();
      else window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
    });
    nav.appendChild(button);
    return true;
  }

  function bindKiosk(){
    const root=document.querySelector('#sb-att-overlay');
    if(!root)return;
    root.style.pointerEvents='auto';
    root.style.zIndex='1000000';
    const modal=root.querySelector('.sb-att-modal');
    if(modal)modal.style.pointerEvents='auto';
    root.querySelectorAll('button').forEach(b=>{b.style.pointerEvents='auto';b.style.touchAction='manipulation'});
    if(root.dataset.attendanceClickFix==='1')return;
    root.dataset.attendanceClickFix='1';

    root.addEventListener('click',async function(e){
      const b=e.target.closest('button');
      if(!b||b.disabled)return;
      const id=b.id;
      if(!['sb-att-capture','sb-att-retake','sb-att-use','sb-att-in','sb-att-out'].includes(id))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try{
        if(id==='sb-att-capture' && typeof window.__smallbizAttendanceCapture==='function') return window.__smallbizAttendanceCapture();
        if(id==='sb-att-retake' && typeof window.__smallbizAttendanceRetake==='function') return window.__smallbizAttendanceRetake();
        if(id==='sb-att-use' && typeof window.__smallbizAttendanceUse==='function') return window.__smallbizAttendanceUse();
        if(id==='sb-att-in' && typeof window.__smallbizAttendanceRecord==='function') return window.__smallbizAttendanceRecord('time_in');
        if(id==='sb-att-out' && typeof window.__smallbizAttendanceRecord==='function') return window.__smallbizAttendanceRecord('time_out');
      }catch(err){
        const m=document.querySelector('#sb-att-msg');
        if(m){m.textContent=err?.message||String(err);m.className='sb-att-msg error'}
      }
    },true);
  }

  function boot(){
    addAttendanceNav();
    const observer=new MutationObserver(function(){addAttendanceNav();bindKiosk()});
    observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;
    const timer=setInterval(function(){
      addAttendanceNav();
      bindKiosk();
      if(++tries>240)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
