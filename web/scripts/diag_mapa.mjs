/*
 * diag_mapa — abre el panel REAL con sesion real (token inyectado, como lo
 * haria la web tras un login de verdad), abre la pestaña Red y comprueba que
 * el mapa se pinta: tiles cargados o respaldo vectorial (paises dibujados).
 */
import puppeteer from "puppeteer-core";

const EMAIL = process.env.CUENTA || "diagmapa4@jumpernat.test";
const CLAVE = "Diag#2026x!";
const TOKEN = process.env.TOKEN || (await login());
if (!TOKEN) { console.error("sin token"); process.exit(1); }

async function login() {
  const r1 = await fetch("https://jumpernet.duckdns.org/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: CLAVE }),
  });
  if (!r1.ok) return null;
  return (await r1.json()).token || null;
}

const b = await puppeteer.launch({
  executablePath: process.env.CHROMIUM, headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const p = await b.newPage();
p.on("console", (m) => { if (m.type() === "error") console.log("consola:", m.text().slice(0, 140)); });

await p.goto("https://y0selin.github.io/jumperNET/", { waitUntil: "networkidle2", timeout: 45000 });
await p.evaluate((t) => localStorage.setItem("token", t), TOKEN);
await p.reload({ waitUntil: "networkidle2" });
await p.waitForFunction(() => !document.body.innerText.includes("invitado@"), { timeout: 20000 }).catch(() => {});
console.log("sesion:", (await p.evaluate(() => (document.body.innerText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+/i) || ["?"])[0])));

// pestaña Red dentro del panel
const clic = await p.evaluateHandle(() => {
  const cands = [...document.querySelectorAll("button, nav a, a")];
  const el = cands.find(e => /Red/.test((e.textContent || "").trim()) && !/Redes/.test((e.textContent || "").trim()));
  if (el) el.click();
  return !!el;
});
console.log("clic pestaña Red:", await clic.evaluate(v => v));
// si el interruptor esta apagado, hay que encenderla para que el mapa tenga salida
await p.evaluate(() => { const s = [...document.querySelectorAll("button.interruptor, .interruptor")][0]; if (s) s.click(); });
await new Promise(r => setTimeout(r, 6000));
await p.waitForSelector(".leaflet-container", { timeout: 20000 }).catch(() => {});
const estado = await p.evaluate(() => {
  const div = document.querySelector(".leaflet-container");
  const tiles = [...document.querySelectorAll(".leaflet-tile")];
  const cargadas = tiles.filter(t => t.complete && t.naturalWidth > 0).length;
  const paises = document.querySelectorAll(".leaflet-interactive").length;
  return { tiles: tiles.length, cargadas, paises, divVisible: !!div && div.offsetHeight > 100 };
});
console.log("estado del mapa:", JSON.stringify(estado));
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: "/tmp/mapa.png", fullPage: false });
await b.close();
