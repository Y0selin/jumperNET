import { useEffect, useState } from "react";
import { planDe, precioDe } from "./planes.js";

/* Carrito de suscripciones.
 *
 * Reglas del negocio, aplicadas aquí y no solo en la interfaz:
 *   · una sola suscripción a la vez (no se acumulan planes incompatibles),
 *   · el plan Free no se compra y Empresarial se habla con el equipo,
 *   · BIENVENIDA10 = 10 % una única vez en la primera compra elegible.
 *
 * Solo se guarda qué plan y qué código: ni tarjetas, ni CVV, ni datos
 * bancarios. La elegibilidad real la confirma el backend cuando existe
 * (GET /billing/elegibilidad); el navegador solo lleva la cuenta local para
 * que la interfaz no prometa dos veces lo mismo.
 */

const CLAVE = "jumpernet-carrito-v1";
const CLAVE_PROMO = "jumpernet-promo-usada-v1";

export const CODIGO_BIENVENIDA = "BIENVENIDA10";
export const PCT_BIENVENIDA = 10;

const vacio = () => ({ items: [], promo: null, actualizado: 0 });

function normalizaItem(it) {
  if (!it || typeof it !== "object") return null;
  const planId = String(it.planId || "").toLowerCase();
  const plan = planDe(planId);
  if (plan.id !== planId) return null;
  /* Solo se compra lo que tiene precio de autoservicio. */
  if (plan.id !== "pro") return null;
  return { planId, desde: Number(it.desde) || Date.now() };
}

function lee() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (!d || !Array.isArray(d.items)) return vacio();
    const items = d.items.map(normalizaItem).filter(Boolean).slice(0, 1);
    const promo = d.promo && d.promo.codigo === CODIGO_BIENVENIDA
      ? { codigo: CODIGO_BIENVENIDA, pct: PCT_BIENVENIDA }
      : null;
    return { items, promo, actualizado: Number(d.actualizado) || 0 };
  } catch {
    return vacio();
  }
}

let estado = lee();
let promoMemoria = false;
const oyentes = new Set();

function emite() {
  oyentes.forEach((f) => {
    try { f(estado); } catch { /* un oyente roto no tumba el carrito */ }
  });
}

function guarda() {
  estado = { ...estado, actualizado: Date.now() };
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* modo privado */ }
  emite();
}

export function getCarrito() {
  return estado;
}

export function suscribeCarrito(f) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

export function promoUsada() {
  try { return localStorage.getItem(CLAVE_PROMO) === "1" || promoMemoria; }
  catch { return promoMemoria; }
}

export function marcaPromoUsada() {
  promoMemoria = true;
  try { localStorage.setItem(CLAVE_PROMO, "1"); } catch { /* sin persistencia */ }
  estado = { ...estado, promo: null };
  guarda();
}

/* Añade un plan. Devuelve qué pasó para que la interfaz lo cuente:
   nunca se queda con dos suscripciones sin avisar. */
export function anadePlan(planId) {
  const id = String(planId || "").toLowerCase();
  const plan = planDe(id);
  if (plan.id !== "pro") {
    return {
      ok: false,
      motivo: plan.id === "free" ? "gratis" : "ventas",
      mensaje: plan.id === "free"
        ? "El plan Free no se compra: se activa al crear la cuenta."
        : "El plan Empresarial se acuerda con el equipo, no se contrata desde el carrito.",
    };
  }
  const habia = estado.items.length > 0;
  estado = {
    ...estado,
    items: [{ planId: "pro", desde: Date.now() }],
    /* al cambiar de plan, el descuento sigue siendo válido si no se ha usado */
    promo: promoUsada() ? null : estado.promo,
  };
  guarda();
  return {
    ok: true,
    reemplazado: habia,
    mensaje: habia ? "Plan actualizado: solo se mantiene una suscripción a la vez." : "Plan Pro añadido al carrito.",
  };
}

