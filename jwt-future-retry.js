// SmallBiz POS: targeted recovery for Supabase/PostgREST PGRST303 clock skew.
// For safe REST reads only, refresh the persisted Supabase session and retry with
// the fresh access token instead of waiting/reloading the whole application.
(function(){
  const originalFetch=window.fetch?.bind(window);
  if(!originalFetch)return;

  const isRestRead=(input,init)=>{
    let url="";
    let method="GET";
    try{
      if(typeof input==='string')url=input;
      else if(input?.url)url=input.url;
      method=String(init?.method||input?.method||'GET').toUpperCase();
    }catch(_){return false}
    return (method==='GET'||method==='HEAD') && /\/rest\/v1\//.test(url);
  };

  const futureJwt=async response=>{
    if(!response||response.status!==401)return false;
    try{return /JWT issued at future|PGRST303/i.test(await response.clone().text())}catch(_){return false}
  };

  const headersOf=(input,init)=>{
    const h=new Headers(input?.headers||init?.headers||{});
    return h;
  };

  function findAuthStorage(){
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        if(!key.startsWith('sb-')||!key.endsWith('-auth-token'))continue;
        const raw=localStorage.getItem(key);
        if(!raw)continue;
        const value=JSON.parse(raw);
        if(value?.refresh_token)return value;
      }
    }catch(_){ }
    return null;
  }

  async function refreshAccessToken(requestUrl,apikey){
    const stored=findAuthStorage();
    if(!stored?.refresh_token||!apikey)return null;
    try{
      const base=new URL(requestUrl).origin;
      const response=await originalFetch(base+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':apikey},
        body:JSON.stringify({refresh_token:stored.refresh_token})
      });
      if(!response.ok)return null;
      const next=await response.json();
      if(!next?.access_token)return null;

      // Keep the persisted session current for Supabase's next request.
      try{
        const storageKey=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));
        if(storageKey){
          const current=JSON.parse(localStorage.getItem(storageKey)||'{}');
          localStorage.setItem(storageKey,JSON.stringify({...current,...next,expires_at:Math.floor(Date.now()/1000)+Number(next.expires_in||3600)}));
        }
      }catch(_){ }
      return next.access_token;
    }catch(_){return null}
  }

  window.fetch=async function(input,init){
    const safe=isRestRead(input,init);
    let response=await originalFetch(input,init);
    if(!safe||!(await futureJwt(response)))return response;

    const url=typeof input==='string'?input:input?.url||'';
    const headers=headersOf(input,init);
    const apikey=headers.get('apikey')||headers.get('x-client-info')&&headers.get('apikey');
    const freshToken=await refreshAccessToken(url,apikey);
    if(freshToken){
      const retryHeaders=new Headers(headers);
      retryHeaders.set('Authorization','Bearer '+freshToken);
      response=await originalFetch(input,{...(init||{}),headers:retryHeaders});
      if(!(await futureJwt(response)))return response;
    }

    // Final short retry window for a genuine server clock-skew condition.
    for(const delay of [2000,4000,6000]){
      await new Promise(r=>setTimeout(r,delay));
      response=await originalFetch(input,init);
      if(!(await futureJwt(response)))return response;
    }
    return response;
  };
})();
