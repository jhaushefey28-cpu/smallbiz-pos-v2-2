import fs from "node:fs";

const path="owner-modules-loader.jsx";
let text=fs.readFileSync(path,"utf8");

const oldOpen=`function openLoadedModule(item){if(item.key==="team"&&typeof window.__smallbizOpenTeam==="function"){window.__smallbizOpenTeam();return true}const internal=findInternalButton(item);if(internal){internal.click();return true}window.dispatchEvent(new CustomEvent(\`smallbiz:open-\${item.key}\`));return false}`;
const newOpen=`function openLoadedModule(item){if(item.key==="team"&&typeof window.__smallbizOpenTeam==="function"){window.__smallbizOpenTeam();return true}if(item.key==="growth"&&typeof window.__smallbizOpenGrowthCenter==="function"){window.__smallbizOpenGrowthCenter();return true}if(item.key==="cashier-shift"&&typeof window.__smallbizOpenCashierShift==="function"){window.__smallbizOpenCashierShift();return true}const internal=findInternalButton(item);if(internal){internal.click();return true}window.dispatchEvent(new CustomEvent(\`smallbiz:open-\${item.key}\`));return false}`;

const oldLoad=`async function loadOwnerModule(item,button){if(!hasPermission(item.permission)||loading.has(item.key))return;if(loaded.has(item.key)){openLoadedModule(item);return}loading.add(item.key);button?.setAttribute("aria-busy","true");const labelNode=button?.querySelector("b");if(labelNode)labelNode.textContent=\`\${item.label}…\`;try{await item.load();loaded.add(item.key);const internal=await waitForInternalButton(item);if(internal)internal.click();else window.dispatchEvent(new CustomEvent(\`smallbiz:open-\${item.key}\`))}catch(error){console.warn(\`[SmallBiz] \${item.label} failed to load.\`,error);window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}))}finally{button?.removeAttribute("aria-busy");const currentLabel=button?.querySelector("b");if(currentLabel)currentLabel.textContent=item.label;loading.delete(item.key)}}`;
const newLoad=`async function loadOwnerModule(item,button){if(!hasPermission(item.permission)||loading.has(item.key))return;if(loaded.has(item.key)){openLoadedModule(item);return}loading.add(item.key);button?.setAttribute("aria-busy","true");const labelNode=button?.querySelector("b");if(labelNode)labelNode.textContent=\`\${item.label}…\`;try{await item.load();loaded.add(item.key);if(item.key==="growth"||item.key==="cashier-shift"){await openLoadedModule(item);return}const internal=await waitForInternalButton(item);if(internal)internal.click();else window.dispatchEvent(new CustomEvent(\`smallbiz:open-\${item.key}\`))}catch(error){console.warn(\`[SmallBiz] \${item.label} failed to load.\`,error);window.dispatchEvent(new CustomEvent("smallbiz:owner-module-error",{detail:{key:item.key,label:item.label,error}}))}finally{button?.removeAttribute("aria-busy");const currentLabel=button?.querySelector("b");if(currentLabel)currentLabel.textContent=item.label;loading.delete(item.key)}}`;

if(text.includes(oldOpen)) text=text.replace(oldOpen,newOpen);
else throw new Error("Owner loader direct-open block not found; refusing unsafe patch.");
if(text.includes(oldLoad)) text=text.replace(oldLoad,newLoad);
else throw new Error("Owner loader load block not found; refusing unsafe patch.");

fs.writeFileSync(path,text,"utf8");
console.log("Applied final Growth/Cashier direct-open routing after the build-time owner loader is generated.");
