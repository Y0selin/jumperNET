import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1200));
await p.click(".pp-campana");
await new Promise(r=>setTimeout(r,600));
const info = await p.evaluate(()=>{
  const panel = document.querySelector(".pp-avisos-panel");
  const ul = document.querySelector(".pp-avisos-lista");
  return {
    panel: panel.getBoundingClientRect().toJSON(),
    panelCS: {overflow:getComputedStyle(panel).overflow, maxH:getComputedStyle(panel).maxHeight, z:getComputedStyle(panel).zIndex},
    ul: ul.getBoundingClientRect().toJSON(),
    ulCS: {maxH:getComputedStyle(ul).maxHeight, scrollTop:ul.scrollTop, sh:ul.scrollHeight, ch:ul.clientHeight, display:getComputedStyle(ul).display},
    items: [...ul.children].map(li=>({t:li.textContent.slice(0,30), r:li.getBoundingClientRect().toJSON(), op:getComputedStyle(li).opacity, vis:getComputedStyle(li).visibility})),
  };
});
console.log(JSON.stringify(info,null,1));
await b.close();
