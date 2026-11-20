/* Modo de interfaz: claro por defecto, oscuro opcional.
   Escribe la paleta en <html> (igual que el Diseñador) para que toda la
   plataforma —sitio público y panel— cambie de golpe y sin recargar. */

const CLAVE = "jumpernet-modo-v1";

export const MODOS = {
  claro: {
    nombre: "Claro",
    color: "#f0f4ff",
    vars: {
      "--bg-1": "#f0f4ff", "--bg-2": "#e6ecff",
      "--panel": "255, 255, 255", "--panel-sol": "124, 77, 255",
      "--borde": "#c9d4f0", "--acento-1": "#7c4dff",
      "--acento-2": "#00b8d9", "--acento-3": "#ff5c93",
      "--texto": "#0f1233", "--texto-suave": "#5b6490",
    },
  },
  oscuro: {
    nombre: "Oscuro",
    color: "#06050b",
    vars: {
      "--bg-1": "#06050b", "--bg-2": "#0a0812",
      "--panel": "22, 19, 32", "--panel-sol": "255, 90, 54",
      "--borde": "#2a2438", "--acento-1": "#ff5a36",
      "--acento-2": "#8b7bff", "--acento-3": "#33d6c0",
      "--texto": "#f4f0e8", "--texto-suave": "#a49dae",
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
  html.dataset.modo = m;
  html.style.colorScheme = m;
  Object.entries(MODOS[m].vars).forEach(([k, v]) => html.style.setProperty(k, v));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", MODOS[m].color);
  return m;
}
