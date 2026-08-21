// SMALLBIZ_POST_LOGIN_MODULES_2026_08_21
// Load optional POS/Owner enhancements only after the React auth screen is gone.
// This keeps mobile authentication isolated from enhancement scripts.
const MODULES = [
  "/reprint-modal-fix.js",
  "/void-reason-enhancement.js",
  "/transaction-audit-enhancement.js",
  "/team-management.js",
  "/sales-channels.jsx",
  "/product-channel-mapping.jsx",
  "/order-management-shipment-hotfix.js",
  "/order-management.jsx",
  "/platform-channel-admin.js",
  "/marketplace-connections.jsx",
  "/marketplace-oauth-connect.js",
  "/marketplace-sync-readiness.jsx",
  "/marketplace-stock-reservation.jsx",
  "/marketplace-fulfillment.jsx",
  "/report-export-engine.js",
  "/reports-center.js",
  "/mobile-cart-float.js",
  "/business-controls.jsx",
  "/inventory-center.jsx",
  "/growth-center.jsx",
  "/growth-center-sidebar-fix.js",
  "/cashier-shift.jsx"
];

const STYLES = [
  "/sidebar-fix.css",
  "/platform-channel-admin.css",
  "/responsive-pos.css",
  "/reports-center.css",
  "/mobile-cart-float.css",
  "/mobile-login-fix.css",
  "/business-controls-scroll-fix.css",
  "/cashier-shift.css"
];

let loaded = false;

function loadStyles(){
  for(const href of STYLES){
    if(document.querySelector(`link[data-smallbiz-post-login="${href}"]`)) continue;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    link.dataset.smallbizPostLogin=href;
    document.head.appendChild(link);
  }
}

async function loadModules(){
  if(loaded)return;
  loaded=true;
  loadStyles();
  for(const src of MODULES){
    try{
      await import(`${src}?smallbiz-post-login=20260821`);
    }catch(error){
      // An optional enhancement must never block the authenticated POS core.
      console.error(`[SmallBiz] Optional module failed: ${src}`, error);
    }
  }
}

function isAuthenticatedView(){
  const root=document.getElementById("root");
  if(!root)return false;
  // The core app's login view uses .auth/.login-card. Once that disappears,
  // the authenticated application is mounted and optional modules may start.
  return !root.querySelector(".auth .login-card");
}

function boot(){
  if(isAuthenticatedView()){
    void loadModules();
    return true;
  }
  return false;
}

if(!boot()){
  const observer=new MutationObserver(()=>{
    if(boot())observer.disconnect();
  });
  observer.observe(document.getElementById("root")||document.body,{childList:true,subtree:true});
}
