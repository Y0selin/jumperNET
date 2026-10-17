/* JumperNET Browser — UI: pestañas, omnibox, circuito tipo Tor */
"use strict";

const $ = (id) => document.getElementById(id);
const pestanas = []; // [{view, capturada:bool, titulo}]
let ptab = -1;       // índice de la pestaña activa

/* La home es LOCAL (: jn://inicio, página propia con el buscador integrado —
 * como la página-cta del Tor Browser pero nuestra). El MOTOR por defecto es
 * DuckDuckGo, igual que Tor: cualquier texto libre del omnibox va a
 * duckduckgo.com/?q=… a través del circuito. */
const HOME = "jn://inicio";

/* ───── estado de la red (chip + menú) ───── */
function pintaEstado(st) {
  const chip = $("chipEstado");
  if (st && st.activo) {
    chip.className = "chip viva";
    chip.textContent = "CIRCUITO ACTIVO";
  } else if (st && st.conectado) {
    chip.className = "chip apagada";
    chip.textContent = "RED APAGADA — pulsa ⌖";
  } else {
    chip.className = "chip";
    chip.textContent = "SIN SESIÓN";
  }
  $("notaCuenta").textContent = st && st.email ? "sesión: " + st.email : "sin sesión";
  if (st && st.activo) {
    const saltos = (st.circuito || []).join(" → ") || "nodo → nodo → nodo";
    $("cadenaCircuit").textContent = "tu página → " + saltos + " → internet";
    $("notaCircuit").textContent = "exit: " + (st.ip_salida || "midiendo…") + " · 3 saltos";
    $("bRotar").disabled = false;
  } else {
    $("cadenaCircuit").textContent = st && st.error ? "error: " + st.error : "circuito apagado — conecta tu cuenta";
    $("notaCircuit").textContent = "exit: —";
    $("bRotar").disabled = true;
  }
}

async function refrescaEstado() {
  try { pintaEstado(await window.jn.estado()); } catch { /* sin API aún */ }
}

/* ───── pestañas ───── */
function creaPestana(url = HOME) {
  const view = document.createElement("webview");
  const part = document.createElement("div");
  part.setAttribute("partition", "persist:jn"); // sesión persistente del navegador
  view.style.display = "none";
  view.setAttribute("partition", "persist:jn");
  view.setAttribute("allowpopups", "");
  view.src = url;
  $("paginas").appendChild(view);

  const p = { view, titulo: "Nueva pestaña" };
  pestanas.push(p);

  view.addEventListener("page-title-updated", (e) => {
    p.titulo = e.title || p.titulo;
    pintaPestanas();
  });
  view.addEventListener("did-navigate", () => { if (pestanas[ptab] === p) pintaNav(view); });
  view.addEventListener("did-navigate-in-page", () => { if (pestanas[ptab] === p) pintaNav(view); });
  view.addEventListener("dom-ready", () => pintaNav(view));
  view.addEventListener("did-fail-load", (e) => {
    if (e.errorCode === -3) return; // carga abortada
    if (pestanas[ptab] === p) {
      $("candado").className = "candado"; $("candado").style.color = "var(--error)";
    }
  });

  activaPestana(pestanas.length - 1);
  return p;
}

function activaPestana(i) {
  ptab = i;
  pestanas.forEach((p, j) => { p.view.style.display = j === i ? "block" : "none"; });
  pintaPestanas();
  const v = pestanas[i] && pestanas[i].view;
  if (v) pintaNav(v);
}

function cierraPestana(i) {
  const p = pestanas[i];
  if (!p) return;
  try { p.view.closeHandled = true; } catch { /* nada */ }
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
    t.className = "titulo"; t.textContent = p.titulo || "·";
    const c = document.createElement("span");
    c.className = "cruces"; c.textContent = "✕"; c.title = "Cerrar pestaña";
    c.onclick = (e) => { e.stopPropagation(); cierraPestana(i); };
    d.append(t, c);
    d.onclick = () => activaPestana(i);
    caja.appendChild(d);
  });
}

