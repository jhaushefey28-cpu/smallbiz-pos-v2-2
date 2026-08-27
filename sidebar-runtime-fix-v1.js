// SMALLBIZ SIDEBAR RUNTIME FIX V1
// Keeps the React sidebar canonical and provides a deterministic Attendance opener.
(function(){
  const ROOT='.sidebar-nav';
  const canonicalKeys=new Set();
  let busy=false;

  function normalize(){
    const root=document.querySelector(ROOT);
    if(!root)return;

    const seen=new Set();
    root.querySelectorAll(':scope > button').forEach(btn=>{
      const key=btn.dataset.sidebarKey||'';
      if(key){
        if(seen.has(key)){btn.remove();return;}
        seen.add(key);
      }
      const label=btn.querySelector('b');
      if(key==='products'&&label)label.textContent='Product';
      if(key==='inventory'&&label)label.textContent='Inventory';
    });

    // Remove legacy/injected sidebar items that are not owned by React.
    root.querySelectorAll(':scope > *').forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      if(node.matches('button[data-smallbiz-react-sidebar="true"]'))return;
      node.remove();
    });
  }

  async function openAttendance(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    if(busy)return;
    busy=true;
    try{
      const sb=window.__SMALLBIZ_SUPABASE__;
      if(sb)window.__smallbizAttendanceSupabase=sb;
      await import('./attendance-runtime-bridge.js');
      await import('./attendance-center.js');
      if(typeof window.__smallbizOpenAttendance==='function'){
        window.__smallbizOpenAttendance();
      }else{
        window.dispatchEvent(new CustomEvent('smallbiz:open-attendance'));
      }
    }catch(err){
      console.error('[SmallBiz] Employee/Attendance failed to open.',err);
      const box=document.querySelector('.error-card');
      if(box)box.innerHTML='<h2>Employee/Attendance error</h2><pre>'+String(err?.stack||err)+'</pre>';
      else alert('Employee/Attendance failed to open: '+String(err?.message||err));
    }finally{busy=false;}
  }

  function bind(){
    const root=document.querySelector(ROOT);
    if(!root)return;
    normalize();
    const attendance=root.querySelector('button[data-sidebar-key="attendance"]');
    if(attendance&&!attendance.dataset.smallbizAttendanceFix){
      attendance.dataset.smallbizAttendanceFix='true';
      attendance.addEventListener('click',openAttendance,true);
    }
  }

  const observer=new MutationObserver(()=>bind());
  const start=()=>{
    bind();
    observer.observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
