import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","claro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await p.goto("http://127.0.0.1:5199/#/tarifas",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1200));
const o=await p.evaluate(()=>{
  const el=document.querySelector(".jn-plan-pro");
  const cs=getComputedStyle(el);
  return {cls:el.className, bg:cs.backgroundImage, bgc:cs.backgroundColor, color:cs.color, radius:cs.borderRadius, htmlModo:document.documentElement.dataset.modo, tema:document.documentElement.dataset.tema, w: el.getBoundingClientRect().width};
});
console.log(JSON.stringify(o,null,1));
await p.screenshot({path:".shots/rediseno/pro-claro.png",clip:{x:520,y:550,width:400,height:440}});
await b.close();
