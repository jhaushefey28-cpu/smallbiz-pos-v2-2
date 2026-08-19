function compactComboSidebar(){
  const nodes=[...document.querySelectorAll('a,button,[role="button"],li,div')];
  nodes.forEach(node=>{
    const text=(node.textContent||'').replace(/\s+/g,' ').trim();
    if(!/^🎁?\s*Combo\s*\/\s*Sets$/i.test(text) && !/^Combo\s*\/\s*Sets$/i.test(text)) return;
    const target=node.closest('a,button,[role="button"]')||node;
    target.classList.add('sb-combo-sidebar-item');
    target.style.whiteSpace='nowrap';
    target.style.minHeight='52px';
    target.style.height='52px';
    target.style.paddingTop='8px';
    target.style.paddingBottom='8px';
    target.style.lineHeight='1.15';
    const labels=[...target.querySelectorAll('*')].filter(x=>/Combo\s*\/\s*Sets/i.test((x.textContent||'').replace(/\s+/g,' ').trim()));
    labels.forEach(label=>{
      label.style.whiteSpace='nowrap';
      label.style.lineHeight='1.15';
      label.style.fontSize='14px';
    });
  });
}
compactComboSidebar();
const observer=new MutationObserver(()=>compactComboSidebar());
observer.observe(document.body,{subtree:true,childList:true});
setTimeout(()=>observer.disconnect(),15000);
