/*
 * diag_extension.mjs — lanza Chromium con la dist de la extensión, conecta al
 * service worker por CDP y verifica EN DENTRO: configJumperNAT del storage,
 * chrome.proxy.settings.get() y el resultado de fijado(). Después navega a
 * api.ipify.org y dice qué IP ve la página (la del exit o la tuya).
 * Uso: DIST=.../dist/chrome node scripts/diag_extension.mjs
 */
import puppeteer from "puppeteer-core";
import { existsSync } from "fs";

const DIST = process.env.DIST || "extension/dist/chrome";
const CHROME = process.env.CHROMIUM;
if (!CHROME || !existsSync(DIST + "/manifest.json")) {
  console.error("uso: CHROMIUM=/ruta/chrome DIST=carpeta/del/manifest node scripts/diag_extension.mjs");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", `--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  defaultViewport: { width: 1100, height: 800 },
});

/* espera al service worker de la extension */
let sw = null;
for (let i = 0; i < 40 && !sw; i++) {
  sw = browser.targets().find((t) => t.type() === "service_worker" && t.url().includes("background.js"));
  if (!sw) await new Promise((r) => setTimeout(r, 250));
}
if (!sw) { console.error("[diag] no apareció el service worker de la extension"); process.exit(1); }
console.log("[diag] service worker encontrado:", sw.url());

const worker = await sw.worker();
const estado = await worker.evaluate(async () => {
  const cfg = await chrome.storage.local.get(["configJumperNAT"]);
  let ajustes = "no accesible";
  try { ajustes = (await chrome.proxy.settings.get({})).value; } catch (e0) { ajustes = "error: " + e0.message; }
  return { config: cfg.configJumperNAT || null, ajustes };
});
console.log("[diag] estado del SW:\n", JSON.stringify(estado, null, 2));

/* ahora la página: qué IP ve */
await pag0(browser);
async function pag0(browser) {
  const pagina = await browser.newPage();
  const avisos = [];
  pagina.on("pageerror", (e0) => avisos.push(String(e0).slice(0, 120)));
  try {
    await pagina.goto("https://api.ipify.org", { waitUntil: "networkidle2", timeout: 30000 });
    const ip = await pagina.evaluate((_) => document.body.innerText.trim().slice(0, 64));
    console.log("[diag] IP que la página ve:", ip, avisos.length ? `avisos: ${avisos}` : "");
  } catch (e0) {
    console.log("[diag] la página NO cargó:", String(e0).slice(0, 160));
  }
}
await browser.close();
