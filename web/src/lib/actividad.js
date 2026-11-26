/* Actividad del panel: solo vive en este navegador. El resumen y el panel
   de red leen la misma lista para que no haya dos historias distintas. */

const CLAVE = "jumpernet-actividad";
const MAXIMO = 12;

export function leeActividad(maximo = MAXIMO) {
  try {
    const bruto = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((x) => x && typeof x.t === "number" && typeof x.texto === "string")
      .slice(0, maximo);
  } catch {
    return [];
  }
}

export function guardaActividad(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO)));
  } catch { /* modo privado o almacenamiento lleno */ }
}

export function apuntaActividad(texto, tipo = "ok") {
  const item = { t: Date.now(), texto, tipo };
  const nuevo = [item, ...leeActividad(MAXIMO)].slice(0, MAXIMO);
  guardaActividad(nuevo);
  return nuevo;
}
