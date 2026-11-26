import { useEffect, useState } from "react";
import {
  PROMO,
  PRECIO_BASE_PRO,
  normalizaSaltos,
  precioPro,
  extrasPro,
  precioConPromo,
} from "./planes.js";

/* Carrito mínimo de JumperNET.
 * Solo existe una suscripción Pro: nunca se acumulan unidades. El contenido
 * vive en localStorage para sobrevivir a recargas y cambios de página.
 *
 * El precio se calcula aquí solo para previsualizar: el backend vuelve a
 * calcularlo y el checkout compara ambos importes antes de continuar. La
 * promoción de bienvenida no se puede verificar sin una pasarela real, así
 * que la interfaz lo dice con claridad. */

const CLAVE = "jumpernet-carrito-v2";
/* v2: la demo anterior consumía la promo antes de una compra real. La clave
   antigua se limpia para que ese fallo no deje el descuento bloqueado. */
const CLAVE_PROMO = "jumpernet-promo-usada-v2";
const CLAVE_PROMO_DEMO = "jumpernet-promo-usada-v1";
const EVENTO = "jumpernet-carrito";

export const PRECIO_PRO = PRECIO_BASE_PRO;

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
  try {
    localStorage.removeItem(CLAVE_PROMO_DEMO);
    return localStorage.getItem(CLAVE_PROMO) === "1";
  } catch { return false; }
}

export function marcarPromoUsada() {
  try { localStorage.setItem(CLAVE_PROMO, "1"); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: estadoCarrito() }));
}

export function estadoCarrito() {
  const crudo = lee();
  const items = crudo.items
    .filter((i) => i && i.id === "pro")
    .slice(0, 1)
    .map((i) => ({ ...i, saltos: normalizaSaltos(i.saltos || 3) }));
  const saltos = items[0]?.saltos || 3;
  const promo = items.length > 0 && !promoUsada();
  const precio = items.length ? precioPro(saltos) : 0;
  const { descuento, primerPago } = precioConPromo(precio, promo);

  return {
    items,
    cantidad: items.length,
    saltos,
    promo,
    base: PRECIO_BASE_PRO,
    extras: items.length ? extrasPro(saltos) : 0,
    precio,
    descuento,
    primerPago: items.length ? primerPago : 0,
    renovacion: items.length ? precio : 0,
  };
}

/** Añade Pro con el tamaño elegido o actualiza el que ya está en el carrito. */
export function agregaPro(saltos = 3) {
  const n = normalizaSaltos(saltos);
  const actual = lee();
  escribe({
    items: [{ id: "pro", nombre: "JumperNET Pro", saltos: n, precio: precioPro(n), desde: Date.now() }],
    actualizado: Date.now(),
  });
  return estadoCarrito();
}

/** Cambia el máximo contratado sin salir del carrito. */
export function cambiaSaltosPro(saltos = 3) {
  const n = normalizaSaltos(saltos);
  const actual = lee();
  if (!actual.items.some((i) => i.id === "pro")) return agregaPro(n);
  escribe({
    items: actual.items.map((i) => (i.id === "pro"
      ? { ...i, saltos: n, precio: precioPro(n) }
      : i)),
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

export { PROMO };
