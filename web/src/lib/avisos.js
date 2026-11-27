/* Centro de avisos del sitio público.
   Los avisos fijos son noticias reales de la web (no ruido): cada uno
   lleva a la página donde se puede comprobar. Los efímeros —encender el
   circuito, girarlo, cambiar de modo— se lanzan como toast desde cualquier
   componente con lanzarAviso(), sin pasar props por medio. */

const CLAVE = "jumpernet-avisos-leidos-v1";

export const AVISOS = [
  {
    id: "edicion",
    tono: "nuevo",
    titulo: "Edición 3.1 en línea",
    texto: "Intro de primera visita, visita guiada de seis paradas y el panel que te saluda por tu nombre.",
    cuando: "esta semana",
    ruta: "/proyecto",
    cta: "ver el proyecto",
  },
  {
    id: "video",
    tono: "media",
    titulo: "El vídeo de portada, renovado",
    texto: "30 segundos con la paleta nueva, capítulos, subtítulos y música original. También está el viaje completo.",
    cuando: "hoy",
    ruta: "/video",
    cta: "abrir el vídeo",
  },
  {
    id: "lab",
    tono: "lab",
    titulo: "Laboratorio: rompe la red a propósito",
    texto: "Simulador de fallos, inspector del paquete y consola de comandos. Todo en el navegador, sin cuenta.",
    cuando: "hace 2 días",
    ruta: "/lab",
    cta: "entrar al laboratorio",
  },
  {
    id: "salida",
    tono: "ok",
    titulo: "La salida solo habla 80 y 443",
    texto: "El nodo de salida descarta IP privadas, loopback y metadata. Es una regla del circuito, no una promesa.",
    cuando: "fijo",
    ruta: "/funciona",
    cta: "cómo funciona",
  },
];

export function leeLeidos() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(crudo) ? crudo : [];
  } catch {
    return [];
  }
}

export function guardaLeidos(ids) {
  try { localStorage.setItem(CLAVE, JSON.stringify([...new Set(ids)])); } catch { /* sin persistencia */ }
}

export function cuentaNoLeidos(leidos = leeLeidos()) {
  return AVISOS.filter((a) => !leidos.includes(a.id)).length;
}

/* Aviso efímero: aparece como toast en cualquier página. */
export function lanzarAviso(texto, tipo = "ok") {
  if (typeof window === "undefined" || !texto) return;
  window.dispatchEvent(new CustomEvent("jumpernet-aviso", { detail: { texto, tipo } }));
}
