/* Modo de interfaz: claro por defecto, oscuro opcional.
   Escribe la paleta en <html> (igual que el Diseñador) para que toda la
   plataforma —sitio público y panel— cambie de golpe y sin recargar. */

const CLAVE = "jumpernet-modo-v1";

export const MODOS = {
  claro: {
    nombre: "Claro",
    color: "#F2F6F0",
    vars: {
      "--bg-1": "#F2F6F0", "--bg-2": "#E7F2EA",
      "--panel": "251, 253, 249", "--panel-sol": "27, 116, 96",
      "--borde": "#D2E0D6", "--acento-1": "#1B7460",
      "--acento-2": "#146B59", "--acento-3": "#B68A3E",
      "--texto": "#1B3029", "--texto-suave": "#476057",
      "--acento-txt": "#A8432B", "--acento-txt-2": "#BE5338",
      "--linea": "rgb(27 48 41 / .11)", "--linea-2": "rgb(27 48 41 / .17)",
      "--sup-1": "#FBFDF9", "--sup-2": "#F5FAF4", "--sup-3": "#EAF3EC",
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
      "--acento-txt": "#ffa38f", "--acento-txt-2": "#ffb9a8",
      "--linea": "rgb(160 200 230 / .14)", "--linea-2": "rgb(160 200 230 / .26)",
      "--sup-1": "#102436", "--sup-2": "#0d2031", "--sup-3": "#152c40",
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
