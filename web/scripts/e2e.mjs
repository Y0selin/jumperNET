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
      if (ruta === "/me" && metodo === "PATCH") {
        if (!S.token) return res({ detail: "token" }, 401);
        if (cuerpo.alias !== undefined) S.alias = cuerpo.alias || null;
        return res({ id: 7, email: S.email, alias: S.alias || null });
      }
      if (ruta === "/me") {
        if (!S.token) return res({ detail: "token" }, 401);
        return res({ id: 7, email: S.email, alias: S.alias || null, ip_real: IP_REAL, ip_salida: S.activo ? IP_SALIDA : null,
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
await navegador.defaultBrowserContext()
  .overridePermissions(new URL(URL_APP).origin, ["clipboard-read", "clipboard-write"])
  .catch(() => { /* el portapapeles no siempre está disponible en headless */ });
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
await pagina.evaluateOnNewDocument(() => {
  /* la intro y la invitación son de primera visita: el recorrido E2E ya las
     prueba aparte y aquí no debe tapar los clics de la app. */
  try {
    localStorage.setItem("jumpernet-intro-v31", "1");
    localStorage.setItem("jumpernet-visita-v31", "1");
  } catch { /* almacenamiento bloqueado */ }
});
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

/* El acceso es una página propia: #/acceso/login o #/acceso/registro.
   Se navega por hash (sin recargar) para no perder el mock de la API. */
async function irAlAcceso(modo = "login") {
  await pagina.evaluate((m) => { location.hash = "#/acceso/" + m; }, modo);
  await espera(400);
  await pagina.waitForSelector(".panel-auth", { timeout: 8000 });
}

/* clic limitado a un contenedor: en la portada hay botones «Crear cuenta»
   en la barra y «Crear» en las pestañas del formulario. */
async function clicEn(raiz, match, etiqueta = null) {
  for (const b of await pagina.$$(`${raiz} button`)) {
    const t = (await b.evaluate((e) => e.textContent)) || "";
    if (!t.includes(match)) continue;
    try {
      await b.click();
    } catch {
      await b.evaluate((e) => e.click());
    }
    ok(`clic → ${etiqueta || match}`); return true;
  }
  MAL(`no encontré botón «${match}» dentro de ${raiz}`); return false;
}

async function entrar(email, clave) {
  await pagina.evaluate((e, c) => { const s = window.__mock; s.email = e; s.pass = c; s.token = null; }, email, clave);
  await irAlAcceso("login").catch(() => {});
  await escribe("input[type=email]", email);
  await escribe("input[type=password]", clave);
  await clic("Entrar →");
  await enPanel();
}

console.log("\n== 1 · INICIO ==");
await pagina.goto(URL_APP, { waitUntil: "networkidle2" });
await espera(700);
await captura("01a-hero-claro");
igual((await texto(".pp-marca")).includes("JumperNET"), true, "la marca JumperNET abre la portada");
igual((await texto("h1")).toLowerCase().includes("no va sola"), true, "el hero promete el cambio de IP («no va sola»)");
igual((await pagina.$$("canvas")).length >= 1, true, "fondo de glifos (canvas) presente");
igual((await pagina.$$(".sp-tres-item")).length, 3, "tres ideas que explican el proyecto");
igual(await pagina.$$eval(".hn-paradas .hn-nodo", (b) => b.length), 5, "el hero enseña las cinco paradas");
igual(await pagina.$eval(".hn-panel", (e) => e.classList.contains("on")), true, "el circuito de portada arranca encendido");
await pagina.click(".hero-switch");
igual(await pagina.$eval(".hero-switch", (b) => b.getAttribute("aria-checked")), "false", "el interruptor apaga la red");
igual(await pagina.$eval(".hn-panel", (e) => e.classList.contains("off")), true, "la portada refleja la red apagada");
await pagina.click(".hero-switch");
await pagina.click(".hn-paradas .hn-nodo:nth-child(4)");
await espera(250);
igual((await texto(".hn-ficha")).includes("nodo₃"), true, "tocar una parada cuenta qué ve y qué sabe");
const antesGiro = await pagina.$$eval(".hn-paradas .hn-nodo b", (b) => b.map((x) => x.textContent).join("|"));
await pagina.click(".hn-girar");
igual((await pagina.$$eval(".hn-paradas .hn-nodo b", (b) => b.map((x) => x.textContent).join("|"))) !== antesGiro, true, "«girar relés» cambia el circuito");
igual((await pagina.$$(".sp-dir")).length >= 5, true, "directorio con las páginas del sitio");
igual(await pagina.$$eval(".sp-mapa-nodo", (b) => b.length), 5, "esquema del circuito con sus 5 paradas");
await pagina.click(".sp-mapa-nodo:nth-child(2)");
await espera(250);
igual((await texto(".sp-mapa-det-n")).includes("nodo₁"), true, "tocar una parada explica qué ve y qué sabe");
await pagina.click(".sp-mapa-acciones .btn.primario");
await espera(1600);
const avance = await pagina.$eval(".sp-mapa-paquete", (e) => parseFloat(e.style.left) || 0);
igual(avance > 30, true, `el paquete cruza el esquema (${avance}%)`);
await pagina.click(".sp-mapa-acciones .btn");
igual(await pagina.$eval(".sp-mapa-paquete", (e) => e.classList.contains("con-capas")), true, "el botón enseña las capas sobre el paquete");
await pagina.click(".sp-tres-item .sp-mas");
igual(await pagina.$$eval(".sp-mas-txt", (p) => p.length), 1, "las ideas se despliegan al pulsar «saber más»");
igual((await pagina.$(".pp-progreso")) !== null, true, "la cabecera tiene barra de progreso de lectura");
igual((await pagina.$(".pp-metricas")) !== null, true, "métricas vivas de la red");
igual((await pagina.$(".pp-video")) !== null, true, "vídeo de portada en el inicio");
const estiloPaquete = await pagina.$eval(".hn-paquete", (e) => {
  const s = getComputedStyle(e); return { nom: s.animationName, iter: s.animationIterationCount, dur: s.animationDuration };
});
igual(estiloPaquete.nom, "hn-viaje", "el paquete del hero recorre el circuito");
igual(estiloPaquete.iter, "infinite", "la animación del paquete se repite");
igual(parseFloat(estiloPaquete.dur) > 0, true, "duración del paquete válida (" + estiloPaquete.dur + ")");
igual(await pagina.$eval(".pp-nav", (e) => getComputedStyle(e).position), "fixed", "barra superior fija del sitio");
igual((await pagina.$(".hn-panel")) !== null, true, "panel interactivo del circuito en el hero");
igual((await pagina.$(".pp-dock")) !== null, true, "dock de navegación inferior presente");
igual((await pagina.$(".fondo-red")) !== null, true, "fondo de red interactivo presente");
await captura("01-inicio");

console.log("\n== 1a·1 · CINE DESDE LA CABECERA ==");
igual(await pagina.evaluate(() => document.documentElement.dataset.modo), "claro", "la interfaz abre en modo claro");
igual(await pagina.$$eval(".pp-video-cap", (a) => a.length), 7, "el vídeo de portada tiene siete capítulos");
igual((await pagina.$(".pp-video-sub")) !== null, true, "el reproductor muestra subtítulos");
await pagina.click(".pp-video-abrir");
await espera(1100);
igual(await pagina.$eval(".video-modal", (e) => e.classList.contains("abierto")), true, "el botón de la cabecera abre el cine");
igual(await pagina.$$eval(".video-modal-cap", (a) => a.length), 7, "el cine lista los siete capítulos");
igual(await pagina.$eval(".video-modal video", (v) => v.videoWidth > 0), true, "el vídeo del cine carga");
igual(await pagina.$eval(".video-modal-tiempo", (e) => e.textContent.includes("30 s")), true, "el cine muestra 30 s, no Infinity");
await captura("01a-video-modal");
await pagina.keyboard.press("Escape");
await espera(500);
igual(await pagina.$eval(".video-modal", (e) => !e.classList.contains("abierto")), true, "Escape cierra el cine");
for (const frac of [0.4, 0.75, 1]) {
  await pagina.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
  await espera(450);
}
const revelados = (await pagina.$$(".revela.visto")).length, totalRevela = (await pagina.$$(".revela")).length;
igual(revelados >= 3, true, `secciones reveladas al hacer scroll (${revelados}/${totalRevela})`);
await pagina.evaluate(() => window.scrollTo(0, 0));
/* el dock se oculta mientras el vídeo está a la vista: esperar a que
   termine su transición de vuelta, no a un tiempo fijo */
await pagina.waitForFunction(() => {
  const d = document.querySelector(".pp-dock");
  return d && Number(getComputedStyle(d).opacity) > .95;
}, { timeout: 4000 }).catch(() => {});
await espera(80);

console.log("\n== 1a · PÁGINAS PROPIAS (no anclas) ==");
const enlacesNav = await pagina.$$eval(".jn-dock-item", (as) => as.map((a) => a.getAttribute("href")));
igual(enlacesNav.length, 9, "el dock tiene las 9 páginas públicas");
igual(enlacesNav.includes("#/proyecto") && enlacesNav.includes("#/tarifas"), true, "los enlaces apuntan a rutas propias, no a anclas");
await pagina.click('.jn-dock-item[href="#/proyecto"]');
await espera(700);
igual(await pagina.evaluate(() => location.hash), "#/proyecto", "«Proyecto» navega a su propia URL");
igual((await texto("h1")).includes("Qué es JumperNET"), true, "la página del proyecto tiene su título");
igual(await pagina.evaluate(() => document.querySelector(".jn-dock-item.activa .jn-dock-txt")?.textContent || null), "Proyecto", "el dock marca la página activa");
igual((await pagina.$$(".pp-parada")).length >= 6, true, "el proyecto trae el flujo TÚ → 3 nodos → internet");
await captura("01a-proyecto");
await pagina.evaluate(() => document.querySelector(".ds").scrollIntoView({ block: "center" }));
await pagina.click(".ds .btn.primario");
await espera(2400);
const pasoDemo = await pagina.$eval(".ds", (e) => Number(e.dataset.paso));
igual(pasoDemo >= 2, true, `la demo mueve el paquete por los saltos (paso ${pasoDemo})`);
await pagina.click(".ds-capas-btn");
igual(await pagina.$eval(".ds-capas-btn", (e) => e.textContent.includes("Ver capas")), true, "la demo permite ocultar las capas");
await captura("01a-demo");

console.log("\n== 1a·2 · EL EQUIPO Y LA MARCA ==");
await pagina.evaluate(() => { location.hash = "#/equipo"; });
await espera(800);
igual(await pagina.evaluate(() => location.hash), "#/equipo", "«Equipo» tiene su propia URL");
igual((await texto("h1")).includes("Cinco personas"), true, "la página del equipo se presenta con las cinco personas");
igual(await pagina.$$eval(".eq-persona", (p) => p.length), 5, "las cinco fichas del equipo están en la página");
igual((await cuerpo()).includes("Yoselin") && (await cuerpo()).includes("Adrián"), true, "los nombres del equipo aparecen en la marca");
igual(await pagina.evaluate(() => document.querySelector(".jn-dock-item.activa .jn-dock-txt")?.textContent || null), "Equipo", "el dock marca «Equipo» como página activa");
await pagina.click(".eq-punto");
await espera(250);
igual(await pagina.$eval(".eq-logo-foco", (e) => e.className.includes("es-01")), true, "el logo se explica por piezas al tocarlo");
await captura("01a-equipo");

await pagina.click('.jn-dock-item[href="#/usos"]');
await espera(700);
igual(await pagina.evaluate(() => location.hash), "#/usos", "«Para qué sirve» navega a su propia URL");
igual((await texto("h1")).includes("Qué puedes hacer"), true, "la página explica para qué sirve con situaciones");
igual(await pagina.$$eval(".us-tab", (b) => b.length), 5, "cinco escenarios de uso seleccionables");
await pagina.click(".us-tab:nth-child(2)");
await espera(250);
igual(await pagina.$eval(".us-tab:nth-child(2)", (b) => b.getAttribute("aria-selected")), "true", "el escenario elegido queda marcado");
igual(await pagina.$eval(".us-ruta", (e) => e.classList.contains("on")), false, "el circuito empieza apagado");
await pagina.click(".us-switch");
await espera(350);
igual(await pagina.$eval(".us-switch", (b) => b.getAttribute("aria-checked")), "true", "el interruptor enciende el circuito");
igual(await pagina.$eval(".us-ruta", (e) => e.classList.contains("on")), true, "la ruta se dibuja encendida");
igual((await cuerpo()).includes("la IP del exit"), true, "enseña qué ve el destino con el circuito encendido");
const rotulo1 = await pagina.$$eval(".us-ruta .us-nodo b", (bs) => bs[1]?.textContent || "");
await pagina.click(".us-girar");
await espera(300);
const rotulo2 = await pagina.$$eval(".us-ruta .us-nodo b", (bs) => bs[1]?.textContent || "");
igual(rotulo2 !== rotulo1, true, `«girar nodos» cambia el circuito (${rotulo1} → ${rotulo2})`);
await captura("01b-usos");
await pagina.evaluate(() => { location.hash = "#/funciona"; });
await espera(700);
igual((await texto(".terminal")).includes("jumpernat"), true, "«Cómo funciona» trae la terminal viva");
igual((await cuerpo()).includes("--proxy-user"), true, "y el comando correcto (--proxy-user)");

await pagina.evaluate(() => { location.hash = "#/tarifas"; });
await espera(600);
igual(await pagina.evaluate(() => document.querySelectorAll(".jn-plan").length), 3, "«Tarifas» tiene página propia con los 3 planes");

await pagina.evaluate(() => { location.hash = "#/dudas"; });
await espera(600);
igual((await pagina.$$(".pp-faq-item")).length >= 6, true, "«Dudas» lista las preguntas en su página");
await pagina.click(".pp-faq-item");
await espera(300);

await pagina.evaluate(() => { location.hash = "#/descargas"; });
await espera(600);
igual(await incluye("Extensión"), true, "«Descargas» es una página con las entregas");

await pagina.evaluate(() => { location.hash = "#/"; });
await espera(700);

console.log("\n== 1b · VÍDEO DE PORTADA ==");
igual(await pagina.evaluate(() => location.hash), "#/", "de vuelta en el inicio");
await pagina.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  document.getElementById("video").scrollIntoView();
});
await espera(1800);
const vid = await pagina.evaluate(async () => {
  const v = document.querySelector(".pp-video-lienzo");
  if (!v) return null;
  v.muted = true;
  try { await v.play(); } catch { /* el navegador headless puede bloquear el gesto */ }
  await new Promise((r) => setTimeout(r, 700));
  return { w: v.videoWidth, h: v.videoHeight, t: v.currentTime, pausado: v.paused, listo: v.readyState };
});
igual(vid?.w, 1280, `el vídeo de portada carga a ${vid?.w}×${vid?.h}`);
igual(vid?.t > 0 && !vid?.pausado, true, "el vídeo de portada se reproduce");
/* la cabecera ya no lleva «Inicio»: el logo es el inicio, así que volver a #/
   no marca ninguna pestaña (y eso es lo correcto, no un fallo). */
igual(await pagina.evaluate(() => document.querySelector(".jn-dock-item.activa .jn-dock-txt")?.textContent || null), "Inicio", "en la portada el dock marca Inicio");
igual(await pagina.evaluate(() => document.querySelector(".pp-marca").getAttribute("href")), "#/", "el logo lleva a la portada");
await captura("01b-video");

console.log("\n== 1c · CABECERA MÓVIL ==");
await pagina.setViewport({ width: 390, height: 844 });
await espera(700);
await pagina.evaluate(() => window.scrollTo(0, 0));
await espera(500);
igual(await pagina.$eval(".pp-dock", (e) => {
  const r = e.getBoundingClientRect();
  return r.width > 300 && r.top > 700 && r.bottom <= 845;
}), true, "dock fijo y visible en móvil");
igual(await pagina.$$eval(".jn-dock-item", (a) => a.length), 9, "el dock conserva las nueve páginas en móvil");
igual(await pagina.evaluate(() => [...document.querySelectorAll(".jn-dock-ico")].every((e) => e.getBoundingClientRect().width > 0)), true, "iconos visibles en el dock móvil");
igual(await pagina.$eval(".pp-nav", (e) => e.getBoundingClientRect().height > 0), true, "barra superior visible en móvil");
igual(await pagina.evaluate(() => !!document.querySelector('.pp-nav-acciones a[href="#/acceso/login"]')), true, "«Entrar» sigue accesible en móvil");
await captura("01c-dock-movil");
await pagina.click('.jn-dock-item[href="#/proyecto"]');
await espera(700);
igual(await pagina.evaluate(() => location.hash), "#/proyecto", "el dock móvil navega a otra página");
await pagina.evaluate(() => { location.hash = "#/"; });
await espera(600);
await pagina.setViewport({ width: 1280, height: 900 });
await espera(600);

console.log("\n== 2 · AUTH: validaciones y registro ==");
await irAlAcceso("login");
igual(await pagina.evaluate(() => location.hash), "#/acceso/login", "el acceso tiene URL propia (#/acceso/login)");
await pagina.waitForSelector(".panel-auth", { timeout: 5000 }).then(() => ok("panel de auth visible")).catch(() => MAL("auth no apareció"));
await captura("02-auth");
await escribe("input[type=email]", "noesuncorreo");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Entrar →");
await espera(350);
igual((await cuerpo()).includes("eso no parece un correo válido"), true, "valida el formato del correo sin llamar a la API");
await irAlAcceso("registro");
igual(await pagina.evaluate(() => location.hash), "#/acceso/registro", "el registro tiene URL propia (#/acceso/registro)");
igual(await pagina.evaluate(() => document.querySelector(".pestAuth.on")?.textContent.trim()), "Crear", "la página de registro abre en modo «Crear»");
await escribe("#jn-nombre", "Fernando E2E");
await escribe("input[type=email]", "e2e@jumpernat.local");
await escribe("input[type=password]", "corta");
await clic("Crear cuenta →");
await espera(350);
igual((await cuerpo()).includes("8 caracteres o más"), true, "exige 8 caracteres en el registro");
await escribe("input[type=password]", "clave-e2e-123");
await clic("Crear cuenta →");
/* el registro entra directo al panel: no se vuelve a pedir la contraseña */
await enPanel().then(() => ok("registro completado y entrada automática al panel")).catch(async () => {
  MAL("el registro no llevó al panel"); console.log("  ERRORES:", JSON.stringify(errores, null, 1)); console.log("  BODY:", JSON.stringify((await cuerpo()).slice(0, 400)));
});
igual(await pagina.evaluate(() => location.hash), "#/panel", "el registro entra al panel por su ruta (#/panel)");
igual((await cuerpo()).includes("cuenta creada"), true, "aviso de cuenta creada");

console.log("\n== 3 · PANEL: red APAGADA y todos los nodos a la vista ==");
await clic("Panel de red");
await espera(900);
let c = await cuerpo();
igual(c.includes("DESACTIVADA"), true, "interruptor en DESACTIVADA (no auto-activa)");
igual(c.includes("RED OFF"), true, "chip de estado OFF");
igual(c.toUpperCase().includes("¿QUÉ PASA SI ACTIVO?"), true, "explica qué pasará antes de activar");
igual((await pagina.$(".interruptor.activo")) === null, true, "interruptor apagado");
igual((await pagina.$(".tuberia.off")) !== null, true, "tubería de tráfico detenida");
igual((await pagina.$(".pn-off-aviso")) !== null, true, "aviso de red apagada visible");
igual((await pagina.$(".pn-verificacion")) === null, true, "la verificación no aparece hasta activar la red");
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

igual(c.includes("nodos_usuario") || c.includes("nodos de usuarios"), true, "contador con desglose de nodos de usuarios");
igual(await pagina.evaluate(() => window.__mock.latidos >= 1), true, "tu equipo emite su latido (/nodos/usuario)");
igual(c.includes("4 ms") || c.includes("5 ms"), true, "latencia TCP real por nodo");
igual(c.includes("hace 3.2 s") || c.includes("hace 4.1 s"), true, "edad del último latido por nodo");
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
await pagina.waitForSelector(".leaflet-pane", { timeout: 5000 }).then(() => ok("mapa Leaflet inicializado con la red activa")).catch(() => MAL("mapa Leaflet no apareció"));
igual((await pagina.$$(".marca-mapa")).length >= 1, true, "marcador propio en el mapa (sin imágenes de Leaflet)");
igual(c.includes("LIVE") && await incluye("latencia media de tus saltos"), true, "tablón en vivo presente (LIVE + datos medidos)");
igual(c.includes("Bilbao"), true, "geolocalización real de tu IP (Bilbao, vía /geo del servidor)");
igual(await pagina.evaluate(() => [...document.querySelectorAll("button")].some((b) => (b.textContent || "").includes("Comprobar circuito ahora") && !b.disabled)), true, "la comprobación se habilita con la red activa");
igual(c.includes("salida (exit)"), true, "tablón en vivo etiqueta la salida del circuito");
igual(c.includes("129.213.137.20"), true, "IP de salida real mostrada");
igual(c.includes("Washington"), true, "geolocalización real de la IP de salida");
igual((await pagina.$(".parada.pulso")) !== null, true, "primera parada con pulso");
/* el panel activo marca cada nodo del circuito en su tarjeta: 1 · 2 · exit */
igual(c.includes("exit · salida real") || c.includes("tu circuito #3"), true, "el nodo exit marcado con su papel real");
const saltosMarcados = await pagina.evaluate(() => (document.body.innerText.match(/tu circuito #/g) || []).length);
igual(saltosMarcados, 3, `los 3 nodos del circuito marcados con su posición (${saltosMarcados}/3)`);
await captura("04-panel-activo");

console.log("\n== 4b · COPIAR LA IP DE SALIDA ==");
const botonCopiar = await pagina.$(".ip-caja.salida .ip-copiar");
if (!botonCopiar) {
  MAL("no encontré el botón para copiar la IP de salida");
} else {
  await botonCopiar.click();
  await espera(250);
  const textoCopiar = (await botonCopiar.evaluate((e) => e.textContent)) || "";
  igual(textoCopiar.includes("copiada"), true, "el botón confirma la IP copiada");
  const portapapeles = await pagina.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  igual(portapapeles, "129.213.137.20", "el portapapeles recibe la IP de salida real");
}

console.log("\n== 4c · DIAGNÓSTICO DE LA SESIÓN ==");
await clic("Ejecutar diagnóstico");
await espera(1200);
const filasDiagnostico = await pagina.$$(".pn-diag-fila");
igual(filasDiagnostico.length, 6, "el diagnóstico muestra sus 6 comprobaciones");
igual(await incluye("IP que ve internet"), true, "el diagnóstico incluye la salida real");
igual(await incluye("JWT válido"), true, "el diagnóstico valida la sesión JWT");
await clic("Copiar informe");
await espera(250);
const informe = await pagina.evaluate(() => navigator.clipboard.readText()).catch(() => "");
igual(informe.includes("JumperNET · diagnóstico de red"), true, "el informe se copia con su cabecera");
igual(informe.includes("129.213.137.20"), true, "el informe incluye la IP de salida");
igual(await pagina.evaluate(() => !!localStorage.getItem("jumpernet-diagnostico-v1")), true, "el último diagnóstico queda guardado en el navegador");
await pagina.$eval(".pn-diag", (e) => e.scrollIntoView({ block: "center" }));
await espera(350);
await captura("05b-diagnostico");

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
const etiquetaNodos = (await cuerpo()).includes("Gestor de nodos") ? "Gestor de nodos" : "Nodos disponibles";
await clic(etiquetaNodos);
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

console.log("\n== 8 · DOCUMENTACIÓN, PERFIL y APARIENCIA ==");
/* La documentación se abre desde Soporte; el enlace externo está dentro de
   la página y apunta al sitio servido por WordPress. */
await clic("Soporte");
await espera(300);
await clic("Documentación");
await espera(700);
const enlaceDocs = await pagina.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((x) => (x.href || "").includes("/docs/"));
  return a ? a.href : null;
});
igual(!!enlaceDocs, true, "enlace de documentación presente");
igual((enlaceDocs || "").includes("/docs/"), true, `la documentación apunta a /docs/ (${(enlaceDocs || "?").slice(0, 70)})`);
await clic("Cuenta");
await espera(300);
await clic("Mi perfil");
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
await clic("Apariencia");
await espera(800);
igual(await incluye("Preestablecidos"), true, "apariencia con preestablecidos de tema");
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
/* el lateral se oculta con una transición al entrar la media query: esperar a
   la geometría real (fuera de pantalla) en vez de asumir un tiempo fijo. */
await pagina.waitForFunction(() => {
  const e = document.querySelector(".lateral");
  if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.right <= 0 || r.width === 0;
}, { timeout: 5000 }).catch(() => {});
const geoLateral = await pagina.$eval(".lateral", (e) => {
  const r = e.getBoundingClientRect();
  const s = getComputedStyle(e);
  return {
    izq: Math.round(r.left), der: Math.round(r.right), ancho: Math.round(r.width),
    tr: s.transform, anim: s.animationName,
    mq: window.matchMedia("(max-width: 1000px)").matches, iw: window.innerWidth,
  };
});
console.log("  [diag] lateral en móvil:", JSON.stringify(geoLateral));
/* Oculto = fuera de pantalla por la izquierda o sin ancho (el diseño puede
   recortar la columna a 0 en móvil, no solo desplazarla con transform). */
igual(geoLateral.der <= 0 || geoLateral.ancho === 0, true, "en móvil la barra lateral está oculta");
igual((await pagina.$(".hamburguesa")) !== null, true, "botón de menú presente en móvil");
await pagina.click(".hamburguesa");
ok("clic → abrir menú (hamburguesa)");
/* la barra tiene una transición: se espera a que termine, no a un tiempo fijo */
await pagina.waitForFunction(() => {
  const e = document.querySelector(".lateral");
  if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.left >= -1;
}, { timeout: 4000 }).catch(() => {});
const geoAbierto = await pagina.$eval(".lateral", (e) => {
  const r = e.getBoundingClientRect();
  return { izq: Math.round(r.left), der: Math.round(r.right), ancho: Math.round(r.width) };
});
console.log("  [diag] lateral abierto:", JSON.stringify(geoAbierto));
igual(geoAbierto.der > 0 && geoAbierto.ancho > 0 && geoAbierto.izq >= -1, true, "el menú lateral se abre en móvil");
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
igual((await pagina.$(".leaflet-pane")) === null, true, "el mapa se destruye al apagar la red");
/* segunda conexión: el mapa debe volver a montarse sobre el contenedor nuevo */
await pulsaSwitch();
await pagina.waitForFunction(() => document.body.innerText.includes("RED ACTIVA"), { timeout: 9000 }).then(() => ok("segunda conexión activa")).catch(() => MAL("no reactivó"));
await pagina.waitForSelector(".leaflet-pane", { timeout: 5000 }).then(() => ok("el mapa vuelve a montarse tras reconectar")).catch(() => MAL("el mapa no volvió tras reconectar"));
await pulsaSwitch();
await pagina.waitForFunction(() => !document.querySelector(".interruptor.activo"), { timeout: 9000 }).then(() => ok("red apagada de nuevo")).catch(() => MAL("no desactivó la segunda vez"));
await clic("Salir");
await espera(900);
igual((await cuerpo()).includes("Crear mi cuenta"), true, "vuelta al inicio tras salir");
igual(await pagina.evaluate(() => location.hash), "#/", "salir lleva a la portada pública");
igual(await pagina.evaluate(() => localStorage.getItem("token")), null, "el token se borra al salir");

await entrar("e2e@jumpernat.local", "clave-e2e-123");
ok("segunda sesión iniciada para probar el borrado");
await clic("Cuenta");
await espera(300);
await clic("Mi perfil");
await espera(800);
await clic("Eliminar cuenta…");
await espera(300);
await clic("Sí, eliminar para siempre");
await espera(1200);
igual(await pagina.evaluate(() => window.__mock.borrados), 1, "la API recibió el DELETE /me");
igual((await cuerpo()).includes("Crear mi cuenta"), true, "tras borrar la cuenta vuelve al inicio");
igual(await pagina.evaluate(() => localStorage.getItem("token")), null, "sin token tras borrar la cuenta");

console.log("\n== ERRORES DE CONSOLA / RED ==");
if (errores.length) errores.forEach((e) => MAL(e)); else ok("cero errores de consola y cero peticiones fallidas");

await navegador.close();
console.log(fallos ? `\n✗ ${fallos} fallos` : "\n✓ E2E COMPLETO: TODO CORRECTO");
process.exit(fallos ? 1 : 0);
