/* Diseños del panel.
 *
 * Cada preset tiene DOS paletas coordinadas —claro y oscuro— y comparte
 * forma, tipografía y efectos. El color solo no basta: cada diseño ajusta
 * radios, densidad visual y luminosidad para tener identidad propia.
 *
 * Se aplican en vivo sobre document.documentElement y se guardan en
 * localStorage. Los temas antiguos se migran al preset más cercano para no
 * dejar a nadie con una paleta rota.
 */
import { useEffect, useState } from "react";

const CLAVE = "jumpernat-tema-v3";

const BASE_CLARO = {
  "--panel": "255, 255, 255",
  "--panel-sol": "15, 118, 110",
  "--linea": "rgb(16 42 36 / .10)",
  "--linea-2": "rgb(16 42 36 / .18)",
  "--sup-1": "#FFFFFF",
  "--sup-2": "#F7FBF9",
  "--sup-3": "#ECF5F0",
};

const BASE_OSCURO = {
  "--panel": "13, 36, 32",
  "--panel-sol": "61, 220, 171",
  "--linea": "rgb(170 220 205 / .13)",
  "--linea-2": "rgb(170 220 205 / .24)",
  "--sup-1": "#0D241F",
  "--sup-2": "#0A1F1B",
  "--sup-3": "#123029",
};