/* ───── omnibox ───── */
function pintaNav(v) {
  const u = v.getURL ? v.getURL() : "";
  if (/^jn:/.test(u)) $("url").value = u;              // esquema propio, sin trims
  else $("url").value = /^https:/.test(u) ? u.replace(/^https:\/\//, "") : u;
  $("candado").className = "candado" + (/^https:/.test(u) ? " https" : "");
  $("candado").style.color = "";
  const i = pestanas.findIndex((p) => p.view === v);
  if (i >= 0) { pestanas[i].titulo = v.getTitle ? (v.getTitle() || pestanas[i].titulo) : pestanas[i].titulo; pintaPestanas(); }
}

function normalizaAUrl(txt) {
  const t = txt.trim();
  if (!t) return HOME;
  if (/^(https?:\/\/|about:|file:)/i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?|:)/.test(t)) return "https://" + t;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(t);
}

/* ───── arranque ───── */
window.addEventListener("DOMContentLoaded", async () => {
  $("bMin").onclick = () => window.jn.minimizar();
  $("bMax").onclick = () => window.jn.maximizar();
  $("bCerrar").onclick = () => window.jn.salir();
  $("bNueva").onclick = () => creaPestana(HOME);
  $("bAtras").onclick = () => pestanas[ptab] && pestanas[ptab].view.goBack();
  $("bDelante").onclick = () => pestanas[ptab] && pestanas[ptab].view.goForward();
  $("bRecargar").onclick = () => pestanas[ptab] && pestanas[ptab].view.reload();
  $("bCircuito").onclick = () => abrirCerrarMenu();
  $("bMenu").onclick = () => abrirCerrarMenu();
  $("bRotar").onclick = async () => {
    $("bRotar").textContent = "…rotando";
    try { await window.jn.rotar(); } catch { /* el estado lo cuenta */ }
    $("bRotar").textContent = "⟳ Nuevo circuito (3 saltos)";
    refrescaEstado();
  };
  $("bReiniciar").onclick = () => window.jn.reiniciar();
  $("bCerrarSesion").onclick = async () => {
    await window.jn.desconectar();
    $("acceso").hidden = false;
    $("estadoAcceso").textContent = "sesión cerrada — el navegador navega directo hasta conectarte";
    refrescaEstado();
  };

  $("url").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const v = pestanas[ptab] && pestanas[ptab].view;
    if (v) v.loadURL(normalizaAUrl($("url").value));
    if (v) v.focus();
  });

  $("bEntrar").onclick = async () => {
    const email = $("eEmail").value.trim();
    const clave = $("eClave").value;
    const est = $("estadoAcceso");
    if (!email || !clave) { est.className = "estado error"; est.textContent = "escribe tu email y contraseña"; return; }
    est.className = "estado"; est.textContent = "conectando el circuito…";
    try {
      const st = await window.jn.entrar({ email, clave });
      if (st.error) { est.className = "estado error"; est.textContent = st.error; return; }
      est.className = "estado ok"; est.textContent = "conectado ✓";
      $("acceso").hidden = true;
      if (!pestanas.length) creaPestana(HOME);
      refrescaEstado();
    } catch (e) { est.className = "estado error"; est.textContent = String(e.message || e).slice(0, 100); }
  };

  window.jn.alNuevaPestana((url) => creaPestana(url));

  // sesión existente: arrancamos ya navegando dentro del circuito
  const st = await window.jn.estado();
  if (st.conectado) {
    $("acceso").hidden = true;
    if (!pestanas.length) creaPestana(HOME);
  } else {
    $("acceso").hidden = false;
  }
  refrescaEstado();
  setInterval(refrescaEstado, 30000);
});

function abrirCerrarMenu() {
  const m = $("menu");
  m.hidden = !m.hidden;
}
