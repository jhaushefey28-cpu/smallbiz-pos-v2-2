(function(){
  const SUPABASE_URL='https://fnuncwcsliojhgkmmhwo.supabase.co';
  const SUPABASE_KEY='sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe';
  let sb=null;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[m]));

  function client(){
    if(!sb&&window.supabase?.createClient) sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return sb;
  }

  async function context(){
    const c=client();
    if(!c) throw new Error('Supabase client unavailable.');
    const {data:{session}}=await c.auth.getSession();
    if(!session) throw new Error('Please login first.');
    const {data:profile,error}=await c.from('profiles').select('id,business_id,full_name,role,active').eq('id',session.user.id).single();
    if(error) throw error;
    if(!profile?.active) throw new Error('Inactive account.');
    return profile;
  }

  function renameNav(){
    const b=document.querySelector('.sidebar-nav [data-smallbiz-attendance]');
    if(!b) return false;
    const label=b.querySelector('b');
    if(label) label.textContent='Employees / Attendance';
    else b.innerHTML='<span>👥</span><b>Employees / Attendance</b>';
    return true;
  }

  async function loadEmployees(body,profile){
    const {data,error}=await client().rpc('get_attendance_employees',{p_business_id:profile.business_id});
    if(error) throw error;
    const employees=data||[];
    const canManage=['owner','admin','manager'].includes(String(profile.role||'').toLowerCase());
    body.innerHTML=`
      <div class="sb-ea-section-head">
        <div><h3>👥 Employee / Staff</h3><p>Add employees here first, then enroll their face in the Face Enrollment tab.</p></div>
        ${canManage?'<button id="sb-ea-add" class="primary">＋ Add Employee</button>':''}
      </div>
      <div id="sb-ea-form-wrap"></div>
      <div class="sb-att-table">
        <table><thead><tr><th>Employee</th><th>Face</th><th>Status</th></tr></thead><tbody>
          ${employees.length?employees.map(e=>`<tr><td><b>${esc(e.full_name)}</b></td><td>${e.has_face?'✅ Enrolled':'⚪ Not enrolled'}</td><td>${e.active===false?'Inactive':'Active'}</td></tr>`).join(''):'<tr><td colspan="3">No employees yet. Click Add Employee to create the first staff record.</td></tr>'}
        </tbody></table>
      </div>`;
    if(canManage) $('#sb-ea-add').onclick=()=>showEmployeeForm(body,profile);
  }

  function showEmployeeForm(body,profile){
    const wrap=$('#sb-ea-form-wrap');
    if(!wrap) return;
    wrap.innerHTML=`
      <form id="sb-ea-form" class="sb-ea-form">
        <div class="sb-ea-form-title">Add Employee / Staff</div>
        <div class="sb-ea-form-grid">
          <div><label>Employee No.</label><input id="sb-ea-no" placeholder="e.g. EMP-001" /></div>
          <div><label>Full Name</label><input id="sb-ea-name" placeholder="Employee full name" required /></div>
          <div><label>Position</label><input id="sb-ea-position" placeholder="e.g. Cashier" /></div>
          <div><label>Department</label><input id="sb-ea-department" placeholder="e.g. Store Operations" /></div>
          <div><label>Hire Date</label><input id="sb-ea-hire" type="date" /></div>
        </div>
        <div class="sb-ea-form-actions"><button type="button" id="sb-ea-cancel">Cancel</button><button class="primary" id="sb-ea-save">Save Employee</button></div>
        <div id="sb-ea-form-msg" class="sb-ea-form-msg"></div>
      </form>`;
    $('#sb-ea-cancel').onclick=()=>{wrap.innerHTML='';};
    $('#sb-ea-form').onsubmit=async e=>{
      e.preventDefault();
      const save=$('#sb-ea-save'),msg=$('#sb-ea-form-msg');
      save.disabled=true;msg.textContent='Saving employee...';msg.className='sb-ea-form-msg';
      try{
        const r=await client().rpc('create_attendance_employee',{
          p_business_id:profile.business_id,
          p_employee_no:$('#sb-ea-no').value.trim()||null,
          p_full_name:$('#sb-ea-name').value.trim(),
          p_position:$('#sb-ea-position').value.trim()||null,
          p_department:$('#sb-ea-department').value.trim()||null,
          p_hire_date:$('#sb-ea-hire').value||null
        });
        if(r.error) throw r.error;
        msg.textContent='Employee created successfully.';msg.className='sb-ea-form-msg success';
        setTimeout(()=>loadEmployees(body,profile),450);
      }catch(err){msg.textContent=err.message||String(err);msg.className='sb-ea-form-msg error';save.disabled=false;}
    };
  }

  function installEmployeeTab(overlay){
    const tabs=$('.sb-att-tabs',overlay);
    if(!tabs||tabs.querySelector('[data-employee-mode]')) return;
    const btn=document.createElement('button');
    btn.type='button';btn.dataset.employeeMode='1';btn.textContent='👥 Employee / Staff';
    tabs.insertBefore(btn,tabs.firstChild);
    btn.onclick=async()=>{
      tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
      const body=$('#sb-att-body',overlay);body.innerHTML='<div class="sb-att-empty">Loading employees...</div>';
      try{const p=await context();await loadEmployees(body,p);}catch(e){body.innerHTML=`<div class="sb-att-empty">${esc(e.message||String(e))}</div>`;}
    };
    tabs.querySelectorAll('button[data-mode]').forEach(x=>x.addEventListener('click',()=>btn.classList.remove('active')));
  }

  function boot(){
    renameNav();
    const observer=new MutationObserver(()=>{
      renameNav();
      const overlay=$('#sb-att-overlay');
      if(overlay) installEmployeeTab(overlay);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(renameNav,1000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
