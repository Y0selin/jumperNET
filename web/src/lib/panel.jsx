import { useEffect, useState } from "react";
import { planDe, SALTOS_MAX, SALTOS_MIN, normalizaSaltos } from "./planes.js";

/* Navegación y preferencias del área privada.
 *
 * Los permisos de verdad siguen viviendo en el backend. Esta estructura solo
 * decide qué interfaz enseñar: Free y Pro comparten las funciones básicas y
 * Pro añade las herramientas avanzadas. Las entradas con `bloqueado` abren
 * una ficha explicativa, nunca una página vacía.
 */

export const NAV_FREE = [
  {
    id: "general", titulo: "General", items: [
      { id: "inicio", txt: "Inicio", ico: "home" },
      { id: "control", txt: "Panel de control", ico: "grid" },
      { id: "notificaciones", txt: "Notificaciones", ico: "bell" },
      { id: "novedades", txt: "Novedades", ico: "spark" },
    ],
  },
  {
    id: "red", titulo: "Red", items: [
      { id: "red", txt: "Panel de red", ico: "network" },
      { id: "nodos", txt: "Nodos disponibles", ico: "nodes" },
      { id: "estadisticas", txt: "Estadísticas y rendimiento", ico: "chart" },
      { id: "circuito", txt: "Mi circuito", ico: "route" },
      { id: "ip", txt: "Comprobación de IP", ico: "globe" },
      { id: "diagnostico", txt: "Diagnóstico básico", ico: "pulse" },
      { id: "informes", txt: "Informes PDF", ico: "file" },
    ],
  },
  {
    id: "herramientas", titulo: "Herramientas", items: [
      { id: "terminal", txt: "Terminal educativa", ico: "terminal" },
      { id: "lab", txt: "JumperNET Lab", ico: "flask" },
      { id: "simulador", txt: "Simulador de red", ico: "sim" },
      { id: "descargas", txt: "Descargas", ico: "download" },
      { id: "guias", txt: "Guías de configuración", ico: "book" },
    ],
  },
  {
    id: "cuenta", titulo: "Mi cuenta", items: [
      { id: "perfil", txt: "Perfil", ico: "user" },
      { id: "suscripcion", txt: "Mi suscripción", ico: "card" },
      { id: "mejorar", txt: "Mejorar plan", ico: "bolt" },
      { id: "preferencias", txt: "Preferencias", ico: "sliders" },
      { id: "apariencia", txt: "Apariencia", ico: "palette" },
    ],
  },
  {
    id: "soporte", titulo: "Soporte", items: [
      { id: "faq", txt: "Preguntas frecuentes", ico: "help" },
      { id: "docs", txt: "Documentación", ico: "book" },
      { id: "contacto", txt: "Contacto", ico: "mail" },
      { id: "estado", txt: "Estado del servicio", ico: "shield" },
    ],
  },
  {
    id: "pro", titulo: "Descubre Pro", items: [
      { id: "explorer", txt: "Network Explorer", ico: "radar", bloqueado: true },
      { id: "disenador", txt: "Diseñador de circuitos", ico: "pen", bloqueado: true },
      { id: "monitor", txt: "Monitor de rendimiento", ico: "chart", bloqueado: true },
    ],
  },
];

