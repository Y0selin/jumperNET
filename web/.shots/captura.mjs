import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.env.URL_APP || "http://127.0.0.1:5173/";
const SALIDA = process.env.SALIDA || ".shots/rediseno";
const PREFIJO = process.env.PREFIJO || "antes";
mkdirSync(SALIDA, { recursive: true });

const navegador = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const errores = [];
const paradas = [
  ["hero", 0],
  ["indice", 980],
  ["diferencia", 1750],
  ["circuito", 2750],
  ["tres-ideas", 3800],
  ["piezas", 4750],
  ["video", 5750],
  ["metricas", 6800],
];

for (const modo of ["oscuro", "claro"]) {
  for (const [nombre, ancho, alto, movil] of [["escritorio", 1440, 1000, false], ["movil", 390, 844, true]]) {
    const pagina = await navegador.newPage();
    await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil });
    await pagina.evaluateOnNewDocument((m) => {
      localStorage.setItem("jumpernet-modo-v1", m);
      localStorage.setItem("jumpernet-intro-v31", "vista");
      localStorage.setItem("jumpernet-visita-v31", "vista");
      localStorage.removeItem("jumpernat-tema-v3");
      sessionStorage.setItem("jumpernet-promo-aviso-v1", "1");
    }, modo);
    pagina.on("console", (m) => { if (m.type() === "error") errores.push(`${modo}/${nombre}: ${m.text()}`); });
    pagina.on("pageerror", (e) => errores.push(`${modo}/${nombre}: ${e.message}`));
    await pagina.goto(URL, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));
    const altoTotal = await pagina.evaluate(() => document.documentElement.scrollHeight);
    for (const [seccion, y] of (movil ? paradas.slice(0, 4) : paradas)) {
      const pos = Math.min(y, Math.max(0, altoTotal - alto));
      await pagina.evaluate((p) => window.scrollTo(0, p), pos);
      await new Promise((r) => setTimeout(r, 550));
      await pagina.screenshot({ path: `${SALIDA}/${PREFIJO}-${modo}-${nombre}-${seccion}.png` });
    }
    console.log(`${modo}/${nombre}: alto ${altoTotal}`);
    await pagina.close();
  }
}

await navegador.close();
if (errores.length) {
  console.log("ERRORES:\n" + [...new Set(errores)].join("\n"));
  process.exitCode = 1;
} else {
  console.log("sin errores de consola");
}
