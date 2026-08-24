import fs from "node:fs";

const path="main.jsx";
let text=fs.readFileSync(path,"utf8");

if(!text.includes('const [recentScanned,setRecentScanned]=useState([]);')){
  throw new Error("Barcode state anchor not found; refusing unsafe scanner patch.");
}

if(text.includes('SMALLBIZ_UNIVERSAL_HID_SCANNER_V1')){
  console.log("Universal HID scanner already present; skipped.");
  process.exit(0);
}

const anchor='  const [recentScanned,setRecentScanned]=useState([]);';
const addition=anchor+`\n  // SMALLBIZ_UNIVERSAL_HID_SCANNER_V1: USB/wireless/Bluetooth HID scanners use keyboard events.\n  const barcodeBufferRef=useRef("");\n  const barcodeLastKeyRef=useRef(0);\n  useEffect(()=>{\n    if(!session?.user||!profile?.business_id)return;\n    const onKeyDown=event=>{\n      if(event.ctrlKey||event.altKey||event.metaKey)return;\n      const target=event.target;\n      const tag=String(target?.tagName||"").toLowerCase();\n      const editable=Boolean(target?.isContentEditable)||tag==="input"||tag==="textarea"||tag==="select";\n      const now=performance.now();\n      const gap=now-barcodeLastKeyRef.current;\n      if(gap>120){barcodeBufferRef.current="";}\n      barcodeLastKeyRef.current=now;\n      if(event.key==="Enter"){\n        const code=barcodeBufferRef.current.trim();\n        barcodeBufferRef.current="";\n        if(!editable&&code.length>=4){\n          event.preventDefault();\n          event.stopPropagation();\n          const product=products.find(p=>String(p.barcode||"").trim()===code);\n          if(product){handleScannedProduct(product);setSearch(product.barcode);setStatus("Scanned: "+product.name);}\n          else{setSearch(code);setStatus("Barcode not found: "+code);}\n        }\n        return;\n      }\n      if(editable)return;\n      if(event.key.length===1){\n        barcodeBufferRef.current+=event.key;\n        if(barcodeBufferRef.current.length>96)barcodeBufferRef.current=barcodeBufferRef.current.slice(-96);\n      }\n    };\n    window.addEventListener("keydown",onKeyDown,true);\n    return()=>window.removeEventListener("keydown",onKeyDown,true);\n  },[session?.user?.id,profile?.business_id,products]);`;
text=text.replace(anchor,addition);
fs.writeFileSync(path,text,"utf8");
console.log("Applied SMALLBIZ_UNIVERSAL_HID_SCANNER_V1: wired, wireless-dongle and Bluetooth HID barcode scanners share the existing POS barcode handler; mobile layout untouched.");
