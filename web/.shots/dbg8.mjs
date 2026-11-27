import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1200));
await p.click(".pp-campana");
await new Promise(r=>setTimeout(r,900));
const out = await p.evaluate(()=>{
  const el = document.querySelector(".pp-avisos-panel");
  const an = el.getAnimations().map(a=>({name:a.animationName, state:a.playState, time:a.currentTime, fill:a.effect.getTiming().fill}));
  return {op:getComputedStyle(el).opacity, anim:an, n:document.querySelectorAll(".pp-avisos-panel").length, rect:el.getBoundingClientRect().toJSON()};
});
console.log(JSON.stringify(out,null,1));
await p.screenshot({path:".shots/vivo/panel-listo.png"});
await b.close();
