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
    const originalText=button?.textContent||'Login';

    const resetButton=()=>{
      submitted=false;
      if(button){
        button.disabled=false;
        button.textContent=originalText;
      }
      if(submitTimer){clearTimeout(submitTimer);submitTimer=null;}
    };

    // Only mark the form as submitting. Do not reload the page and do not
    // interfere with Supabase's persisted session/auth-state lifecycle.
    const markSubmitted=()=>{
      submitted=true;
      if(button){
        button.disabled=true;
        button.textContent='Signing in...';
      }
      if(submitTimer)clearTimeout(submitTimer);
      // If React/Supabase returns an error, the React UI remains on the form.
      // Re-enable the button after a bounded timeout so a mobile browser cannot
      // leave the user permanently stuck in a disabled state.
      submitTimer=setTimeout(()=>{
        if(document.body.contains(form) && !document.querySelector('.auth-error')) resetButton();
      },12000);
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

    // Keep the Login button usable after a browser-level validation failure.
    form.addEventListener('invalid',()=>resetButton(),true);
  };

  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  install();
})();
