import { useEffect, useState } from "react";

/* Centro de notificaciones.
 *
 * Solo se apuntan cosas que han pasado de verdad: una compra registrada,
 * un cambio de plan, un fallo de conexión devuelto por la API, una
 * respuesta de soporte guardada. Nada de avisos inventados para inflar el
 * contador. Vive en el navegador y no se envía al servidor.
 */

const CLAVE = "jumpernet-notificaciones-v1";
const MAXIMO = 40;

export const CATEGORIAS = [
  { id: "todas", nombre: "Todas" },
  { id: "red", nombre: "Red" },
  { id: "suscripcion", nombre: "Suscripción" },
  { id: "soporte", nombre: "Soporte" },
  { id: "sistema", nombre: "Sistema" },
  { id: "promociones", nombre: "Promociones" },
];

const bienvenida = () => [
  {
    id: "sys-bienvenida",
    t: Date.now(),
    cat: "sistema",
    titulo: "Tu panel está listo",
    texto: "Nada se conecta solo: enciende la red cuando quieras y apágala con el mismo botón.",
    leida: false,
    href: "#/panel",
  },
  {
    id: "promo-bienvenida",
    t: Date.now(),
    cat: "promociones",
    titulo: "10 % en tu primera suscripción",
    texto: "Código BIENVENIDA10. Se aplica una sola vez, a la primera compra elegible, y puedes verlo en el carrito.",
    leida: false,
    href: "#/tarifas",
  },
];

function leeCrudo() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (Array.isArray(d)) return d.filter((n) => n && n.id && n.titulo);
  } catch { /* almacenamiento bloqueado */ }
  return null;
}

function guarda(lista) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO))); } catch { /* modo privado */ }
}

let oyentes = new Set();
let cache = null;

function carga() {
  if (cache) return cache;
  const guardadas = leeCrudo();
  cache = guardadas && guardadas.length ? guardadas : bienvenida();
  if (!guardadas) guarda(cache);
  return cache;
}

function emite() {
  oyentes.forEach((f) => { try { f(cache); } catch { /* oyente roto */ } });
}

export function listaNotifs() {
  return carga();
}

export function noLeidas() {
  return carga().filter((n) => !n.leida).length;
}

export function creaNotif({ cat = "sistema", titulo, texto, href = null }) {
  if (!titulo) return;
  const item = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    t: Date.now(),
    cat,
    titulo,
    texto: texto || "",
    leida: false,
    href,
  };
  cache = [item, ...carga()].slice(0, MAXIMO);
  guarda(cache);
  emite();
  return item;
}

export function marcaLeida(id) {
  cache = carga().map((n) => (n.id === id ? { ...n, leida: true } : n));
  guarda(cache);
  emite();
}

export function marcaTodasLeidas() {
  cache = carga().map((n) => ({ ...n, leida: true }));
  guarda(cache);
  emite();
}

export function borraNotif(id) {
  cache = carga().filter((n) => n.id !== id);
  guarda(cache);
  emite();
}

export function borraTodas() {
  cache = [];
  guarda(cache);
  emite();
}

export function useNotificaciones() {
  const [lista, setLista] = useState(listaNotifs);

  useEffect(() => {
    oyentes.add(setLista);
    const alCambiar = (e) => {
      if (e.key === CLAVE) {
        cache = null;
        setLista(carga());
      }
    };
    window.addEventListener("storage", alCambiar);
    return () => { oyentes.delete(setLista); window.removeEventListener("storage", alCambiar); };
  }, []);

  return {
    lista,
    noLeidas: lista.filter((n) => !n.leida).length,
    marcaLeida,
    marcaTodasLeidas,
    borraNotif,
    borraTodas,
  };
}

/* Abre el panel de notificaciones desde la campana o desde una tarjeta. */
export function abreNotificaciones() {
  window.dispatchEvent(new Event("jumpernet-abrir-notificaciones"));
}
