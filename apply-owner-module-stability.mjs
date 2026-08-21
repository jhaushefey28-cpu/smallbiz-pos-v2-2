import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");
const legacy='import "./post-login-modules.js";';
if(text.includes(legacy)){
  text=text.replace(legacy+"\n","").replace(legacy,"");
  fs.writeFileSync(path,text);
  console.log("Removed legacy DOM module loader; Vite-native owner loader is authoritative.");
}else{
  console.log("Legacy DOM module loader already absent.");
}
