/*
 * JumperNAT Browser — Chromium dedicado con TODO el trafico por tu circuito.
 *
 * Como Tor Browser, pero sobre tu red: al arrancar identifica tu cuenta, se
 * asegura la RED encendida (/connect) y pone el proxy del circuito en la
 * sesion del navegador — CADA pagina, WebSocket y fetch sale por los 3 saltos
 * con la IP del nodo de salida. Las credenciales del proxy-407 se responden
 * aqui en el main (evento app 'login'), sin ventanas ni configurar nada.
 *
 * «Nuevo circuito» = Tor Browser-changing pipes: rota el circuito en el
 * servidor (/rotate), recalcula la IP de salida y deja la ruta lista; el
 * trafico NUEVO sale ya por los saltos nuevos (la sesion de Chromium no
 * mantiene conexiones viejas de paginas cerradas). «Reiniciar» relanza la app
 * para arrancar de cero como pide el reinicio del Tor Browser.
 */
"use strict";

const { app, BrowserWindow, ipcMain, session, shell, Menu } = require("electron");
const fs = require("fs");
const path = require("path");

const API_URL = "https://jumpernet.duckdns.org";
const PROXY_HOST = "jumpernet.duckdns.org";
const PROXY_PUERTO = 1081; // entrada HTTP con auth Basic (Connect 80/443)

let ventana = null;
let cuenta = null; // { email, clave, token } — la clave hace falta para el 407

const ficheroCuenta = () => path.join(app.getPath("userData"), "cuenta.json");

function guardarCuenta(c) {
  try { fs.writeFileSync(ficheroCuenta(), JSON.stringify(c), { mode: 0o600 }); } catch (e) { /* nada */ }
  cuenta = c;
}

function cargarCuenta() {
  try { cuenta = JSON.parse(fs.readFileSync(ficheroCuenta(), "utf8")); } catch (e) { cuenta = null; }
  return cuenta;
}

async function api(metodo, ruta, cuerpo, extra = {}) {
  const cab = { "Content-Type": "application/json", ...extra };
  if (cuenta && cuenta.token) cab["Authorization"] = "Bearer " + cuenta.token;
  const r = await fetch(API_URL + ruta, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  let datos = null;
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok) throw new Error((datos && datos.detail) || `HTTP ${r.status}`);
  return datos;
}

/* ------------------------------------------------------------- proxy global */

async function ponProxy(activo) {
  const s = sesionPrincipal();
  if (activo && cuenta) {
    await s.setProxy({
      proxyRules: `http=${PROXY_HOST}:${PROXY_PUERTO};https=${PROXY_HOST}:${PROXY_PUERTO}`,
      proxyBypassRules: "localhost,127.0.0.1,[::1]",
    });
  } else {
    await s.setProxy({ proxyRules: "direct" });
  }
}

function sesionPrincipal() {
  return session.defaultSession;
}

/* Los 407 del proxy se responden AQUI, sin ventanas: esto es lo que el
 * navegador dedicado hereda de la extension pero al nivel del main, para
 * TODAS las ventanas y sesiones. */
app.on("login", (evento, webContenidos, detalles, authInfo, cb) => {
  if (!detalles.isProxy || !cuenta) return;
  evento.preventDefault();
  cb(cuenta.email, cuenta.clave); // Basic del usuario real contra entrada-http
});

/* ----------------------------------------------------------------- ciclo */

async function estadoCompleto() {
  // hace login si falta token y devuelve {activo,circuito,ip_salida,email}
  if (cuenta && (!cuenta.token || cuenta.t_sesion !== hoy())) {
    try {
      const l = await api("POST", "/login", { email: cuenta.email, password: cuenta.clave });
      cuenta = { ...cuenta, token: l.token, t_sesion: hoy() };
      guardarCuenta(cuenta);
    } catch (e) { return { error: e.message, conectado: false }; }
  }
  if (!cuenta || !cuenta.token) return { conectado: false };
  try {
    const yo = await api("GET", "/me");
    if (!yo.activo) {
      // el navegador VPN-conectado encierra su misión: si la RED está apagada, la enciende
      try {
        await api("POST", "/connect");
        const yo2 = await api("GET", "/me");
        yo.activo = true;
        yo.circuito = yo2.circuito;
        yo.ip_salida = yo2.ip_salida;
      } catch { /* sin circuito: lo muestra el UI */ }
    }
    await ponProxy(!!yo.activo && !!(cuenta && cuenta.token));
    return { conectado: true, email: cuenta.email, ...yo };
  } catch (e) { return { error: e.message, conectado: false }; }
}

function hoy() { return new Date().toISOString().slice(0, 10); }

async function accionNuevoCircuito() {
  const yo = await api("POST", "/rotate");
  return { ...yo, msg: "circuito listo — el trafico nuevo sale por los saltos nuevos" };
}

async function accionReiniciar() {
  app.relaunch();
  app.exit(0);
}

/* ------------------------------------------------------------------ UI */

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1140, height: 780, minWidth: 640, minHeight: 480,
    frame: false,          // barra propia: el navegador se pinta como Tor Browser pero moderno
    backgroundColor: "#101014",
    webPreferences: {
      preload: path.join(__dirname, "ventana", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false,
    },
    icon: path.join(__dirname, "recursos", "jumpernat.png"),
    title: "JumperNAT Browser",
  });
  ventana.loadFile(path.join(__dirname, "ventana", "index.html"));
  ventana.setMenuBarVisibility(false);
  // seguridad: el contenido web fuera del panel no puede abrir ventanas nuevas
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    ventana.webContents.send("jn:nueva-pestana", url);
    return { action: "deny" };
  });
}

/* ----------------------------------------------------------------- IPC */

ipcMain.handle("jn:estado", (e) => estadoCompleto());
ipcMain.handle("jn:entrar", (e, { email, clave }) => {
  guardarCuenta({ email, clave, token: null, t_sesion: null, autoconectar: true });
  return estadoCompleto();
});
ipcMain.handle("jn:conectar", async () => {
  try { await api("POST", "/connect"); } catch (e) { /* devolver estado y error */ }
  return estadoCompleto();
});
ipcMain.handle("jn:desconectar", async () => {
  try { await api("POST", "/disconnect", undefined); } catch { /* igual se muestra */ }
  await ponProxy(false);
  return estadoCompleto();
});
ipcMain.handle("jn:rotar", (e) => accionNuevoCircuito());
ipcMain.handle("jn:reiniciar", async () => { await accionReiniciar(); });
ipcMain.handle("jn:nueva-pestana", (e, url) => ventana.webContents.send("jn:nueva-pestana", url));
ipcMain.handle("jn:salir", () => { ventana && ventana.destroy(); app.exit(0); });
ipcMain.handle("jn:minimizar", () => { ventana && ventana.minimize(); });
ipcMain.handle("jn:maximizar", () => {
  if (!ventana) return;
  ventana.isMaximized() ? ventana.unmaximize() : ventana.maximize();
});
ipcMain.handle("jn:abrir-URL", (e, url) => shell.openExternal(url));

/* ---------------------------------------------------------------- arranque */

app.whenReady().then(() => {
  cargarCuenta();
  const s = sesionPrincipal();
  // cabeceras fuera si falla el circuito: el UI avisa; sin dejar colgadas las paginas
  s.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 JumperNATBrowser/1.0");
  crearVentana();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) crearVentana(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
Menu.setApplicationMenu(null);
