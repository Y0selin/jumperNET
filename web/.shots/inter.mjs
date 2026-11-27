import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/usr/bin/chromium",headless:"new",args:["--no-sandbox","--disable-gpu","--autoplay-policy=no-user-gesture-required"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:1000});
const errores=[];
p.on("pageerror",e=>errores.push("pageerror: "+e.message));
p.on("console",m=>{if(m.type()==="error"&&!m.text().includes("CORS")&&!m.text().includes("ERR_FAILED"))errores.push(m.text())});
await p.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await p.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,900));
const r={};
// simulador
r.nodosIniciales=await p.$$eval(".hn-nodo b",els=>els.map(e=>e.textContent));
await p.click(".hn-nodo:nth-child(3)");
r.sel=await p.$eval(".hn-nodo:nth-child(3)",e=>e.classList.contains("sel"));
await p.click(".hn-girar");
r.nodosTrasGirar=await p.$$eval(".hn-nodo b",els=>els.map(e=>e.textContent));
await p.click(".hero-switch");
r.off=await p.$eval(".hn-panel",e=>e.classList.contains("off"));
r.estado=await p.$eval(".hn-estado",e=>e.textContent.trim());
await p.click(".hero-switch");
// video largo
await p.evaluate(()=>document.querySelector("#video").scrollIntoView());
await new Promise(r=>setTimeout(r,900));
r.video=await p.$eval(".vv video",v=>({poster:v.poster.split("/").pop(),muted:v.muted,paused:v.paused,ready:v.readyState}));
await p.click(".vv-play");
await new Promise(r=>setTimeout(r,1500));
r.reproducido=await p.$eval(".vv video",v=>({paused:v.paused,t:v.currentTime,muted:v.muted}));
r.range=await p.$eval(".vv-barra input",i=>({max:i.max,val:i.value}));
await p.click(".vv-boton[aria-pressed]");
r.mudoDespues=await p.$eval(".vv video",v=>v.muted);
// capitulo
await p.evaluate(()=>document.querySelectorAll(".vv-caps-lista button")[2].click());
await new Promise(r=>setTimeout(r,600));
r.capitulo=await p.$eval(".vv video",v=>v.currentTime);
// modo
await p.evaluate(()=>window.scrollTo(0,0));
await p.click(".pp-nav-acciones .rep-boton, .pp-nav-acciones button[aria-label*='modo'], .pp-nav-acciones button[title*='modo']").catch(()=>{});
r.modo=await p.evaluate(()=>document.documentElement.dataset.modo);
// móvil
const m=await b.newPage();
await m.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await m.evaluateOnNewDocument(()=>{localStorage.setItem("jumpernet-modo-v1","oscuro");localStorage.setItem("jumpernet-intro-v31","vista");localStorage.setItem("jumpernet-visita-v31","vista");sessionStorage.setItem("jumpernet-promo-aviso-v1","1");});
await m.goto("http://127.0.0.1:5199/",{waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,800));
r.movil=await m.evaluate(()=>({dock:document.querySelectorAll(".jn-dock-item").length, overflowX:document.documentElement.scrollWidth>window.innerWidth+1, sw:document.documentElement.scrollWidth, iw:window.innerWidth}));
console.log(JSON.stringify(r,null,1));
console.log("ERRORES:", errores.length?errores.join("\n"):"ninguno");
await b.close();
