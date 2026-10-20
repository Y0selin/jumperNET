/* JumperNET Browser v2 — UI: pestañas, omnibox y chip PROXY */
"use strict";

const $ = (id) => document.getElementById(id);
const HOME = "https://duckduckgo.com/?q=";

const pestanas = []; // [{view, titulo}]
let ptab = -1;

/* telemetría legible por CDP / depuración: window.__jn */
window.__jn = { eventos: [], estado: null };
function logDiag(t) {
  try {
    window.__jn.eventos.push(new Date().toISOString().slice(11, 19) + " " + t);
    if (window.__jn.eventos.length > 60) window.__jn.eventos.shift();
  } catch { /* nada */ }
}

/* ═══════════════════════════════════════════════════════════ pestañas ══ */

function creaPestana(url = HOME) {
  const view = document.createElement("webview");
  view.setAttribute("partition", "persist:jn");
  view.setAttribute("allowpopups", "");
  view.setAttribute("webpreferences", "backgroundThrottling=no");
  view.style.display = "none";
  view.src = url;
  $("paginas").appendChild(view);
  // el primer tamaño: clavamos el webview al contenedor DESDE EL PRINCIPIO
  // (evita la pestaña cortada si la ventana cambia antes del primer frame)
  requestAnimationFrame(reajustaWebviews);

  const p = { view, titulo: "Nueva pestaña" };
  pestanas.push(p);

  view.addEventListener("page-title-updated", (e) => { p.titulo = e.title || p.titulo; pintaPestanas(); });
  view.addEventListener("did-navigate", () => { if (pestanas[ptab] === p) pintaNav(view); });
  view.addEventListener("did-navigate-in-page", () => { if (pestanas[ptab] === p) pintaNav(view); });
  view.addEventListener("did-start-loading", () => logDiag("carga: " + String(view.src || "").slice(0, 60)));
  view.addEventListener("did-fail-load", (e) => {
    if (e.errorCode === -3) return;
    logDiag("fallo " + e.errorCode + " " + (e.errorDescription || "") + " en " + String(e.validatedURL || "").slice(0, 50));
    pintaCandado(view, true);
  });
  view.addEventListener("dom-ready", () => {
    let u = "";
    try { u = view.getURL() || ""; } catch { u = view.src || ""; }
    logDiag("dom-ready " + u.slice(0, 60));
    if (pestanas[ptab] === p) pintaNav(view);
    try { view.focus(); } catch { /* nada */ }
  });

  activaPestana(pestanas.length - 1);
  return p;
}

function activaPestana(i) {
  ptab = i;
  pestanas.forEach((p, j) => { p.view.style.display = j === i ? "block" : "none"; });
  pintaPestanas();
  // la pestaña recién activa puede venir con tamaño viejo del webview:
  // fijarlo al contenedor ANTES de pintar la dirección (evita «cortada»)
  setTimeout(reajustaWebviews, 30);
  reajustaWebviews();
  const v = pestanas[i] && pestanas[i].view;
  if (v) pintaNav(v);
}

function cierraPestana(i) {
  const p = pestanas[i];
  if (!p) return;
  p.view.remove();
  pestanas.splice(i, 1);
  if (!pestanas.length) { creaPestana(HOME); return; }
  activaPestana(Math.min(i, pestanas.length - 1));
}

function pintaPestanas() {
  const caja = $("pestanas");
  caja.innerHTML = "";
  pestanas.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "pestana" + (i === ptab ? " activa" : "");
    const t = document.createElement("span");
    t.className = "titulo";
    t.textContent = p.titulo || "·";
    const c = document.createElement("span");
    c.className = "cruces";
    c.textContent = "✕";
    c.title = "Cerrar pestaña";
    c.onclick = (e) => { e.stopPropagation(); cierraPestana(i); };
    d.append(t, c);
    d.onclick = () => activaPestana(i);
    caja.appendChild(d);
  });
}

/* ═══════════════════════════════════════════════════════════ omnibox ══ */

function pintaCandado(view, enError = false) {
  let u = "";
  try { u = view.getURL ? view.getURL() : ""; } catch { u = view.src || ""; }
  const https = /^https:/.test(u);
  $("candado").textContent = enError ? "◈!" : (https ? "◈" : "◇");
  $("candado").style.color = enError ? "var(--rojo)" : (https ? "var(--ok)" : "var(--suave)");
}

function pintaNav(view) {
  let u = "";
  try { u = view.getURL ? view.getURL() : ""; } catch { u = view.src || ""; }
  $("url").value = u.startsWith("jn://") ? u : u.replace(/^https?:\/\//, "");
  pintaCandado(view, false);
  const i = pestanas.findIndex((p) => p.view === view);
  if (i >= 0) {
    let titulo = null;
    try { titulo = view.getTitle ? view.getTitle() : null; } catch { /* nada */ }
    pestanas[i].titulo = titulo || pestanas[i].titulo;
    pintaPestanas();
  }
}

function normalizaAUrl(txt) {
  const t = (txt || "").trim();
  if (!t) return HOME;
  if (/^(https?:\/\/|about:|jn:)/i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?|:)/.test(t)) return "https://" + t;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(t);
}

