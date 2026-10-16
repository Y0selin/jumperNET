/*
 * diag_panel_real.mjs — abre el panel PÚBLICO con un token REAL de la API
 * (obtenido por login de verdad) y recorre Red/Nodos capturando TODO:
 * errores de consola, pageerrors, peticiones fallidas y HTTP >= 400.
 * Uso:  EMAIL=... CLAVE=... node scripts/diag_panel_real.mjs [urlApp]
 */
import puppeteer from "puppeteer-core";

const URL_APP = process.argv[2] || "https://y0selin.github.io/jumperNET/";
const EMAIL = process.env.EMAIL || "socksuser@test.local";
const CLAVE = process.env.CLAVE || "sup3rguay";

const API = "https://jumpernet.duckdns.org";
const r = await fetch(`${API}/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: CLAVE }),
});
const token = (await r.json()).token;
if (!token) { console.error("[diag] no pude hacer login against la API"); process.exit(1); }
console.log("[diag] login real OK (token de 2 h)");

const navegador = await puppeteer.launch({
  executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1280, height: 900 },
});
const pag = await navegador.newPage();
const problemas = [];
pag.on("console", (m) => { if (["error","warning"].includes(m.type())) problemas.push(`consola-${m.type()}: ${m.text().slice(0,200)}`); });
pag.on("pageerror", (e) => problemas.push(`pageerror: ${String(e).slice(0,200)}`));
pag.on("requestfailed", (rs) => problemas.push(`requestfailed: ${rs.method()} ${rs.url().slice(0,120)} — ${rs.failure()?.errorText}`));
pag.on("response", (rs) => { if (rs.status() >= 400) problemas.push(`HTTP ${rs.status()}: ${rs.request().method()} ${rs.url().slice(0,140)}`); });

// carga con el token ya puesto (como una sesión hecha hace un rato)
await pag.evaluateOnNewDocument((t) => localStorage.setItem("token", t), token);
await pag.goto(URL_APP, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((s) => setTimeout(s, 5000));
const donde = await pag.evaluate(() => document.body.innerText.replace(/\n+/g," | ").slice(0, 300));
console.log(`[diag] recorrido: ${donde}`);
await pag.screenshot({ path: "e2e-out/diag-red-1.png" });

// pestaña Nodos
await pag.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /nodos/i.test(x.textContent)); if (b) b.click(); });
await new Promise((s) => setTimeout(s, 4000));
await pag.screenshot({ path: "e2e-out/diag-nodos-2.png" });

console.log(`\n[diag] ${problemas.length === 0 ? "cero errores de consola/red ✓" : "PROBLEMAS:"}`);
for (const p of problemas) console.log(`  · ${p}`);
await navegador.close();
