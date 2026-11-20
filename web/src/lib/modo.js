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
    color: "#0B1320",
    vars: {
      "--bg-1": "#0B1320", "--bg-2": "#111B2E",
      "--panel": "17, 27, 46", "--panel-sol": "255, 99, 71",
      "--borde": "#2A3A55", "--acento-1": "#FF6347",
      "--acento-2": "#33D6C0", "--acento-3": "#D6A84B",
      "--texto": "#E8F0F8", "--texto-suave": "#A8B8CC",
    },
  },
};

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

/* Hook de React para usar el modo en componentes */
export function useModo() {
  const [modo, setModo] = React.useState(() => {
    try {
      const persisted = localStorage.getItem(CLAVE);
      return persisted || "claro";
    } catch { return "claro"; }
  });

  React.useEffect(() => {
    document.dispatchEvent(new Event("toggle-modo"));
    aplicaModo(modo);
  }, [modo]);

  return { modo, setModo };
}