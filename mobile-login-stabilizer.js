// Mobile login stabilizer: only assists the existing React login form.
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
    if(password){ password.setAttribute('autocomplete','current-password'); email?.setAttribute('enterkeyhint','next'); password.setAttribute('enterkeyhint','go'); }
    if(button){ button.type='submit'; button.setAttribute('aria-label','Login'); }

    // Some mobile browsers can miss the synthetic submit after a touch gesture.
    // Give the normal React submit a short window; only requestSubmit if none fired.
    let submitted=false;
    form.addEventListener('submit',()=>{submitted=true;setTimeout(()=>{submitted=false;},1000)},true);
    if(button){
      button.addEventListener('pointerup',()=>{
        if(submitted) return;
        setTimeout(()=>{
          if(!submitted && document.body.contains(form) && !form.dataset.loginFallbackUsed){
            form.dataset.loginFallbackUsed='1';
            try{ form.requestSubmit(button); }catch(_){ button.click(); }
            setTimeout(()=>{form.dataset.loginFallbackUsed='';},1200);
          }
        },450);
      },{passive:true});
    }
  };
  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  install();
})();
