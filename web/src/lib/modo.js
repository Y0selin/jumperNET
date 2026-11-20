/* Modo de interfaz: azul técnico por defecto, variante clara opcional.
   Escribe la paleta en <html> para que todo el sitio cambie de golpe.
   Clave nueva para estrenar la identidad sin heredar preferencias viejas. */

import { useEffect, useState } from "react";

const CLAVE = "jumpernet-modo-v2";

export const MODOS = {
  oscuro: {
    nombre: "Noche",
    color: "#0A12B8",
    vars: {
      "--bg-1": "#0A12B8", "--bg-2": "#060C80",
      "--panel": "10, 18, 168", "--panel-sol": "223, 255, 63",
      "--borde": "#4B5BFF", "--acento-1": "#DFFF3F",
      "--acento-2": "#FF5CA8", "--acento-3": "#6FF2FF",
      "--texto": "#F4F6FF", "--texto-suave": "#B9C3FF",
    },
  },
  claro: {
    nombre: "Día",
    color: "#F3F5FF",
    vars: {
      "--bg-1": "#F3F5FF", "--bg-2": "#E4E8FF",
      "--panel": "255, 255, 255", "--panel-sol": "20, 40, 224",
      "--borde": "#B4BDF2", "--acento-1": "#1428E0",
      "--acento-2": "#D6006F", "--acento-3": "#007A86",
      "--texto": "#0A0F5C", "--texto-suave": "#4B55A8",
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
  const m = modo === "claro" ? "claro" : "oscuro";
  const html = document.documentElement;
  html.dataset.modo = m;
  html.style.colorScheme = m;
  Object.entries(MODOS[m].vars).forEach(([k, v]) => html.style.setProperty(k, v));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", MODOS[m].color);
  return m;
}

/* Hook de React para usar el modo en componentes. */
export function useModo() {
  const [modo, setModo] = useState(cargaModo);
  useEffect(() => {
    aplicaModo(modo);
    guardaModo(modo);
  }, [modo]);
  return { modo, setModo };
}
