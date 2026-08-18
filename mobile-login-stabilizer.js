// Mobile login stabilizer: assists the existing React login form only.
// It never performs authentication itself and never touches POS logic.
(function(){
  const install=()=>{
    const form=document.querySelector('.login-card');
    if(!form || form.dataset.mobileLoginStabilized==='1') return;
    form.dataset.mobileLoginStabilized='1';

    const email=form.querySelector('input[type="email"]');
    const password=form.querySelector('input[type="password"]');
    const button=form.querySelector('button[type="submit"],button');
    if(email){ email.setAttribute('autocomplete','username'); email.setAttribute('inputmode','email'); email.setAttribute('enterkeyhint','next'); }
    if(password){ password.setAttribute('autocomplete','current-password'); password.setAttribute('enterkeyhint','go'); }
    if(button){ button.type='submit'; button.setAttribute('aria-label','Login'); }

    let submitted=false;
    let submitTimer=null;
    let sessionPoll=null;
    const originalText=button?.textContent||'Login';

    const stopSessionPoll=()=>{
      if(sessionPoll){clearInterval(sessionPoll);sessionPoll=null;}
    };

    const resetButton=()=>{
      submitted=false;
      stopSessionPoll();
      if(button){
        button.disabled=false;
        button.textContent=originalText;
      }
      if(submitTimer){clearTimeout(submitTimer);submitTimer=null;}
    };

    // The auth request itself remains owned by React/Supabase. We only watch
    // for the persisted Supabase session so a mobile browser cannot remain on
    // the login screen when Supabase has already completed the password login.
    const sessionWasPersisted=()=>{
      try{
        for(let i=0;i<localStorage.length;i++){
          const key=localStorage.key(i)||'';
          if(!key.startsWith('sb-')||!key.endsWith('-auth-token'))continue;
          const raw=localStorage.getItem(key);
          if(!raw)continue;
          const value=JSON.parse(raw);
          if(value?.access_token && value?.user?.id)return true;
        }
      }catch(_){ }
      return false;
    };

    const recoverIfSessionReady=()=>{
      if(!submitted||!document.body.contains(form)||!sessionWasPersisted())return;
      stopSessionPoll();
      try{
        if(sessionStorage.getItem('smallbiz-login-recovery-used')==='1')return;
        sessionStorage.setItem('smallbiz-login-recovery-used','1');
      }catch(_){ }
      // Give supabase-js a moment to finish its auth-state callback, then
      // reload only when a valid persisted session is already present.
      setTimeout(()=>{
        if(document.body.contains(form)) window.location.replace(window.location.href);
      },250);
    };

    const markSubmitted=()=>{
      submitted=true;
      if(button){
        button.disabled=true;
        button.textContent='Signing in...';
      }
      if(submitTimer)clearTimeout(submitTimer);
      submitTimer=setTimeout(()=>{
        if(document.body.contains(form) && !sessionWasPersisted()) resetButton();
      },12000);
      stopSessionPoll();
      sessionPoll=setInterval(recoverIfSessionReady,250);
      recoverIfSessionReady();
    };

    form.addEventListener('submit',markSubmitted,true);

    // Some mobile browsers can miss the synthetic submit after a touch.
    // requestSubmit() re-enters the normal React onSubmit handler; it does not
    // authenticate independently and is guarded against duplicate submission.
    const fallbackSubmit=()=>{
      if(submitted||!document.body.contains(form)||form.dataset.loginFallbackUsed==='1')return;
      form.dataset.loginFallbackUsed='1';
      try{
        if(typeof form.requestSubmit==='function') form.requestSubmit(button);
        else button?.click();
      }catch(_){
        try{button?.click()}catch(__){}
      }
      setTimeout(()=>{form.dataset.loginFallbackUsed='';},1500);
    };

    if(button){
      button.addEventListener('click',()=>setTimeout(fallbackSubmit,150),{passive:true});
      button.addEventListener('pointerup',()=>setTimeout(fallbackSubmit,300),{passive:true});
      button.addEventListener('touchend',()=>setTimeout(fallbackSubmit,300),{passive:true});
    }

    form.addEventListener('invalid',()=>resetButton(),true);
  };

  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  install();
})();
