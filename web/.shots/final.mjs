import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu","--hide-scrollbars"]});
for (const modo of ["oscuro","claro"]) {
  const p = await b.newPage();
  await p.setViewport({width:1440,height:1000});
  await p.evaluateOnNewDocument((m)=>{localStorage.setItem("jumpernet-modo-v1",m);localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");}, modo);
  await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
  await new Promise(r=>setTimeout(r,1200));
  await p.screenshot({path:`.shots/rediseno/ok-${modo}-hero.png`});
  await p.evaluate(()=>window.scrollTo(0,5600));
  await new Promise(r=>setTimeout(r,1200));
  await p.screenshot({path:`.shots/rediseno/ok-${modo}-video.png`});
  await p.close();
  const m = await b.newPage();
  await m.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await m.evaluateOnNewDocument((x)=>{localStorage.setItem("jumpernet-modo-v1",x);localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");}, modo);
  await m.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
  await new Promise(r=>setTimeout(r,1000));
  await m.screenshot({path:`.shots/rediseno/ok-${modo}-movil.png`});
  await m.evaluate(()=>window.scrollTo(0,1150));
  await new Promise(r=>setTimeout(r,900));
  await m.screenshot({path:`.shots/rediseno/ok-${modo}-movil-video.png`});
  await m.close();
}
await b.close();
