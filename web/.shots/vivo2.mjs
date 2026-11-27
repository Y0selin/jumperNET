import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });
const prepara = (p, modo) => p.evaluateOnNewDocument((m) => {
  localStorage.setItem("jumpernet-modo-v1", m);
  localStorage.setItem("jumpernet-intro-v31", "vista");
  localStorage.setItem("jumpernet-visita-v31", "vista");
  localStorage.removeItem("jumpernet-avisos-leidos-v1");
  sessionStorage.setItem("jumpernet-promo-aviso-v1", "1");
}, modo);

const cl = await b.newPage();
await cl.setViewport({ width: 1440, height: 1000 });
await prepara(cl, "claro");
await cl.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle2" });
await espera(1400);
await cl.evaluate(() => { location.hash = "#/funciona"; });
await cl.waitForSelector(".vivo-carga");
await espera(120);
await cl.screenshot({ path: ".shots/vivo/final-carga-claro.png" });
await espera(1400);
await cl.click(".pp-campana");
await espera(700);
console.log("opacidad panel", await cl.$eval(".pp-avisos-panel", (e) => getComputedStyle(e).opacity));
await cl.screenshot({ path: ".shots/vivo/final-panel-claro.png" });

const m = await b.newPage();
await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await prepara(m, "oscuro");
await m.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle2" });
await espera(1500);
await m.screenshot({ path: ".shots/vivo/final-movil-hero.png" });
await m.tap(".pp-campana");
await espera(600);
await m.screenshot({ path: ".shots/vivo/final-movil-avisos.png" });
await m.keyboard.press("Escape");
await espera(300);
await m.evaluate(() => { location.hash = "#/video"; });
await m.waitForSelector(".vivo-carga");
await espera(150);
await m.screenshot({ path: ".shots/vivo/final-movil-carga.png" });
await espera(1400);
await m.screenshot({ path: ".shots/vivo/final-movil-video.png" });
await b.close();
console.log("listo");
