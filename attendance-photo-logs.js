(function(){
  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient) return;
  const patched = function(...args){
    const client = originalCreateClient.apply(this,args);
    const originalRpc = client.rpc.bind(client);
    client.rpc = async function(fn, params){
      if (fn === 'record_face_attendance' && params && typeof params === 'object') {
        const preview = document.querySelector('#sb-att-preview');
        const photo = preview && !preview.hidden && preview.src && preview.src.startsWith('data:image/') ? await compressPhoto(preview.src) : null;
        params = {...params, p_photo_data: photo};
      }
      return originalRpc(fn, params);
    };
    return client;
  };
  window.supabase.createClient = patched;

  function esc(v){return String(v??'').replace(/[&<>\'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[m]));}
  async function compressPhoto(dataUrl){
    try{const img=new Image();img.src=dataUrl;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});const maxW=480,maxH=360;const scale=Math.min(1,maxW/img.width,maxH/img.height);const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.68);}catch(_){return dataUrl;}
  }
  function fmt(v){return v?new Date(v).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}):'—';}
  function fmtDate(v){return v?new Date(v+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'2-digit'}):'—';}
  function getClient(){return window.supabase?.createClient && window.supabase.createClient('https://fnuncwcsliojhgkmmhwo.supabase.co','sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe');}
  async function getProfile(client){const {data:{session}}=await client.auth.getSession();if(!session)throw new Error('Please login first.');const {data:p,error}=await client.from('profiles').select('business_id,role,active').eq('id',session.user.id).single();if(error)throw error;if(!p?.active)throw new Error('Inactive account.');if(!['owner','admin','manager'].includes(String(p.role||'').toLowerCase()))throw new Error('Only Owner, Admin, or Manager can view attendance logs.');return p;}
  function buildLogsUI(body){
    body.innerHTML=`<div class="sb-att-log-toolbar"><div><h3>Attendance Logs</h3><p>Backtrack attendance by date and export the filtered records to Excel.</p></div><div class="sb-att-log-actions"><label>From <input id="sb-att-log-from" type="date"></label><label>To <input id="sb-att-log-to" type="date"></label><button id="sb-att-log-load">🔎 View</button><button id="sb-att-log-today">Today</button><button id="sb-att-log-excel">📊 Excel</button></div></div><div class="sb-att-calendar-card"><div class="sb-att-calendar-head"><button id="sb-att-cal-prev">‹</button><strong id="sb-att-cal-title"></strong><button id="sb-att-cal-next">›</button></div><div class="sb-att-calendar-grid" id="sb-att-calendar-grid"></div></div><div id="sb-att-log-table-wrap" class="sb-att-table"></div>`;
    const $=s=>body.querySelector(s);
    const now=new Date();const to=now.toISOString().slice(0,10);const from=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);$('#sb-att-log-from').value=from;$('#sb-att-log-to').value=to;
    let currentMonth=new Date(now.getFullYear(),now.getMonth(),1); let lastRows=[]; let businessId=null;
    function renderCalendar(){const y=currentMonth.getFullYear(),m=currentMonth.getMonth();$('#sb-att-cal-title').textContent=currentMonth.toLocaleDateString('en-PH',{month:'long',year:'numeric'});const first=new Date(y,m,1).getDay();const days=new Date(y,m+1,0).getDate();const selectedFrom=$('#sb-att-log-from').value,selectedTo=$('#sb-att-log-to').value;let h=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-week">${x}</div>`).join('');for(let i=0;i<first;i++)h+='<div class="cal-day empty"></div>';for(let d=1;d<=days;d++){const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const inRange=selectedFrom&&selectedTo&&iso>=selectedFrom&&iso<=selectedTo;h+=`<button class="cal-day${inRange?' selected':''}" data-date="${iso}">${d}</button>`}$('#sb-att-calendar-grid').innerHTML=h;body.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{const d=b.dataset.date;$('#sb-att-log-from').value=d;$('#sb-att-log-to').value=d;load();});}
    function renderRows(rows){lastRows=rows||[];$('#sb-att-log-table-wrap').innerHTML=rows.length?`<table><thead><tr><th>Picture</th><th>Date</th><th>Employee</th><th>Employee No.</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Method</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.photo_data?`<img class="sb-att-log-photo" src="${x.photo_data}" alt="Attendance photo" loading="lazy">`:'<span class="sb-att-no-photo">No photo</span>'}</td><td>${fmtDate(x.attendance_date)}</td><td><b>${esc(x.employee_name)}</b></td><td>${esc(x.employee_no||'—')}</td><td>${fmt(x.time_in)}</td><td>${fmt(x.time_out)}</td><td>${Number(x.regular_hours||0).toFixed(2)}</td><td>${esc(x.recognition_method||'manual')}</td></tr>`).join('')}</tbody></table>`:'<div class="sb-att-empty">No attendance records for the selected date range.</div>';}
    function loadXlsx(){return new Promise((resolve,reject)=>{if(window.XLSX)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Excel export library failed to load.'));document.head.appendChild(s);});}
    function exportExcel(){if(!lastRows.length){alert('No attendance records to export.');return;}if(!window.XLSX){loadXlsx().then(exportExcel);return;}const data=lastRows.map(x=>({'Date':x.attendance_date,'Employee No.':x.employee_no||'','Employee':x.employee_name||'','Time In':fmt(x.time_in),'Time Out':fmt(x.time_out),'Regular Hours':Number(x.regular_hours||0),'Overtime Hours':Number(x.overtime_hours||0),'Status':x.status||'','Method':x.recognition_method||'','Photo':x.photo_data?'Captured':'No photo'}));const ws=XLSX.utils.json_to_sheet(data);ws['!cols']=[{wch:12},{wch:14},{wch:28},{wch:12},{wch:12},{wch:14},{wch:15},{wch:12},{wch:14},{wch:12}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Attendance Logs');XLSX.writeFile(wb,`SmallBiz-Attendance-${$('#sb-att-log-from').value}-to-${$('#sb-att-log-to').value}.xlsx`);}
    async function load(){try{$('#sb-att-log-load').disabled=true;const client=getClient();const p=await getProfile(client);businessId=p.business_id;const r=await client.rpc('list_attendance',{p_business_id:businessId,p_start_date:$('#sb-att-log-from').value,p_end_date:$('#sb-att-log-to').value});if(r.error)throw r.error;renderRows(r.data||[]);renderCalendar();}catch(e){$('#sb-att-log-table-wrap').innerHTML=`<div class="sb-att-empty">${esc(e.message||String(e))}</div>`}finally{$('#sb-att-log-load').disabled=false}}
    $('#sb-att-log-load').onclick=load;$('#sb-att-log-today').onclick=()=>{const t=new Date().toISOString().slice(0,10);$('#sb-att-log-from').value=t;$('#sb-att-log-to').value=t;load();};$('#sb-att-log-excel').onclick=exportExcel;$('#sb-att-cal-prev').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();};$('#sb-att-cal-next').onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();};renderCalendar();load();
  }
  function installTabHook(){const overlay=document.querySelector('#sb-att-overlay');if(!overlay||overlay.dataset.logEnhancement==='1')return;overlay.dataset.logEnhancement='1';overlay.querySelectorAll('[data-mode]').forEach(btn=>{btn.addEventListener('click',()=>{if(btn.dataset.mode==='logs')setTimeout(()=>{const body=overlay.querySelector('#sb-att-body');if(body)buildLogsUI(body);},30);},true);});}
  const observer=new MutationObserver(()=>installTabHook());observer.observe(document.body,{childList:true,subtree:true});installTabHook();
})();
