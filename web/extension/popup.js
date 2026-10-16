"use strict";

const navegador = typeof browser !== "undefined" ? browser : chrome;

const $ = (id) => document.getElementById(id);

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