export const NAV_PRO = [
  {
    id: "general", titulo: "General", items: [
      { id: "inicio", txt: "Inicio", ico: "home" },
      { id: "centro", txt: "Centro de control", ico: "grid", pro: true },
      { id: "notificaciones", txt: "Notificaciones", ico: "bell" },
      { id: "novedades", txt: "Novedades", ico: "spark" },
    ],
  },
  {
    id: "red", titulo: "Red y conexiones", items: [
      { id: "red", txt: "Panel de red", ico: "network" },
      { id: "nodos", txt: "Gestor de nodos", ico: "nodes" },
      { id: "estadisticas", txt: "Estadísticas y rendimiento", ico: "chart", pro: true },
      { id: "explorer", txt: "Network Explorer", ico: "radar", pro: true },
      { id: "circuitos", txt: "Mis circuitos", ico: "route", pro: true },
      { id: "disenador", txt: "Diseñador de circuitos", ico: "pen", pro: true },
      { id: "monitor", txt: "Monitor de rendimiento", ico: "chart", pro: true },
      { id: "informes", txt: "Informes PDF", ico: "file" },
    ],
  },
  {
    id: "seguridad", titulo: "Seguridad", items: [
      { id: "seguridad", txt: "Centro de seguridad", ico: "shield", pro: true },
      { id: "ip", txt: "Comprobación de IP", ico: "globe" },
      { id: "inspector", txt: "Inspector de paquetes", ico: "layers", pro: true },
      { id: "diagnostico", txt: "Diagnóstico avanzado", ico: "pulse" },
    ],
  },
  {
    id: "herramientas", titulo: "Herramientas", items: [
      { id: "terminal", txt: "Terminal interactiva", ico: "terminal" },
      { id: "lab", txt: "JumperNET Lab", ico: "flask" },
      { id: "comparador", txt: "Comparador de circuitos", ico: "compare", pro: true },
      { id: "fallos", txt: "Simulador de fallos", ico: "warning", pro: true },
      { id: "socks", txt: "Configurador SOCKS5", ico: "plug", pro: true },
      { id: "descargas", txt: "Descargas", ico: "download" },
    ],
  },
  {
    id: "suscripcion", titulo: "Suscripción", items: [
      { id: "plan", txt: "Mi plan Pro", ico: "bolt" },
      { id: "personalizar", txt: "Personalizar suscripción", ico: "sliders", pro: true },
      { id: "facturas", txt: "Facturas", ico: "receipt" },
      { id: "carrito", txt: "Carrito", ico: "cart" },
    ],
  },
  {
    id: "cuenta", titulo: "Cuenta", items: [
      { id: "perfil", txt: "Mi perfil", ico: "user" },
      { id: "preferencias", txt: "Preferencias", ico: "sliders" },
      { id: "dashboard", txt: "Personalizar dashboard", ico: "layout", pro: true },
      { id: "apariencia", txt: "Apariencia", ico: "palette" },
    ],
  },
  {
    id: "soporte", titulo: "Soporte", items: [
      { id: "docs", txt: "Documentación", ico: "book" },
      { id: "contacto", txt: "Contacto", ico: "mail" },
      { id: "estado", txt: "Estado del servicio", ico: "shield" },
    ],
  },
];

export const NAV_EMPRESA = [
  {
    id: "empresa", titulo: "Organización", items: [
      { id: "organizacion", txt: "Panel de empresa", ico: "building", pro: true },
    ],
  },
];

export function navDe(yo) {
  const plan = planDe(yo);
  if (plan.id === "free") return NAV_FREE;
  if (plan.id === "empresarial") {
    const index = NAV_PRO.findIndex((g) => g.id === "suscripcion");
    return [...NAV_PRO.slice(0, index + 1), ...NAV_EMPRESA, ...NAV_PRO.slice(index + 1)];
  }
  return NAV_PRO;
}

export function itemDe(yo, id) {
  return navDe(yo).flatMap((g) => g.items).find((i) => i.id === id) || null;
}

