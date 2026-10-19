/* ═══════════════════════════════════════════════════════════════════════════
 * JumperNET Browser v2 — reescritura completa.
 *
 * Como el Tor Browser, pero sobre TU red:
 *   · Al abrir: página de inicio LOCAL (jn://inicio) con buscador DuckDuckGo.
 *   · En la esquina inferior-derecha: chip «PROXY ON/OFF».
 *   · Al ACTIVARLO: pones tus credenciales de la web una vez y, a partir de
 *     ahí, TODO el tráfico (páginas, WebSockets, fetch) va por tu circuito de
 *     3 saltos y sale con la IP del nodo de salida.
 *   · El desafío 407 del proxy se responde AQUÍ (main), sin ventanas extra.
 *
 * Lecciones de la v1 aplicadas:
 *   · El proxy se establece en TODAS las sesiones (default + persist:jn) con
 *     UNA sola función: nunca puede quedar una pestaña navegando directa.
 *   · El vigilante de carga vive en el main (los timers del renderer duermen
 *     con la ventana sin foco): reintentos ×2 → página local jn://error con
 *     el motivo ERR_… y botón Reintentar.
 *   · Todo el arranque está protegido: si la red no va, el navegador igual
 *     se abre (con estado visible y log para depurar).
 *   · Log rotatorio en fichero + página jn://log para depurar en campo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
"use strict";

const { app, BrowserWindow, ipcMain, session, Menu, protocol, webContents } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/* ------------------------------------------------------------------ config */

const API_URL = "https://jumpernet.duckdns.org";
const PROXY_HOST = "jumpernet.duckdns.org";
const PROXY_PUERTO = 1081;          // entrada HTTP del circuito (auth Basic)
const PART_PESTANAS = "persist:jn"; // sesión persistente de las pestañas
const HOME = "https://duckduckgo.com/?q="; // motor por defecto (como Tor Browser)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 JumperNETBrowser/2.0";

/* ------------------------------------------------------------------ log */

const LOG_MAX = 400;
const LOG_LINEAS = [];
let ficheroLog = null;

