import { normalizaPlan, planDe } from "./planes.js";

/* Suscripción y pedidos.
 *
 * La verdad del plan viene de /me (backend). Lo que se guarda aquí son las
 * solicitudes de compra que el usuario ha hecho desde la web y si pidió
 * cancelar la renovación. Sin proveedor de pagos conectado no existe ninguna
 * factura: no inventamos importes ni estados «pagado».
 */

const CLAVE_PEDIDOS = "jumpernet-pedidos-v1";
const CLAVE_ESTADO = "jumpernet-suscripcion-v1";
const MAXIMO = 25;

function leeJSON(clave, porDefecto) {
  try {
    const d = JSON.parse(localStorage.getItem(clave) || "null");
    return d ?? porDefecto;
  } catch { return porDefecto; }
}

export function leePedidos() {
  const d = leeJSON(CLAVE_PEDIDOS, []);
  return Array.isArray(d) ? d : [];
}

export function guardaPedidos(lista) {
  try { localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(lista.slice(0, MAXIMO))); } catch { /* privado */ }
}

function referencia(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `JN-${y}${m}-${azar}`;
}

export function creaPedido(datos) {
  const plan = planDe(datos.planId);
  const pedido = {
    ref: referencia(),
    fecha: Date.now(),
    planId: plan.id,
    planNombre: plan.nombre,
    ciclo: datos.ciclo || "mensual",
    subtotal: Number(datos.subtotal) || 0,
    descuento: Number(datos.descuento) || 0,
    total: Number(datos.total) || 0,
    promo: datos.promo || null,
    estado: datos.estado || "pendiente",
    /* «local» = solicitud registrada en este navegador;
       «stripe» = sesión real creada por el backend */
    fuente: datos.fuente || "local",
    facturacion: datos.facturacion || null,
  };
  const lista = [pedido, ...leePedidos()];
  guardaPedidos(lista);
  return pedido;
}

export function pedidoPorRef(ref) {
  const buscada = String(ref || "").trim().toUpperCase();
  return leePedidos().find((p) => String(p.ref).toUpperCase() === buscada) || null;
}

export function leeEstadoSuscripcion() {
  const d = leeJSON(CLAVE_ESTADO, {});
  return d && typeof d === "object" ? d : {};
}

function guardaEstadoSuscripcion(d) {
  try { localStorage.setItem(CLAVE_ESTADO, JSON.stringify(d)); } catch { /* privado */ }
}

export function cancelaRenovacion() {
  const d = { ...leeEstadoSuscripcion(), renovacionCancelada: true, cuando: Date.now() };
  guardaEstadoSuscripcion(d);
  return d;
}

export function reactivaRenovacion() {
  const d = { ...leeEstadoSuscripcion(), renovacionCancelada: false, cuando: Date.now() };
  guardaEstadoSuscripcion(d);
  return d;
}

function sumaMes(ms) {
  const d = new Date(ms);
  const dia = d.getDate();
  d.setMonth(d.getMonth() + 1);
  /* 31 de enero + 1 mes → 28/29 de febrero, no 3 de marzo */
  if (d.getDate() < dia) d.setDate(0);
  return d.getTime();
}

/* Estado que se pinta en «Mi suscripción» y en la barra superior. */
export function estadoSuscripcion(yo) {
  const plan = planDe(normalizaPlan(yo?.plan));
  const esGratis = plan.id === "free";
  const pedidos = leePedidos();
  const delPlan = pedidos.filter((p) => p.planId === plan.id);
  const ultimo = delPlan[0] || null;
  const local = leeEstadoSuscripcion();

  const alta = yo?.alta ? Number(yo.alta) * 1000 : null;
  const desde = ultimo?.fecha || (!esGratis ? alta : null);

  /* Solo se promete una fecha de renovación si existe un pedido registrado:
     sin proveedor de pagos no hay cobro automático que anunciar. */
  const renueva = !esGratis && ultimo ? sumaMes(ultimo.fecha) : null;
  const cancelada = !esGratis && !!local.renovacionCancelada;

  let estado = "gratis";
  let etiqueta = "Gratis";
  if (!esGratis) {
    if (ultimo && ultimo.estado === "pendiente") { estado = "pendiente"; etiqueta = "Pendiente de activación"; }
    else if (cancelada) { estado = "cancelada"; etiqueta = "Renovación cancelada"; }
    else { estado = "activo"; etiqueta = "Activa"; }
  }

  return {
    plan,
    esGratis,
    estado,
    etiqueta,
    desde,
    renueva,
    cancelada,
    precio: typeof plan.precio === "number" ? plan.precio : null,
    precioTexto: plan.precioTexto,
    periodo: plan.periodo,
    pedidos,
    ultimo,
    fuente: ultimo ? (ultimo.fuente === "stripe" ? "proveedor de pagos" : "solicitud registrada en este navegador") : "cuenta de JumperNET",
    /* facturas solo cuando el proveedor ha confirmado el cobro */
    facturas: pedidos.filter((p) => p.estado === "pagado"),
  };
}

export function formateaFecha(ms) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return "—"; }
}

export function formateaEuros(n) {
  const v = Number(n) || 0;
  return `${v.toFixed(2).replace(".", ",")} €`;
}
