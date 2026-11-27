import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
for (const [modo, vp, movil] of [["oscuro",{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2},true],["claro",{width:1440,height:1000},false]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.evaluateOnNewDocument((m)=>{localStorage.setItem("jumpernet-modo-v1",m);localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");}, modo);
  await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
  await new Promise(r=>setTimeout(r,1400));
  movil ? await p.tap(".pp-campana") : await p.click(".pp-campana");
  await new Promise(r=>setTimeout(r,600));
  await p.screenshot({path:`.shots/vivo/panel-fix-${modo}.png`});
  await p.close();
}
await b.close(); console.log("ok");
