import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1200));
await p.click(".pp-campana");
await new Promise(r=>setTimeout(r,500));
const out = await p.evaluate(()=>{
  const el = document.querySelector(".pp-avisos-panel");
  const cs = getComputedStyle(el);
  return {bg:cs.backgroundColor, bgi:cs.backgroundImage, bf:cs.backdropFilter, op:cs.opacity, panelVar:getComputedStyle(document.documentElement).getPropertyValue("--luz-panel")};
});
console.log(out);
await b.close();
