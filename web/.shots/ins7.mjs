import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","claro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,900));
const o=await p.evaluate(()=>{
  const info=(s)=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return {y:Math.round(r.y),h:Math.round(r.height),pt:cs.paddingTop,mt:cs.marginTop,gap:cs.gap,disp:cs.display};};
  return {hero:info(".hn-hero"), g:info(".hn-guirnalda"), txt:info(".hn-hero-txt"), hoy:info(".hn-hoy"), eyebrow:info(".hn-eyebrow"), titulo:info(".hn-titulo"), vis:info(".hn-hero-visual"), heroPt:getComputedStyle(document.querySelector(".hn-hero")).padding, txtH:document.querySelector(".hn-hero-txt").getBoundingClientRect().height};
});
console.log(JSON.stringify(o,null,1));
await b.close();