export const TITULOS_PANEL = {
  inicio: ["Inicio", "tu punto de partida en la red"],
  control: ["Panel de control", "estado real de tu cuenta y tu circuito"],
  centro: ["Centro de control", "telemetría y personalización de la sesión"],
  notificaciones: ["Notificaciones", "avisos de tu cuenta y de la red"],
  novedades: ["Novedades", "lo último que ha cambiado en JumperNET"],
  red: ["Panel de red", "el interruptor maestro y tu conexión"],
  nodos: ["Nodos", "la red viva, sin adornos"],
  estadisticas: ["Estadísticas y rendimiento", "latencia, tráfico y disponibilidad medidos"],
  circuito: ["Mi circuito", "los relés que recorren tu tráfico"],
  circuitos: ["Mis circuitos", "tus configuraciones guardadas en este navegador"],
  explorer: ["Network Explorer", "explora nodos y conexiones"],
  disenador: ["Diseñador de circuitos", "prueba tamaños y modos antes de conectar"],
  monitor: ["Monitor de rendimiento", "latencia y disponibilidad medidas"],
  seguridad: ["Centro de seguridad", "cifrado, proxy y privacidad"],
  ip: ["Comprobación de IP", "la prueba de que sales por otro sitio"],
  inspector: ["Inspector de paquetes", "capas de cifrado, sin capturar nada"],
  diagnostico: ["Diagnóstico", "comprobaciones de API, sesión y nodos"],
  informes: ["Informes PDF", "estado, configuración y resultados de tu red"],
  terminal: ["Terminal", "comandos educativos, ningún shell real"],
  lab: ["JumperNET Lab", "experimentos de red seguros"],
  comparador: ["Comparador de circuitos", "qué cambia al añadir saltos"],
  fallos: ["Simulador de fallos", "qué pasa cuando un nodo cae"],
  socks: ["Configurador SOCKS5", "conecta tus aplicaciones"],
  descargas: ["Descargas", "extensiones, agentes y navegador"],
  guias: ["Guías de configuración", "paso a paso, sin atajos"],
  plan: ["Mi plan Pro", "suscripción y renovación"],
  suscripcion: ["Mi suscripción", "lo que tienes y lo que puedes ampliar"],
  personalizar: ["Personalizar suscripción", "elige el tamaño del circuito"],
  mejorar: ["Mejorar plan", "más herramientas y más control"],
  facturas: ["Facturas", "los documentos disponibles"],
  carrito: ["Carrito", "revisa la suscripción antes de continuar"],
  perfil: ["Mi perfil", "identidad y datos de la cuenta"],
  preferencias: ["Preferencias", "cómo quieres que se comporte el panel"],
  dashboard: ["Personalizar dashboard", "ordena y elige tus tarjetas"],
  apariencia: ["Apariencia", "tema, color y tipografía"],
  faq: ["Preguntas frecuentes", "respuestas directas"],
  docs: ["Documentación", "guías completas de JumperNET"],
  contacto: ["Contacto", "habla con el equipo"],
  estado: ["Estado del servicio", "medido ahora, no una promesa"],
  organizacion: ["Panel de empresa", "estructura de organización"],
  admin: ["Administración", "cuentas, red y estadísticas"],
};

export const ICONOS_PANEL = {
  home: <><path d="M3 10.7 12 3l9 7.7" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
  network: <><circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7.2 6h9.6M6.5 8l4.3 7.8M17.5 8l-4.3 7.8" /></>,
  nodes: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h8M6 8v8M18 8v8M8 18h8" /></>,
  route: <><circle cx="5" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 6h5a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  pulse: <><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m7 9 2.7 2.7L7 14.4M12.5 14.5H17" /></>,
  flask: <><path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 17l-5-9V3" /><path d="M7.5 15h9" /></>,
  sim: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4M7 9h4M7 12h7" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  book: <><path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H20v15.5H6.2A2.2 2.2 0 0 0 4 20.7z" /><path d="M4 20.7V5.2M8 7h8M8 10.5h5" /></>,
  user: <><circle cx="12" cy="8" r="3.4" /><path d="M4.5 21c0-4 3.3-6.2 7.5-6.2s7.5 2.2 7.5 6.2" /></>,
  card: <><rect x="2.8" y="5" width="18.4" height="14" rx="2.5" /><path d="M2.8 9.6h18.4M6.5 14.8h4" /></>,
  bolt: <><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18h1.4a2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" /><circle cx="7.5" cy="10" r=".8" /><circle cx="10" cy="6.8" r=".8" /><circle cx="14.5" cy="6.8" r=".8" /><circle cx="17" cy="10" r=".8" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.7 2.3c-.8.4-1.3 1-1.3 2M12 17.1h.01" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  shield: <><path d="M12 3 5 6v6c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 19 5M12 3v3M21 12h-3" /></>,
  pen: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m13.5 7.5 3 3M4 20h5" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  compare: <><path d="M4 6h7M4 18h7M13 12h7" /><path d="m8 3 3 3-3 3M8 15l3 3-3 3M17 9l3 3-3 3" /></>,
  warning: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17.5h.01" /></>,
  plug: <><path d="M9 3v6M15 3v6M7 9h10v2a5 5 0 0 1-10 0V9ZM12 16v5" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  cart: <><path d="M3 4h2l2.4 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6" /><circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h18M9 9v12" /></>,
  building: <><path d="M4 21V5.5A2.5 2.5 0 0 1 6.5 3H14v18M14 9h4.5A1.5 1.5 0 0 1 20 10.5V21M2 21h20M7 7h3M7 11h3M7 15h3" /></>,
};

