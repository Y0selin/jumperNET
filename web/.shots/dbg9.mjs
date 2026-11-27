import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1400));
await p.tap(".pp-campana");
await new Promise(r=>setTimeout(r,600));
const out = await p.evaluate(()=>{
  const el = document.querySelector(".pp-avisos-panel");
  const cs = getComputedStyle(el);
  const anc = [];
  let n = el;
  while (n && n !== document.body) { const c = getComputedStyle(n); anc.push({c:n.className, op:c.opacity, z:c.zIndex, bf:c.backdropFilter, pos:c.position}); n = n.parentElement; }
  return {bg:cs.backgroundColor, op:cs.opacity, bf:cs.backdropFilter, anc};
});
console.log(JSON.stringify(out,null,1));
await b.close();
