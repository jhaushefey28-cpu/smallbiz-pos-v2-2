// SmallBiz POS auth recovery + password reset helper.
// IMPORTANT: Do not inspect JWT `iat` against the device clock here.
// Supabase Auth and PostgREST can have brief clock skew, and mobile device
// clocks can also be inaccurate. Deleting a valid persisted session based on
// the browser clock can create a login/reload loop on phones.
(function(){
  try{
    const SUPABASE_URL='https://fnuncwcsliojhgkmmhwo.supabase.co';
    const SUPABASE_KEY='sb_publishable_jvzxrFRakTBDiQvST5e44w_X60WWMPe';
    const TEST_EMAIL='leeconrad123@gmail.com';
    let sb=null;
    const ensureClient=async()=>{
      if(sb)return sb;
      const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY);
      return sb;
    };
    const css=()=>{if(document.getElementById('sb-auth-recovery-css'))return;const s=document.createElement('style');s.id='sb-auth-recovery-css';s.textContent='.sb-auth-recovery-btn{display:block;width:100%;margin-top:10px;border:0;background:transparent;color:#2563eb;font-weight:700;cursor:pointer;padding:10px}.sb-auth-recovery-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px}.sb-auth-recovery-card{width:min(380px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui}.sb-auth-recovery-card input{display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:12px;border:1px solid #d1d5db;border-radius:10px}.sb-auth-recovery-card button{width:100%;padding:12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;margin-top:8px;cursor:pointer}.sb-auth-recovery-msg{font-size:13px;margin-top:10px;color:#374151}';document.head.appendChild(s)};
    const showRecoveryForm=async()=>{css();if(document.getElementById('sb-recovery-overlay'))return;const o=document.createElement('div');o.id='sb-recovery-overlay';o.className='sb-auth-recovery-overlay';o.innerHTML='<div class="sb-auth-recovery-card"><h2 style="margin:0 0 6px">Set your password</h2><p style="margin:0 0 14px;color:#6b7280">Create a password for the test cashier account.</p><input id="sb-rp1" type="password" placeholder="New password" autocomplete="new-password"><input id="sb-rp2" type="password" placeholder="Confirm password" autocomplete="new-password"><button id="sb-rp-save">Save password</button><button id="sb-rp-cancel" style="background:#6b7280">Cancel</button><div id="sb-rp-msg" class="sb-auth-recovery-msg"></div></div>';document.body.appendChild(o);o.querySelector('#sb-rp-cancel').onclick=()=>o.remove();o.querySelector('#sb-rp-save').onclick=async()=>{const a=o.querySelector('#sb-rp1').value,b=o.querySelector('#sb-rp2').value,m=o.querySelector('#sb-rp-msg');if(a.length<8){m.textContent='Password must be at least 8 characters.';return}if(a!==b){m.textContent='Passwords do not match.';return}m.textContent='Saving...';try{const c=await ensureClient();const {error}=await c.auth.updateUser({password:a});if(error)throw error;m.textContent='Password saved. You can now login with the cashier account.';setTimeout(()=>o.remove(),1200)}catch(e){m.textContent=e?.message||'Unable to update password.'}}};
    const sendReset=async()=>{css();const c=await ensureClient();const input=document.querySelector('.login-card input[type="email"]')||document.querySelector('.auth input[type="email"]');const typed=String(input?.value||'').trim();const target=typed||TEST_EMAIL;let m=document.getElementById('sb-reset-msg');if(!m){m=document.createElement('div');m.id='sb-reset-msg';m.className='sb-auth-recovery-btn';(document.querySelector('.login-card form')||document.querySelector('.auth form'))?.appendChild(m)}m.textContent='Sending password reset email...';const {error}=await c.auth.resetPasswordForEmail(target,{redirectTo:location.origin});m.textContent=error?('Reset failed: '+error.message):('Reset email sent to '+target+'. Check your inbox.');};
    const install=()=>{css();const card=document.querySelector('.login-card');if(!card)return;const form=card.querySelector('form');if(!form||card.querySelector('.sb-auth-recovery-btn'))return;const b=document.createElement('button');b.type='button';b.className='sb-auth-recovery-btn';b.textContent='Forgot / Set Password?';b.onclick=sendReset;form.appendChild(b)};
    const observer=new MutationObserver(install);observer.observe(document.documentElement,{childList:true,subtree:true});setInterval(install,800);install();
    ensureClient().then(c=>c.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')showRecoveryForm()})).catch(()=>{});
    window.__SMALLBIZ_AUTH_RECOVERY__='password-reset-v1';
  }catch(_){ /* never block app startup */ }
})();
