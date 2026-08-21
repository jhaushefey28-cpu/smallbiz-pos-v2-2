/* SMALLBIZ_AUTH_BOOTSTRAP_V3_2026_08_21
 * Protected pre-auth layer. This file does NOT own application state or modules.
 * It only prevents mobile auth requests from hanging forever and gives the user
 * deterministic feedback/retry behavior while the React/Supabase auth flow runs.
 */
(function(){
  'use strict';
  if(window.__SMALLBIZ_AUTH_BOOTSTRAP_V3__) return;
  window.__SMALLBIZ_AUTH_BOOTSTRAP_V3__=true;

  const AUTH_TIMEOUT=15000;
  const originalFetch=window.fetch.bind(window);

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const isSupabaseAuth=/\/auth\/v1\/(token|user)(?:[/?]|$)/i.test(url);
    if(!isSupabaseAuth) return originalFetch(input,init);

    const controller=new AbortController();
    const externalSignal=init&&init.signal;
    let timer;
    let abortedByTimeout=false;
    const onAbort=()=>controller.abort(externalSignal&&externalSignal.reason);
    if(externalSignal){
      if(externalSignal.aborted) controller.abort(externalSignal.reason);
      else externalSignal.addEventListener('abort',onAbort,{once:true});
    }
    timer=setTimeout(()=>{abortedByTimeout=true;controller.abort();},AUTH_TIMEOUT);

    return originalFetch(input,{...(init||{}),signal:controller.signal})
      .catch(error=>{
        if(abortedByTimeout){
          const timeoutError=new Error('Login request timed out. Please check your internet connection and try again.');
          timeoutError.name='SmallBizAuthTimeoutError';
          throw timeoutError;
        }
        throw error;
      })
      .finally(()=>{
        clearTimeout(timer);
        if(externalSignal) externalSignal.removeEventListener('abort',onAbort);
      });
  };

  function isLoginForm(form){
    if(!form) return false;
    const password=form.querySelector('input[type="password"]');
    const email=form.querySelector('input[type="email"]');
    return !!(password&&email);
  }

  function setLoginBusy(form,busy){
    if(!form) return;
    form.dataset.smallbizAuthBusy=busy?'1':'0';
    const buttons=form.querySelectorAll('button[type="submit"],button');
    buttons.forEach(button=>{
      if(busy){
        if(!button.dataset.smallbizOriginalText) button.dataset.smallbizOriginalText=button.textContent||'';
        button.disabled=true;
        button.textContent='Signing in…';
      }else{
        button.disabled=false;
        if(button.dataset.smallbizOriginalText) button.textContent=button.dataset.smallbizOriginalText;
      }
    });
  }

  function showLoginMessage(form,message,isError){
    let node=form.querySelector('[data-smallbiz-auth-status]');
    if(!node){
      node=document.createElement('div');
      node.dataset.smallbizAuthStatus='1';
      node.setAttribute('role','status');
      node.style.cssText='margin-top:10px;font-size:13px;line-height:1.4;text-align:center;';
      form.appendChild(node);
    }
    node.textContent=message;
    node.style.color=isError?'#b91c1c':'#475569';
  }

  document.addEventListener('submit',function(event){
    const form=event.target;
    if(!isLoginForm(form)) return;
    if(form.dataset.smallbizAuthBusy==='1'){
      event.preventDefault();
      return;
    }

    setLoginBusy(form,true);
    showLoginMessage(form,navigator.onLine===false?'Offline — reconnecting…':'Signing in securely…',false);

    const started=Date.now();
    const timer=setInterval(function(){
      if(!document.documentElement.contains(form)){
        clearInterval(timer);
        return;
      }
      if(!document.querySelector('.login-card')){
        clearInterval(timer);
        return;
      }
      if(Date.now()-started>=AUTH_TIMEOUT+1000){
        clearInterval(timer);
        setLoginBusy(form,false);
        showLoginMessage(form,'Login timed out. Please check your connection and try again.',true);
      }
    },500);
  },true);

  window.addEventListener('offline',function(){
    const form=document.querySelector('.login-card form');
    if(form) showLoginMessage(form,'You are offline. Please reconnect and try again.',true);
  });
  window.addEventListener('online',function(){
    const form=document.querySelector('.login-card form');
    if(form && form.dataset.smallbizAuthBusy!=='1') showLoginMessage(form,'Connection restored. You can try signing in again.',false);
  });
})();
