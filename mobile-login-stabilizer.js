// Mobile login stabilizer: assists the existing React login form only.
// It never performs authentication itself and never touches POS logic.
(function(){
  const install=()=>{
    const form=document.querySelector('.login-card');
    if(!form || form.dataset.mobileLoginStabilized==='1') return;
    form.dataset.mobileLoginStabilized='1';

    const email=form.querySelector('input[type="email"]');
    const password=form.querySelector('input[type="password"]');
    const button=form.querySelector('button');
    if(email){ email.setAttribute('autocomplete','username'); email.setAttribute('inputmode','email'); email.setAttribute('enterkeyhint','next'); }
    if(password){ password.setAttribute('autocomplete','current-password'); password.setAttribute('enterkeyhint','go'); }
    if(button){ button.type='submit'; button.setAttribute('aria-label','Login'); }

    let submitted=false;
    let fallbackTimer=null;
    const originalText=button?.textContent||'Login';

    const markSubmitted=()=>{
      submitted=true;
      if(button){
        button.disabled=true;
        button.textContent='Signing in...';
      }
      if(fallbackTimer)clearTimeout(fallbackTimer);
      // If Supabase has accepted the credentials but React did not receive the
      // auth-state event on a mobile browser, one controlled reload lets the
      // persisted Supabase session be picked up by getSession().
      fallbackTimer=setTimeout(()=>{
        if(!document.body.contains(form))return;
        if(sessionStorage.getItem('smallbiz_mobile_login_reload')==='1'){
          if(button){button.disabled=false;button.textContent=originalText;}
          return;
        }
        sessionStorage.setItem('smallbiz_mobile_login_reload','1');
        window.location.reload();
      },8000);
    };

    const clearReloadFlag=()=>{
      try{sessionStorage.removeItem('smallbiz_mobile_login_reload')}catch(_){ }
    };
    clearReloadFlag();
    form.addEventListener('submit',markSubmitted,true);

    const fallbackSubmit=()=>{
      if(submitted||!document.body.contains(form)||form.dataset.loginFallbackUsed==='1')return;
      form.dataset.loginFallbackUsed='1';
      try{form.requestSubmit(button)}catch(_){button?.click()}
      setTimeout(()=>{form.dataset.loginFallbackUsed='';},1500);
    };

    if(button){
      button.addEventListener('pointerup',()=>setTimeout(fallbackSubmit,350),{passive:true});
      button.addEventListener('touchend',()=>setTimeout(fallbackSubmit,350),{passive:true});
    }
  };

  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  install();
})();
