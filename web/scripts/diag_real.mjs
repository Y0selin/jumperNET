/*
 * diag_real.mjs — reproduce el recorrido de un usuario REAL contra la web
 * publicada (API real, sin mocks) y enseña TODO lo que el navegador ve:
 * errores de consola, peticiones fallidas y avisos del panel.
 * Uso: CHROMIUM=/ruta/chrome node scripts/diag_real.mjs [url_app]
 */
import puppeteer from "puppeteer-core";

const URL_APP = process.argv[2] || "https://y0selin.github.io/jumperNET/";
const EMAIL = `diag${Date.now() % 100000}@prueba.es`;
const CLAVE = "DiagDePrueba123-$";

const navegador = await puppeteer.launch({
  executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1280, height: 900 },
});
const pag = await navegador.newPage();
const problemas = [];
pag.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") problemas.push(`consola-${m.type()}: ${m.text().slice(0, 160)}`);
});
pag.on("pageerror", (e) => problemas.push(`pageerror: ${String(e).slice(0, 160)}`));
pag.on("requestfailed", (r) => problemas.push(`requestfailed: ${r.method()} ${r.url().slice(0, 120)} — ${r.failure()?.errorText}`));
pag.on("response", (r) => {
  if (r.status() >= 400) problemas.push(`HTTP ${r.status()}: ${r.request().method()} ${r.url().slice(0, 120)}`);
});
console.log(`[diag] sin sesion: ${URL_APP}`);
await pag.goto(URL_APP, { waitUntil: "networkidle2", timeout: 60000 });
await pag.screenshot({ path: "e2e-out/diag-1-landing.png" });

// acceder → register (cuenta nueva real)
for (const seletor of ["//button[contains(., \"Acceder\")]", "//button[contains(., \"Entrar\")]"]) {
  const el = (await pag.$x?.(seletor)) || await pag.$$( "button").then((bs) => bs.find((b) => b.evaluate((e) => e.textContent)));
  if (el) { await el.click?.() ?? null; break; }
}
await pag.waitForFunction(() => document.body.innerText.toLowerCase().includes("email"), { timeout: 15000 }).catch(()=>{});
await pag.evaluate((email, clave) => {
  const textos = [...document.querySelectorAll("input")];
  const emailIn = textos.find((i) => /email/i.test(i.name + i.placeholder + i.type));
  const passIn = textos.find((i) => i.type === "password");
  if (emailIn) { emailIn.value = email; emailIn.dispatchEvent(new Event("input", { bubbles: true })); }
  if (passIn) { passIn.value = clave; passIn.dispatchEvent(new Event("input", { bubbles: true })); }
}, EMAIL, CLAVE);
// cambia a la pestaña de REGISTRO si existe y envía
await pag.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /registr/i.test(x.textContent));
  if (b) b.click();
});
await new Promise((r) => setTimeout(r, 1500));
await pag.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /crear|entrar|acceder|→/i.test(x.textContent));
  if (b) b.click();
});
await new Promise((r) => setTimeout(r, 4000));
await pag.screenshot({ path: "e2e-out/diag-2-post-auth.png" });
const texto = await pag.evaluate(() => document.body.innerText.slice(0, 1500));
console.log(`[diag] estado tras auth: ${texto.replace(/\n+/g, " | ").slice(0, 400)}`);
await new Promise((r) => setTimeout(r, 6000)); // deja que el mapa/geo carguen
await pag.screenshot({ path: "e2e-out/diag-3-panel.png" });

console.log(`\n[diag] ${problemas.length === 0 ? "cero errores de consola/red ✓" : "PROBLEMAS:"}`);
for (const p of problemas) console.log(`  · ${p}`);
const token = await pag.evaluate(() => localStorage.getItem("token"));
console.log(`[diag] token en el navegador: ${token ? "sí (login real OK)" : "no"}`);
await navegador.close();
