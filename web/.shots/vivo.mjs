import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

mkdirSync(".shots/vivo", { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
});

async function prepara(p, modo) {
  await p.evaluateOnNewDocument((m) => {
    localStorage.setItem("jumpernet-modo-v1", m);
    localStorage.setItem("jumpernet-intro-v31", "vista");
    localStorage.setItem("jumpernet-visita-v31", "vista");
    localStorage.setItem("jumpernet-tour-v31", "vista");
    localStorage.removeItem("jumpernet-avisos-leidos-v1");
    sessionStorage.setItem("jumpernet-promo-aviso-v1", "1");
  }, modo);
}

for (const modo of ["oscuro", "claro"]) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1000 });
  await prepara(p, modo);
  await p.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle2" });
  await espera(1600);
  await p.screenshot({ path: `.shots/vivo/${modo}-hero.png` });

  await p.click(".pp-campana");
  await espera(400);
  await p.screenshot({ path: `.shots/vivo/${modo}-avisos.png` });
  await p.keyboard.press("Escape");
  await espera(250);

  /* navegación con cortina de carga */
  await p.evaluate(() => { location.hash = "#/lab"; });
  await espera(300);
  await p.screenshot({ path: `.shots/vivo/${modo}-carga.png` });
  await espera(1200);
  await p.screenshot({ path: `.shots/vivo/${modo}-lab.png` });

  /* toast al cambiar de modo */
  await p.click(".btn-modo");
  await espera(500);
  await p.screenshot({ path: `.shots/vivo/${modo}-toast.png` });
  await p.close();
}

/* móvil */
const m = await b.newPage();
await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await prepara(m, "oscuro");
await m.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle2" });
await espera(1600);
await m.screenshot({ path: ".shots/vivo/movil-hero.png" });
await m.tap(".pp-campana");
await espera(400);
await m.screenshot({ path: ".shots/vivo/movil-avisos.png" });
await m.keyboard.press("Escape");
await espera(200);
await m.evaluate(() => { location.hash = "#/tarifas"; });
await espera(260);
await m.screenshot({ path: ".shots/vivo/movil-carga.png" });
await espera(1200);
await m.screenshot({ path: ".shots/vivo/movil-tarifas.png" });
await m.close();

await b.close();
console.log("capturas listas");
