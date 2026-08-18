// SmallBiz POS auth recovery.
// IMPORTANT: Do not inspect JWT `iat` against the device clock here.
// Supabase Auth and PostgREST can have brief clock skew, and mobile device
// clocks can also be inaccurate. Deleting a valid persisted session based on
// the browser clock can create a login/reload loop on phones.
//
// Supabase's own client handles persisted sessions and token refresh. The app
// also has a narrow PGRST303 read retry in jwt-future-retry.js for transient
// PostgREST clock skew.
(function(){
  try{
    // Keep this module intentionally passive. Do not reload the page after a
    // mobile login: main.jsx already subscribes to onAuthStateChange and calls
    // getSession(), so forcing a reload can interrupt the password-login flow.
    window.__SMALLBIZ_AUTH_RECOVERY__ = 'passive-v3';
  }catch(_){ /* never block app startup */ }
})();
