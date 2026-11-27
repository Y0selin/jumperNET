import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000,deviceScaleFactor:1.5});
for (const modo of ["claro","oscuro"]) {
  await p.evaluateOnNewDocument((m)=>{localStorage.setItem("jumpernet-modo-v1",m);localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");}, modo);
  await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
  await new Promise(r=>setTimeout(r,1000));
  const r=await p.evaluate(()=>{const v=document.querySelector(".hn-video-hero").getBoundingClientRect();return {x:v.x,y:v.y,w:v.width,h:v.height}});
  await p.screenshot({path:`.shots/rediseno/crop-video-${modo}.png`,clip:{x:r.x-10,y:r.y-10,width:r.w+20,height:r.h+80}});
  await p.goto("http://127.0.0.1:5199/#/tarifas",{waitUntil:"networkidle2"});
  await new Promise(r=>setTimeout(r,900));
  await p.screenshot({path:`.shots/rediseno/crop-pro-${modo}.png`,clip:{x:510,y:540,width:420,height:460}});
}
await b.close();
