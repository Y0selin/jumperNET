"use strict";

const navegador = typeof browser !== "undefined" ? browser : chrome;

const $ = (id) => document.getElementById(id);

/*
 * Estado REAL de la red (lo que no se debe confundir con el proxy):
 * hace login con las credenciales guardadas contra la API y pregunta /me.
 *   viva     -> la red esta encendida: el proxy del botón va a funcionar
 *   apagada  -> tus credenciales son válidas PERO no pulsaste el interruptor
 *               del panel web (la extension no enciende la red; solo ruta)
 *   rechazada-> email/clave no son los de tu cuenta de la web
 */
async function comprobarRed() {
  const caja = $("estadoRed");
  const { configJumperNAT } = await navegador.storage.local.get(["configJumperNAT"]);
  const config = configJumperNAT || {};
  if (!config.usuario || !config.clave) {
    caja.className = "estado-red mono";
    caja.textContent = "· sin credenciales todavía: escribe tu email y clave y pulsa ACTIVAR";
    return;
  }
  caja.textContent = "comprobando el estado de la red…";
  try {
    const r1 = await fetch(`https://${config.host}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.usuario, password: config.clave }),
    });
    if (!r1.ok) throw new Error(r1.status);
    const tok = (await r1.json()).token;
    const r2 = await fetch(`https://${config.host}/me`, { headers: { Authorization: `Bearer ${tok}` } });
    const yo = await r2.json();
    if (yo.activo) {
      caja.className = "estado-red mono viva";
      caja.textContent = `◉ red encendida · ${yo.circuito?.length || 3} saltos · exit: ${yo.nodo_exit || "—"}`;
    } else {
      caja.className = "estado-red mono apagada";
      caja.textContent = "○ red APAGADA: enciéndela con el interruptor de la pestaña Red en la web (la extensión no la enciende; solo dirige tu tráfico)";
    }
  } catch (e) {
    caja.className = "estado-red mono error";
    caja.textContent = "✕ credenciales rechazadas (o sin conexión con la API) — revisa email y clave";
  }
}

async function cargar() {
  const { configJumperNAT } = await navegador.storage.local.get(["configJumperNAT"]);
  const config = configJumperNAT || {};
  $("usuario").value = config.usuario || "";
  $("clave").value = config.clave || "";
  refrescarEstado();
}

async function refrescarEstado() {
  const { configJumperNAT } = await navegador.storage.local.get(["configJumperNAT"]);
  const config = configJumperNAT || {};
  const viva = !!(config.activo && config.usuario && config.clave);
  $("punto").className = "punto" + (viva ? " viva" : "");
  $("estadoTxt").textContent = viva
    ? `— activo via ${config.host}:${config.puerto}`
    : "— apagado";
  $("encender").textContent = viva ? "Reaplicar" : "Activar";
}

async function guardar(extra) {
  const config = {
    host: "jumpernet.duckdns.org",
    puerto: 1081,
    usuario: $("usuario").value.trim(),
    clave: $("clave").value,
    activo: false,
    ...(extra || {}),
  };
  await navegador.storage.local.set({ configJumperNAT: config });
  return config;
}

$("encender").addEventListener("click", async () => {
  await guardar({ activo: true });
  refrescarEstado();
});

$("apagar").addEventListener("click", async () => {
  await guardar({ activo: false });
  refrescarEstado();
});

$("olvidar").addEventListener("click", async () => {
  $("usuario").value = "";
  $("clave").value = "";
  await guardar({ activo: false });
  refrescarEstado();
});

cargar();
comprobarRed();
