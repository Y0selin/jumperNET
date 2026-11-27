import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
for (const modo of ["oscuro","claro"]) {
  const p = await b.newPage();
  await p.setViewport({width:1440,height:1000});
  await p.evaluateOnNewDocument((m)=>{localStorage.setItem("jumpernet-modo-v1",m);localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");}, modo);
  await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
  await new Promise(r=>setTimeout(r,2600));
  await p.screenshot({path:`.shots/rediseno/promo-${modo}.png`,clip:{x:980,y:760,width:460,height:240}});
  await p.click(".btn-modo");
  await new Promise(r=>setTimeout(r,500));
  const m=await p.evaluate(()=>document.documentElement.dataset.modo);
  console.log(modo,"->",m);
  await p.close();
}
await b.close();
