import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","claro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,900));
const o=await p.evaluate(()=>{
  const c=document.querySelector(".pp-video-caps"); const cs=getComputedStyle(c);
  return {wrap:cs.flexWrap, of:cs.overflowX, h:c.getBoundingClientRect().height, w:c.getBoundingClientRect().width, kids:[...c.children].map(k=>Math.round(k.getBoundingClientRect().width))};
});
console.log(JSON.stringify(o));
await p.goto("http://127.0.0.1:5199/#/tarifas",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,900));
const q=await p.evaluate(()=>{const el=document.querySelector(".jn-plan-pro"); const cs=getComputedStyle(el); return {bg:cs.backgroundImage.slice(0,150), color:cs.color};});
console.log(JSON.stringify(q));
await b.close();