function limpiaLog(s) {
  /* ninguna credencial en el log: email enmascarado siempre */
  return String(s).replace(/([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+/g, "$1@…");
}

function log(mensaje, nivel = "info") {
  const linea = `[${new Date().toISOString().slice(11, 23)}] (${nivel}) ${limpiaLog(mensaje)}`;
  LOG_LINEAS.push(linea);
  if (LOG_LINEAS.length > LOG_MAX) LOG_LINEAS.shift();
  try { if (ficheroLog) fs.appendFileSync(ficheroLog, linea + "\n", { mode: 0o600 }); } catch { /* nada */ }
  console.log(linea);
}

/* ------------------------------------------------------------------ estado */

let ventana = null;
let conta = { email: null, clave: null, token: null }; // credenciales del usuario
let estado = { // lo que verá el chip/panel
  proxyActivo: false,
  cuentaOk: false,
  redActiva: false,
  circuito: null,
  ipSalida: null,
  email: null,
  error: null,
  tunel: null,      // "conectado" | "rechazado" | null (estado del túnel peer)
};

const ficheroCuenta = () => path.join(app.getPath("userData"), "cuenta.json");

function guardarCuenta() {
  try { fs.writeFileSync(ficheroCuenta(), JSON.stringify(conta), { mode: 0o600 }); }
  catch (e) { log("no pude guardar la cuenta: " + e.message, "aviso"); }
}
function cargarCuenta() {
  try { conta = { email: null, clave: null, token: null, ...JSON.parse(fs.readFileSync(ficheroCuenta(), "utf8")) }; }
  catch { /* primera ejecución: no hay cuenta */ }
}

/* ------------------------------------------------------------------ API */

async function api(metodo, ruta, cuerpo) {
  const cab = { "Content-Type": "application/json" };
  if (conta.token) cab.Authorization = "Bearer " + conta.token;
  const r = await fetch(API_URL + ruta, {
    method: metodo,
    headers: cab,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  let datos = null;
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok) throw new Error((datos && datos.detail) || ("HTTP " + r.status));
  return datos;
}

/* ------------------------------------------------------------- proxy global */

function sesiones() { return [session.defaultSession, session.fromPartition(PART_PESTANAS)]; }

async function proxyEncender() {
  /* OJO: el separador es PUNTO Y COMA. Con comas Chromium no parsea las
     reglas y cae a DIRECT silenciosamente — es exactamente el bug que
     salió en Windows (todo "funcionaba" pero sin circuito). Canario
     verificado con resolveProxy: comas → "DIRECT", punto y coma → proxy. */
  const reglas = {
    mode: "fixed_servers",
    proxyRules: `http=${PROXY_HOST}:${PROXY_PUERTO};https=${PROXY_HOST}:${PROXY_PUERTO}`,
    proxyBypassList: "localhost,127.0.0.1,[::1]",
  };
  for (const ses of sesiones()) await ses.setProxy(reglas);
  estado.proxyActivo = true;
  log(`proxy ENCENDIDO -> ${PROXY_HOST}:${PROXY_PUERTO} (fixed_servers, todas las sesiones)`);
}

async function proxyApagar() {
  for (const ses of sesiones()) await ses.setProxy({ proxyRules: "direct" });
  estado.proxyActivo = false;
  log("proxy apagado (conexión directa)");
}

/* El 407 del proxy se responde AQUÍ, para todas las sesiones, sin ventanas.
 * Firma exacta: (event, webContents, authenticationResponseDetails, authInfo, callback) */
app.on("login", (evento, _wc, _detalles, authInfo, responde) => {
  if (!authInfo || !authInfo.isProxy) return;
  evento.preventDefault();
  if (!conta.email || !conta.clave) {
    log("407 pero sin credenciales: cancelo la autenticación (el vigilante actuará)", "aviso");
    responde(); // cancela: Chromium produce un fallo de carga y el vigilante actúa
    return;
  }
  log("407 del proxy → respondo con " + conta.email);
  responde(conta.email, conta.clave);
});

/* ═════════════════════════════════════════ ciclo de conexión (el toggle) */
/*   1) valida/renueva sesión en la API — 401 → NUNCA activo el proxy a ciegas
 *   2) si la RED está apagada → auto-encendido
 *   3) encender el proxy de TODAS las sesiones (el 407 ya sabe quién es)
 *   4) verificación honesta: petición real por el proxy → IP del exit
 */
async function conectarProxy(credencialesNuevas) {
  const fallo = (mensaje) => {
    estado.error = mensaje;
    difundirEstado();
    return { ok: false, error: mensaje };
  };

  if (credencialesNuevas && credencialesNuevas.email) {
    conta.email = String(credencialesNuevas.email).trim();
    conta.clave = String(credencialesNuevas.clave || "");
    conta.token = null;
    guardarCuenta();
  }
  if (!conta.email || !conta.clave) return fallo("Escribe tu email y contraseña.");

  try {
    estado.error = null;
    // 1) ficha actual (si el JWT caducó, hace login otra vez aquí mismo)
    let yo;
    try {
      yo = await api("GET", "/me");
    } catch {
      log("GET /me falló → probando /login");
      const sesion = await api("POST", "/login", { email: conta.email, password: conta.clave });
      conta.token = sesion.token || sesion.access_token || null;
      guardarCuenta();
      yo = await api("GET", "/me");
    }
    estado.cuentaOk = true;
    estado.email = conta.email;

    // 2) auto-encendido de la red si estaba apagada
    if (!yo.activo) {
      log("red apagada → enciendo automáticamente");
      yo = await api("POST", "/connect");
      if (!yo.activo) yo = await api("GET", "/me");
    }
    estado.redActiva = !!yo.activo;
    estado.circuito = yo.circuito || null;
    estado.ipSalida = yo.ip_salida || null;

    // 3) el proxy YA, en todas las sesiones
    await proxyEncender();
    difundirEstado();

    // 3b) túnel del peer si el opt-in está aceptado (sin puertos, modelo Tor)
    tunelSegunOptin(yo);   // en segundo plano: no bloquea la conexión del proxy

    // 4) verificación HONESTA de la IP: la mide el SERVIDOR haciendo una
    //    petición real por el circuito (independiente del stack del navegador).
    //    Fallback: fetch por la sesión (fixed_servers ya está activo).
    const ip = await comprobarIPSalida();
    if (ip) estado.ipSalida = ip;
    difundirEstado();
    log("conectado ✓ exit=" + (estado.ipSalida || "?"));
    return { ok: true };
  } catch (e) {
    await proxyApagar();
    estado.cuentaOk = false;
    log("conectar falló: " + e.message, "error");
    return fallo(String(e.message || e).slice(0, 180));
  }
}

async function comprobarIPSalida() {
  /* Verificación de la IP de salida, en dos niveles:
   *  1) POST /comprobar: el SERVIDOR hace una petición real por el circuito
   *     (con tu cuenta y contraseña) y devuelve la IP que vio el destino.
   *     Es lo más honesto: no depende de cómo el navegador maneja el proxy.
   *  2) fallback: fetch por session.defaultSession (va por el network
   *     service → respeta el proxy y el 407). El fetch de Node/undici NO
   *     respeta el proxy: saldría directo y devolvería TU IP — nunca usarlo. */
  try {
    const c = await api("POST", "/comprobar", { password: conta.clave });
    if (c && c.ok && c.ip_observada) {
      log("/comprobar (server-side) OK: exit=" + c.ip_observada + " tu_ip=" + (c.tu_ip || "?"));
      return c.ip_observada;
    }
    log("/comprobar respondió sin ip_observada: " + (c && (c.error || c.detail) || "?"), "aviso");
  } catch (e) {
    log("/comprobar falló: " + e.message + " — uso la verificación local", "aviso");
  }
  try {
    const r = await session.defaultSession.fetch("https://api.ipify.org?format=json", {
      headers: { "Cache-Control": "no-store" },
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json();
    return j.ip || null;
  } catch (e) {
    log("comprobación local de IP falló: " + e.message, "aviso");
    return null; // no bloquea la conexión: el panel mostrará la IP guardada
  }
}

async function desconectarProxy() {
  await proxyApagar();
  detenerTunel();
  estado.redActiva = false;
  estado.circuito = null;
  difundirEstado();
  return { ok: true };
}

/* ══════════════════════════════ túnel inverso (ser salto, sin puertos) ════
 * Si el usuario ACEPTÓ ser salto (POST /me salto_publico=true), este proceso
 * hijo mantiene UNA conexión saliente al broker del VPS: su equipo queda
 * disponible como salto externo SIN abrir puertos en el router (modelo Tor:
 * la conexión la abre él hacia afuera). El broker la sirve a la red cuando
 * alguien salta por él. Detener el agente o revocar el opt-in = sin salto. */
let tunelProceso = null;
let tunelDeseado = false;   // el opt-in sigue aceptado → el agente DEBE estar vivo

function detenerTunel() {
  tunelDeseado = false; // sin opt-in activo el vigilante no re-lanza nada
  if (tunelProceso) {
    try { tunelProceso.kill(); } catch { /* nada */ }
    tunelProceso = null;
    estado.tunel = null;
    log("túnel del peer detenido");
  }
}

async function tunelSegunOptin(yo) {
  detenerTunel();
  if (!yo.salto_publico) return;   // no aceptó: nada de túnel
  tunelDeseado = true;
  try {
    const info = await api("GET", "/peer_token");
    const args = [
      info.broker.split(":")[0] || "jumpernet.duckdns.org",
      info.broker.split(":")[1] || "9008",
      info.nombre || `peer_u${yo.id}`,
      info.peer_token,
      "80,443",
      info.clave_saltos || "",   // JENC: solo el exit la necesita (/peer_token la da al dueño)
    ];
    // ELECTRON_RUN_AS_NODE=1: en producción (empaquetado) process.execPath no
    // es node sino electron-as-node; en dev es el node del sistema. Igual que
    // agente_tunel.js es Node puro.
    tunelProceso = spawn(process.execPath, [path.join(__dirname, "agente_tunel.js"), ...args], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    tunelProceso.stdout.on("data", (d) => {
      const s = String(d);
      if (s.includes("túnel aceptado")) { estado.tunel = "conectado"; difundirEstado(); }
      // credenciales rechazadas o sin opt-in: no tiene sentido re-lanzarlo
      if (s.includes("NOOPTIN")) { estado.tunel = "sin-optin"; tunelDeseado = false; difundirEstado(); }
      if (s.includes("credenciales rechazadas")) { tunelDeseado = false; }
    });
    tunelProceso.stderr.on("data", (d) => log("tunel(stderr): " + String(d).slice(0, 120), "aviso"));
    tunelProceso.on("exit", (code) => { tunelProceso = null; estado.tunel = null; log("agente del túnel salió (código " + code + ")"); difundirEstado(); });
    log("túnel del peer arrancado (conexión saliente: sin puertos abiertos)");
  } catch (e) {
    log("no pude arrancar el túnel: " + e.message, "aviso");
  }
}

/* Vigilante del túnel: si el agente MUERE (fallo de red, <>…), main lo
 * re-lanza en ≤25 s mientras el opt-in siga aceptado. Es lo que permite
 * que el peer figure SIEMPRE saltable (con latencia) mientras el
 * usuario haya dicho «acep tar ser salto» — sin tocar nada. */
setInterval(() => {
  if (!tunelDeseado || tunelProceso) return;
  log("el agente del túnel no está: lo re-lanzo (auto-sanación)");
  tunelSegunOptin({ salto_publico: true }).catch(() => { /* ya logueado */ });
}, 25000);

async function rotarCircuito() {
  try {
    const r = await api("POST", "/rotate");
    estado.circuito = r.circuito || estado.circuito;
    estado.ipSalida = r.ip_salida || estado.ipSalida;
    difundirEstado();
    log("circuito rotado");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 180) };
  }
}

function difundirEstado() {
  const s = { ...estado, email: conta.email ? conta.email.replace(/@.*$/, "@…") : null };
  try { if (ventana && !ventana.isDestroyed()) ventana.webContents.send("jn:estado", s); } catch { /* nada */ }
}

/* ═════════════════════════════════════════════════ IPC: el puente con la UI */

ipcMain.handle("jn:obtenerEstado", () => ({ ...estado }));
ipcMain.handle("jn:activar", (_e, credenciales) => conectarProxy(credenciales));
ipcMain.handle("jn:desactivar", () => desconectarProxy());
ipcMain.handle("jn:rotar", () => rotarCircuito());
ipcMain.handle("jn:log", () => LOG_LINEAS.join("\n"));
ipcMain.handle("jn:reiniciar", () => { app.relaunch(); app.exit(0); });
ipcMain.handle("jn:abrirExterno", (_e, url) => require("electron").shell.openExternal(url));
/* opt-in del salto (aceptar/revocar) + encendido inmediato del túnel (sin puertos) */
ipcMain.handle("jn:serSalto", async (_e, acepta) => {
  try {
    await api("PATCH", "/me", { salto_publico: !!acepta });
    if (acepta) await tunelSegunOptin({ salto_publico: true, id: null });
    else detenerTunel();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 160) };
  }
});

/* ═════════════════════════════════════════════════ ventana + esquema jn:// */

/* Los bounds del último cierre se recuerdan (por pantalla), pero SIEMPRE
   recortados al área visible del monitor donde caiga la ventana: así nunca
   arrastra una ventana más alta que la pantalla (el «navegador cortado
   por la mitad» al reabrirla en otro equipo o monitor menor). */
const BOUNDS_FICHERO = path.join(app.getPath("userData"), "bounds.json");
function cargaBounds() {
  try { return JSON.parse(fs.readFileSync(BOUNDS_FICHERO, "utf8")); } catch { return null; }
}
function guardaBounds() {
  if (!ventana || ventana.isDestroyed() || ventana.isMinimized()) return;
  try {
    fs.mkdirSync(path.dirname(BOUNDS_FICHERO), { recursive: true });
    fs.writeFileSync(BOUNDS_FICHERO, JSON.stringify({ ...ventana.getBounds(), maximizada: ventana.isMaximized() }));
  } catch { /* sin disco no pasa nada: solo los bounds del próximo arranque */ }
}
/* Recorta un rectángulo dentro del área de trabajo de la pantalla que contenga
   la mayor parte del rectángulo (o la primaria si está fuera de todas). */
function recortaAlArea(bounds) {
  const { screen } = require("electron");
  const displays = screen.getAllDisplays();
  let elegida = screen.getPrimaryDisplay();
  let mejor = -1;
  if (typeof bounds.x === "number" && typeof bounds.y === "number") {
    for (const d of displays) {
      const a = d.workArea;
      const xSol = Math.max(0, Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x));
      const ySol = Math.max(0, Math.min(bounds.y + bounds.height, a.y + a.height) - Math.max(bounds.y, a.y));
      const solape = xSol * ySol;
      if (solape > mejor) { mejor = solape; elegida = d; }
    }
  } else {
    // primer arranque o bounds parciales: recorta el tamaño respecto a la
    // primaria y deja x/y a undefined para que Electron centre la ventana
    const a = elegida.workArea;
    const ancho = Math.min(bounds.width, a.width);
    const alto = Math.min(bounds.height, a.height);
    return { width: Math.round(ancho), height: Math.round(alto) };
  }
  const a = elegida.workArea;
  const ancho = Math.min(bounds.width, a.width);
  const alto = Math.min(bounds.height, a.height);
  // si quedara fuera, pégala a la esquina interior más cercana
  const x = Math.max(a.x, Math.min(bounds.x, a.x + a.width - ancho));
  const y = Math.max(a.y, Math.min(bounds.y, a.y + a.height - alto));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(ancho), height: Math.round(alto) };
}

