/* diagflujo2: flujo REAL del usuario con la extension v1.0.2 (sin config.json):
   1) arranque limpio (debe navegar por SU IP, sin proxy)
   2) "escribir creds + ACTIVAR" (storage.local) con la cuenta de prueba,
      cuyo circuito guardado en DB tiene un hop MUERTO (peer_prueba)
   3) navegar a api.ipify.org: debe ver la IP del exit (reparacion auto) */
import puppeteer from "puppeteer-core";
const DIST = process.env.DIST || "extension/dist/chrome";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM, headless: true,
  args: ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage",`--disable-extensions-except=${DIST}`,`--load-extension=${DIST}`],
});
let sw=null; for(let i=0;i<40&&!sw;i++){sw=browser.targets().find(t=>t.type()==="service_worker"&&t.url().includes("background.js"));if(!sw)await new Promise(r=>setTimeout(r,250));}
if(!sw){console.error("sin SW");process.exit(1);}
const worker = await sw.worker();
async function ip(tag){
  const p = await browser.newPage();
  try{
    await p.goto("https://api.ipify.org",{waitUntil:"networkidle2",timeout:30000});
    console.log(tag, "IP pagina:", await p.evaluate(()=>document.body.innerText.trim().slice(0,40)));
  }catch(e){ console.log(tag, "no cargo:", String(e).slice(0,110)); }
  await p.close();
}
await ip("1) recien instalada, sin creds (debe ver TU IP):");
// el usuario escribe sus credenciales y pulsa ACTIVAR
await worker.evaluate(async()=>{
  await chrome.storage.local.set({configJumperNAT:{host:"jumpernet.duckdns.org",puerto:1081,usuario:"socksuser@test.local",clave:"sup3rguay",activo:true}});
});
await new Promise(r=>setTimeout(r,1200));
const estado = await worker.evaluate(async()=>{
  let a="error"; try{a=(await chrome.proxy.settings.get({})).value;}catch(e){a=String(e).slice(0,100);}
  return a;
});
console.log("2) ajustes del navegador tras ACTIVAR:", JSON.stringify(estado));
await ip("3) tras ACTIVAR con denom circuito con hop muerto (debe ver IP del exit):");
await ip("4) de nuevo (estabilidad):");
await browser.close();