/* ═══════════════════════════════════════════════ chip PROXY + panel ══ */

function pintaChip(st) {
  const chip = $("chipProxy");
  chip.className = "chipProxy " + (st && st.proxyActivo ? "activo" : (st && st.trabajando ? "trabajando" : "apagado"));
  $("chipTexto").textContent = st && st.proxyActivo ? "PROXY ACTIVO" : "PROXY";
  $("chipPunto").title = st && st.proxyActivo
    ? "conectado — IP de salida: " + (st.ipSalida || "midiendo…")
    : "conexión directa (sin circuito)";
}

function pintaPanel(st) {
  if (!st) return;
  $("credZona").hidden = !!st.proxyActivo;
  $("estadoZona").hidden = !st.proxyActivo;
  if (st.proxyActivo) {
    $("vEmail").textContent = st.email || "—";
    $("vRed").textContent = st.redActiva ? "encendida ✓" : "apagada";
    $("vCircuito").textContent = (st.circuito || []).join(" → ") || "—";
    $("vIP").textContent = st.ipSalida || "midiendo…";
    pintaSalto(st.tunel);
  }
}

/* estado del opt-in «ser salto»:
 *   tunel = "conectado"  → aceptado y túnel vivo
 *           "sin-optin"  → el servidor dice que no está aceptado
 *           null         → sin activar
 * Conecta con la ficha del estado guardada en localStorage (vSaltoAceito). */
function pintaSalto(tunel) {
  const aceptadoLS = window.localStorage.getItem("jn_salto") === "1";
  const activo = tunel === "conectado";
  $("vSalto").textContent = activo ? "ACTIVO ✓ (túnel vivo, sin puertos)" :
    aceptadoLS ? "aceptado — conectando túnel…" : "no participando";
  const b = $("bSerSalto");
  b.textContent = aceptadoLS ? "⨯ Dejar de ser salto" : "✓ Aceptar ser salto (sin abrir puertos)";
}

async function toggleSalto() {
  const b = $("bSerSalto");
  const acepta = window.localStorage.getItem("jn_salto") !== "1";
  b.disabled = true;
  const est = $("panelEstado");
  est.className = "estado";
  est.textContent = acepta ? "aceptando el salto y abriendo el túnel…" : "revocando el salto…";
  const r = await window.jn.serSalto(acepta);
  b.disabled = false;
  if (r && r.ok) {
    window.localStorage.setItem("jn_salto", acepta ? "1" : "0");
    est.className = "estado ok";
    est.textContent = acepta
      ? "✓ Tu equipo ya es salto de la red (conexión saliente, cero puertos abiertos)."
      : "✓ Tu equipo ya NO es salto de la red.";
  } else {
    est.className = "estado error";
    est.textContent = (r && r.error) || "no se pudo cambiar el opt-in";
  }
  pintaPanel(window.__jn.estado);
}

function muestraPanel() {
  $("panelVelo").hidden = false;
  pintaPanel(window.__jn.estado);
  const est = $("panelEstado");
  est.className = "estado";
  est.textContent = window.__jn.estado && window.__jn.estado.proxyActivo
    ? "el proxy está activo: todo tu tráfico va por el circuito."
    : "introduce tus credenciales para activar el proxy del circuito.";
}

function cierraPanel() { $("panelVelo").hidden = true; }

async function activarProxy() {
  const email = $("eEmail").value.trim();
  const clave = $("eClave").value;
  const est = $("panelEstado");
  if (!email || !clave) {
    est.className = "estado error";
    est.textContent = "escribe tu email y contraseña (los de la web).";
    return;
  }
  est.className = "estado";
  est.textContent = "conectando el circuito…";
  const b = $("bActivar");
  b.disabled = true;
  b.textContent = "…conectando";
  try {
    const r = await window.jn.activar({ email, clave });
    if (!r.ok) {
      est.className = "estado error";
      est.textContent = r.error || "no se pudo conectar";
      return;
    }
    est.className = "estado ok";
    est.textContent = "conectado ✓ todo tu tráfico sale por el circuito.";
    pintaPanel(window.__jn.estado);
    // la portada del buscador ya navega por el proxy
    if (!pestanas.length) creaPestana(HOME);
  } catch (e) {
    est.className = "estado error";
    est.textContent = String((e && e.message) || e).slice(0, 120);
  } finally {
    b.disabled = false;
    b.textContent = "⚡ Activar el proxy";
  }
}

/* ═══════════════ FIX del recorte a mitad de pantalla (BUG visivo) ═════════
   Los <webview> de Electron NO se redimensionan solos al cambiar el tamaño de
   la ventana (bug conocido de Chromium): quedan clavados al tamaño del primer
   render y el contenido se ve CORTADO (la mitad inferior blanca/vacía).
   Solución: fijar su tamaño EXACTO en píxeles en cada resize del shell. */
