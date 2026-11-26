/* Registro local de actividad del panel. No se envía al servidor y no guarda
   destinos ni historial de navegación: solo acciones del usuario sobre la
   red (encender, girar, apagar, comprobar). */

const CLAVE = "jumpernet-actividad";

export function leeLog() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(bruto) ? bruto.slice(0, 12) : [];
  } catch { return []; }
}

export function guardaLog(lista) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, 12))); } catch { /* modo privado */ }
}

export function apuntaLog(texto, tipo = "ok") {
  const item = { t: Date.now(), texto, tipo };
  const actual = leeLog();
  guardaLog([item, ...actual].slice(0, 12));
  window.dispatchEvent(new CustomEvent("jumpernet-actividad", { detail: item }));
  return item;
}
