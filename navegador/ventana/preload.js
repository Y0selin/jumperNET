// puente seguro entre la UI y el main: solo los métodos del navegador
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jn", {
  estado: () => ipcRenderer.invoke("jn:estado"),
  entrar: (d) => ipcRenderer.invoke("jn:entrar", d),
  conectar: () => ipcRenderer.invoke("jn:conectar"),
  desconectar: () => ipcRenderer.invoke("jn:desconectar"),
  rotar: () => ipcRenderer.invoke("jn:rotar"),
  reiniciar: () => ipcRenderer.invoke("jn:reiniciar"),
  salir: () => ipcRenderer.invoke("jn:salir"),
  minimizar: () => ipcRenderer.invoke("jn:minimizar"),
  maximizar: () => ipcRenderer.invoke("jn:maximizar"),
  alNuevaPestana: (cb) => ipcRenderer.on("jn:nueva-pestana", (e, url) => cb(url)),
});