function crearVentana() {
  const base = { width: 1200, height: 820, minWidth: 640, minHeight: 480 };
  const guardados = cargaBounds();
  let letras = base;
  if (guardados) letras = { ...base, ...guardados, maximizada: undefined };
  // NUNCA abrir más grande que el area de trabajo del monitor: el browser
  // siempre se ve ENTERO (no hay «corte por la mitad» al arrancar)
  letras = recortaAlArea(letras);
  ventana = new BrowserWindow({
    ...letras,
    useContentSize: false,
    center: !letras.x,
    backgroundColor: "#0d0d14",
    icon: path.join(__dirname, "recursos", "jumpernat.png"),
    title: "JumperNET Browser",
    webPreferences: {
      preload: path.join(__dirname, "ventana", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false,
      backgroundThrottling: false, // pestañas al fondo siguen reintentando
    },
  });
  // doble seguro de visibilidad TOTAL en el primer arranque: una vez cargada
  // la página, se re-clampa al workArea Y se centra (por si el WM la puso
  // abajo/derecha al crearla — el «form a media pantalla» de la captura)
  ventana.webContents.once("did-finish-load", () => {
    const b = ventana.getBounds();
    const encajado = recortaAlArea(b);
    if (b.width !== encajado.width || b.height !== encajado.height ||
        b.x < 0 || b.y < 0) {
      ventana.setBounds(encajado);
    }
    if (!guardados) ventana.center();
    ventana.show();
  });
  if (guardados && guardados.maximizada) ventana.maximize();
  ventana.loadFile(path.join(__dirname, "ventana", "index.html"));
  /* si el usuario arrastra la ventana a un monitor menor, re-encajarla e
     informar al shell para que los webviews se re-alineen (self-heal).
     Con debounce: «move» dispara a ráfaga durante el arrastre. */
  let temporizadorEncaje = null;
  ventana.on("move", () => {
    clearTimeout(temporizadorEncaje);
    temporizadorEncaje = setTimeout(encajarASuPantalla, 250);
  });
  ventana.on("enter-full-screen", () => setTimeout(reajustaDeNuevo, 200));
  ventana.on("leave-full-screen", () => setTimeout(reajustaDeNuevo, 200));
  ventana.on("unmaximize", () => setTimeout(reajustaDeNuevo, 120));
  ventana.on("maximize", () => setTimeout(reajustaDeNuevo, 120));
  ventana.on("resize", guardaBounds);
  ventana.on("move", guardaBounds);
  ventana.on("close", guardaBounds);
  /* ventanas emergentes (popups) de webs → pestaña nueva, nunca ventana nueva */
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    ventana.webContents.send("jn:pestaña", url);
    return { action: "deny" };
  });

  function encajarASuPantalla() {
    try {
      const b = ventana.getBounds();
      const nuevo = recortaAlArea(b);
      if (nuevo.width !== b.width || nuevo.height !== b.height) ventana.setBounds(nuevo);
      ventana.webContents.send("jn:reencuadre");
    } catch { /* nada */ }
  }
  function reajustaDeNuevo() { encajarASuPantalla(); }
}

