import fs from "node:fs";

const MAIN="main.jsx";
const OWNER="owner-modules-loader.jsx";
if(!fs.existsSync(MAIN)||!fs.existsSync(OWNER))throw new Error("Sidebar source files are missing; build stopped safely.");

let main=fs.readFileSync(MAIN,"utf8");
let owner=fs.readFileSync(OWNER,"utf8");

/* SMALLBIZ_SIDEBAR_HARD_STOP_V40
   Final source-of-truth repair. React owns every visible sidebar button.
   Runtime modules may open overlays, but they are forbidden from creating or
   rebinding sidebar buttons. A DOM guard removes any non-React child that a
   legacy module tries to append, preventing the exact "click -> duplicate at
   bottom -> duplicate works" failure. */

const navBlock=/<nav className="sidebar-nav">[\s\S]*?<\/nav>/;
const canonicalNav=`<nav className="sidebar-nav">
        {[["pos","🛒","POS",canSell],["cashier-shift","💵","Cashier Shift",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["growth","📈","Growth Center",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["attendance","👥","Employee/Attendance",canSell],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>
          <button key={key} type="button" data-smallbiz-react-sidebar="true" data-sidebar-key={key} className={activePage===key?"nav-item active":"nav-item"} onClick={()=>selectSidebarPage(key)}><span>{icon}</span><b>{label}</b></button>)}
      </nav>`;
if(!navBlock.test(main))throw new Error("Sidebar nav source block not found; refusing hard-stop repair.");
main=main.replace(navBlock,canonicalNav);

const openExternal=`  const externalSidebarOpen={
    "cashier-shift":async()=>{await import("./cashier-shift.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-cashier-shift"));},
    "growth":async()=>{await import("./growth-center.jsx");window.dispatchEvent(new CustomEvent("smallbiz:open-growth-center"));},
    "attendance":async()=>{window.__SMALLBIZ_SUPABASE__=supabase;await import("./attendance-runtime-bridge.js");await import("./attendance-center.js");window.dispatchEvent(new CustomEvent("smallbiz:open-attendance"));}
  };

  async function selectSidebarPage(key){
    if(externalSidebarOpen[key]){
      try{await externalSidebarOpen[key]();}catch(error){console.warn(`[SmallBiz] ${key} failed to open.`,error);setErr(`${key} failed to open: ${error?.message||error}`)}
      return;
    }
    setActivePage(key);
    requestAnimationFrame(()=>{
      const mainArea=document.querySelector(".main-area");
      if(mainArea)mainArea.scrollTo({top:0,behavior:"auto"});
      const sidebar=document.querySelector(".sidebar-nav");
      if(sidebar)sidebar.scrollTop=0;
    });
  }`;
const functionPattern=/\s+(?:async )?function selectSidebarPage\(key\)\{[\s\S]*?\n  \}/;
if(functionPattern.test(main))main=main.replace(functionPattern,"\n"+openExternal);
else{
  const anchor='  const canManageMasters=isOwner||role==="manager";';
  if(!main.includes(anchor))throw new Error("Sidebar permission anchor not found; refusing hard-stop repair.");
  main=main.replace(anchor,anchor+"\n\n"+openExternal);
}

if(!main.includes("data-smallbiz-react-sidebar=\"true\""))throw new Error("React sidebar ownership marker was not inserted.");

const observerEffect=`
  useEffect(()=>{
    const root=document.querySelector(".sidebar-nav");
    if(!root)return;
    const clean=()=>{
      Array.from(root.children).forEach(node=>{
        if(node instanceof HTMLElement&&!node.dataset.smallbizReactSidebar)node.remove();
      });
    };
    clean();
    const observer=new MutationObserver(clean);
    observer.observe(root,{childList:true});
    return()=>observer.disconnect();
  },[profile?.id]);`;
if(!main.includes("SMALLBIZ_SIDEBAR_DOM_GUARD_V40")){
  const anchor='  useEffect(()=>{if(profile?.business_id)loadSaleItemsHistory()},[salesHistory,profile?.business_id]);';
  if(!main.includes(anchor))throw new Error("Sidebar DOM guard insertion anchor not found.");
  main=main.replace(anchor,anchor+"\n\n  // SMALLBIZ_SIDEBAR_DOM_GUARD_V40"+observerEffect);
}

if(!main.includes("window.__SMALLBIZ_SUPABASE__=supabase")){
  const anchor="const supabase=configError?null:createClient(SUPABASE_URL,SUPABASE_KEY);";
  if(!main.includes(anchor))throw new Error("Supabase source anchor not found.");
  main=main.replace(anchor,anchor+"\nwindow.__SMALLBIZ_SUPABASE__=supabase;");
}

/* Owner loader becomes bind-only and cannot attach a second click path to the
   React button. React's onClick is the only sidebar navigation handler. */
const bindPattern=/function bindButton\(item,button,created=false\)\{[\s\S]*?\n\}\n\nfunction ensureCanonicalButton/;
const bindOnly=`function bindButton(item,button,created=false){
  if(!button)return null;
  if(button.tagName==="BUTTON")button.type="button";
  button.setAttribute("aria-label",item.label);
  button.dataset.smallbizOwnerCanonical=item.key;
  if(created)button.dataset.smallbizOwnerCreated=LOADER_VERSION;
  button.style.setProperty("pointer-events","auto","important");
  button.style.setProperty("touch-action","manipulation","important");
  button.style.setProperty("position","relative","important");
  button.style.setProperty("z-index","5","important");
  return button;
}

function ensureCanonicalButton`;
if(!bindPattern.test(owner))throw new Error("Owner loader bind block not found; refusing hard-stop repair.");
owner=owner.replace(bindPattern,bindOnly);
owner=owner.replace(/SMALLBIZ_OWNER_MODULES_LOADER_V[^\n]*/,"SMALLBIZ_OWNER_MODULES_LOADER_V40_REACT_BIND_ONLY");
owner=owner.replace(/const LOADER_VERSION="[^"]+";/,'const LOADER_VERSION="v40";');

fs.writeFileSync(MAIN,main,"utf8");
fs.writeFileSync(OWNER,owner,"utf8");
console.log("Applied SMALLBIZ_SIDEBAR_HARD_STOP_V40: React-only sidebar, fixed canonical order, external modules open through explicit events, duplicate DOM additions are removed, and the owner loader has no click handler.");
