import fs from "node:fs";

const path="team-management.js";
let text=fs.readFileSync(path,"utf8");

const stateOld='const state = { session: null, profile: null, settings: null, members: [], busy: false };';
if(text.includes(stateOld)&&!text.includes("isTenantSuperAdmin")) {
  text=text.replace(stateOld,'const state = { session: null, profile: null, settings: null, members: [], busy: false, isTenantSuperAdmin: false };');
}

// The permission model may already have changed the Team module's loadContext implementation.
// Do not depend on an obsolete exact source block. Instead, augment the current context loader
// only when the tenant-super-admin marker/query is not already present.
if(!text.includes("state.isTenantSuperAdmin")) {
  const marker='state.profile = profile;';
  if(!text.includes(marker)) throw new Error("Tenant Super Admin team access patch failed safely: profile context marker not found.");
  const injected='''const { data: tenantAdmin } = await sb.from("tenant_superadmins").select("business_id,user_id").eq("business_id", profile.business_id).eq("user_id", profile.id).maybeSingle();
  state.isTenantSuperAdmin = Boolean(tenantAdmin?.user_id===profile.id && tenantAdmin?.business_id===profile.business_id);
  ''';
  text=text.replace(marker, injected + marker);
}

if(!text.includes("state.isTenantSuperAdmin")) throw new Error("Tenant Super Admin team access patch failed safely.");
fs.writeFileSync(path,text);
console.log("Applied SMALLBIZ_TENANT_SUPERADMIN_TEAM_ACCESS_V2: tenant super-admin marker is applied without relying on obsolete loader source.");
