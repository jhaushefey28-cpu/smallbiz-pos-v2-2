import fs from "node:fs";

const mainPath = "main.jsx";
let main = fs.readFileSync(mainPath, "utf8");

const stateAnchor = 'const [profile,setProfile]=useState(null),[activePage,setActivePage]=useState("pos");';
const stateReplacement = stateAnchor + '\n  const [permissionCodes,setPermissionCodes]=useState(()=>new Set()),[isTenantSuperAdmin,setIsTenantSuperAdmin]=useState(false),[permissionsReady,setPermissionsReady]=useState(false);';
if (main.includes(stateAnchor) && !main.includes("permissionsReady")) main = main.replace(stateAnchor, stateReplacement);

const profileEffectAnchor = 'useEffect(()=>{if(profile?.business_id)loadSaleItemsHistory()},[salesHistory,profile?.business_id]);';
const permissionEffect = '\n  useEffect(()=>{\n    if(!profile?.id||!profile?.business_id)return;\n    loadEffectivePermissions(profile).catch(error=>console.warn("[SmallBiz] Permission load failed.",error));\n  },[profile?.id,profile?.business_id]);\n\n  useEffect(()=>{\n    window.__smallbizPermissionsReady=permissionsReady;\n    window.__smallbizIsTenantSuperAdmin=isTenantSuperAdmin;\n    window.__smallbizHasPermission=(code)=>isTenantSuperAdmin||permissionCodes.has(String(code||""));\n    if(permissionsReady)window.dispatchEvent(new Event("smallbiz:permissions-ready"));\n  },[permissionsReady,isTenantSuperAdmin,permissionCodes]);\n';
if (main.includes(profileEffectAnchor) && !main.includes("loadEffectivePermissions(profile)")) main = main.replace(profileEffectAnchor, profileEffectAnchor + permissionEffect);

const roleBlock = 'const role=String(profile?.role||"owner").toLowerCase();\n  const isOwner=isTenantSuperAdmin;\n  const canSell=isOwner||role==="manager"||role==="cashier";\n  const canViewReports=isOwner||role==="manager";\n  const canManageInventory=isOwner||role==="manager";\n  const canManagePurchasing=isOwner||role==="manager";\n  const canManageMasters=isOwner||role==="manager";';
if (!main.includes(roleBlock)) throw new Error("Expected permission role block not found; build stopped safely.");

const newPermissionBlock = `const role=String(profile?.role||"cashier").toLowerCase();
  const hasPermission=code=>isTenantSuperAdmin||permissionCodes.has(String(code||""));
  const isOwner=isTenantSuperAdmin;
  const canSell=hasPermission("pos.use");
  const canViewReports=hasPermission("reports.view");
  const canManageInventory=hasPermission("products.manage")||hasPermission("inventory.adjust");
  const canManagePurchasing=hasPermission("inventory.purchase");
  const canManageMasters=hasPermission("products.manage")||hasPermission("settings.manage");`;
main = main.replace(roleBlock, newPermissionBlock);

const helperAnchor = '  function paymentLabel(m){return m==="gcash"?"GCash":m==="card"?"Card":"Cash"}\n';
const helper = `
  async function loadEffectivePermissions(p){
    if(!supabase||!p?.id||!p?.business_id)return;
    const [{data:tenantAdmin,error:tenantError},{data:roleRows,error:roleError},{data:userRows,error:userError},{data:allPermissions,error:allError}]=await Promise.all([
      supabase.from("tenant_superadmins").select("business_id,user_id").eq("business_id",p.business_id).eq("user_id",p.id).maybeSingle(),
      supabase.from("role_permissions").select("role,permission_id,allowed").eq("role",p.role),
      supabase.from("user_permissions").select("permission_id,allowed").eq("user_id",p.id),
      supabase.from("permissions").select("id,code")
    ]);
    if(tenantError||roleError||userError||allError)throw new Error(tenantError?.message||roleError?.message||userError?.message||allError?.message||"Unable to load permissions.");
    const superAdmin=Boolean(tenantAdmin?.user_id===p.id&&tenantAdmin?.business_id===p.business_id);
    const codesById=new Map((allPermissions||[]).map(x=>[x.id,x.code]));
    const effective=new Map();
    (roleRows||[]).forEach(row=>{const code=codesById.get(row.permission_id);if(code)effective.set(code,row.allowed!==false);});
    (userRows||[]).forEach(row=>{const code=codesById.get(row.permission_id);if(code)effective.set(code,row.allowed===true);});
    if(superAdmin)(allPermissions||[]).forEach(row=>effective.set(row.code,true));
    setIsTenantSuperAdmin(superAdmin);
    setPermissionCodes(new Set(Array.from(effective.entries()).filter(([,allowed])=>allowed).map(([code])=>code)));
    setPermissionsReady(true);
  }

`;
if (main.includes(helperAnchor) && !main.includes("async function loadEffectivePermissions")) main = main.replace(helperAnchor, helperAnchor + helper);

const sidebarNeedle = '{[["pos","🛒","POS",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["products","📦","Products",canManageInventory],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canManageMasters],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManageMasters],["movements","🔄","Stock History",canManageInventory]].filter(x=>x[3]).map(([key,icon,label])=>';
const sidebarReplacement = '{[["pos","🛒","POS",canSell],["dashboard","📈","Dashboard",canViewReports],["transactions","📋","Transactions",canSell],["reports","📊","Reports",canViewReports],["products","📦","Products",hasPermission("products.view")],["categories","🏷️","Categories",canManageMasters],["customers","👥","Customers",canSell],["purchases","🚚","Purchasing",canManagePurchasing],["suppliers","🏢","Suppliers",canManagePurchasing],["attendance","👥","Employees / Attendance",hasPermission("attendance.view")],["movements","🔄","Stock History",hasPermission("inventory.view")]].filter(x=>x[3]).map(([key,icon,label])=>';
if (main.includes(sidebarNeedle)) main = main.replace(sidebarNeedle, sidebarReplacement);

if (!main.includes("window.__smallbizHasPermission")) throw new Error("Permission bridge was not inserted safely.");
if (!main.includes("hasPermission(\"pos.use\")")) throw new Error("Permission-based POS access was not inserted safely.");
if (!main.includes("hasPermission(\"attendance.view\")")) throw new Error("Permission-based Attendance access was not inserted safely.");

fs.writeFileSync(mainPath, main);
console.log("Applied SMALLBIZ_TENANT_PERMISSION_MODEL_V1: tenant super-admin full access + per-user permission overrides.");