export const PRESETS = {
  "jumpernet-classic": {
    id: "jumpernet-classic",
    nombre: "JumperNET Classic",
    descripcion: "Azul noche y hielo; esmeralda de día sobre blanco frío.",
    etiqueta: "Identidad",
    forma: {
      "--radio": "18px", "--radio-2": "12px", "--tam-fuente": "15px",
      "--fuente": '"Inter", "Segoe UI", system-ui, sans-serif',
      "--fuente-titulo": '"Space Grotesk", "Inter", system-ui, sans-serif',
    },
    efectos: { "--glow": "0.55", "--glass": "0.9", "--vel-anim": "1" },
    variantes: {
      claro: {
        ...BASE_CLARO,
        "--bg-1": "#F4F8FC", "--bg-2": "#E8F1FA",
        "--borde": "#D6E4F0",
        "--acento-1": "#0F766E", "--acento-2": "#1E6FA8", "--acento-3": "#0E9488",
        "--texto": "#0F2338", "--texto-suave": "#4A6278",
        "--acento-txt": "#0B6B5A", "--acento-txt-2": "#0E7C6B",
        "--linea": "rgb(16 42 66 / .10)", "--linea-2": "rgb(16 42 66 / .18)",
        "--sup-1": "#FFFFFF", "--sup-2": "#F7FBFE", "--sup-3": "#ECF4FA",
        "--grafico-1": "#0F766E", "--grafico-2": "#1E6FA8", "--grafico-3": "#0E9488",
        "--grafico-4": "#B08A4A", "--grafico-5": "#64748B",
        "--fondo-a": "#E7F2FB", "--fondo-b": "#F8FCFF", "--fondo-c": "#E6F6F3",
        "--sombra": "0 20px 50px -40px rgb(16 42 66 / .32)",
      },
      oscuro: {
        ...BASE_OSCURO,
        "--panel": "13, 31, 49", "--panel-sol": "94, 234, 212",
        "--bg-1": "#071524", "--bg-2": "#0A2033",
        "--borde": "#1B354D",
        "--acento-1": "#5EEAD4", "--acento-2": "#7DD3FC", "--acento-3": "#67E8F9",
        "--texto": "#EDF6FF", "--texto-suave": "#9DB4C9",
        "--acento-txt": "#8FE9D8", "--acento-txt-2": "#C7F7EE",
        "--linea": "rgb(150 200 235 / .13)", "--linea-2": "rgb(150 200 235 / .24)",
        "--sup-1": "#0D2237", "--sup-2": "#0A1B2C", "--sup-3": "#142E45",
        "--grafico-1": "#5EEAD4", "--grafico-2": "#7DD3FC", "--grafico-3": "#38BDF8",
        "--grafico-4": "#E2C07C", "--grafico-5": "#9DB4C9",
        "--fondo-a": "#0A2540", "--fondo-b": "#06121F", "--fondo-c": "#0A2A2E",
        "--sombra": "0 26px 70px -38px rgb(2 8 18 / .62)",
      },
    },
  },

  arctic: {
    id: "arctic",
    nombre: "Arctic",
    descripcion: "Blanco hielo y azul glaciar. Luz limpia, técnica y serena.",
    etiqueta: "Frío",
    forma: {
      "--radio": "16px", "--radio-2": "10px", "--tam-fuente": "15px",
      "--fuente": '"Inter", "Segoe UI", system-ui, sans-serif',
      "--fuente-titulo": '"Inter", "Segoe UI", system-ui, sans-serif',
    },
    efectos: { "--glow": "0.4", "--glass": "0.86", "--vel-anim": "1" },
    variantes: {
      claro: {
        ...BASE_CLARO,
        "--panel": "255, 255, 255", "--panel-sol": "29, 78, 216",
        "--bg-1": "#F5FAFF", "--bg-2": "#E9F3FE",
        "--borde": "#D4E4F4",
        "--acento-1": "#1D4ED8", "--acento-2": "#0284C7", "--acento-3": "#0D9488",
        "--texto": "#0F2035", "--texto-suave": "#51677E",
        "--acento-txt": "#0369A1", "--acento-txt-2": "#0284C7",
        "--linea": "rgb(20 45 75 / .10)", "--linea-2": "rgb(20 45 75 / .18)",
        "--sup-1": "#FFFFFF", "--sup-2": "#F8FCFF", "--sup-3": "#ECF5FE",
        "--grafico-1": "#1D4ED8", "--grafico-2": "#0EA5E9", "--grafico-3": "#14B8A6",
        "--grafico-4": "#8B5CF6", "--grafico-5": "#64748B",
        "--fondo-a": "#E5F2FE", "--fondo-b": "#F9FCFF", "--fondo-c": "#E8FBF7",
        "--sombra": "0 22px 50px -40px rgb(15 42 70 / .38)",
      },
      oscuro: {
        ...BASE_OSCURO,
        "--panel": "12, 33, 53", "--panel-sol": "125, 211, 252",
        "--bg-1": "#061524", "--bg-2": "#0A2033",
        "--borde": "#1B3A55",
        "--acento-1": "#7DD3FC", "--acento-2": "#38BDF8", "--acento-3": "#5EEAD4",
        "--texto": "#EAF5FF", "--texto-suave": "#A3BFD4",
        "--acento-txt": "#93C5FD", "--acento-txt-2": "#BFDBFE",
        "--linea": "rgb(165 210 240 / .13)", "--linea-2": "rgb(165 210 240 / .24)",
        "--sup-1": "#0C2135", "--sup-2": "#091B2B", "--sup-3": "#12304A",
        "--grafico-1": "#7DD3FC", "--grafico-2": "#38BDF8", "--grafico-3": "#5EEAD4",
        "--grafico-4": "#C4B5FD", "--grafico-5": "#9FB9CB",
        "--fondo-a": "#082238", "--fondo-b": "#061421", "--fondo-c": "#0B2A2C",
        "--sombra": "0 24px 60px -34px rgb(0 0 0 / .62)",
      },
    },
  },

  midnight: {
    id: "midnight",
    nombre: "Midnight",
    descripcion: "Azul noche, violeta y destellos de oro. Profundidad elegante.",
    etiqueta: "Nocturno",
    forma: {
      "--radio": "20px", "--radio-2": "13px", "--tam-fuente": "15px",
      "--fuente": '"Inter", "Segoe UI", system-ui, sans-serif',
      "--fuente-titulo": '"Space Grotesk", "Inter", system-ui, sans-serif',
    },
    efectos: { "--glow": "0.75", "--glass": "0.82", "--vel-anim": "1" },
    variantes: {
      claro: {
        ...BASE_CLARO,
        "--panel": "255, 255, 255", "--panel-sol": "67, 56, 202",
        "--bg-1": "#F6F7FC", "--bg-2": "#ECEFFA",
        "--borde": "#DCDDF2",
        "--acento-1": "#4338CA", "--acento-2": "#0F766E", "--acento-3": "#B68A3E",
        "--texto": "#171A35", "--texto-suave": "#575C7A",
        "--acento-txt": "#C2410C", "--acento-txt-2": "#E4572E",
        "--linea": "rgb(30 34 72 / .10)", "--linea-2": "rgb(30 34 72 / .18)",
        "--sup-1": "#FFFFFF", "--sup-2": "#FAFAFF", "--sup-3": "#F0F1FB",
        "--grafico-1": "#4338CA", "--grafico-2": "#E4572E", "--grafico-3": "#0F9D8F",
        "--grafico-4": "#B68A3E", "--grafico-5": "#64748B",
        "--fondo-a": "#EAEBFB", "--fondo-b": "#FAFAFF", "--fondo-c": "#F8EFE7",
        "--sombra": "0 24px 55px -42px rgb(40 40 80 / .42)",
      },
      oscuro: {
        ...BASE_OSCURO,
        "--panel": "15, 21, 43", "--panel-sol": "129, 140, 248",
        "--bg-1": "#070B18", "--bg-2": "#0B1226",
        "--borde": "#232A4D",
        "--acento-1": "#818CF8", "--acento-2": "#22D3EE", "--acento-3": "#F0B86E",
        "--texto": "#EEF2FF", "--texto-suave": "#A5AECF",
        "--acento-txt": "#FDA4AF", "--acento-txt-2": "#FECDD3",
        "--linea": "rgb(170 180 230 / .13)", "--linea-2": "rgb(170 180 230 / .24)",
        "--sup-1": "#0D1428", "--sup-2": "#0A1020", "--sup-3": "#141C38",
        "--grafico-1": "#818CF8", "--grafico-2": "#FDA4AF", "--grafico-3": "#22D3EE",
        "--grafico-4": "#F0B86E", "--grafico-5": "#A5AECF",
        "--fondo-a": "#0A1430", "--fondo-b": "#060A14", "--fondo-c": "#0A2228",
        "--sombra": "0 26px 65px -34px rgb(0 0 0 / .7)",
      },
    },
  },

  forest: {
    id: "forest",
    nombre: "Forest",
    descripcion: "Verdes profundos, musgo y ámbar. Natural, sobrio y cálido.",
    etiqueta: "Natural",
    forma: {
      "--radio": "14px", "--radio-2": "9px", "--tam-fuente": "15px",
      "--fuente": '"Inter", "Segoe UI", system-ui, sans-serif',
      "--fuente-titulo": '"Fraunces", "Iowan Old Style", Georgia, serif',
    },
    efectos: { "--glow": "0.38", "--glass": "0.9", "--vel-anim": "1" },
    variantes: {
      claro: {
        ...BASE_CLARO,
        "--panel": "255, 255, 255", "--panel-sol": "47, 107, 58",
        "--bg-1": "#F5F8F1", "--bg-2": "#E9F1E2",
        "--borde": "#D8E4CF",
        "--acento-1": "#2F6B3A", "--acento-2": "#527C34", "--acento-3": "#B7791F",
        "--texto": "#1B2A1D", "--texto-suave": "#53634F",
        "--acento-txt": "#A8432B", "--acento-txt-2": "#C25A3A",
        "--linea": "rgb(28 48 30 / .10)", "--linea-2": "rgb(28 48 30 / .18)",
        "--sup-1": "#FFFFFF", "--sup-2": "#F9FCF6", "--sup-3": "#EEF5E8",
        "--grafico-1": "#2F6B3A", "--grafico-2": "#B7791F", "--grafico-3": "#5DAF9A",
        "--grafico-4": "#8A9A5B", "--grafico-5": "#64748B",
        "--fondo-a": "#E6F0DE", "--fondo-b": "#F9FCF6", "--fondo-c": "#F5EEDD",
        "--sombra": "0 22px 50px -40px rgb(28 48 30 / .4)",
      },
      oscuro: {
        ...BASE_OSCURO,
        "--panel": "15, 39, 25", "--panel-sol": "134, 201, 122",
        "--bg-1": "#0A150E", "--bg-2": "#102217",
        "--borde": "#23402B",
        "--acento-1": "#86C97A", "--acento-2": "#5DAF9A", "--acento-3": "#D4B15A",
        "--texto": "#EDF5E8", "--texto-suave": "#A4B8A0",
        "--acento-txt": "#F0A58D", "--acento-txt-2": "#F7C4B2",
        "--linea": "rgb(170 210 165 / .13)", "--linea-2": "rgb(170 210 165 / .24)",
        "--sup-1": "#102719", "--sup-2": "#0C1E13", "--sup-3": "#173224",
        "--grafico-1": "#86C97A", "--grafico-2": "#D4B15A", "--grafico-3": "#5DAF9A",
        "--grafico-4": "#C9D6A3", "--grafico-5": "#A4B8A0",
        "--fondo-a": "#0E2417", "--fondo-b": "#08120B", "--fondo-c": "#1F2A18",
        "--sombra": "0 24px 60px -34px rgb(0 0 0 / .62)",
      },
    },
  },

  minimal: {
    id: "minimal",
    nombre: "Minimal",
    descripcion: "Casi sin ruido: tinta, teal y grises finos. Todo respira.",
    etiqueta: "Esencial",
    forma: {
      "--radio": "10px", "--radio-2": "6px", "--tam-fuente": "14.5px",
      "--fuente": '"Inter", "Segoe UI", system-ui, sans-serif',
      "--fuente-titulo": '"Inter", "Segoe UI", system-ui, sans-serif',
    },
    efectos: { "--glow": "0.18", "--glass": "0.96", "--vel-anim": "1" },
    variantes: {
      claro: {
        ...BASE_CLARO,
        "--panel": "255, 255, 255", "--panel-sol": "15, 118, 110",
        "--bg-1": "#FBFCFC", "--bg-2": "#F2F5F5",
        "--borde": "#DFE5E6",
        "--acento-1": "#0F172A", "--acento-2": "#0F766E", "--acento-3": "#64748B",
        "--texto": "#0F172A", "--texto-suave": "#5B6672",
        "--acento-txt": "#0F766E", "--acento-txt-2": "#115E59",
        "--linea": "rgb(15 23 42 / .09)", "--linea-2": "rgb(15 23 42 / .16)",
        "--sup-1": "#FFFFFF", "--sup-2": "#F8FAFA", "--sup-3": "#EFF3F3",
        "--grafico-1": "#0F766E", "--grafico-2": "#334155", "--grafico-3": "#0EA5A4",
        "--grafico-4": "#94A3B8", "--grafico-5": "#E4572E",
        "--fondo-a": "#F0F6F5", "--fondo-b": "#FCFDFD", "--fondo-c": "#F7F3EF",
        "--sombra": "0 18px 44px -38px rgb(15 23 42 / .3)",
      },
      oscuro: {
        ...BASE_OSCURO,
        "--panel": "18, 23, 28", "--panel-sol": "226, 232, 240",
        "--bg-1": "#0B0E11", "--bg-2": "#12161A",
        "--borde": "#262C32",
        "--acento-1": "#E2E8F0", "--acento-2": "#5EEAD4", "--acento-3": "#94A3B8",
        "--texto": "#F1F5F9", "--texto-suave": "#9BA7B4",
        "--acento-txt": "#7DD3FC", "--acento-txt-2": "#BAE6FD",
        "--linea": "rgb(220 230 240 / .10)", "--linea-2": "rgb(220 230 240 / .18)",
        "--sup-1": "#12171C", "--sup-2": "#0E1216", "--sup-3": "#1A2026",
        "--grafico-1": "#5EEAD4", "--grafico-2": "#CBD5E1", "--grafico-3": "#38BDF8",
        "--grafico-4": "#94A3B8", "--grafico-5": "#FDBA74",
        "--fondo-a": "#101A1C", "--fondo-b": "#090C0F", "--fondo-c": "#1A1512",
        "--sombra": "0 22px 55px -36px rgb(0 0 0 / .6)",
      },
    },
  },

  grafito: {
    id: "grafito",
    nombre: "Grafito Pro",
    descripcion: "Azul acero y violeta sobre grises fríos. Aspecto de herramienta.",
    etiqueta: "Profesional",
    forma: {
      "--radio": "12px", "--radio-2": "8px", "--tam-fuente": "14.5px",
      "--fuente": '"Inter", "Segoe UI", system-ui, sans-serif',
      "--fuente-titulo": '"Space Grotesk", "Inter", system-ui, sans-serif',
    },
    efectos: { "--glow": "0.5", "--glass": "0.88", "--vel-anim": "1" },
    variantes: {
      claro: {
        ...BASE_CLARO,
        "--panel": "255, 255, 255", "--panel-sol": "37, 99, 235",
        "--bg-1": "#F6F7FA", "--bg-2": "#ECEFF5",
        "--borde": "#D9DFEA",
        "--acento-1": "#2563EB", "--acento-2": "#0F766E", "--acento-3": "#7C3AED",
        "--texto": "#111827", "--texto-suave": "#525D6E",
        "--acento-txt": "#C2410C", "--acento-txt-2": "#E4572E",
        "--linea": "rgb(17 24 39 / .10)", "--linea-2": "rgb(17 24 39 / .18)",
        "--sup-1": "#FFFFFF", "--sup-2": "#F9FAFC", "--sup-3": "#EEF1F7",
        "--grafico-1": "#2563EB", "--grafico-2": "#E4572E", "--grafico-3": "#0F766E",
        "--grafico-4": "#7C3AED", "--grafico-5": "#64748B",
        "--fondo-a": "#E9EEF9", "--fondo-b": "#FAFBFD", "--fondo-c": "#F4ECFA",
        "--sombra": "0 20px 48px -38px rgb(17 24 39 / .38)",
      },
      oscuro: {
        ...BASE_OSCURO,
        "--panel": "17, 25, 40", "--panel-sol": "96, 165, 250",
        "--bg-1": "#090D15", "--bg-2": "#0F1623",
        "--borde": "#283347",
        "--acento-1": "#60A5FA", "--acento-2": "#34D399", "--acento-3": "#A78BFA",
        "--texto": "#E8EDF6", "--texto-suave": "#9BA9BE",
        "--acento-txt": "#FDBA74", "--acento-txt-2": "#FED7AA",
        "--linea": "rgb(180 200 230 / .13)", "--linea-2": "rgb(180 200 230 / .24)",
        "--sup-1": "#111928", "--sup-2": "#0C121D", "--sup-3": "#182236",
        "--grafico-1": "#60A5FA", "--grafico-2": "#FDBA74", "--grafico-3": "#34D399",
        "--grafico-4": "#A78BFA", "--grafico-5": "#9BA9BE",
        "--fondo-a": "#0D1A2E", "--fondo-b": "#080C13", "--fondo-c": "#17142A",
        "--sombra": "0 24px 60px -34px rgb(0 0 0 / .65)",
      },
    },
  },
};

