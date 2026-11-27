import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>{location.hash="#/lab";});
for (const ms of [120, 250, 400, 550]) {
  await new Promise(r=>setTimeout(r, ms===120?120:ms-(ms===250?120:ms===400?250:400)));
  const d = await p.evaluate(()=>{
    const bar = document.querySelector(".vivo-carga-barra i");
    const txt = document.querySelector(".vivo-carga-pie span");
    return bar ? {inline:bar.getAttribute("style"), w:getComputedStyle(bar).width, txt:txt?.textContent} : "sin barra";
  });
  console.log(ms, JSON.stringify(d));
}
await p.screenshot({path:".shots/vivo/barra.png", clip:{x:560,y:560,width:340,height:80}});
await b.close();
