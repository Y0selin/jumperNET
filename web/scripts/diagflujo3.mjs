/* diagflujo3 — ciclo COMPLETO del usuario con la v1.0.3:
   1) instalacion limpia -> navega DIRECTO (su IP)
   2) ACTIVAR con su cuenta -> navega por el circuito (IP del exit)
   3) DESACTIVAR (boton del popup) -> vuelve a navegar directo (su IP)
   4) re-ACTIVAR -> circuito otra vez (estabilidad) */
import puppeteer from "puppeteer-core";
const DIST = process.env.DIST || "extension/dist/chrome";
const USER = "diag1003@jumpernat.test", CLAVE = "Diag#2026x!";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM, headless: true,
  args: ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage",`--disable-extensions-except=${DIST}`,`--load-extension=${DIST}`],
});
let sw=null; for(let i=0;i<40&&!sw;i++){sw=browser.targets().find(t=>t.type()==="service_worker"&&t.url().includes("background.js"));if(!sw)await new Promise(r=>setTimeout(r,250));}
const worker = await sw.worker();
async function ip(tag){
  const p = await browser.newPage();
  try{
    await p.goto("https://api.ipify.org",{waitUntil:"networkidle2",timeout:30000});
    console.log(tag, "->", await p.evaluate(()=>document.body.innerText.trim().slice(0,40)));
  }catch(e){ console.log(tag, "NO CARGO:", String(e).slice(0,110)); }
  await p.close();
}
const set = (activo) => worker.evaluate((a,u,c)=>chrome.storage.local.set({configJumperNAT:{host:"jumpernet.duckdns.org",puerto:1081,usuario:u,clave:c,activo:a}}), activo, USER, CLAVE);
await ip("1) recien instalada (esperado: TU IP 83.56.26.27):");
await set(true); await new Promise(r=>setTimeout(r,1500));
await ip("2) tras ACTIVAR (esperado: 129.213.137.20):");
await set(false); await new Promise(r=>setTimeout(r,1500));
await ip("3) tras DESACTIVAR (esperado: TU IP otra vez):");
await set(true); await new Promise(r=>setTimeout(r,1500));
await ip("4) re-ACTIVAR (esperado: 129.213.137.20):");
const ajustes = await worker.evaluate(()=>chrome.proxy.settings.get({}));
console.log("5) ajustes finales:", JSON.stringify(ajustes.value));
await browser.close();
