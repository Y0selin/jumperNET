// puente seguro entre la UI y el main — solo los métodos del navegador
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jn", {
  obtenerEstado: () => ipcRenderer.invoke("jn:obtenerEstado"),
  activar: (credenciales) => ipcRenderer.invoke("jn:activar", credenciales),
  desactivar: () => ipcRenderer.invoke("jn:desactivar"),
  rotar: () => ipcRenderer.invoke("jn:rotar"),
  log: () => ipcRenderer.invoke("jn:log"),
  reiniciar: () => ipcRenderer.invoke("jn:reiniciar"),
  abrirExterno: (url) => ipcRenderer.invoke("jn:abrirExterno", url),
  alEstado: (cb) => ipcRenderer.on("jn:estado", (_e, s) => cb(s)),
  alPestaña: (cb) => ipcRenderer.on("jn:pestaña", (_e, url) => cb(url)),
  avisoReencuadre: (cb) => ipcRenderer.on("jn:reencuadre", () => cb()),
});
