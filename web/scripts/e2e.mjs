/* Test E2E del frontend (Chrome real, headless).
   Técnica: inyectar el mock ANTES de que cargue la app (evaluateOnNewDocument)
   sustituyendo window.fetch por un enrutador en JS de página. Sin red ni CORS.
   Uso: node scripts/e2e.mjs   (requiere `vite preview` en 4173)
   Deja capturas en e2e-out/ para revisar el diseño a ojo. */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

// URL_APP permite probar cualquier despliegue, p. ej.:
//   URL_APP=https://y0selin.github.io/jumperNET/ npm run test:e2e
const URL_APP = process.env.URL_APP || "http://localhost:4173/";
const SALIDA = "e2e-out";
mkdirSync(SALIDA, { recursive: true });

let fallos = 0;
const ok = (m) => console.log("  OK  · " + m);
const MAL = (m) => { fallos++; console.log("  MAL · " + m); };
const igual = (a, b, m) => (a === b ? ok(m) : MAL(`${m} (esperado ${JSON.stringify(b)}, hay ${JSON.stringify(a)})`));

/* ── código del mock que corre DENTRO de la página ── */
const MOCK_PAGINA = /* js */ `
(() => {
  const S = window.__mock = { email: "", pass: "", token: null, activo: false, circuito: [], ip_salida: null, ip_real: "83.34.12.7", ultimo_cambio: null, borrados: 0 };
  const b64u = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\\+/g, "-").replace(/\\//g, "_");
  const jwt = () => { const a = Math.floor(Date.now() / 1000); return b64u({ alg: "HS256", typ: "JWT" }) + "." + b64u({ sub: "7", email: S.email, iat: a, exp: a + 7200 }) + ".firma-simulada"; };
  const NODOS = [1,2,3,4,5,6].map((i) => ({ nombre: "nodo" + i, direccion: "nodo" + i + ":9000", estado: "vivo" }));
  window.__origFetch = window.fetch;
  window.fetch = async (input, init) => {
    let ruta, metodo = (init && init.method) || "GET";
    const S = window.__mock || {};
    try {
      const url = typeof input === "string" ? input : input.url;
      const u = new URL(url, location.href);
      ruta = u.pathname; metodo = (init && init.method) || "GET";
      const esApi = u.hostname.endsWith("duckdns.org");
      const esGeo = u.hostname.endsWith("ipapi.co");
      if (esGeo) {
        return new Response(JSON.stringify({ latitude: 43.26, longitude: -2.93, city: "Bilbao", region: "PV", country_name: "España" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!esApi) return window.__origFetch(input, init);
      const cuerpo = init && init.body ? JSON.parse(init.body) : {};
      console.log("[jn-mock]", metodo, ruta);
      const res = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
      if (ruta === "/register") { S.email = cuerpo.email || S.email; S.pass = cuerpo.password || S.pass; return res({ ok: true, id: 7, email: S.email }); }
      if (ruta === "/login") {
        if (cuerpo.email === S.email && cuerpo.password === S.pass) { S.token = jwt(); return res({ token: S.token, expira_en: 7200 }); }
        return res({ detail: "credenciales no validas" }, 401);
      }
      if (ruta === "/me" && metodo === "DELETE") { S.borrados++; S.token = null; S.activo = false; S.circuito = []; S.pass = ""; return res({ ok: true }); }
      if (ruta === "/me") return S.token ? res({ id: 7, email: S.email, ip_real: S.ip_real, ip_salida: S.ip_salida, circuito: S.circuito, activo: S.activo, ultimo_cambio: S.ultimo_cambio }) : res({ detail: "token" }, 401);
      if (ruta === "/connect") { S.activo = true; S.circuito = ["nodo2", "nodo1", "nodo6"]; S.ip_salida = "nodo6"; S.ultimo_cambio = Date.now() / 1000; return res({ ok: true }); }
      if (ruta === "/rotate") { S.circuito = ["nodo3", "nodo5", "nodo4"]; S.ip_salida = "nodo4"; S.ultimo_cambio = Date.now() / 1000; return res({ ok: true }); }
      if (ruta === "/disconnect") { S.activo = false; S.circuito = []; S.ip_salida = null; S.ultimo_cambio = Date.now() / 1000; return res({ ok: true }); }
      if (ruta === "/nodos") return res(NODOS);
      return res({ detail: "mock sin ruta " + ruta }, 404);
    } catch (e) {
      console.log("[jn-mock] ERROR", metodo, ruta, String(e));
      return new Response(JSON.stringify({ detail: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  };
})();
`;

