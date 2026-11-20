/* Modo de interfaz: claro por defecto, oscuro opcional.
   Escribe la paleta en <html> (igual que el Diseñador) para que toda la
   plataforma —sitio público y panel— cambie de golpe y sin recargar. */

const CLAVE = "jumpernet-modo-v1";

export const MODOS = {
  claro: {
    nombre: "Claro",
    color: "#FFFFFF",
    vars: {
      "--bg-1": "#FFFFFF", "--bg-2": "#EFF8FF",
      "--panel": "255, 255, 255", "--panel-sol": "22, 125, 104",
      "--borde": "#dce8f2", "--acento-1": "#FF6347",
      "--acento-2": "#167D68", "--acento-3": "#D6A84B",
      "--texto": "#14283E", "--texto-suave": "#3a5068",
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