export function quitaPlan() {
  estado = { ...estado, items: [], promo: null };
  guarda();
}

export function vaciaCarrito() {
  estado = { items: [], promo: null, actualizado: Date.now() };
  guarda();
}

export function aplicarCodigo(codigo) {
  const limpio = String(codigo || "").trim().toUpperCase();
  if (!limpio) return { ok: false, mensaje: "Escribe un código promocional." };
  if (limpio !== CODIGO_BIENVENIDA) {
    return { ok: false, mensaje: "Ese código no está activo. Revisa que esté escrito tal cual." };
  }
  if (promoUsada()) {
    return { ok: false, mensaje: "La promoción de bienvenida ya se usó en esta cuenta. Es válida una sola vez." };
  }
  if (!estado.items.length) {
    return { ok: false, mensaje: "Añade antes un plan al carrito: el descuento se aplica a la primera compra." };
  }
  estado = { ...estado, promo: { codigo: CODIGO_BIENVENIDA, pct: PCT_BIENVENIDA } };
  guarda();
  return { ok: true, mensaje: "Código aplicado: 10 % de descuento en tu primera suscripción." };
}

export function quitaCodigo() {
  estado = { ...estado, promo: null };
  guarda();
}

export function resumenCarrito() {
  const item = estado.items[0] || null;
  const plan = item ? planDe(item.planId) : null;
  const subtotal = item ? precioDe(item.planId) : 0;
  const pct = estado.promo ? PCT_BIENVENIDA : 0;
  const descuento = Number(((subtotal * pct) / 100).toFixed(2));
  const total = Number((subtotal - descuento).toFixed(2));
  return {
    item,
    plan,
    cantidad: estado.items.length,
    subtotal,
    pct,
    descuento,
    total,
    promo: estado.promo,
    ciclo: "mensual",
    hayPromo: !!estado.promo,
  };
}

/* ¿Sigue la cuenta siendo elegible? Pregunta al backend si existe esa ruta.
   Sin backend de facturación, devuelve `fuente: "local"` y lo dice. */
export async function verificaElegibilidad() {
  if (promoUsada()) {
    return { elegible: false, fuente: "local", motivo: "La promoción ya se usó en este navegador." };
  }
  try {
    const r = await fetch(`${base()}/billing/elegibilidad`, {
      headers: cabeceras(),
      method: "GET",
    });
    if (r.status === 401 || r.status === 404) throw new Error("sin-backend");
    if (!r.ok) throw new Error("sin-backend");
    const d = await r.json();
    return {
      elegible: !!d.elegible,
      fuente: "servidor",
      motivo: d.motivo || null,
      ya_usada: !!d.ya_usada,
    };
  } catch {
    return {
      elegible: !promoUsada(),
      fuente: "local",
      motivo: "No hay servicio de facturación conectado: la elegibilidad se comprueba en este navegador y el equipo la revisa antes de activar nada.",
    };
  }
}

function base() {
  return "https://jumpernet.duckdns.org";
}

function cabeceras() {
  let token = "";
  try { token = localStorage.getItem("token") || ""; } catch { /* privado */ }
  const cab = { "Content-Type": "application/json" };
  if (token) cab.Authorization = "Bearer " + token;
  return cab;
}

/* Abre el panel lateral desde cualquier sitio (barra, tarjeta, aviso). */
export function abreCarrito() {
  window.dispatchEvent(new Event("jumpernet-abrir-carrito"));
}

export function useCarrito() {
  const [actual, setActual] = useState(getCarrito);

  useEffect(() => {
    const baja = suscribeCarrito(setActual);
    /* dos pestañas abiertas comparten el mismo carrito */
    const alCambiar = (e) => {
      if (e.key === CLAVE) {
        estado = lee();
        setActual(estado);
      }
    };
    window.addEventListener("storage", alCambiar);
    return () => { baja(); window.removeEventListener("storage", alCambiar); };
  }, []);

  return actual;
}
