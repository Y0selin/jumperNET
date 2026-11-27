import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>{location.hash="#/lab";});
await new Promise(r=>setTimeout(r,500));
const out = await p.evaluate(()=>{
  const el = document.querySelector(".vivo-carga-barra i");
  const cs = getComputedStyle(el);
  const reglas = [];
  for (const hoja of document.styleSheets) {
    let rs; try { rs = hoja.cssRules; } catch { continue; }
    const rec = (l) => { for (const r of l) { if (r.cssRules) { rec(r.cssRules); continue; } if (!r.selectorText) continue; let m=false; try { m = el.matches(r.selectorText); } catch { continue; } if (m) reglas.push(r.selectorText + " => " + r.style.cssText.slice(0,120)); } };
    rec(rs);
  }
  return {pos:cs.position, w:cs.width, maxW:cs.maxWidth, minW:cs.minWidth, ov:cs.overflow, off:el.offsetWidth, parentW:el.parentElement.offsetWidth, parentDisp:getComputedStyle(el.parentElement).display, reglas};
});
console.log(JSON.stringify(out,null,1));
await b.close();