function escHtml(v) {
  return String(v).replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[ch]));
}

function pistaDeError(detalle) {
  if (/ERR_PROXY/.test(detalle)) return "El proxy no respondió (407 o caído). Guarda tus credenciales en el chip PROXY de la esquina o pulsa de nuevo tras rotar el circuito.";
  if (/ERR_CONNECTION|ERR_TIMED_OUT|ERR_EMPTY/.test(detalle)) return "No se alcanzó el destino: el circuito puede estar congestionado o la web caída. Rota el circuito (⟳) o reintenta en unos segundos.";
  if (/ERR_NAME|DNS/.test(detalle)) return "No se resolvió el nombre del dominio. Con el proxy activo la resolución va por tu circuito: prueba a rotarlo.";
  if (/ERR_CERT|SSL/.test(detalle)) return "Problema de certificado HTTPS del destino (no del circuito).";
  return "Comprueba el chip PROXY (esquina inferior derecha) y, si sigue fallando, rota el circuito.";
}

function servirJn(peticion) {
  let url;
  try { url = new URL(peticion.url); } catch { return respuesta404(); }
  const host = url.hostname;

  if (host === "inicio") {
    try {
      const html = fs.readFileSync(path.join(__dirname, "ventana", "inicio.html"));
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch { return respuesta404(); }
  }

  if (host === "error") {
    const detalle = (url.searchParams.get("err") || "la página no respondió").slice(0, 240);
    const destino = (url.searchParams.get("destino") || HOME).slice(0, 480);
    return new Response(paginaError(detalle, destino), { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (host === "log") {
    const pre = LOG_LINEAS.map(limpiaLog).map(escHtml).join("\n");
    const html = "<!DOCTYPE html><meta charset=\"utf-8\"><title>JumperNET · registro</title>" +
      "<body style=\"background:#0b0b10;color:#c9c9d4;font:13px/1.65 ui-monospace,Consolas,monospace;padding:28px;white-space:pre-wrap\">" +
      `<h2 style="color:#8f7bff;margin:0 0 10px">registro interno (${LOG_LINEAS.length} líneas)</h2>${escHtml(pre)}</body>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  return respuesta404();
}

function respuesta404() {
  return new Response("<meta charset=\"utf-8\"><body style=\"background:#0d0d14;color:#e8e8ea;font-family:system-ui;padding:40px\"><h1>jn: no encontrado</h1></body>",
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
}

function paginaError(detalle, destino) {
  const motivo = escHtml(detalle);
  const pista = escHtml(pistaDeError(detalle));
  const botonReintentar = `
    <button id="reintentar">↻ Reintentar</button>
    <a href="${escHtml(destino)}">abrir la dirección otra vez</a>
    <a href="jn://log">ver el registro interno</a>`;
  const accion = `
    const d = ${JSON.stringify(destino)};
    document.getElementById("reintentar").onclick = () => location.replace(d);`;
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>JumperNET · no cargó</title><style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,'Segoe UI',sans-serif;background:#0b0b10;color:#e8e8ea}
  .caja{width:min(580px,92vw);border:1px solid #2b2b38;border-radius:20px;padding:34px;background:#13131a}
  .marca{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#6c5ce7,#4a3fd8);font-weight:800;margin-bottom:14px}
  h1{font-size:19px;margin:0 0 8px}
  p{color:#9a9aa2;font-size:13.5px;line-height:1.65;margin:6px 0}
  code{background:rgb(122 105 255/.12);border:1px solid rgb(122 105 255/.3);border-radius:7px;padding:3px 8px;font-family:ui-monospace,monospace;font-size:12.5px;color:#d9d3ff;word-break:break-all}
  .pista{border-left:3px solid #6c5ce7;padding-left:12px}
  button{margin-top:16px;background:linear-gradient(135deg,#6c5ce7,#5747e0);border:0;color:#fff;font-weight:700;padding:11px 24px;border-radius:12px;font-size:14px;cursor:pointer;margin-right:10px}
  button:hover{filter:brightness(1.08)}
  a{color:#8f7bff;text-decoration:none;display:inline-block;margin-top:12px;font-size:13px;margin-right:14px}
</style></head><body><div class="caja">
<div class="marca">≋</div>
<h1>No se pudo cargar la página</h1>
<p>Detalle técnico (motivo real de Chromium):</p>
<p><code>${motivo}</code></p>
<p class="pista">${pista}</p>
${botonReintentar}
<script>${accion}</script>
</div></body></html>`;
}

/* ═══════════════════════════════════ vigilante de carga (en el main)
 * Timers de Node que JAMÁS duermen (los del renderer sí, con la ventana sin
 * foco). Estados por webContents:
 *   · did-fail-load (carga principal, no -3): memoriza fallo Y reintenta ×2.
 *   · aún tras los 2 reintentos: → jn://error?err=… &destino=… (página local
 *     con el motivo ERR_… y botón Reintentar).
 *   · blanco > 45 s sin éxito → mismo camino (detalle genérico).
 * El reintento NUESTRO no re-incrementa el contador (marca `propio`).
 */
const VISTO = new Map(); // wcId → cronología

function visto(wc) {
  let s = VISTO.get(wc.id);
  if (!s) { s = { pedida: "", fallo: null, intentos: 0, propio: false, enError: false, desde: 0, exito: false }; VISTO.set(wc.id, s); }
  return s;
}

app.on("web-contents-created", (_ev, wc) => {
  if (wc.getType() !== "webview") return; // solo las pestañas
  const s = visto(wc);

  wc.on("did-start-loading", () => {
    if (s.propio) { s.propio = false; return; } // nuestro reintento: no reinicia nada
    s.fallo = null; s.intentos = 0; s.enError = false; s.exito = false; s.desde = Date.now();
    try { s.pedida = wc.getURL() || s.pedida; } catch { /* nada */ }
  });

  wc.on("did-fail-load", (_ev2, codigo, desc, urlFallo, esPrincipal) => {
    if (codigo === -3 || esPrincipal !== true) return; // -3 = navegación abortada
    s.fallo = (desc || ("error " + codigo)).slice(0, 240);
    if (urlFallo) s.pedida = urlFallo;
    log("fallo de carga: " + s.fallo + " en " + (s.pedida || "?").slice(0, 60), "aviso");
  });

  wc.on("dom-ready", () => {
    let u = "";
    try { u = wc.getURL() || ""; } catch { /* nada */ }
    if (u.startsWith("jn://")) return;     // nuestras páginas propias no son éxito
    if (!s.fallo) s.exito = true;           // éxito real (no se pisó por un fallo)
  });

  wc.on("destroyed", () => VISTO.delete(wc.id));
});

setInterval(() => {
  for (const [id, s] of [...VISTO.entries()]) {
    let wc = null;
    try { wc = webContents.fromId(id); } catch { /* se fue */ }
    if (!wc || wc.isDestroyed()) { VISTO.delete(id); continue; }
    if (s.enError) continue;

    const cargando = (() => { try { return wc.isLoading(); } catch { return false; } })();

    if (!cargando && !s.fallo && !s.exito) continue;           // idle pero sano
    if (s.fallo === null && !cargando) continue;

    // ¿blanco demasiado largo?
    if (cargando && !s.fallo && !s.exito && s.desde && Date.now() - s.desde > 45000) {
      s.fallo = "ERR_TIMED_BLANCO (la página no cargó en 45 s)";
      s.pedida = s.pedida || HOME;
    }

    if (s.fallo) {
      if (s.intentos >= 2) {
        const detalles = s.fallo;
        const destino = s.pedida || HOME;
        s.enError = true; s.fallo = null; s.intentos = 0; s.exito = false;
        log("3 fallos en " + destino.slice(0, 60) + " → página de error", "aviso");
        try { wc.loadURL("jn://error?err=" + encodeURIComponent(detalles) + "&destino=" + encodeURIComponent(destino)); } catch { /* nada */ }
        continue;
      }
      s.intentos++; s.propio = true; s.fallo = null; s.desde = Date.now();
      log("reintento " + s.intentos + " → " + (s.pedida || HOME).slice(0, 80));
      try { wc.loadURL(s.pedida || HOME); } catch { /* nada */ }
    }
  }
}, 2000);

/* ------------------------------------------------------------------ arranque */

app.whenReady().then(async () => {
  try {
    ficheroLog = path.join(app.getPath("userData"), "jn.log");
    log("=== JumperNET Browser v2 arranca ===");
    cargarCuenta();
    for (const ses of sesiones()) {
      try { ses.setUserAgent(UA); } catch { /* nada */ }
      try { ses.protocol.handle("jn", servirJn); } catch { log("jn ya registrado en esta sesión", "aviso"); }
    }
    crearVentana();

    // auto-conexión si hay cuenta guardada (valida y enciende en segundo plano)
    if (conta.email && conta.clave) {
      log("hay cuenta guardada: auto-conexión en segundo plano");
      conectarProxy(null).then((r) => {
        if (r.ok) log("auto-conexión OK al arrancar");
        else log("auto-conexión falló al arrancar: " + (r.error || "?"), "aviso");
      }).catch(() => { /* ya lo registra conectarProxy */ });
    } else {
      log("sin cuenta guardada: el usuario activará el proxy con sus credenciales");
    }
  } catch (e) {
    log("error fatal al arrancar: " + (e.stack || e.message), "error");
    try { crearVentana(); } catch { /* nada más se puede */ }
  }
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
Menu.setApplicationMenu(null);
