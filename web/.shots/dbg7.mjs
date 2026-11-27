import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1400));
console.log("reduce:", await p.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches));
await p.evaluate(()=>{location.hash="#/tarifas";});
for (const ms of [80,200,350,600,900]) { await new Promise(r=>setTimeout(r,ms===80?80:150)); console.log(ms, await p.evaluate(()=>!!document.querySelector(".vivo-carga"))); }
await p.screenshot({path:".shots/vivo/movil-nav.png"});
await b.close();
