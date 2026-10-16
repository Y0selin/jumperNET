/* Temas del Diseñador: cada tema es un conjunto de variables CSS que se
   aplican en vivo sobre document.documentElement. Persiste en localStorage. */
const CLAVE = "jumpernat-tema";

export const PRESETS = {
  "neon-nocturno": {
    nombre: "Neón Nocturno",
    variables: {
      "--bg-1": "#060a14", "--bg-2": "#0b1226", "--panel": "18, 24, 43", "--panel-sol": "255, 255, 255",
      "--borde": "#4e68b4", "--acento-1": "#4f8cff", "--acento-2": "#2ecc71",
      "--acento-3": "#a06bff", "--texto": "#e8edf8", "--texto-suave": "#93a0bd",
    },
    forma: { "--radio": "16px", "--radio-2": "10px", "--tam-fuente": "15px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "1", "--glass": "0.55", "--vel-anim": "1" },
  },
  "oceano-profundo": {
    nombre: "Océano Profundo",
    variables: {
      "--bg-1": "#02111b", "--bg-2": "#05253a", "--panel": "8, 34, 52", "--panel-sol": "190, 240, 255",
      "--borde": "#2f7fa6", "--acento-1": "#0ea5e9", "--acento-2": "#14b8a6",
      "--acento-3": "#22d3ee", "--texto": "#dff5ff", "--texto-suave": "#8fb6c9",
    },
    forma: { "--radio": "20px", "--radio-2": "12px", "--tam-fuente": "15px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "1.2", "--glass": "0.6", "--vel-anim": "1" },
  },
  "matrix": {
    nombre: "Matrix",
    variables: {
      "--bg-1": "#010603", "--bg-2": "#031c0c", "--panel": "6, 28, 14", "--panel-sol": "40, 255, 140",
      "--borde": "#1f6e35", "--acento-1": "#22c55e", "--acento-2": "#4ade80",
      "--acento-3": "#86efac", "--texto": "#d8ffe6", "--texto-suave": "#7fae8a",
    },
    forma: { "--radio": "6px", "--radio-2": "4px", "--tam-fuente": "14.5px", "--fuente": 'ui-monospace, "Cascadia Code", Consolas' },
    efectos: { "--glow": "1.4", "--glass": "0.5", "--vel-anim": "1.2" },
  },
  "rubí": {
    nombre: "Rubí Rojo",
    variables: {
      "--bg-1": "#100306", "--bg-2": "#26060f", "--panel": "38, 10, 18", "--panel-sol": "255, 190, 200",
      "--borde": "#7f2440", "--acento-1": "#ff4d6d", "--acento-2": "#ff9f68",
      "--acento-3": "#e5484d", "--texto": "#ffe9ee", "--texto-suave": "#c08b98",
    },
    forma: { "--radio": "14px", "--radio-2": "9px", "--tam-fuente": "15px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "1.3", "--glass": "0.58", "--vel-anim": "1" },
  },
  "luz-blanca": {
    nombre: "Luz Blanca",
    variables: {
      "--bg-1": "#eef2f9", "--bg-2": "#dfe7f5", "--panel": "255, 255, 255", "--panel-sol": "255,255,255",
      "--borde": "#9db3d6", "--acento-1": "#2563eb", "--acento-2": "#059669",
      "--acento-3": "#7c3aed", "--texto": "#101828", "--texto-suave": "#5b6b85",
    },
    forma: { "--radio": "16px", "--radio-2": "10px", "--tam-fuente": "15px", "--fuente": '"Inter", system-ui' },
    efectos: { "--glow": "0.55", "--glass": "0.85", "--vel-anim": "1" },
  },
  "solar-de-oro": {
    nombre: "Solar de Oro",
    variables: {
      "--bg-1": "#0d0a04", "--bg-2": "#241a05", "--panel": "40, 30, 10", "--panel-sol": "255, 230, 170",
      "--borde": "#8a6d1d", "--acento-1": "#f5b83d", "--acento-2": "#ff9f1a",
      "--acento-3": "#fff176", "--texto": "#fff6e0", "--texto-suave": "#c4ad7f",
    },
    forma: { "--radio": "24px", "--radio-2": "14px", "--tam-fuente": "15.5px", "--fuente": '"Sora", system-ui' },
    efectos: { "--glow": "1.35", "--glass": "0.6", "--vel-anim": "1.1" },
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
  return JSON.parse(JSON.stringify(PRESETS["neon-nocturno"]));
}
export function temaPorId(id) { return JSON.parse(JSON.stringify(PRESETS[id] || PRESETS["neon-nocturno"])); }
