import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await p.evaluate(()=>window.scrollTo(0,5750));
await new Promise(r=>setTimeout(r,1500));
const o=await p.evaluate(()=>{
  const el=document.querySelector(".pp-video-puente");
  const cs=getComputedStyle(el);
  const inn=el.querySelector(".nota"); const ci=getComputedStyle(inn);
  const pa=document.querySelector(".pp-video-caps"); const cp=getComputedStyle(pa);
  return {cls:el.className, op:cs.opacity, bg:cs.backgroundColor, border:cs.borderColor, color:cs.color, nota:ci.color, caps:{h:pa.getBoundingClientRect().height, wrap:cp.flexWrap, w:pa.getBoundingClientRect().width}};
});
console.log(JSON.stringify(o,null,1));
await p.screenshot({path:".shots/rediseno/puente.png",clip:{x:80,y:700,width:1280,height:240}});
await b.close();
