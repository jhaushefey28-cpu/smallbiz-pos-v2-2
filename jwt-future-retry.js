// SmallBiz POS: narrow recovery for transient Supabase/PostgREST PGRST303 clock skew.
// Retry only safe REST reads. This is intentionally longer on initial login because
// a fresh Auth JWT can be briefly ahead of the PostgREST validator clock.
(function(){
  const originalFetch=window.fetch?.bind(window);
  if(!originalFetch)return;

  const MAX_RETRIES=5;
  const WAIT_MS=3000;

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

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  const isFutureJwtResponse=async response=>{
    if(!response||response.status!==401)return false;
    try{
      const text=await response.clone().text();
      return /JWT issued at future|PGRST303/i.test(text);
    }catch(_){return false}
  };

  window.fetch=async function(input,init){
    const safe=isRestRead(input,init);
    let response=await originalFetch(input,init);
    if(!safe||!(await isFutureJwtResponse(response)))return response;

    for(let attempt=1;attempt<=MAX_RETRIES;attempt++){
      await sleep(WAIT_MS*attempt);
      response=await originalFetch(input,init);
      if(!(await isFutureJwtResponse(response)))return response;
    }

    return response;
  };
})();
