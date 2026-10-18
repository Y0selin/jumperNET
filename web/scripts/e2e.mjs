/* Test E2E del frontend (Chrome real, headless).
   Técnica: inyectar el mock ANTES de que cargue la app (evaluateOnNewDocument)
   sustituyendo window.fetch por un enrutador en JS de página. Sin red ni CORS.
   Uso:   node scripts/e2e.mjs                      (contra vite preview:4173)
          URL_APP=https://y0selin.github.io/jumperNET/ node scripts/e2e.mjs
   Deja capturas en e2e-out/. */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL_APP = process.env.URL_APP || "http://localhost:4173/";
const SALIDA = process.env.E2E_SALIDA || "e2e-out";
mkdirSync(SALIDA, { recursive: true });

let fallos = 0;
const ok = (m) => console.log("  OK  · " + m);
const MAL = (m) => { fallos++; console.log("  MAL · " + m); };
const igual = (a, b, m) => (a === b ? ok(m) : MAL(`${m} (esperado ${JSON.stringify(b)}, hay ${JSON.stringify(a)})`));

/* ── mock de la API, dentro de la página ── */
const MOCK_PAGINA = /* js */ `
(() => {
  const IP_REAL = "83.34.12.7", IP_SALIDA = "129.213.137.20";
  const S = window.__mock = { email: "", pass: "", token: null, activo: false, circuito: [], borrados: 0, comprobaciones: 0 };
  const b64u = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\\+/g, "-").replace(/\\//g, "_");
  const jwt = () => { const a = Math.floor(Date.now() / 1000); return b64u({ alg: "HS256", typ: "JWT" }) + "." + b64u({ sub: "7", email: S.email, iat: a, exp: a + 7200 }) + ".firma-simulada"; };
  const NODOS = [
    { nombre: "nodo1", direccion: "nodo1:9000", estado: "vivo", conexiones: 1, ultimo_hb: 3.2, ms: 4, tipo: "infra", dueno: null, alias: null, hoppable: true, responde: true, sin_ok_s: 2.1, saltable: true },
    { nombre: "nodo2", direccion: "nodo2:9000", estado: "vivo", conexiones: 2, ultimo_hb: 4.1, ms: 5, tipo: "infra", dueno: null, alias: null, hoppable: true, responde: true, sin_ok_s: 3.3, saltable: true },
    { nombre: "nodo3", direccion: "nodo3:9000", estado: "vivo", conexiones: 0, ultimo_hb: 6.0, ms: 3, tipo: "infra", dueno: null, alias: null, hoppable: true, responde: true, sin_ok_s: 1.7, saltable: true },
    { nombre: "nodo4", direccion: "nodo4:9000", estado: "vivo", conexiones: 0, ultimo_hb: 8.4, ms: 7, tipo: "infra", dueno: null, alias: null, hoppable: true, responde: true, sin_ok_s: 4.0, saltable: true },
    { nombre: "nodo5", direccion: "nodo5:9000", estado: "vivo", conexiones: 0, ultimo_hb: 2.2, ms: 6, tipo: "infra", dueno: null, alias: null, hoppable: true, responde: true, sin_ok_s: 2.8, saltable: true },
    { nombre: "nodo6", direccion: "nodo6:9000", estado: "caido", conexiones: 0, ultimo_hb: 62.0, ms: null, tipo: "infra", dueno: null, alias: null, hoppable: true, responde: false, sin_ok_s: null, saltable: false },
    // nodo personal DINÁMICO del usuario e2e (id 7): entra por su latido
    { nombre: "peer_u7", direccion: "83.34.12.7:0", estado: "vivo", conexiones: 0, ultimo_hb: 1.5, ms: null, tipo: "usuario", dueno: 7, alias: "Mi portátil", hoppable: false, responde: false, sin_ok_s: null, saltable: false },
    // peer EXTERNO validado (servicio de un usuario que SÍ responde)
    { nombre: "peer_ext_casa", direccion: "93.176.44.10:9000", estado: "vivo", conexiones: 1, ultimo_hb: 2.0, ms: 48, tipo: "usuario", dueno: 9, alias: "El peer de una amigos", hoppable: true, responde: true, sin_ok_s: 5.5, saltable: true },
    // peer externo que ENVÍA latido pero su servicio NO responde
    { nombre: "peer_zombi", direccion: "88.12.9.44:9000", estado: "vivo", conexiones: 0, ultimo_hb: 1.0, ms: null, tipo: "usuario", dueno: 11, alias: null, hoppable: true, responde: false, sin_ok_s: null, saltable: false },
  ];
  const GEO = {
    [IP_REAL]: { ok: true, lat: 43.2630, lon: -2.9350, ciudad: "Bilbao", region: "País Vasco", pais: "España", org: "Euskaltel", fuente: "ipwho.is" },
    [IP_SALIDA]: { ok: true, lat: 38.8951, lon: -77.0364, ciudad: "Washington", region: "District of Columbia", pais: "Estados Unidos", org: "Oracle Public Cloud", fuente: "ipwho.is" },
  };
  window.__origFetch = window.fetch;
  window.fetch = async (input, init) => {
    let ruta, metodo = (init && init.method) || "GET";
    try {
      const url = typeof input === "string" ? input : input.url;
      const u = new URL(url, location.href);
      ruta = u.pathname; metodo = (init && init.method) || "GET";
      const esApi = u.hostname.endsWith("duckdns.org");
      if (!esApi) return window.__origFetch(input, init);
      const cuerpo = init && init.body ? JSON.parse(init.body) : {};
      console.log("[jn-mock]", metodo, ruta);
      const res = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
      if (ruta === "/register") { S.email = cuerpo.email || S.email; S.pass = cuerpo.password || S.pass; return res({ ok: true, id: 7, email: S.email }); }
      if (ruta === "/login") {
        if (cuerpo.email === S.email && cuerpo.password === S.pass) { S.token = jwt(); return res({ token: S.token, expira_en: 7200 }); }
        return res({ detail: "credenciales no validas" }, 401);
      }
      if (ruta === "/me" && metodo === "DELETE") { S.borrados++; S.token = null; S.activo = false; S.circuito = []; return res({ ok: true }); }
      if (ruta === "/me") {
        if (!S.token) return res({ detail: "token" }, 401);
        return res({ id: 7, email: S.email, ip_real: IP_REAL, ip_salida: S.activo ? IP_SALIDA : null,
                     nodo_exit: S.circuito.length ? S.circuito[S.circuito.length - 1] : null,
                     circuito: S.circuito, activo: S.activo, ultimo_cambio: S.ultimoCambio || null,
                     // Fase 9 - modo de saltos elegido por el usuario + IP del exit externo
                     modo: S.modo || "todos", exit_ip: (S.modo === "externos" ? "93.176.44.10" : null),
                     // panel nuevo: rol y plano con límites (solo el moderador ve TODOS los nodos)
                     rol: "moderador", plan: "pro", saltos_min: 3, saltos_max: 7,
                     puede_elegir_saltos: true, refresco_cada_h: 10 });
      }
      if (ruta === "/connect") {
        S.activo = true; S.ultimoCambio = Date.now() / 1000;
        S.modo = cuerpo.modo || "todos";
        S.conexiones = S.conexiones || [];
        S.conexiones.push({ modo: S.modo, saltos: cuerpo.saltos || null });
        // modo externos -> circuito SOLO con peers tipo usuario (validados)
        S.circuito = S.modo === "externos" ? ["peer_ext_casa"] : ["nodo2", "nodo1", "nodo6"];
        return res({ ok: true });
      }
      if (ruta === "/rotate") { S.circuito = ["nodo3", "nodo5", "nodo4"]; S.ultimoCambio = Date.now() / 1000; return res({ ok: true }); }
      if (ruta === "/disconnect") { S.activo = false; S.circuito = []; return res({ ok: true }); }
      if (ruta === "/nodos") return res(NODOS);
      if (ruta === "/nodos/usuario") { S.latidos = (S.latidos || 0) + 1; const f = NODOS.find((n) => n.nombre === "peer_u7"); return res(f); }
      if (ruta === "/nodosvivos") {
        const v = NODOS.filter((n) => n.estado === "vivo").length;
        return res({ total: v + (S.activo ? 1 : 0), infra: v - 1, equipos: S.activo ? 1 : 0, nodos_usuario: 2, validados: 7, externos_saltables: 1, cuando: Date.now() / 1000 });
      }
      if (ruta === "/salida") return res({ ip_salida: IP_SALIDA, nodo_exit: S.circuito.slice(-1)[0] || null, activo: S.activo });
      if (ruta === "/geo") {
        const ip = u.searchParams.get("ip") || IP_REAL;
        const g = GEO[ip];
        return res(g ? { ip, cache: true, ...g } : { ip, ok: false, error: "ningun proveedor de geolocalizacion respondio" });
      }
      if (ruta === "/comprobar") {
        S.comprobaciones++;
        if (!S.activo) return res({ detail: "la red esta apagada: enciendela antes de comprobar" }, 409);
        if (cuerpo.password !== S.pass) return res({ ok: false, error: "credenciales rechazadas o sin circuito activo", ms: 12 });
        return res({ ok: true, ip_observada: IP_SALIDA, ip_esperada: IP_SALIDA, tu_ip: IP_REAL,
                     usa_el_exit: true, cambia_tu_ip: true, circuito: S.circuito,
                     destino: "api.ipify.org:80", ms: 187 });
      }
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
  // «asset fantasma»: el preview responde el index.html del SPA (200) a cualquier
  // ruta que falte, así que un asset inexistente se cuela sin 404. En producción
  // (Pages, en subruta) sí daría 404: mejor detectarlo aquí.
  if (/\.(png|jpe?g|svg|gif|webp|css|js|woff2?|ttf)(\?|$)/.test(u) && r.request().resourceType() !== "document") {
    const ct = (r.headers()["content-type"] || "");
    if (ct.includes("text/html")) errores.push(`asset fantasma (el fallback SPA tapa un 404): ${u.slice(0, 100)}`);
  }
});
pagina.on("console", (m) => { const t = m.text(); if (t.startsWith("[jn-mock]")) console.log("  [mock]", t.slice(0, 110)); if (m.type() === "error") errores.push("console: " + t); });
await pagina.evaluateOnNewDocument(MOCK_PAGINA);
await pagina.setViewport({ width: 1280, height: 900 });

const texto = async (sel) => String((await pagina.$eval(sel, (e) => e.textContent).catch(() => "")) ?? "");
const cuerpo = async () => String((await pagina.evaluate(() => document.body.innerText)) ?? "");
/* El texto visible lleva text-transform: uppercase en títulos y etiquetas, y
   innerText devuelve ese texto YA transformado: comparar sin distinguir
   mayúsculas evita falsos negativos. */
const incluye = async (t) => (await cuerpo()).toLowerCase().includes(String(t).toLowerCase());
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = async (n) => { await pagina.screenshot({ path: `${SALIDA}/${n}.png`, fullPage: false }); };
async function clic(match, etiqueta = null) {
  for (const b of await pagina.$$("button")) {
    const t = (await b.evaluate((e) => e.textContent)) || "";
    if (!t.includes(match)) continue;
    try {
      await b.click();
    } catch {
      // Botón fuera del viewport (barra lateral oculta en móvil): se pulsa por
      // DOM para no abortar el recorrido del test.
      await b.evaluate((e) => e.click());
    }
    ok(`clic → ${etiqueta || match}`); return true;
  }
  MAL(`no encontré botón «${match}»`); return false;
}
async function escribe(sel, valor) {
  await pagina.click(sel, { clickCount: 3 });
  await pagina.type(sel, valor);
}
const enPanel = () => pagina.waitForFunction(() => document.body.innerText.includes("RED OFF") || document.body.innerText.includes("RED ACTIVA"), { timeout: 20000 });
/* Pulir el interruptor: se centra en el viewport antes de pulsarlo, porque la
   barra superior es fija y taparía el botón si quedase pegado arriba. */
async function pulsaSwitch() {
  // La barra superior es fija: si el interruptor queda pegado arriba, el clic
  // lo recibe el header. Se centra de verdad (el scroll suave de html, con
  // scroll-behavior: smooth, hacía que se midiera antes de terminar).
  const info = await pagina.evaluate(() => {
    const html = document.documentElement;
    const antes = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    const e = document.querySelector(".interruptor");
    const r = e.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - window.innerHeight / 2);
    html.style.scrollBehavior = antes;
    const r2 = e.getBoundingClientRect();
    const cx = r2.left + r2.width / 2, cy = r2.top + r2.height / 2;
    const cima = document.elementFromPoint(cx, cy);
    return {
      caja: [Math.round(r2.left), Math.round(r2.top), Math.round(r2.width), Math.round(r2.height)],
      /* el punto medio lo debe recibir el propio botón o algo dentro de él */
      cima: cima ? `${cima.tagName.toLowerCase()}.${String(cima.className || "").split(" ")[0]}` : "nada",
      golpea: !!cima && (cima === e || e.contains(cima)),
      deshabilitado: e.disabled,
    };
  });
  igual(info.golpea, true, `el interruptor recibe el clic (encima: ${info.cima}, caja ${info.caja.join(",")})`);
  await pagina.click(".interruptor");
}

async function entrar(email, clave) {
  await pagina.evaluate((e, c) => { const s = window.__mock; s.email = e; s.pass = c; s.token = null; }, email, clave);
  await clic("Acceder");
  await pagina.waitForSelector(".panel-auth", { timeout: 5000 }).catch(() => {});
  await escribe("input[type=email]", email);
  await escribe("input[type=password]", clave);
  await clic("Entrar →");
  await enPanel();
}

console.log("\n== 1 · LANDING ==");
await pagina.goto(URL_APP, { waitUntil: "networkidle2" });
igual((await texto("h1")).includes("JumperNET"), true, "hero con título JumperNET");
igual((await texto(".terminal")).includes("jumpernat"), true, "terminal viva presente");
igual((await pagina.$$("canvas")).length >= 1, true, "fondo de glifos (canvas) presente");
igual((await pagina.$$(".tarjeta")).length >= 4, true, "tarjetas renderizadas");
igual((await pagina.$$(".paquete")).length >= 4, true, "flujo animado de paquetes");
igual((await cuerpo()).includes("--proxy-user"), true, "la landing enseña el comando correcto (--proxy-user)");
const estiloLogo = await pagina.$eval(".logo-cubo.flota", (e) => {
  const s = getComputedStyle(e); return { nom: s.animationName, iter: s.animationIterationCount, dur: s.animationDuration };
});
igual(estiloLogo.nom, "flota", "logo animado con «flota»");
igual(estiloLogo.iter, "infinite", "la animación del logo se repite (infinite intacto)");
igual(parseFloat(estiloLogo.dur) > 0, true, "duración del logo válida (" + estiloLogo.dur + ")");
igual(await pagina.$eval(".lateral", (e) => getComputedStyle(e).position), "fixed", "barra lateral fija (estructura del diseño de referencia)");
await captura("01-landing");
for (const frac of [0.4, 0.75, 1]) {
  await pagina.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
  await espera(450);
}
const revelados = (await pagina.$$(".revela.visto")).length, totalRevela = (await pagina.$$(".revela")).length;
igual(revelados >= 3, true, `secciones reveladas al hacer scroll (${revelados}/${totalRevela})`);

console.log("\n== 2 · AUTH: validaciones y registro ==");
await pagina.evaluate(() => window.scrollTo(0, 0));
await clic("Acceder");
await pagina.waitForSelector(".panel-auth", { timeout: 5000 }).then(() => ok("panel de auth visible")).catch(() => MAL("auth no apareció"));
await captura("02-auth");
await escribe("input[type=email]", "noesuncorreo");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Entrar →");
await espera(350);
igual((await cuerpo()).includes("eso no parece un correo válido"), true, "valida el formato del correo sin llamar a la API");
await clic("Crear", "pestaña Crear");
await espera(250);
await escribe("input[type=email]", "e2e@jumpernat.local");
await escribe("input[type=password]", "corta");
await clic("Crear cuenta →");
await espera(350);
igual((await cuerpo()).includes("8 caracteres o más"), true, "exige 8 caracteres en el registro");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Crear cuenta →");
await espera(700);
igual((await cuerpo()).includes("cuenta creada"), true, "registro completado");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Entrar →");
await enPanel().then(() => ok("panel visible tras el login")).catch(async () => {
  MAL("el login no llevó al panel"); console.log("  ERRORES:", JSON.stringify(errores, null, 1)); console.log("  BODY:", JSON.stringify((await cuerpo()).slice(0, 400)));
});

console.log("\n== 3 · PANEL: red APAGADA y todos los nodos a la vista ==");
await espera(700);
let c = await cuerpo();
igual(c.includes("DESACTIVADA"), true, "interruptor en DESACTIVADA (no auto-activa)");
igual(c.includes("RED OFF"), true, "chip de estado OFF");
igual(c.toUpperCase().includes("¿QUÉ PASA SI ACTIVO?"), true, "explica qué pasará antes de activar");
igual((await pagina.$(".interruptor.activo")) === null, true, "interruptor apagado");
igual((await pagina.$(".tuberia.off")) !== null, true, "tubería de tráfico detenida");
igual((await pagina.$(".leaflet-pane")) !== null, true, "mapa Leaflet inicializado sin crash");
igual((await pagina.$$(".marca-mapa")).length >= 1, true, "marcador propio en el mapa (sin imágenes de Leaflet)");
/* la UI lista los nodos en TARJETAS (y el panel usa <Nodos compacta />):
   se cuentan las tarjetas de nodos, no filas de tabla */
const nodosVistos = await pagina.evaluate(() => {
  const nombres = ["nodo1", "nodo2", "nodo3", "nodo4", "nodo5", "nodo6"];
  const tarj = [...document.querySelectorAll(".tarjeta")];
  return nombres.filter((n) => tarj.some((t) => t.textContent.includes(n))).length;
});
igual(nodosVistos >= 6, true, `los 6 nodos visibles aunque la red esté apagada (${nodosVistos}/6)`);
/* nodos DINÁMICOS: el equipo del usuario (peer_u7) aparece en la lista con su alias,
   el tablón en vivo está pintado con su latido, y el contador de nodos vive */
igual(c.includes("peer_u7"), true, "tu equipo (peer_u7) aparece en la lista de nodos");
igual(c.includes("Mi portátil"), true, "el nodo personal enseña el alias de su dueño");
igual(c.includes("LIVE") && await incluye("latencia media de tus saltos"), true, "tablón en vivo presente (LIVE + datos medidos)");
igual(c.includes("nodos_usuario") || c.includes("nodos de usuarios"), true, "contador con desglose de nodos de usuarios");
igual(await pagina.evaluate(() => window.__mock.latidos >= 1), true, "tu equipo emite su latido (/nodos/usuario)");
igual(c.includes("4 ms") || c.includes("5 ms"), true, "latencia TCP real por nodo");
igual(c.includes("hace 3.2 s") || c.includes("hace 4.1 s"), true, "edad del último latido por nodo");
igual(c.includes("Bilbao"), true, "geolocalización real de tu IP (Bilbao, vía /geo del servidor)");
igual(await pagina.evaluate(() =>
  [...document.querySelectorAll("button[disabled]")].some((b) => (b.textContent || "").includes("Comprobar"))), true, "la comprobación está deshabilitada con la red apagada");
/* selector de nº de saltos (nuevo, plan pro): las 5 opciones visibles */
igual(await pagina.evaluate(() => [...document.querySelectorAll("button")].some((b) => (b.textContent || "").includes("7 saltos"))), true, "selector de saltos con la opción 7");
/* Fase 9 — selector del MODO de saltos: todos vs solo externos + contador validados */
igual(await incluye("¿Por dónde quieres saltar?"), true, "selector del modo de saltos arriba del interruptor");
igual(await pagina.evaluate(() => [...document.querySelectorAll("button")].some((b) => (b.textContent || "").includes("Solo externos"))), true, "opción de modo SÓLO EXTERNOS visible (prueba de IP del peer)");
igual(await incluye("equipo(s) externo(s) validados"), true, "contador de externos validados por sonda TCP");
igual(await incluye("validados por sonda"), true, "el contador global ensea los nodos verificados por sondeo");
await captura("03-panel-apagado");

console.log("\n== 4 · ACTIVAR RED + verificación real de la IP ==");
await pulsaSwitch();
await pagina.waitForFunction(() => document.body.innerText.includes("RED ACTIVA"), { timeout: 9000 }).then(() => ok("estado RED ACTIVA")).catch(() => MAL("no activó"));
await espera(900);
c = await cuerpo();
igual(c.includes("nodo2") && c.includes("nodo1") && c.includes("nodo6"), true, "circuito nodo2 → nodo1 → nodo6 visible");
igual(c.includes("circuito encendido · desde"), true, "tablón en vivo marca el tiempo de circuito encendido");
igual(c.includes("salida (exit)"), true, "tablón en vivo etiqueta la salida del circuito");
igual(c.includes("129.213.137.20"), true, "IP de salida real mostrada");
igual(c.includes("Washington"), true, "geolocalización real de la IP de salida");
igual((await pagina.$(".parada.pulso")) !== null, true, "primera parada con pulso");
/* el panel activo marca cada nodo del circuito en su tarjeta: 1 · 2 · exit */
igual(c.includes("exit · salida real") || c.includes("tu circuito #3"), true, "el nodo exit marcado con su papel real");
const saltosMarcados = await pagina.evaluate(() => (document.body.innerText.match(/tu circuito #/g) || []).length);
igual(saltosMarcados, 3, `los 3 nodos del circuito marcados con su posición (${saltosMarcados}/3)`);
await captura("04-panel-activo");

console.log("\n== 5 · COMPROBACIÓN REAL DEL CIRCUITO ==");
await escribe("input[type=password]", "clave-mala");
await clic("Comprobar circuito ahora");
await espera(700);
igual((await cuerpo()).includes("la comprobación falló"), true, "con contraseña incorrecta avisa del fallo");
igual((await cuerpo()).includes("credenciales rechazadas"), true, "y explica el motivo real devuelto por el proxy");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Comprobar circuito ahora");
await espera(900);
c = await cuerpo();
igual(c.includes("el circuito funciona"), true, "con la contraseña correcta confirma que el destino ve otra IP");
igual(c.includes("IP observada por el destino"), true, "enseña la IP observada por el destino");
igual(c.includes("187 ms"), true, "enseña la latencia real de la comprobación");
igual(await pagina.evaluate(() => window.__mock.comprobaciones), 2, "la API recibió las dos comprobaciones");
await captura("05-verificacion");

console.log("\n== 6 · GIRAR circuito ==");
await clic("Girar circuito");
await espera(1100);
c = await cuerpo();
igual(c.includes("nodo3") && c.includes("nodo5") && c.includes("nodo4"), true, "circuito rotado a nodo3 → nodo5 → nodo4");

console.log("\n== 7 · PESTAÑA NODOS ==");
await clic("Nodos");
await espera(900);
c = await cuerpo();
igual(await incluye("Todos los nodos"), true, "vista completa de nodos");
igual(await incluye("conexiones reenviando"), true, "resumen de conexiones de toda la red");
/* vista de nodos: tarjetas por defecto (☰ cambia a tabla) */
const nodosEnPagina = await pagina.evaluate(() =>
  [...document.querySelectorAll(".tarjeta")].filter((t) => /nodo\d|peer_/.test(t.textContent)).length);
igual(nodosEnPagina >= 6, true, `vas a ver los 6 nodos aunque estés en vista tarjetas (${nodosEnPagina})`);
igual(c.includes("exit") && c.includes("entrada"), true, "papel de cada nodo en tu circuito (entrada / exit)");
igual(await incluye("nodo6:9000"), true, "dirección interna real de cada nodo");
igual(await incluye("caido"), true, "nodo6 sin latido marcado como caído (estado por heartbeat real)");
/* validación de vida y externos en la lista de nodos */
igual(await incluye("peer_ext_casa"), true, "el peer externo validado aparece en la lista");
igual(await incluye("peer_zombi"), true, "el peer que late sin servicio también se ve");
igual(await incluye("verificado"), true, "chips de verificación por sonda TCP");
igual(await incluye("sin verificar"), true, "el peer zombi queda marcado como sin verificar (no saltable)");
igual(await incluye("saltable"), true, "los validados se marcan como saltables");
/* filtro EXTERNOS en el desplegable: solo quedan peers tipo usuario validados */
await pagina.select('select[aria-label="Filtrar nodos"]', "externos");
await espera(600);
c = await cuerpo();
igual(c.includes("peer_ext_casa"), true, "con filtro externos se conserva el peer validado");
igual(c.includes("peer_zombi") || c.includes("nodo1"), false, "con filtro externos NO aparecen ni zombis ni infra");
await pagina.select('select[aria-label="Filtrar nodos"]', "todos");
await espera(400);
await captura("06-nodos");

console.log("\n== 8 · DOCUMENTACIÓN, CUENTA y DISEÑADOR ==");
/* la documentación interna vivió en una pestaña del panel; ahora es un sitio
   servido por WordPress y el enlace lateral la abre en pestaña nueva */
const enlaceDocs = await pagina.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((x) => (x.textContent || "").includes("Documentación"));
  return a ? a.href : null;
});
igual(!!enlaceDocs, true, "enlace de documentación presente");
igual((enlaceDocs || "").includes("/docs/"), true, `la documentación apunta a /docs/ (${(enlaceDocs || "?").slice(0, 70)})`);
await clic("Cuenta");
await espera(900);
c = await cuerpo();
igual(c.includes("e2e@jumpernat.local"), true, "la cuenta muestra tu email");
igual(c.includes("Zona de peligro"), true, "zona de peligro presente");
const antes = await pagina.evaluate(() => window.__mock.borrados);
await clic("Eliminar cuenta…");
await espera(400);
igual((await cuerpo()).includes("¿Seguro?"), true, "confirmación en dos pasos");
igual(await pagina.evaluate(() => window.__mock.borrados), antes, "el primer clic no borra nada");
await clic("Cancelar");
await clic("Diseñador");
await espera(800);
igual(await incluye("Preestablecidos"), true, "diseñador de temas");
const presetMatrix = await pagina.$$eval("button", (bs) => {
  const b = bs.find((x) => x.textContent.trim() === "Matrix");
  if (b) b.click();   // clic por DOM: dispara el onClick de React aunque el hijo lo cubra
  return !!b;
});
igual(presetMatrix, true, "botón del preset Matrix encontrado y pulsado");
await espera(500);
const acentoAplicado = await pagina.evaluate(() => document.documentElement.style.getPropertyValue("--acento-1"));
const temaGuardado = await pagina.evaluate(() => localStorage.getItem("jn-tema") || "");
console.log(`  [diag] --acento-1 = ${JSON.stringify(acentoAplicado)} · tema guardado = ${temaGuardado.slice(0, 60)}`);
igual(acentoAplicado.includes("22c55e"), true, "preset Matrix aplicado en vivo");
await captura("07-disenador");

console.log("\n== 9 · RESPONSIVE + MENÚ LATERAL EN MÓVIL ==");
await pagina.setViewport({ width: 390, height: 844 });
await espera(700);
const oculto = await pagina.$eval(".lateral", (e) => e.getBoundingClientRect().left < 0);
igual(oculto, true, "en móvil la barra lateral está oculta");
igual((await pagina.$(".hamburguesa")) !== null, true, "botón de menú presente en móvil");
await pagina.click(".hamburguesa");
ok("clic → abrir menú (hamburguesa)");
await espera(600);
igual(await pagina.$eval(".lateral", (e) => e.getBoundingClientRect().left >= -1), true, "el menú lateral se abre en móvil");
await captura("08-movil-menu");
await clic("Panel de red");
await espera(700);
const desborde = await pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
if (desborde.sw > desborde.iw + 2) {
  const culpables = await pagina.evaluate(() => [
    ...document.querySelectorAll("body *"),
  ].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.right > window.innerWidth + 2 && !e.closest(".halo, .fondo-fijo");
  }).slice(0, 10).map((e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return `${e.tagName.toLowerCase()}.${String(e.className || "").toString().split(" ")[0]} w=${Math.round(r.width)} der=${Math.round(r.right)} pl=${s.paddingLeft} minw=${s.minWidth}`;
  }));
  console.log("  [diag] elementos que desbordan:", culpables);
  /* Recorrido voraz: baja siempre por el hijo con mayor min-content para
     localizar el elemento concreto que ensancha la retícula del panel. */
  const ruta = await pagina.evaluate(() => {
    const minc = (e) => {
      const a = e.style.width; e.style.width = "min-content";
      const w = Math.round(e.getBoundingClientRect().width); e.style.width = a; return w;
    };
    const desc = (e) => `${e.tagName.toLowerCase()}.${String(e.className || "").toString().split(" ")[0]}`;
    const salida = [];
    let e = document.querySelector("main.contenido .apa");
    while (e && salida.length < 12) {
      const s = getComputedStyle(e);
      salida.push(`${desc(e)} minc=${minc(e)} w=${Math.round(e.getBoundingClientRect().width)} ws=${s.whiteSpace} ovx=${s.overflowX} disp=${s.display}`);
      const hijos = [...e.children];
      if (!hijos.length) break;
      hijos.sort((a, b) => minc(b) - minc(a));
      if (minc(hijos[0]) <= 0) break;
      e = hijos[0];
    }
    return salida;
  });
  console.log("  [diag] ruta más ancha por min-content:", ruta);
}
igual(desborde.sw <= desborde.iw + 2, true, `sin desborde horizontal en móvil (${desborde.sw} ≤ ${desborde.iw})`);
await captura("09-movil-panel");
await pagina.setViewport({ width: 1280, height: 900 });
await espera(400);

console.log("\n== 10 · DESACTIVAR, SALIR y BORRAR LA CUENTA ==");
await clic("Panel de red");
await espera(500);
await pulsaSwitch();
// Esperar al ESTADO real del interruptor (no al texto «DESACTIVADA», que
// también aparece en el explicativo estático de la tarjeta).
await pagina.waitForFunction(() => !document.querySelector(".interruptor.activo"), { timeout: 9000 }).then(() => ok("volvió a DESACTIVADA")).catch(() => MAL("no desactivó"));
await espera(400);
igual((await pagina.$(".interruptor.activo")) === null, true, "interruptor visualmente apagado");
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
igual(await pagina.evaluate(() => window.__mock.borrados), 1, "la API recibió el DELETE /me");
igual((await cuerpo()).includes("Crear mi cuenta"), true, "tras borrar la cuenta vuelve a la landing");
igual(await pagina.evaluate(() => localStorage.getItem("token")), null, "sin token tras borrar la cuenta");

console.log("\n== ERRORES DE CONSOLA / RED ==");
if (errores.length) errores.forEach((e) => MAL(e)); else ok("cero errores de consola y cero peticiones fallidas");

await navegador.close();
console.log(fallos ? `\n✗ ${fallos} fallos` : "\n✓ E2E COMPLETO: TODO CORRECTO");
process.exit(fallos ? 1 : 0);