export const TEMA_DEFECTO = "jumpernet-classic";

export function temaPorId(id) {
  return JSON.parse(JSON.stringify(PRESETS[id] || PRESETS[TEMA_DEFECTO]));
}

function modoActual() {
  return document.documentElement.dataset.modo === "oscuro" ? "oscuro" : "claro";
}

export function variablesDeTema(tema, modo = modoActual()) {
  const variantes = tema?.variantes || {};
  return variantes[modo] || variantes.claro || tema?.variables || {};
}

export function aplicaTema(tema) {
  const r = document.documentElement.style;
  const modo = modoActual();
  const vars = variablesDeTema(tema, modo);
  Object.entries(vars || {}).forEach(([k, v]) => r.setProperty(k, v));
  Object.entries(tema.forma || {}).forEach(([k, v]) => r.setProperty(k, v));
  /* Los títulos heredan la voz del diseño; si un tema importado no la
     declara, al menos no se queda con la tipografía del diseño anterior. */
  if (tema.forma?.["--fuente"] && !tema.forma?.["--fuente-titulo"]) {
    r.setProperty("--fuente-titulo", tema.forma["--fuente"]);
  }
  Object.entries(tema.efectos || {}).forEach(([k, v]) => r.setProperty(k, v));
  if ("--vel-anim" in (tema.efectos || {})) {
    document.documentElement.dataset.anim = parseFloat(tema.efectos["--vel-anim"]) > 0 ? "on" : "off";
  }
  document.documentElement.dataset.tema = tema.id || "personalizado";
}

