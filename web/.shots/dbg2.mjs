import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,1000));
await p.click(".pp-campana");
await new Promise(r=>setTimeout(r,600));
const out = await p.evaluate(()=>{
  const li = document.querySelector(".pp-avisos-lista li");
  const cs = getComputedStyle(li);
  const encontrados = [];
  for (const hoja of document.styleSheets) {
    let reglas; try { reglas = hoja.cssRules; } catch { continue; }
    const recorre = (lista) => {
      for (const r of lista) {
        if (r.cssRules) { recorre(r.cssRules); continue; }
        if (!r.selectorText) continue;
        let casa = false;
        try { casa = li.matches(r.selectorText); } catch { continue; }
        if (casa) encontrados.push({sel:r.selectorText, css:r.style.cssText.slice(0,160)});
      }
    };
    recorre(reglas);
  }
  return {pos:cs.position, op:cs.opacity, anim:cs.animationName, encontrados};
});
console.log(JSON.stringify(out,null,1));
await b.close();
