(function(){
  function addAttendanceNav(){
    const nav=document.querySelector('.sidebar-nav');
    if(!nav)return false;
    let button=nav.querySelector('[data-smallbiz-attendance-final]');
    if(button)return true;
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
    const parent=nav.parentElement;
    const bottom=parent&&parent.querySelector('.sidebar-bottom');
    if(bottom&&bottom.parentElement===parent) parent.insertBefore(button,bottom);
    else nav.appendChild(button);
    return true;
  }
  function boot(){
    addAttendanceNav();
    const observer=new MutationObserver(function(){addAttendanceNav()});
    observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;
    const timer=setInterval(function(){
      if(addAttendanceNav()||++tries>240)clearInterval(timer);
    },250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
