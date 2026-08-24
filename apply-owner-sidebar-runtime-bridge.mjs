import fs from "node:fs";

const path = "main.jsx";
const source = fs.readFileSync(path, "utf8");
const marker = '    setProfile(p);';
const bridge = `    setProfile(p);\n    // SMALLBIZ_OWNER_SIDEBAR_RUNTIME_BRIDGE_V1\n    // Start the non-destructive owner sidebar loader only after the authenticated profile is known.\n    // This does not alter mobile CSS/layout or existing sidebar items.\n    if(typeof window !== "undefined"){\n      const role=String(p?.role||"").toLowerCase();\n      const owner=role==="owner"||role==="admin"||role==="super_admin";\n      window.__smallbizIsOwner=owner;\n      window.__smallbizProfile=p;\n      if(owner){\n        import("./owner-modules-loader.jsx").then(mod=>{\n          try{\n            mod.startOwnerModules?.();\n            window.dispatchEvent(new CustomEvent("smallbiz:permissions-ready"));\n          }catch(error){console.warn("[SmallBiz] Owner sidebar runtime bridge failed",error)}\n        }).catch(error=>console.warn("[SmallBiz] Owner sidebar loader import failed",error));\n      }\n    }`;

if (source.includes("SMALLBIZ_OWNER_SIDEBAR_RUNTIME_BRIDGE_V1")) {
  console.log("Owner sidebar runtime bridge already present; leaving main.jsx unchanged.");
  process.exit(0);
}
if (!source.includes(marker)) {
  throw new Error("Authenticated profile assignment marker not found; refusing to mutate main.jsx.");
}

fs.writeFileSync(path, source.replace(marker, bridge), "utf8");
console.log("Applied SMALLBIZ_OWNER_SIDEBAR_RUNTIME_BRIDGE_V1: owner loader starts after profile authentication without changing mobile layout.");
