/* Temas del Diseñador: cada tema es un conjunto de variables CSS que se
   aplican en vivo sobre document.documentElement. Persiste en localStorage. */
const CLAVE = "jumpernat-tema";

export const PRESETS = {
  "terminal-verde": {
    nombre: "Terminal Verde",
    variables: {
      "--bg-1": "#0b0f0d", "--bg-2": "#0d1410", "--panel": "18, 23, 20", "--panel-sol": "125, 255, 192",
      "--borde": "#232b26", "--acento-1": "#2ee88a", "--acento-2": "#4fb0ff",
      "--acento-3": "#ffb454", "--texto": "#d9e2db", "--texto-suave": "#8a948d",
    },
    forma: { "--radio": "12px", "--radio-2": "8px", "--tam-fuente": "14.5px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "0.8", "--glass": "0.7", "--vel-anim": "1" },
  },
  "grafito-profesional": {
    nombre: "Grafito Profesional",
    variables: {
      "--bg-1": "#0a0d14", "--bg-2": "#0e1320", "--panel": "21, 27, 42", "--panel-sol": "255, 255, 255",
      "--borde": "#374460", "--acento-1": "#5b8def", "--acento-2": "#34c48c",
      "--acento-3": "#8f7cf1", "--texto": "#e6eaf2", "--texto-suave": "#8a94a8",
    },
    forma: { "--radio": "12px", "--radio-2": "8px", "--tam-fuente": "14.5px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "0.5", "--glass": "0.72", "--vel-anim": "1" },
  },
  "neon-nocturno": {
    nombre: "Neón Nocturno",
    variables: {
      "--bg-1": "#060a14", "--bg-2": "#0b1226", "--panel": "18, 24, 43", "--panel-sol": "255, 255, 255",
      "--borde": "#4e68b4", "--acento-1": "#4f8cff", "--acento-2": "#2ecc71",
      "--acento-3": "#a06bff", "--texto": "#e8edf8", "--texto-suave": "#93a0bd",
    },
    forma: { "--radio": "16px", "--radio-2": "10px", "--tam-fuente": "15px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "1.1", "--glass": "0.55", "--vel-anim": "1" },
  },
  "oceano-profundo": {
    nombre: "Océano Profundo",
    variables: {
      "--bg-1": "#02111b", "--bg-2": "#05253a", "--panel": "8, 34, 52", "--panel-sol": "190, 240, 255",
      "--borde": "#2f7fa6", "--acento-1": "#0ea5e9", "--acento-2": "#14b8a6",
      "--acento-3": "#22d3ee", "--texto": "#dff5ff", "--texto-suave": "#8fb6c9",
    },
    forma: { "--radio": "18px", "--radio-2": "11px", "--tam-fuente": "15px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "0.8", "--glass": "0.62", "--vel-anim": "1" },
  },
  "matrix": {
    nombre: "Matrix",
    variables: {
      "--bg-1": "#010603", "--bg-2": "#031c0c", "--panel": "6, 28, 14", "--panel-sol": "40, 255, 140",
      "--borde": "#1f6e35", "--acento-1": "#22c55e", "--acento-2": "#4ade80",
      "--acento-3": "#86efac", "--texto": "#d8ffe6", "--texto-suave": "#7fae8a",
    },
    forma: { "--radio": "6px", "--radio-2": "4px", "--tam-fuente": "14px", "--fuente": 'ui-monospace, "Cascadia Code", Consolas' },
    efectos: { "--glow": "0.9", "--glass": "0.55", "--vel-anim": "1.1" },
  },
  "luz-blanca": {
    nombre: "Luz Blanca",
    variables: {
      "--bg-1": "#f4f6fa", "--bg-2": "#e8ecf4", "--panel": "255, 255, 255", "--panel-sol": "255,255,255",
      "--borde": "#d0d9e6", "--acento-1": "#3b7ddd", "--acento-2": "#199d70",
      "--acento-3": "#6d5ce6", "--texto": "#131b2a", "--texto-suave": "#5c6a83",
    },
    forma: { "--radio": "12px", "--radio-2": "8px", "--tam-fuente": "14.5px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "0.3", "--glass": "0.9", "--vel-anim": "1" },
  },
};

export function aplicaTema(tema) {
  const r = document.documentElement.style;
  Object.entries(tema.variables || {}).forEach(([k, v]) => r.setProperty(k, v));
  Object.entries(tema.forma || {}).forEach(([k, v]) => r.setProperty(k, v));
  Object.entries(tema.efectos || {}).forEach(([k, v]) => r.setProperty(k, v));
  if ("--vel-anim" in (tema.efectos || {})) {
    document.documentElement.dataset.anim = parseFloat(tema.efectos["--vel-anim"]) > 0 ? "on" : "off";
  }
}

export function guardaTema(tema) { localStorage.setItem(CLAVE, JSON.stringify(tema)); }
export function cargaTema() {
  try {
    const t = JSON.parse(localStorage.getItem(CLAVE));
    if (t && t.variables) return t;
  } catch { /* tema roto: preset */ }
  return JSON.parse(JSON.stringify(PRESETS["terminal-verde"]));
}
export function temaPorId(id) { return JSON.parse(JSON.stringify(PRESETS[id] || PRESETS["terminal-verde"])); }
