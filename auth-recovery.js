// SmallBiz POS auth-session recovery.
// Supabase documents that client clock skew can cause JWT timing errors.
// If a persisted access token is clearly issued in the future, discard only
// the affected Supabase auth session so the app can request a fresh session.
(function(){
  const FUTURE_SKEW_SECONDS=60;
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
      }
    }
  }catch(_){ /* never block app startup */ }
})();
