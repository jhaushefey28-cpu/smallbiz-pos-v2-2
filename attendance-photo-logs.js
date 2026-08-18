(function(){
  const SUPABASE_URL='https://fnuncwcsliojhgkmmhwo.supabase.co';
  const SUPABASE_KEY='sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe';
  let patching=false, logBuildTimer=null, logsBody=null, renderingLogs=false;
  const esc=v=>String(v??'').replace(/[&<>\'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[m]));
  const fmt=v=>v?new Date(v).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}):'—';
  const fmtDate=v=>v?new Date(v+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'2-digit'}):'—';

  async function compressPhoto(dataUrl){
    try{
      const img=new Image(); img.src=dataUrl;
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
      const maxW=480,maxH=360,scale=Math.min(1,maxW/img.width,maxH/img.height);
      const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
      c.getContext('2d').drawImage(img,0,0,c.width,c.height); return c.toDataURL('image/jpeg',.68);
    }catch(_){return dataUrl;}
  }

  function installRpcPatch(){
    if(patching||!window.supabase?.createClient)return;
    patching=true;
    const original=window.supabase.createClient;
    window.supabase.createClient=function(...args){
      const client=original.apply(this,args),rpc=client.rpc.bind(client);
      client.rpc=async function(fn,params){
        if(fn==='record_face_attendance'&&params&&typeof params==='object'){
          const preview=document.querySelector('#sb-att-preview');
          const photo=preview&&!preview.hidden&&preview.src&&preview.src.startsWith('data:image/')?await compressPhoto(preview.src):null;
          params={...params,p_photo_data:photo};
        }
        return rpc(fn,params);
      };
      return client;
    };
  }

  function client(){return window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY)}
  async function profile(c){
    const {data:{session}}=await c.auth.getSession(); if(!session)throw new Error('Please login first.');
    const {data:p,error}=await c.from('profiles').select('business_id,role,active').eq('id',session.user.id).single();
    if(error)throw error; if(!p?.active)throw new Error('Inactive account.');
    if(!['owner','admin','manager'].includes(String(p.role||'').toLowerCase()))throw new Error('Only Owner, Admin, or Manager can view attendance logs.');
    return p;
  }

  function photoCell(src,label){return src?`<button type="button" class="sb-att-photo-btn" data-photo="${src}" aria-label="View ${label} photo"><img class="sb-att-log-photo" src="${src}" alt="${label} photo" loading="lazy"></button>`:'<span class="sb-att-no-photo">—</span>'}

  function buildLogsUI(body){
    if(!body||renderingLogs)return;
    renderingLogs=true; logsBody=body;
    body.innerHTML=`
      <div class="sb-att-log-toolbar">
        <div class="sb-att-log-title"><h3>Attendance Logs</h3><p>Backtrack by date and export the selected records.</p></div>
        <div class="sb-att-log-actions">
          <label>From<input id="sb-att-log-from" type="date"></label>
          <label>To<input id="sb-att-log-to" type="date"></label>
          <button id="sb-att-log-load" class="primary-log-btn">🔎 View</button>
          <button id="sb-att-log-today">Today</button>
          <button id="sb-att-log-excel" class="excel-log-btn">📊 Excel</button>
        </div>
      </div>
      <div class="sb-att-log-calendar-wrap">
        <div class="sb-att-calendar-card">
          <div class="sb-att-calendar-head"><button id="sb-att-cal-prev">‹</button><strong id="sb-att-cal-title"></strong><button id="sb-att-cal-next">›</button></div>
          <div class="sb-att-calendar-grid" id="sb-att-calendar-grid"></div>
        </div>
      </div>
      <div id="sb-att-log-table-wrap" class="sb-att-table"></div>`;
    renderingLogs=false;

    const $=s=>body.querySelector(s),now=new Date(),today=now.toISOString().slice(0,10),weekAgo=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);
    $('#sb-att-log-from').value=weekAgo; $('#sb-att-log-to').value=today;
    let currentMonth=new Date(now.getFullYear(),now.getMonth(),1),lastRows=[];

    function renderCalendar(){
      const y=currentMonth.getFullYear(),m=currentMonth.getMonth(),grid=$('#sb-att-calendar-grid'); if(!grid)return;
      $('#sb-att-cal-title').textContent=currentMonth.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
      const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),sf=$('#sb-att-log-from').value,st=$('#sb-att-log-to').value;
      let h=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-week">${x}</div>`).join('');
      for(let i=0;i<first;i++)h+='<div class="cal-day empty"></div>';
      for(let d=1;d<=days;d++){const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,sel=sf&&st&&iso>=sf&&iso<=st;h+=`<button type="button" class="cal-day${sel?' selected':''}" data-date="${iso}">${d}</button>`;}
      grid.innerHTML=h;
      grid.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{$('#sb-att-log-from').value=b.dataset.date;$('#sb-att-log-to').value=b.dataset.date;load();});
    }

    function renderRows(rows){
      lastRows=rows||[]; const wrap=$('#sb-att-log-table-wrap'); if(!wrap)return;
      wrap.innerHTML=lastRows.length?`<table><thead><tr><th>In Photo</th><th>Out Photo</th><th>Date</th><th>Employee</th><th>No.</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Method</th></tr></thead><tbody>${lastRows.map(x=>`<tr><td>${photoCell(x.time_in_photo_data||x.photo_data,'Time In')}</td><td>${photoCell(x.time_out_photo_data,'Time Out')}</td><td>${fmtDate(x.attendance_date)}</td><td><b>${esc(x.employee_name)}</b></td><td>${esc(x.employee_no||'—')}</td><td>${fmt(x.time_in)}</td><td>${fmt(x.time_out)}</td><td>${Number(x.regular_hours||0).toFixed(2)}</td><td>${esc(x.recognition_method||'manual')}</td></tr>`).join('')}</tbody></table>`:'<div class="sb-att-empty">No attendance records for the selected date range.</div>';
      wrap.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>showPhoto(b.dataset.photo));
    }

    function showPhoto(src){
      const old=document.querySelector('#sb-att-photo-preview-modal'); if(old)old.remove();
      const m=document.createElement('div');m.id='sb-att-photo-preview-modal';m.innerHTML=`<div class="sb-att-photo-preview-backdrop"><div class="sb-att-photo-preview-card"><button type="button" class="sb-att-photo-preview-close">✕</button><img src="${src}" alt="Attendance photo preview"></div></div>`;document.body.appendChild(m);
      m.querySelector('button').onclick=()=>m.remove();m.querySelector('.sb-att-photo-preview-backdrop').onclick=e=>{if(e.target===e.currentTarget)m.remove();};
    }

    function loadXlsx(){return new Promise((resolve,reject)=>{if(window.XLSX)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Excel export library failed to load.'));document.head.appendChild(s);});}
    function exportExcel(){
      if(!lastRows.length){alert('No attendance records to export.');return;}
      if(!window.XLSX){loadXlsx().then(exportExcel);return;}
      const data=lastRows.map(x=>({'Date':x.attendance_date,'Employee No.':x.employee_no||'','Employee':x.employee_name||'','Time In':fmt(x.time_in),'Time Out':fmt(x.time_out),'Regular Hours':Number(x.regular_hours||0),'Overtime Hours':Number(x.overtime_hours||0),'Status':x.status||'','Method':x.recognition_method||'','Time In Photo':x.time_in_photo_data||x.photo_data?'Captured':'No photo','Time Out Photo':x.time_out_photo_data?'Captured':'No photo'}));
      const ws=XLSX.utils.json_to_sheet(data);ws['!cols']=[{wch:12},{wch:14},{wch:28},{wch:12},{wch:12},{wch:14},{wch:15},{wch:12},{wch:14},{wch:16},{wch:17}];
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Attendance Logs');XLSX.writeFile(wb,`SmallBiz-Attendance-${$('#sb-att-log-from').value}-to-${$('#sb-att-log-to').value}.xlsx`);
    }

    async function load(){
      const btn=$('#sb-att-log-load');try{btn.disabled=true;const c=client(),p=await profile(c),r=await c.rpc('list_attendance',{p_business_id:p.business_id,p_start_date:$('#sb-att-log-from').value,p_end_date:$('#sb-att-log-to').value});if(r.error)throw r.error;renderRows(r.data||[]);renderCalendar();}
      catch(e){const wrap=$('#sb-att-log-table-wrap');if(wrap)wrap.innerHTML=`<div class="sb-att-empty">${esc(e.message||String(e))}</div>`;}finally{if(btn)btn.disabled=false;}
    }
    $('#sb-att-log-load').onclick=load;$('#sb-att-log-today').onclick=()=>{$('#sb-att-log-from').value=today;$('#sb-att-log-to').value=today;load();};$('#sb-att-log-excel').onclick=exportExcel;
    $('#sb-att-cal-prev').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();};$('#sb-att-cal-next').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();};
    renderCalendar();load();
  }

  function watchLogs(){
    const overlay=document.querySelector('#sb-att-overlay');if(!overlay)return;
    const body=overlay.querySelector('#sb-att-body');if(!body)return;
    const logsTab=overlay.querySelector('[data-mode="logs"]');if(logsTab&&!logsTab.dataset.stableLogs){logsTab.dataset.stableLogs='1';logsTab.addEventListener('click',()=>{logsBody=body;clearTimeout(logBuildTimer);logBuildTimer=setTimeout(()=>buildLogsUI(body),250);},true);}
    if(logsBody===body&&body.querySelector('#sb-att-log-table-wrap')===null&&overlay.querySelector('[data-mode="logs"].active')){clearTimeout(logBuildTimer);logBuildTimer=setTimeout(()=>buildLogsUI(body),80);}
  }

  const observer=new MutationObserver(()=>{installRpcPatch();watchLogs();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  installRpcPatch();watchLogs();
})();
