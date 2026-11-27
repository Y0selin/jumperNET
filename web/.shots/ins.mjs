import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1000));
const out = await p.evaluate(()=>{
  const sw=document.querySelector(".hero-switch");
  const sp=sw.querySelector("span");
  const cs=getComputedStyle(sw), ps=getComputedStyle(sp);
  const pl=document.querySelector(".hn-nodo-ico");
  return {sw:{bg:cs.backgroundColor,border:cs.borderColor},sp:{bg:ps.backgroundColor,shadow:ps.boxShadow,w:ps.width,h:ps.height},accent:getComputedStyle(document.documentElement).getPropertyValue("--acento-1"), pl: pl?pl.getBoundingClientRect():null, avail: document.querySelector(".hn-paradas").getBoundingClientRect()};
});
console.log(JSON.stringify(out,null,1));
await b.close();
