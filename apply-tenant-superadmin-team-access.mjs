import fs from "node:fs";

const path="team-management.js";
let text=fs.readFileSync(path,"utf8");

const stateOld='const state = { session: null, profile: null, settings: null, members: [], busy: false };';
const stateNew='const state = { session: null, profile: null, settings: null, members: [], busy: false, isTenantSuperAdmin: false };';
if(text.includes(stateOld)&&!text.includes("isTenantSuperAdmin: false"))text=text.replace(stateOld,stateNew);

const old=`async function loadContext() {
  if (!sb) return false;
  const { data: sessionData } = await sb.auth.getSession();
  state.session = sessionData?.session || null;
  if (!state.session?.user) return false;
  const { data: profile, error } = await sb.from("profiles").select("id,business_id,full_name,role,active").eq("id", state.session.user.id).maybeSingle();
  if (error || !profile) return false;
  state.profile = profile;
  return isAdminRole(profile.role) && profile.active !== false;
}`;
const replacement=`async function loadContext() {
  if (!sb) return false;
  const { data: sessionData } = await sb.auth.getSession();
  state.session = sessionData?.session || null;
  if (!state.session?.user) return false;
  const { data: profile, error } = await sb.from("profiles").select("id,business_id,full_name,role,active").eq("id", state.session.user.id).maybeSingle();
  if (error || !profile) return false;
  const { data: tenantAdmin } = await sb.from("tenant_superadmins").select("business_id,user_id").eq("business_id", profile.business_id).eq("user_id", profile.id).maybeSingle();
  state.profile = profile;
  state.isTenantSuperAdmin = Boolean(tenantAdmin?.user_id===profile.id && tenantAdmin?.business_id===profile.business_id);
  return (state.isTenantSuperAdmin || isAdminRole(profile.role)) && profile.active !== false;
}`;
if(text.includes(old))text=text.replace(old,replacement);

if(!text.includes("state.isTenantSuperAdmin"))throw new Error("Tenant Super Admin team access patch failed safely.");
fs.writeFileSync(path,text);
console.log("Applied SMALLBIZ_TENANT_SUPERADMIN_TEAM_ACCESS_V1: tenant super-admin access is independent of profile role.");
