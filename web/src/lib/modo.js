/* Modo de interfaz: claro por defecto, oscuro opcional.
   Escribe la paleta en <html> (igual que el Diseñador) para que toda la
   plataforma —sitio público y panel— cambie de golpe y sin recargar. */

const CLAVE = "jumpernet-modo-v1";

export const MODOS = {
  claro: {
    nombre: "Claro",
    color: "#EEF6FD",
    vars: {
      "--bg-1": "#EEF6FD", "--bg-2": "#FFFFFF",
      "--panel": "255, 255, 255", "--panel-sol": "8, 127, 104",
      "--borde": "#d7e6f4", "--acento-1": "#087f68",
      "--acento-2": "#14283e", "--acento-3": "#d6a84b",
      "--texto": "#14283E", "--texto-suave": "#52697c",
    },
  },
  oscuro: {
    nombre: "Oscuro",
    color: "#0A1725",
    vars: {
      "--bg-1": "#0A1725", "--bg-2": "#0D1D2C",
      "--panel": "16, 36, 54", "--panel-sol": "53, 199, 167",
      "--borde": "#1f3a52", "--acento-1": "#35c7a7",
      "--acento-2": "#d6a84b", "--acento-3": "#e9c178",
      "--texto": "#F1F7FD", "--texto-suave": "#A8C1D4",
    },
  },
};

export function cargaModo() {
  try {
    const m = localStorage.getItem(CLAVE);
    if (m === "oscuro" || m === "claro") return m;
  } catch { /* almacenamiento bloqueado */ }
  return "claro";
}

export function guardaModo(modo) {
  try { localStorage.setItem(CLAVE, modo); } catch { /* sin persistencia */ }
}

export function aplicaModo(modo) {
  const m = modo === "oscuro" ? "oscuro" : "claro";
  const html = document.documentElement;
  /* sin transiciones durante el cambio: la paleta entra de golpe y ninguna
     capa con backdrop-filter se queda con el color anterior */
  html.dataset.cambiando = "1";
  html.dataset.modo = m;
  html.style.colorScheme = m;
  Object.entries(MODOS[m].vars).forEach(([k, v]) => html.style.setProperty(k, v));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", MODOS[m].color);
  void html.offsetWidth;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { delete html.dataset.cambiando; });
  });
  return m;
}
