/* Catálogo único de planes de JumperNET.
 *
 * Todo lo que la web dice de un plan sale de aquí: la parrilla de tarifas,
 * el carrito, el panel y los candados del menú. Los límites son los que el
 * backend aplica de verdad hoy:
 *
 *   free        → 3 saltos fijos, cifrado entre saltos, refresco 1 vez al día
 *   pro         → 3…7 saltos a elección, refresco cada 10 h
 *   empresarial → a medida, se concreta con el equipo (sin autoservicio)
 *
 * No hay facturación anual implementada, así que el selector de ciclo la
 * enseña desactivada en vez de inventar un descuento que no existe.
 */

export const CICLOS = [
  {
    id: "mensual",
    nombre: "Mensual",
    corto: "mes",
    disponible: true,
    nota: "Facturación mes a mes. Puedes cancelar la renovación cuando quieras.",
  },
  {
    id: "anual",
    nombre: "Anual",
    corto: "año",
    disponible: false,
    nota: "Aún no ofrecemos facturación anual. Cuando exista, aparecerá aquí con su precio real.",
  },
];

export const PLANES = [
  {
    id: "free",
    nombre: "Free",
    ico: "🌱",
    tono: "free",
    precio: 0,
    precioTexto: "0 €",
    periodo: "para siempre",
    resumen: "Para probar la red y comprobar que tu IP cambia de verdad.",
    renovacion: "No caduca y no genera ningún cargo. No hace falta tarjeta.",
    exclusivo: [],
    incluido: [
      "3 saltos en nodos de la infraestructura",
      "Cifrado JENC entre saltos",
      "Refresco del circuito 1 vez al día",
      "Panel, diagnóstico básico y documentación",
      "Descarga de la extensión y del navegador",
    ],
    limitaciones: [
      "3 saltos fijos: no puedes elegir el tamaño del circuito",
      "Vista básica de los nodos de tu circuito",
      "Personalización del panel no incluida",
    ],
    cta: { tipo: "registro", texto: "Crear cuenta gratis" },
    capacidad: "free",
  },
  {
    id: "pro",
    nombre: "Pro",
    ico: "⚡",
    tono: "pro",
    precio: 5,
    precioTexto: "5 €",
    periodo: "al mes",
    resumen: "La experiencia completa: tú decides cuán largo quieres el circuito.",
    renovacion: "5 €/mes. Se renueva cada mes hasta que canceles la renovación.",
    recomendado: true,
    exclusivo: [
      "Eliges el número de saltos (3…7)",
      "Refresco del circuito cada 10 horas",
      "Personalización del panel y del tema",
    ],
    incluido: [
      "Todo lo del plan Free",
      "Hasta 7 saltos por circuito",
      "Cifrado por capas en todos los saltos",
      "Nodos: ficha ampliada y monitorización",
      "Diagnóstico avanzado y inspector educativo de paquetes",
      "Diseñador de circuitos del laboratorio",
    ],
    limitaciones: [
      "Sin salidas dedicadas ni SLA",
      "Facturación mensual (no hay modalidad anual todavía)",
    ],
    cta: { tipo: "carrito", texto: "Añadir al carrito" },
    capacidad: "pro",
  },
  {
    id: "empresarial",
    nombre: "Empresarial",
    ico: "🏛",
    tono: "emp",
    precio: null,
    precioTexto: "A medida",
    periodo: "hablemos",
    resumen: "Consumos dedicados, salidas específicas y trato directo con el equipo.",
    renovacion: "Se acuerda contigo: no hay cobro automático ni renovación oculta.",
    exclusivo: [
      "Salidas y consumos dedicados",
      "Plan personalizado por escrito",
      "Trato directo con el equipo del proyecto",
    ],
    incluido: [
      "Todo lo del plan Pro",
      "Configuración acordada contigo",
      "Acompañamiento en la puesta en marcha",
    ],
    limitaciones: [
      "No se contrata en autoservicio",
      "El precio depende del consumo acordado",
    ],
    cta: { tipo: "ventas", texto: "Hablar con el equipo" },
    capacidad: "empresarial",
  },
];

/* ─────────────── capacidades: la fuente de la verdad en el cliente ───────────────
   El backend puede mandar `capacidades` en /me y manda: si llega, manda eso.
   Si no llega, se usa esta tabla, que replica lo que la API aplica hoy.
   Ocultar un botón no es seguridad: las rutas reales (/connect con saltos,
   el inspector, etc.) se comprueban también en el servidor. */
