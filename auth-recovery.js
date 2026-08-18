// SmallBiz POS auth-session recovery.
// Supabase access tokens are short-lived JWTs. If a persisted token is
// clearly issued in the future, discard only that auth session so the app
// can request a fresh token instead of sending a known-invalid JWT to PostgREST.
(function(){
  // Keep this tight: PostgREST rejects JWTs whose iat is in its future.
  // A large tolerance can allow a bad token to survive long enough to break
  // the first profile query after login.
  const FUTURE_SKEW_SECONDS=30;
  let clearedFutureToken=false;
  try{
    const now=Math.floor(Date.now()/1000);
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!key.startsWith('sb-')||!key.endsWith('-auth-token')) continue;
      const raw=localStorage.getItem(key);
      if(!raw) continue;
      let parsed;
      try{ parsed=JSON.parse(raw); }catch(_){ continue; }
      const token=parsed?.access_token;
      if(!token||typeof token!=='string') continue;
      const parts=token.split('.');
      if(parts.length!==3) continue;
      let payload;
      try{
        const normalized=parts[1].replace(/-/g,'+').replace(/_/g,'/');
        payload=JSON.parse(atob(normalized.padEnd(normalized.length+((4-normalized.length%4)%4),'=')));
      }catch(_){ continue; }
      if(Number.isFinite(payload?.iat)&&payload.iat>now+FUTURE_SKEW_SECONDS){
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        clearedFutureToken=true;
      }
    }
  }catch(_){ /* never block app startup */ }

  // If a future-issued token was found, force one clean app start. This makes
  // main.jsx call getSession() without reusing the rejected JWT.
  if(clearedFutureToken){
    try{ sessionStorage.removeItem('smallbiz_mobile_auth_reload_v1'); }catch(_){ }
    try{ window.location.reload(); }catch(_){ }
    return;
  }

  // Mobile auth recovery: Supabase can complete password login while a mobile
  // browser misses the auth-state event. When a fresh auth token appears,
  // reload once so main.jsx calls getSession() with the new session.
  try{
    const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||window.matchMedia('(max-width: 640px)').matches;
    if(!isMobile)return;
    const FLAG='smallbiz_mobile_auth_reload_v1';
    const hasAuthToken=()=>{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key||!key.startsWith('sb-')||!key.endsWith('-auth-token'))continue;
        const raw=localStorage.getItem(key);
        if(!raw)continue;
        try{if(JSON.parse(raw)?.access_token)return true}catch(_){ }
      }
      return false;
    };

    if(!hasAuthToken())sessionStorage.removeItem(FLAG);

    let checks=0;
    const timer=setInterval(()=>{
      if(hasAuthToken()){
        if(sessionStorage.getItem(FLAG)==='1'){
          clearInterval(timer);
          return;
        }
        sessionStorage.setItem(FLAG,'1');
        clearInterval(timer);
        window.location.reload();
        return;
      }
      checks++;
      if(checks>=40)clearInterval(timer);
    },250);
  }catch(_){ /* never block app startup */ }
})();
