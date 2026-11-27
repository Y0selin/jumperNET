/* Modo de interfaz: oscuro por defecto, claro opcional.
   Escribe la paleta en <html> (igual que el Diseñador) para que toda la
   plataforma —sitio público y panel— cambie de golpe y sin recargar. */

const CLAVE = "jumpernet-modo-v1";

export const MODOS = {
  claro: {
    nombre: "Claro",
    color: "#F2F6F0",
    vars: {
      "--bg-1": "#F4F8FC", "--bg-2": "#E8F1FA",
      "--panel": "255, 255, 255", "--panel-sol": "15, 118, 110",
      "--borde": "#D6E4F0", "--acento-1": "#0F766E",
      "--acento-2": "#1E6FA8", "--acento-3": "#0E9488",
      "--texto": "#0F2338", "--texto-suave": "#4A6278",
      "--acento-txt": "#0B6B5A", "--acento-txt-2": "#0E7C6B",
      "--linea": "rgb(16 42 66 / .10)", "--linea-2": "rgb(16 42 66 / .18)",
      "--sup-1": "#FFFFFF", "--sup-2": "#F7FBFE", "--sup-3": "#ECF4FA",
    },
  },
  oscuro: {
    nombre: "Oscuro",
    color: "#071524",
    vars: {
      "--bg-1": "#071524", "--bg-2": "#0A2033",
      "--panel": "13, 31, 49", "--panel-sol": "94, 234, 212",
      "--borde": "#1B354D", "--acento-1": "#5EEAD4",
      "--acento-2": "#7DD3FC", "--acento-3": "#67E8F9",
      "--texto": "#EDF6FF", "--texto-suave": "#9DB4C9",
      "--acento-txt": "#8FE9D8", "--acento-txt-2": "#C7F7EE",
      "--linea": "rgb(150 200 235 / .13)", "--linea-2": "rgb(150 200 235 / .24)",
      "--sup-1": "#0D2237", "--sup-2": "#0A1B2C", "--sup-3": "#142E45",
    },
  },
};

export function cargaModo() {
  try {
    const m = localStorage.getItem(CLAVE);
    if (m === "oscuro" || m === "claro") return m;
  } catch { /* almacenamiento bloqueado */ }
  return "oscuro";
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