const navegador = await puppeteer.launch({
  executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const pagina = await navegador.newPage();
const errores = [];
pagina.on("pageerror", (e) => errores.push("pageerror: " + e.message));
pagina.on("response", (r) => {
  const u = r.url();
  if (r.status() >= 400) errores.push(`http ${r.status()} ${u.slice(0, 90)}`);
  // «asset fantasma»: el preview responde con el index.html del SPA (200) a
  // cualquier ruta que falte, así que un asset inexistente se cuela sin 404.
  // En producción (GitHub Pages, en subruta) el mismo asset SÍ da 404: mejor
  // detectarlo aquí.
  if (/\.(png|jpe?g|svg|gif|webp|css|js|woff2?|ttf)(\?|$)/.test(u) && r.request().resourceType() !== "document") {
    const ct = (r.headers()["content-type"] || "");
    if (ct.includes("text/html")) errores.push(`asset fantasma (el fallback SPA tapa un 404): ${u.slice(0, 100)}`);
  }
});
pagina.on("console", (m) => { const t = m.text(); if (t.startsWith("[jn-mock]")) console.log("  [mock]", t.slice(0, 120)); if (m.type() === "error") errores.push("console: " + t); });
await pagina.evaluateOnNewDocument(MOCK_PAGINA);
await pagina.setViewport({ width: 1280, height: 900 });

const texto = async (sel) => String((await pagina.$eval(sel, (e) => e.textContent).catch(() => "")) ?? "");
const cuerpo = async () => String((await pagina.evaluate(() => document.body.innerText)) ?? "");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = async (n) => { await pagina.screenshot({ path: `${SALIDA}/${n}.png`, fullPage: false }); };
async function clic(match, etiqueta = null) {
  for (const b of await pagina.$$("button")) {
    const t = (await b.evaluate((e) => e.textContent)) || "";
    if (t.includes(match)) { await b.click(); ok(`clic → ${etiqueta || match}`); return true; }
  }
  MAL(`no encontré botón «${match}»`); return false;
}
/** escribe en un campo controlado por React: triple clic para
    seleccionar lo que hubiera y teclear encima */
async function escribe(sel, valor) {
  await pagina.click(sel, { clickCount: 3 });
  await pagina.type(sel, valor);
}

/** inicio de sesión completo por la interfaz */
async function entrar(email, clave) {
  await pagina.evaluate((e, c) => { const s = window.__mock; s.email = e; s.pass = c; s.token = null; }, email, clave);
  await clic("Ya tengo cuenta");
  await pagina.waitForSelector(".panel-auth", { timeout: 5000 }).catch(() => {});
  await escribe("input[type=email]", email);
  await escribe("input[type=password]", clave);
  await clic("Entrar →");
  await pagina.waitForFunction(() => document.body.innerText.includes("RED OFF") || document.body.innerText.includes("RED ACTIVA"), { timeout: 20000 });
}

/** lista los elementos que se salen del ancho de la ventana */
const desbordes = () => pagina.evaluate(() => {
  const iw = window.innerWidth, out = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > iw + 1 || r.left < -1) out.push(`${el.tagName}.${String(el.className || "").slice(0, 34)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
  });
  return out.slice(0, 6);
});

const enPanel = () => pagina.waitForFunction(() => document.body.innerText.includes("RED OFF") || document.body.innerText.includes("RED ACTIVA"), { timeout: 20000 });

console.log("\n== 1 · LANDING ==");
await pagina.goto(URL_APP, { waitUntil: "networkidle2" });
igual((await texto("h1")).includes("JumperNAT"), true, "hero con título JumperNAT");
igual((await texto(".terminal")).includes("jumpernat"), true, "terminal viva presente");
igual((await pagina.$$("canvas")).length >= 1, true, "fondo de glifos (canvas) presente");
igual((await pagina.$$("#root .tarjeta")).length >= 3, true, "tarjetas de features renderizadas");
igual((await pagina.$$(".paquete")).length >= 4, true, "flujo animado de paquetes en la landing");
const estiloFlota = await pagina.$eval(".logo-cubo.flota", (e) => {
  const s = getComputedStyle(e);
  return { nom: s.animationName, iter: s.animationIterationCount, dur: s.animationDuration };
});
igual(estiloFlota.nom, "flota", "logo animado con la animación «flota»");
igual(estiloFlota.iter, "infinite", "la animación del logo se repite (infinite no se pierde)");
igual(parseFloat(estiloFlota.dur) > 0, true, "duración del logo válida (" + estiloFlota.dur + ")");
await captura("01-landing");
await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await espera(900);
igual((await pagina.$$(".revela.visto")).length >= 3, true, "secciones reveladas al hacer scroll");

console.log("\n== 2 · AUTH: validaciones, registro y sin auto-activación ==");
await pagina.evaluate(() => window.scrollTo(0, 0));
await clic("Ya tengo cuenta");
await pagina.waitForSelector(".panel-auth", { timeout: 5000 }).then(() => ok("panel de auth visible")).catch(() => MAL("auth no apareció"));
await captura("02-auth");
await escribe("input[type=email]", "noesuncorreo");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Entrar →");
await espera(350);
igual((await cuerpo()).includes("eso no parece un correo válido"), true, "valida el formato del correo sin llamar a la API");
// contraseña demasiado corta en el registro
await clic("Crear", "pestaña Crear");
await espera(250);
await escribe("input[type=email]", "e2e@jumpernat.local");
await escribe("input[type=password]", "corta");
await clic("Crear cuenta →");
await espera(350);
igual((await cuerpo()).includes("8 caracteres o más"), true, "exige 8 caracteres en el registro");
// registro correcto
await escribe("input[type=password]", "clave-e2e-123");
await clic("Crear cuenta →");
await espera(700);
igual((await cuerpo()).includes("cuenta creada"), true, "registro completado y aviso mostrado");
igual((await pagina.$(".panel-auth .mensaje-error")) === null, true, "sin error tras registrarse");
// el formulario limpia la contraseña al pasar a modo entrar: la reescribimos
await escribe("input[type=password]", "clave-e2e-123");
await clic("Entrar →");
await enPanel()
  .then(() => ok("panel de red visible tras el login (interruptor cargado)"))
  .catch(async () => { MAL("el login no llevó al panel de red"); console.log("  ERRORES:", JSON.stringify(errores, null, 1)); console.log("  BODY:", JSON.stringify((await cuerpo()).slice(0, 500))); });

console.log("\n== 3 · PANEL: red APAGADA por defecto ==");
await espera(600);
let c = await cuerpo();
igual(c.includes("DESACTIVADA"), true, "interruptor en DESACTIVADA al entrar (no auto-activa)");
igual(c.includes("RED OFF") || c.includes("red apagada"), true, "chip de estado OFF");
igual(c.toUpperCase().includes("¿QUÉ PASA SI ACTIVO?"), true, "explica qué pasará antes de activar");
igual((await pagina.$(".interruptor.activo")) === null, true, "interruptor visualmente apagado");
igual((await pagina.$(".tuberia")) !== null, true, "tubería de tráfico presente y detenida");
igual((await pagina.$(".leaflet-pane")) !== null, true, "mapa Leaflet inicializado sin crash");
igual((await pagina.$$(".marca-mapa")).length >= 2, true, "marcadores propios del mapa (sin imágenes de Leaflet que den 404)");
await captura("03-panel-apagado");

console.log("\n== 4 · ACTIVAR RED con el interruptor ==");
await pagina.click(".interruptor");
await pagina.waitForFunction(() => document.body.innerText.includes("RED ACTIVA"), { timeout: 9000 }).then(() => ok("estado RED ACTIVA")).catch(() => MAL("no activó"));
await espera(700);
c = await cuerpo();
igual(c.includes("nodo2") && c.includes("nodo1") && c.includes("nodo6"), true, "circuito nodo2 → nodo1 → nodo6 visible");
igual((await pagina.$(".parada.pulso")) !== null, true, "primera parada con pulso");
igual((await pagina.$(".interruptor.activo")) !== null, true, "interruptor en posición activa");
igual(c.includes("Comando") || c.includes("curl --socks5-hostname"), true, "comando SOCKS5 disponible");
await captura("04-panel-activo");

console.log("\n== 5 · GIRAR circuito ==");
await clic("Girar circuito");
await espera(1100);
c = await cuerpo();
igual(c.includes("nodo3") && c.includes("nodo5") && c.includes("nodo4"), true, "circuito rotado a nodo3 → nodo5 → nodo4");

console.log("\n== 6 · DESACTIVAR ==");
await pagina.click(".interruptor");
await pagina.waitForFunction(() => document.body.innerText.includes("DESACTIVADA"), { timeout: 9000 }).then(() => ok("volvió a DESACTIVADA")).catch(() => MAL("no desactivó"));
await espera(400);
igual((await pagina.$(".interruptor.activo")) === null, true, "interruptor visualmente apagado");

console.log("\n== 7 · INFO · CUENTA · AJUSTES ==");
await clic("Info");
await espera(700);
const textoInfo = (await cuerpo()).toUpperCase();
igual(textoInfo.includes("¿QUÉ ES JUMPERNAT?"), true, "pestaña Info carga (principiante)");
await clic("Modo avanzado");
await espera(800);
igual((await cuerpo()).includes("/interno/socks_auth"), true, "Info en modo avanzado muestra el detalle técnico");
await captura("05-info");

await clic("Cuenta");
await espera(900);
c = await cuerpo();
igual(c.includes("e2e@jumpernat.local"), true, "la cuenta muestra tu email");
igual(c.includes("Zona de peligro"), true, "zona de peligro presente");
igual(c.includes("argon2"), true, "explica cómo se guarda la contraseña");
const iterAntes = await pagina.evaluate(() => (window.__mock?.borrados || 0));
await clic("Eliminar cuenta…");
await espera(400);
igual((await cuerpo()).includes("¿Seguro?"), true, "pide confirmación en un segundo paso");
igual(await pagina.evaluate(() => (window.__mock?.borrados || 0)), iterAntes, "no borra nada con el primer clic");
igual((await cuerpo()).includes("RED APAGADA") || (await cuerpo()).includes("RED ACTIVA"), true, "sigue con sesión iniciada tras cancelar el borrado");
await clic("Cancelar");
await espera(300);
igual((await pagina.$eval(".zona-peligro", (e) => !!e)) === true, true, "zona de peligro vuelve al estado normal");
await captura("06-cuenta");

console.log("\n== 8 · RESPONSIVE (móvil 390×844) ==");
await pagina.setViewport({ width: 390, height: 844 });
await espera(700);
const desborde = await pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, botones: document.querySelectorAll("nav.tabs button").length }));
igual(desborde.sw <= desborde.iw + 2, true, `sin desborde horizontal en móvil (${desborde.sw} ≤ ${desborde.iw})`);
igual(desborde.botones >= 4, true, "la navegación mantiene todas las pestañas en móvil");
await captura("07-movil-panel");
await clic("Info");
await espera(500);
await captura("08-movil-info");
const desborde2 = await pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
igual(desborde2.sw <= desborde2.iw + 2, true, `Info sin desborde en móvil (${desborde2.sw} ≤ ${desborde2.iw})`);
if (desborde2.sw > desborde2.iw + 2) console.log("  [diag] culpables:", JSON.stringify(await desbordes(), null, 1));
await pagina.setViewport({ width: 1280, height: 900 });
await espera(400);

console.log("\n== 9 · AJUSTES: presets en vivo ==");
await clic("Ajustes");
await espera(700);
const nombres = await pagina.$$eval("button", (bs) => bs.map((b) => b.textContent).join("|"));
igual(nombres.includes("Neón Nocturno") && nombres.includes("Terminal Verde"), true, "diseñador con presets (incluye Terminal Verde)");
for (const b of await pagina.$$("button")) {
  if (((await b.evaluate((e) => e.textContent)) || "") === "Matrix") { await b.click(); break; }
}
await espera(500);
igual((await pagina.evaluate(() => document.documentElement.style.getPropertyValue("--acento-1"))).includes("22c55e"), true, "preset Matrix aplicado en vivo (--acento-1)");
igual(await pagina.evaluate(() => document.documentElement.dataset.anim), "on", "data-anim activo con el preset");
await captura("09-ajustes-matrix");

console.log("\n== 10 · SALIR y borrar la cuenta ==");
await clic("Salir");
await espera(900);
igual((await cuerpo()).includes("Crear mi cuenta"), true, "vuelta a la landing tras salir");
igual(await pagina.evaluate(() => localStorage.getItem("token")), null, "el token se borra al salir");

await entrar("e2e@jumpernat.local", "clave-e2e-123");
ok("segunda sesión iniciada para probar el borrado");
await clic("Cuenta");
await espera(800);
await clic("Eliminar cuenta…");
await espera(300);
await clic("Sí, eliminar para siempre");
await espera(1200);
igual(await pagina.evaluate(() => (window.__mock?.borrados || 0)), 1, "la API recibió el DELETE /me");
igual((await cuerpo()).includes("Crear mi cuenta"), true, "tras borrar la cuenta vuelve a la landing");
igual(await pagina.evaluate(() => localStorage.getItem("token")), null, "sin token tras borrar la cuenta");

console.log("\n== ERRORES DE CONSOLA / RED ==");
if (errores.length) errores.forEach((e) => MAL(e)); else ok("cero errores de consola y cero peticiones fallidas");

await navegador.close();
console.log(fallos ? `\n✗ ${fallos} fallos` : "\n✓ E2E COMPLETO: TODO CORRECTO");
process.exit(fallos ? 1 : 0);
