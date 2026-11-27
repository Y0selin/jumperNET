import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
mkdirSync(".shots/rediseno", { recursive: true });
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu","--hide-scrollbars"]});
for (const modo of ["oscuro","claro"]) {
  for (const [ruta,nombre] of [["/funciona","funciona"],["/tarifas","tarifas"],["/lab","lab"]]) {
    const p = await b.newPage();
    await p.setViewport({width:1440,height:1000});
    await p.evaluateOnNewDocument((m)=>{localStorage.setItem("jumpernet-modo-v1",m);localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");}, modo);
    await p.goto(`http://127.0.0.1:5199/#${ruta}`,{waitUntil:"networkidle2"});
    await new Promise(r=>setTimeout(r,1600));
    await p.screenshot({path:`.shots/rediseno/pag-${modo}-${nombre}.png`});
    await p.close();
    console.log(`ok ${modo} ${ruta}`);
  }
}
await b.close();