function reajustaWebviews() {
  const caja = $("paginas");
  if (!caja) return;
  const ancho = Math.max(0, Math.floor(caja.clientWidth));
  const alto = Math.max(0, Math.floor(caja.clientHeight));
  pestanas.forEach((p) => {
    const v = p.view;
    if (!v) return;
    if (v.clientWidth !== ancho || v.clientHeight !== alto) {
      v.style.width = ancho + "px";
      v.style.height = alto + "px";
      // re-pegar el atributo fuerza a Chromium a rehacer el layout interno
      try { v.setAttribute("style", v.getAttribute("style") || ""); } catch { /* nada */ }
    }
    /* auto-ajuste: el repintado del guest (el 85 % en blanco tras un resize
       en GPUs erráticas no se cura solo con el layout) */
    try { if (typeof v.invalidate === "function") v.invalidate(); } catch { /* nada */ }
  });
}
/* OJO: SIN requestAnimationFrame. Cuando la ventana no está renderizando
   (minimizada, oculta, fuera de foco en algunos motores) los callbacks de
   rAF NO se ejecutan y el arreglo se durmió justo cuando hacía falta:
   probado en real — con rAF el webview seguía cortado tras el resize.
   Llamada directa + red de seguridad intervalada. */
window.addEventListener("resize", reajustaWebviews);
setInterval(reajustaWebviews, 1000);   // de-todos modos: cada segundo, barato
/* el proceso principal avisa cuando la ventana cambia de monitor / se re-encaja */
/* el proceso principal avisa cuando la ventana cambia de monitor / se re-encaja */
if (window.jn && typeof window.jn.avisoReencuadre === "function") {
  window.jn.avisoReencuadre(() => { reajustaWebviews(); setTimeout(reajustaWebviews, 120); });
}

/* ═══════════════════════════════════════════════════════════ arranque ══ */

window.addEventListener("DOMContentLoaded", async () => {
  // barra de ventana nativa: esta ventana SÍ tiene marco del sistema
  $("bNueva").onclick = () => creaPestana(HOME);
  $("bAtras").onclick = () => pestanas[ptab] && pestanas[ptab].view.goBack();
  $("bDelante").onclick = () => pestanas[ptab] && pestanas[ptab].view.goForward();
  $("bRecargar").onclick = () => pestanas[ptab] && pestanas[ptab].view.reload();
  $("bLog").onclick = () => { if (pestanas[ptab]) pestanas[ptab].view.loadURL("jn://log"); };
  $("bMenu").onclick = () => { $("menu").hidden = !$("menu").hidden; };
  $("mRotar").onclick = async () => {
    $("menu").hidden = true;
    const r = await window.jn.rotar();
    logDiag("rotar: " + JSON.stringify(r));
  };
  $("mEstado").onclick = () => { $("menu").hidden = true; muestraPanel(); };
  $("mLog").onclick = () => { $("menu").hidden = true; if (pestanas[ptab]) pestanas[ptab].view.loadURL("jn://log"); };
  $("mReiniciar").onclick = () => window.jn.reiniciar();

  $("url").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const v = pestanas[ptab] && pestanas[ptab].view;
    if (v) { v.loadURL(normalizaAUrl($("url").value)).catch(() => {}); v.focus(); }
  });

  // chip y panel
  $("chipProxy").onclick = muestraPanel;
  $("panelCerrar").onclick = cierraPanel;
  $("panelVelo").addEventListener("click", (e) => { if (e.target === $("panelVelo")) cierraPanel(); });
  $("bActivar").onclick = activarProxy;
  $("eClave").addEventListener("keydown", (e) => { if (e.key === "Enter") activarProxy(); });
  $("bDesactivar").onclick = async () => { await window.jn.desactivar(); pintaPanel(window.__jn.estado); };
  $("bSerSalto").onclick = toggleSalto;
  $("bRotar").onclick = async () => { await window.jn.rotar(); pintaPanel(window.__jn.estado); };

  window.jn.alEstado((st) => { window.__jn.estado = st; pintaChip(st); pintaPanel(st); });
  window.jn.alPestaña((url) => creaPestana(url || HOME));

  // arranque: abrimos nuestra portada de búsqueda (jn://inicio, estilo Tor) y
  // consultamos el estado inicial del proxy
  try { creaPestana("jn://inicio"); } catch (e) { logDiag("error creando pestaña: " + e); }
  try { window.__jn.estado = await window.jn.obtenerEstado(); } catch (e) { logDiag("estado inicial falló: " + e); }
  pintaChip(window.__jn.estado);
  pintaPanel(window.__jn.estado);

  // reajustado inicial + observador del contenedor (por si cambia el layout
  // del chrome — la omnibox envuelta a dos líneas reduce el área de páginas)
  reajustaWebviews();
  try {
    new ResizeObserver(reajustaWebviews).observe($("paginas"));
  } catch { /* sin ResizeObserver: queda el evento resize de la ventana */ }

  // si hay sesión guardada y activa, aviso discreto en el chip (ya navega por el proxy)
  logDiag("shell listo");
});
