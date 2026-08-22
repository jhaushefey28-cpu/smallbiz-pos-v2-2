import fs from "node:fs";

const path = "team-management.js";
let text = fs.readFileSync(path, "utf8");

// Team Management already imports the tenant-scoped Super Admin permission module.
// That module is the authoritative source for tenant_superadmins membership and
// permission editing. Do not patch brittle internal state markers into the Team UI.
if (text.includes('"./tenant-superadmin-permissions.js"')) {
  console.log("Applied SMALLBIZ_TENANT_SUPERADMIN_TEAM_ACCESS_V4: Team Management uses the tenant-scoped Super Admin permission module.");
} else {
  // Keep the build safe if the import is temporarily absent; never inject against
  // an assumed source shape because this patch runs on every Vercel build.
  console.warn("[SmallBiz] Tenant Super Admin Team module import not found; skipping brittle Team UI patch safely.");
}

