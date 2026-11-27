import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>{location.hash="#/lab";});
await new Promise(r=>setTimeout(r,250));
const out = await p.evaluate(()=>{
  const bar = document.querySelector(".vivo-carga-barra i");
  if (!bar) return "sin barra";
  const cs = getComputedStyle(bar);
  const caja = bar.parentElement.getBoundingClientRect().toJSON();
  return {w:cs.width, h:cs.height, bg:cs.backgroundImage, bgc:cs.backgroundColor, disp:cs.display, caja};
});
console.log(JSON.stringify(out,null,1));
await b.close();
