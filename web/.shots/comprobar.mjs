import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1000 });
await p.evaluateOnNewDocument(() => {
  localStorage.setItem("jumpernet-modo-v1", "oscuro");
  localStorage.setItem("jumpernet-intro-v31", "vista");
  localStorage.setItem("jumpernet-visita-v31", "vista");
  localStorage.removeItem("jumpernet-avisos-leidos-v1");
  sessionStorage.setItem("jumpernet-promo-aviso-v1", "1");
});
const errores = [];
p.on("pageerror", (e) => errores.push(String(e)));
await p.goto("http://127.0.0.1:5199/", { waitUntil: "networkidle2" });
await espera(1400);

// campana
const badge = await p.$eval(".pp-campana-badge", (el) => el.textContent);
await p.click(".pp-campana");
await espera(400);
const items = await p.$$eval(".pp-avisos-panel .pp-aviso-item", (l) => l.length);
const nuevos = await p.$$eval(".pp-avisos-panel .pp-aviso-item.nuevo", (l) => l.length);
await p.keyboard.press("Escape");
await espera(300);
const panelCerrado = !(await p.$(".pp-avisos-panel"));
const badgeTras = !(await p.$(".pp-campana-badge"));
console.log("campana", { badge, items, nuevos, panelCerrado, badgeTras });

// simulador -> toast
await p.click(".hero-switch");
await espera(400);
const toastApagado = await p.$eval(".vivo-toast", (e) => e.textContent.trim());
await p.click(".hero-switch");
await espera(300);
const toasts = await p.$$eval(".vivo-toast", (l) => l.map((x) => x.textContent.trim()));
await p.click(".hn-girar");
await espera(300);
const toastGiro = await p.$$eval(".vivo-toast", (l) => l.map((x) => x.textContent.trim()));
console.log("toasts", { toastApagado, toasts, toastGiro });

// navegación con cortina
await p.evaluate(() => { location.hash = "#/funciona"; });
await espera(350);
const cortina = !!(await p.$(".vivo-carga"));
await espera(900);
const cortinaFuera = !(await p.$(".vivo-carga"));
const pagina = await p.evaluate(() => location.hash);
console.log("cortina", { cortina, cortinaFuera, pagina });

// modo
await p.click(".btn-modo");
await espera(350);
const modo = await p.evaluate(() => document.documentElement.dataset.modo);
const toastModo = await p.$$eval(".vivo-toast", (l) => l.map((x) => x.textContent.trim()));
console.log("modo", { modo, toastModo });

// aviso del centro: abrir y elegir uno
await p.click(".pp-campana");
await espera(300);
await p.click(".pp-avisos-panel .pp-aviso-item a");
await espera(400);
console.log("navAviso", await p.evaluate(() => location.hash));

console.log("errores", errores);
await b.close();
