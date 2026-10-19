import puppeteer from "puppeteer-core";
const DIST = "/tmp/jnpub/chrome";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM, headless: true,
  args: ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage",`--disable-extensions-except=${DIST}`,`--load-extension=${DIST}`],
  defaultViewport: { width: 1100, height: 800 },
});
let sw=null; for(let i=0;i<40&&!sw;i++){sw=browser.targets().find(t=>t.type()==="service_worker"&&t.url().includes("background.js"));if(!sw)await new Promise(r=>setTimeout(r,250));}
if(!sw){console.error("sin SW");process.exit(1);}
const worker = await sw.worker();
const lee = () => worker.evaluate(async()=>{
  const cfg=(await chrome.storage.local.get(["configJumperNAT"])).configJumperNAT||{};
  let aj="error"; try{aj=(await chrome.proxy.settings.get({})).value;}catch(e){aj=String(e).slice(0,120);}
  return {cfg, aj};
});
async function ip(tag){
  const p = await browser.newPage();
  try{
    await p.goto("https://api.ipify.org",{waitUntil:"networkidle2",timeout:30000});
    console.log(tag, "IP pagina:", await p.evaluate(()=>document.body.innerText.trim().slice(0,40)));
  }catch(e){ console.log(tag, "no cargo:", String(e).slice(0,120)); }
  await p.close();
}
await ip("A(instalacion刚刚,config.json test):");
const antes = await lee(); console.log("A estado SW:", JSON.stringify(antes));
await new Promise(r=>setTimeout(r,2000));
await ip("B(re-navegada 2s despues):");
// simula ACTIVAR con creds reales (lo que haria el usuario al pulsar ACTIVAR)
await worker.evaluate(async()=>{
  await chrome.storage.local.set({configJumperNAT:{host:"jumpernet.duckdns.org",puerto:1081,usuario:"diagconect@jumpernat.test",clave:"Diag#2026x!",activo:true}});
});
await new Promise(r=>setTimeout(r,1500));
console.log("C estado SW tras ACTIVAR:", JSON.stringify(await lee()));
await ip("C(tras ACTIVAR con cuenta real):");
await ip("D(otra navegada):");
await browser.close();