export function guardaTema(tema) {
  try { localStorage.setItem(CLAVE, JSON.stringify(tema)); } catch { /* modo privado */ }
}

function brillo(hex) {
  const m = String(hex || "").match(/^#?([0-9a-f]{6})$/i);
  if (!m) return 255;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114;
}

function migraAntiguo(t) {
  if (!t || !t.variables) return null;
  const esOscuro = brillo(t.variables["--bg-1"]) < 128;
  const id = esOscuro ? "midnight" : "grafito";
  const base = temaPorId(id);
  const variante = esOscuro ? "oscuro" : "claro";
  return {
    ...base,
    id: "migrado",
    nombre: t.nombre || base.nombre,
    migrado: true,
    variantes: {
      ...base.variantes,
      [variante]: { ...base.variantes[variante], ...t.variables },
    },
    forma: { ...base.forma, ...(t.forma || {}) },
    efectos: { ...base.efectos, ...(t.efectos || {}) },
    cssExtra: t.cssExtra || "",
  };
}

export function cargaTema() {
  try {
    const t = JSON.parse(localStorage.getItem(CLAVE) || localStorage.getItem("jumpernat-tema-v2"));
    if (t?.variantes) {
      /* Un preset guardado se relee del catálogo para recibir mejoras de
         paleta; las personalizaciones y el CSS extra se conservan. */
      if (t.id && PRESETS[t.id] && !t.personalizado) {
        return { ...temaPorId(t.id), cssExtra: t.cssExtra || "" };
      }
      return t;
    }
    const migrado = migraAntiguo(t);
    if (migrado) { guardaTema(migrado); return migrado; }
    if (t?.id && PRESETS[t.id]) return temaPorId(t.id);
  } catch { /* tema roto: preset */ }
  return temaPorId(TEMA_DEFECTO);
}

export function useTemas() {
  const [tema, setTema] = useState(cargaTema);

  useEffect(() => {
    document.dispatchEvent(new Event("toggle-tema"));
    aplicaTema(tema);
  }, [tema]);

  return { tema, setTema };
}