export const CAPACIDADES = {
  free: {
    saltosVariables: false,
    nodosAvanzado: false,
    monitorizacion: false,
    diagnosticoAvanzado: false,
    inspectorPaquetes: false,
    disenadorCircuitos: false,
    personalizacion: false,
    exportarFicha: true,
    desconectar: true,
    comprobarIp: true,
    soporte: true,
    descargas: true,
    docs: true,
  },
  pro: {
    saltosVariables: true,
    nodosAvanzado: true,
    monitorizacion: true,
    diagnosticoAvanzado: true,
    inspectorPaquetes: true,
    disenadorCircuitos: true,
    personalizacion: true,
    exportarFicha: true,
    desconectar: true,
    comprobarIp: true,
    soporte: true,
    descargas: true,
    docs: true,
  },
  empresarial: {
    saltosVariables: true,
    nodosAvanzado: true,
    monitorizacion: true,
    diagnosticoAvanzado: true,
    inspectorPaquetes: true,
    disenadorCircuitos: true,
    personalizacion: true,
    exportarFicha: true,
    desconectar: true,
    comprobarIp: true,
    soporte: true,
    descargas: true,
    docs: true,
  },
};

export const NOMBRE_CAPACIDAD = {
  saltosVariables: "Elegir el número de saltos",
  nodosAvanzado: "Ficha ampliada de los nodos",
  monitorizacion: "Monitorización ampliada",
  diagnosticoAvanzado: "Diagnóstico avanzado",
  inspectorPaquetes: "Inspector educativo de paquetes",
  disenadorCircuitos: "Diseñador de circuitos",
  personalizacion: "Personalización del panel",
};

/* Filas de la tabla comparativa. `valores` es texto ya listo para pintar. */
export const FILAS_COMPARATIVA = [
  { id: "precio", etq: "Precio", grupo: "Plan", valores: { free: "0 €", pro: "5 €/mes", empresarial: "A medida" } },
  { id: "saltos", etq: "Saltos por circuito", grupo: "Red", valores: { free: "3 fijos", pro: "3 a 7", empresarial: "A medida" } },
  { id: "eleccion", etq: "Eliges el tamaño del circuito", grupo: "Red", valores: { free: false, pro: true, empresarial: true } },
  { id: "refresco", etq: "Refresco del circuito", grupo: "Red", valores: { free: "1 vez al día", pro: "Cada 10 h", empresarial: "A medida" } },
  { id: "cifrado", etq: "Cifrado por capas (JENC)", grupo: "Red", valores: { free: "Sí, entre saltos", pro: true, empresarial: true } },
  { id: "nodos", etq: "Nodos: ficha ampliada", grupo: "Red", valores: { free: "Básica", pro: true, empresarial: true } },
  { id: "monitor", etq: "Monitorización ampliada", grupo: "Red", valores: { free: false, pro: true, empresarial: true } },
  { id: "diag", etq: "Diagnóstico avanzado", grupo: "Herramientas", valores: { free: "Básico", pro: true, empresarial: true } },
  { id: "inspector", etq: "Inspector de paquetes (educativo)", grupo: "Herramientas", valores: { free: false, pro: true, empresarial: true } },
  { id: "disenador", etq: "Diseñador de circuitos", grupo: "Herramientas", valores: { free: false, pro: true, empresarial: true } },
  { id: "tema", etq: "Personalización del panel", grupo: "Panel", valores: { free: false, pro: true, empresarial: true } },
  { id: "descargas", etq: "Extensión y navegador", grupo: "Panel", valores: { free: true, pro: true, empresarial: true } },
  { id: "soporte", etq: "Soporte", grupo: "Ayuda", valores: { free: "Formulario y docs", pro: "Formulario y docs", empresarial: "Trato directo" } },
  { id: "renovacion", etq: "Renovación", grupo: "Facturación", valores: { free: "No aplica", pro: "Mensual", empresarial: "Por acuerdo" } },
];

export function normalizaPlan(plan) {
  const p = String(plan || "free").toLowerCase();
  if (p === "pro" || p === "plus") return "pro";
  if (p === "empresarial" || p === "enterprise" || p === "business") return "empresarial";
  return "free";
}

export function planDe(id) {
  return PLANES.find((p) => p.id === normalizaPlan(id)) || PLANES[0];
}

export function precioDe(id) {
  const p = planDe(id);
  return typeof p.precio === "number" ? p.precio : 0;
}

/* ¿Puede esta cuenta usar la capacidad? `yo.capacidades` (servidor) gana. */
export function puede(yo, capacidad) {
  const servidor = yo?.capacidades;
  if (servidor && typeof servidor === "object" && capacidad in servidor) {
    return !!servidor[capacidad];
  }
  return !!CAPACIDADES[normalizaPlan(yo?.plan)]?.[capacidad];
}

export function planActual(yo) {
  return planDe(yo?.plan);
}

/* etiqueta corta con icono para la barra superior */
export function etiquetaPlan(yo) {
  const p = planActual(yo);
  return `${p.ico} ${p.nombre}`;
}