/* ── preferencias locales del panel ──────────────────────────────────── */
const CLAVE_PREFS = "jumpernet-panel-prefs-v1";
const EVENTO_PREFS = "jumpernet-panel-prefs";

export const PREFS_DEFECTO = {
  notificaciones: true,
  animaciones: true,
  compacto: false,
  turquesa: true,
  orden: ["circuito", "red", "metricas", "sesion", "accesos"],
  ocultas: [],
};

let memoriaPrefs = null;

export function leePrefsPanel() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_PREFS) || "null");
    if (d && typeof d === "object") {
      return { ...PREFS_DEFECTO, ...d, orden: Array.isArray(d.orden) ? d.orden : PREFS_DEFECTO.orden };
    }
  } catch { /* sin almacenamiento */ }
  return memoriaPrefs || { ...PREFS_DEFECTO };
}

export function guardaPrefsPanel(prefs) {
  memoriaPrefs = prefs;
  try { localStorage.setItem(CLAVE_PREFS, JSON.stringify(prefs)); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent(EVENTO_PREFS, { detail: prefs }));
}

export function usePrefsPanel() {
  const [prefs, setPrefs] = useState(leePrefsPanel);
  useEffect(() => {
    const refresca = (e) => setPrefs(e?.detail || leePrefsPanel());
    window.addEventListener(EVENTO_PREFS, refresca);
    window.addEventListener("storage", refresca);
    return () => {
      window.removeEventListener(EVENTO_PREFS, refresca);
      window.removeEventListener("storage", refresca);
    };
  }, []);
  const actualiza = (cambios) => {
    const siguiente = { ...prefs, ...(typeof cambios === "function" ? cambios(prefs) : cambios) };
    setPrefs(siguiente);
    guardaPrefsPanel(siguiente);
    return siguiente;
  };
  return [prefs, actualiza];
}

/* ── configuración de circuito elegida para la próxima conexión ──────── */
const CLAVE_CIRCUITO = "jumpernet-circuito-pref-v1";
const EVENTO_CIRCUITO = "jumpernet-circuito-pref";

export function leePrefCircuito(yo) {
  const max = normalizaSaltos(yo?.saltos_max || SALTOS_MIN);
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_CIRCUITO) || "null");
    if (d) {
      return {
        saltos: Math.max(SALTOS_MIN, Math.min(max, normalizaSaltos(d.saltos))),
        modo: d.modo === "externos" ? "externos" : "todos",
      };
    }
  } catch { /* sin almacenamiento */ }
  return { saltos: Math.min(3, max), modo: "todos" };
}

export function hayPrefCircuitoGuardada() {
  try { return !!localStorage.getItem(CLAVE_CIRCUITO); } catch { return false; }
}

export function guardaPrefCircuito(pref) {
  try { localStorage.setItem(CLAVE_CIRCUITO, JSON.stringify(pref)); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent(EVENTO_CIRCUITO, { detail: pref }));
}

export function usePrefCircuito(yo) {
  const [pref, setPref] = useState(() => leePrefCircuito(yo));
  useEffect(() => {
    const refresca = (e) => setPref(e?.detail || leePrefCircuito(yo));
    window.addEventListener(EVENTO_CIRCUITO, refresca);
    window.addEventListener("storage", refresca);
    return () => {
      window.removeEventListener(EVENTO_CIRCUITO, refresca);
      window.removeEventListener("storage", refresca);
    };
  }, [yo?.saltos_max]);
  const guarda = (nuevo) => {
    guardaPrefCircuito(nuevo);
    setPref(nuevo);
  };
  return [pref, guarda];
}

/* ── circuitos guardados: solo tamaño y modo, nunca destinos ni historial ── */
const CLAVE_GUARDADOS = "jumpernet-circuitos-guardados-v1";

export function leeCircuitosGuardados() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_GUARDADOS) || "[]");
    return Array.isArray(d) ? d.filter((x) => x && x.saltos >= SALTOS_MIN && x.saltos <= SALTOS_MAX).slice(0, 8) : [];
  } catch { return []; }
}

export function guardaCircuitosGuardados(lista) {
  try { localStorage.setItem(CLAVE_GUARDADOS, JSON.stringify(lista.slice(0, 8))); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent("jumpernet-circuitos-guardados", { detail: lista }));
}

export const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
