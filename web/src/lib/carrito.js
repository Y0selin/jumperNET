import { useEffect, useState } from "react";
import { PROMO } from "./planes.js";

/* Carrito mínimo de JumperNET.
 * Solo existe una suscripción Pro: nunca se acumulan unidades. El contenido
 * vive en localStorage para sobrevivir a recargas y cambios de página.
 *
 * La promoción de bienvenida se aplica sola mientras no se haya consumido en
 * este navegador. No hay backend de pagos, así que la elegibilidad real no se
 * puede comprobar todavía: la interfaz lo dice y el flujo va etiquetado como
 * entorno de pruebas. */

const CLAVE = "jumpernet-carrito-v2";
const CLAVE_PROMO = "jumpernet-promo-usada-v1";
const EVENTO = "jumpernet-carrito";

export const PRECIO_PRO = 5;

let memoria = null;

function lee() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (bruto && Array.isArray(bruto.items)) return bruto;
  } catch { /* almacenamiento bloqueado */ }
  return memoria || { items: [], actualizado: 0 };
}

function escribe(estado) {
  memoria = estado;
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: estadoCarrito() }));
}

export function promoUsada() {
  try { return localStorage.getItem(CLAVE_PROMO) === "1"; } catch { return false; }
}

export function marcarPromoUsada() {
  try { localStorage.setItem(CLAVE_PROMO, "1"); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: estadoCarrito() }));
}

export function estadoCarrito() {
  const crudo = lee();
  const items = crudo.items.filter((i) => i && i.id === "pro").slice(0, 1);
  const promo = items.length > 0 && !promoUsada();
  const descuento = promo ? Math.round(PRECIO_PRO * PROMO.porcentaje) / 100 : 0;
  return {
    items,
    cantidad: items.length,
    promo,
    precio: items.length ? PRECIO_PRO : 0,
    descuento,
    primerPago: items.length ? Math.max(0, PRECIO_PRO - descuento) : 0,
    renovacion: items.length ? PRECIO_PRO : 0,
  };
}

export function agregaPro() {
  const actual = lee();
  if (actual.items.some((i) => i.id === "pro")) {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: estadoCarrito() }));
    return estadoCarrito();
  }
  escribe({
    items: [{ id: "pro", nombre: "JumperNET Pro", precio: PRECIO_PRO, desde: Date.now() }],
    actualizado: Date.now(),
  });
  return estadoCarrito();
}

export function quitaPro() {
  escribe({ items: [], actualizado: Date.now() });
}

export function vaciaCarrito() {
  escribe({ items: [], actualizado: Date.now() });
}

/* Hook compartido: cualquier componente reacciona al carrito sin recargar. */
export function useCarrito() {
  const [estado, setEstado] = useState(estadoCarrito);

  useEffect(() => {
    const refresca = (ev) => setEstado(ev?.detail || estadoCarrito());
    window.addEventListener(EVENTO, refresca);
    window.addEventListener("storage", refresca);
    return () => {
      window.removeEventListener(EVENTO, refresca);
      window.removeEventListener("storage", refresca);
    };
  }, []);

  return estado;
}
