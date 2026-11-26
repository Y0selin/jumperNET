/* Catálogo de planes de JumperNET.
 *
 * Los límites salen del backend real (servicios/api/main.py → PLANES):
 *   free        → 3 saltos fijos · refresco cada 24 h
 *   pro         → 3…7 saltos a elección · refresco cada 10 h
 *   empresarial → gestionado con el equipo (sin autoservicio)
 *
 * No existe pasarela de pago conectada: el plan lo cambia un administrador.
 * Por eso la contratación usa un entorno de pruebas claramente identificado
 * y nunca presenta un cobro simulado como real.
 */

export const PROMO = {
  codigo: "BIENVENIDA10",
  porcentaje: 10,
  titulo: "Tu primera conexión tiene premio",
  texto: "Consigue un 10 % de descuento en tu primera suscripción Pro.",
};

/* Precio del Pro según el tamaño del circuito. El backend guarda esta misma
   tabla y es quien valida el importe final; aquí solo se usa para configurar
   y previsualizar la suscripción. */
export const PRECIOS_PRO = { 3: 5, 4: 6, 5: 7, 6: 8, 7: 9 };
export const PRECIO_BASE_PRO = PRECIOS_PRO[3];
export const SALTOS_MIN = 3;
export const SALTOS_MAX = 7;

export function normalizaSaltos(n) {
  const v = Math.round(Number(n) || SALTOS_MIN);
  return Math.max(SALTOS_MIN, Math.min(SALTOS_MAX, v));
}

export function precioPro(n = SALTOS_MIN) {
  return PRECIOS_PRO[normalizaSaltos(n)];
}

export function extrasPro(n = SALTOS_MIN) {
  return Math.max(0, precioPro(n) - PRECIO_BASE_PRO);
}

export function precioConPromo(precio, promo = true) {
  const bruto = Math.max(0, Number(precio) || 0);
  const descuento = promo ? Math.round(bruto * PROMO.porcentaje) / 100 : 0;
  return { descuento, primerPago: Math.max(0, bruto - descuento) };
}

/* Cálculo local de respaldo. Solo se usa para la demo mientras la API de
   precios no esté publicada; el flujo lo etiqueta como no validado. */
export function calculaPrecioLocal(saltos = SALTOS_MIN, promo = true) {
  const n = normalizaSaltos(saltos);
  const precio = precioPro(n);
  const { descuento, primerPago } = precioConPromo(precio, promo);
  return {
    saltos: n,
    precio_base: PRECIO_BASE_PRO,
    extras: extrasPro(n),
    precio,
    descuento,
    primer_pago: primerPago,
    renovacion: precio,
    local: true,
  };
}

/** Características visibles de Pro para el número de saltos elegido. */
export function caracteristicasPro(saltos = SALTOS_MIN) {
  const n = normalizaSaltos(saltos);
  const extra = extrasPro(n);
  return [
    {
      titulo: "Todo lo incluido en Free",
      detalle: "Panel completo, comprobación real, descargas y el interruptor maestro siguen igual. Pro añade herramientas y más control, no recorta lo gratuito.",
    },
    {
      titulo: `${n} saltos en el circuito`,
      detalle: `Tu suscripción permite circuitos de 3 a ${n} relés. Puedes moverte dentro de ese rango sin volver a pagar cada vez que cambies la configuración.`,
    },
    {
      titulo: extra > 0 ? `+${extra} € por los ${n - SALTOS_MIN} saltos adicionales` : "Precio de entrada: 3 saltos",
      detalle: extra > 0
        ? `La base son 5 € por 3 saltos y cada salto extra suma 1 €. Con ${n} saltos la renovación queda en ${precioPro(n)} €/mes.`
        : "Empiezas con el circuito mínimo de 3 relés. Puedes ampliar la suscripción cuando quieras desde el panel.",
    },
    {
      titulo: "Herramientas Pro desbloqueadas",
      detalle: "Centro de control, Network Explorer, diseñador de circuitos, monitor, inspector educativo y diagnóstico avanzado.",
    },
    {
      titulo: "Cifrado según la implementación",
      detalle: "El mismo ChaCha20-Poly1305 entre saltos que en Free. Más saltos añaden intermediarios y latencia; no convierten el plan en «más seguro» por sí solo.",
    },
    {
      titulo: "Refresco cada diez horas",
      detalle: "Giras el circuito con más frecuencia que en Free, sin cerrar la sesión ni volver a autenticarte.",
    },
  ];
}

const CLAVE_DEMO = "jumpernet-demo-pro-v1";
export const DIAS_DEMO = 30;

export const PLANES = [
  {
    id: "free",
    nombre: "Free",
    etiqueta: "para empezar",
    precio: 0,
    precioTexto: "0 €",
    periodo: "para siempre",
    resumen:
      "Prueba la red completa: tres relés, cifrado por capas y una comprobación real de que tu IP cambia.",
    saltos: 3,
    destacado: false,
    cta: "Crear cuenta gratis",
    caracteristicas: [
      {
        titulo: "Tres saltos en nodos",
        detalle:
          "La red elige tres nodos vivos al azar. Son relés lógicos del laboratorio, no servidores en tres países distintos.",
      },
      {
        titulo: "Cifrado entre saltos",
        detalle:
          "ChaCha20-Poly1305 con reenvío ciego, exactamente la implementación que ya usa la red. No hay un cifrado «mejor» escondido en otro plan.",
      },
      {
        titulo: "Refresco del circuito una vez al día",
        detalle:
          "Puedes pedir un circuito nuevo cada 24 horas. El interruptor y la desconexión siguen siendo tuyos en todo momento.",
      },
      {
        titulo: "Número de saltos fijo",
        detalle:
          "Siempre tres. El selector de 4 a 7 saltos se desbloquea con Pro; aquí aparece con candado y sin promesas raras.",
      },
    ],
  },
  {
    id: "pro",
    nombre: "Pro",
    etiqueta: "la experiencia completa",
    precio: 5,
    precioTexto: "5 €",
    periodo: "al mes",
    resumen:
      "Tú decides cuán largo es el circuito. De 3 a 7 relés, con precio según el tamaño y un refresco nuevo cada diez horas.",
    precioDesde: 5,
    saltos: 3,
    saltosMax: 7,
    destacado: true,
    cta: "Añadir Pro al carrito",
    caracteristicas: [
      {
        titulo: "Todo lo incluido en Free",
        detalle:
          "Nada de recortes: panel, comprobación real, descargas y el interruptor maestro siguen igual.",
      },
      {
        titulo: "De 3 a 7 saltos, a tu medida",
        detalle:
          "Eliges el máximo contratado y puedes montar circuitos de 3 a ese máximo. Más saltos añaden intermediarios y latencia; no convierten el plan en «más seguro» por sí solo.",
      },
      {
        titulo: "Cifrado según la implementación",
        detalle:
          "El mismo ChaCha20-Poly1305 entre saltos que en Free. El plan cambia el tamaño del circuito, no el algoritmo.",
      },
      {
        titulo: "Refresco cada diez horas",
        detalle:
          "Giras el circuito con más frecuencia que en Free, sin cerrar la sesión ni volver a autenticarte.",
      },
      {
        titulo: "Herramientas avanzadas incluidas",
        detalle:
          "Network Explorer, diseñador de circuitos, monitor de rendimiento, inspector educativo, comparador y diagnóstico avanzado. Las simulaciones se identifican como tales.",
      },
    ],
  },
  {
    id: "empresarial",
    nombre: "Empresarial",
    etiqueta: "a medida",
    precio: null,
    precioTexto: "A medida",
    periodo: "hablemos",
    resumen:
      "Consumos y salidas dedicadas según disponibilidad, con configuración y atención directa del equipo.",
    saltos: 7,
    cta: "Hablar con ventas",
    caracteristicas: [
      {
        titulo: "Todo lo incluido en Pro",
        detalle:
          "Partimos del plan Pro y añadimos lo que tu equipo necesite de verdad, sin paquetes cerrados.",
      },
      {
        titulo: "Consumos y salidas dedicadas",
        detalle:
          "Sujeto a disponibilidad de la infraestructura. El equipo concreta capacidad, salidas y condiciones antes de proponer nada.",
      },
      {
        titulo: "Atención directa con el equipo",
        detalle:
          "Un canal de contacto directo para incidencias, cambios de configuración y dudas técnicas.",
      },
      {
        titulo: "Configuración personalizada",
        detalle:
          "Ajustamos el circuito, los nodos y el panel a vuestro caso de uso. Nada se activa sin vuestra autorización.",
      },
      {
        titulo: "Contacto con ventas",
        detalle:
          "El formulario abre un mensaje con vuestros datos. No hay cobro ni alta automática: primero hablamos.",
      },
    ],
  },
];

/* Filas de la comparación interactiva. */
export const COMPARATIVA = [
  {
    grupo: "Circuito",
    filas: [
      { etiqueta: "Saltos por circuito", free: "3 fijos", pro: "3 a 7", emp: "A medida" },
      { etiqueta: "Elección de saltos", free: false, pro: true, emp: true },
      { etiqueta: "Refresco del circuito", free: "Cada 24 h", pro: "Cada 10 h", emp: "Según contrato" },
    ],
  },
  {
    grupo: "Cifrado y red",
    filas: [
      { etiqueta: "Cifrado por salto", free: "JENC · ChaCha20", pro: "JENC · ChaCha20", emp: "JENC · ChaCha20" },
      { etiqueta: "Reenvío ciego", free: true, pro: true, emp: true },
      { etiqueta: "Salida solo 80/443", free: true, pro: true, emp: true },
    ],
  },
  {
    grupo: "Cuenta y soporte",
    filas: [
      { etiqueta: "Panel y comprobación real", free: true, pro: true, emp: true },
      { etiqueta: "Descargas incluidas", free: true, pro: true, emp: true },
      { etiqueta: "Atención directa", free: false, pro: false, emp: true },
      { etiqueta: "Salidas dedicadas", free: false, pro: false, emp: "Según disponibilidad" },
    ],
  },
];

/* ── entorno de demostración ─────────────────────────────────────────────
   Sin pasarela real, el flujo de contratación activa un Pro de prueba
   durante 30 días SOLO en este navegador. Se etiqueta siempre como DEMO y
   no toca los permisos del backend: la red sigue verificando el plan real. */

export function leeDemoPro() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_DEMO) || "null");
    if (d && d.hasta && d.hasta > Date.now()) return d;
    if (d) localStorage.removeItem(CLAVE_DEMO);
  } catch { /* almacenamiento bloqueado */ }
  return null;
}

export function activaDemoPro(usuarioId = null, saltos = SALTOS_MIN) {
  const demo = {
    plan: "pro",
    usuario: usuarioId,
    saltos: normalizaSaltos(saltos),
    desde: Date.now(),
    hasta: Date.now() + DIAS_DEMO * 86400000,
  };
  try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(demo)); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent("jumpernet-plan", { detail: demo }));
  return demo;
}

export function actualizaDemoPro(saltos) {
  const demo = leeDemoPro();
  if (!demo) return null;
  return activaDemoPro(demo.usuario, saltos);
}

export function desactivaDemoPro() {
  try { localStorage.removeItem(CLAVE_DEMO); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent("jumpernet-plan", { detail: null }));
}

/** Plan que debe pintar la interfaz: el real del backend manda; la demo
    solo cubre cuentas Free para poder recorrer el flujo de pruebas. */
export function planDe(yo) {
  const real = PLANES.find((p) => p.id === yo?.plan) || PLANES[0];
  if (real.id !== "free") return { ...real, demo: false };
  const demo = leeDemoPro();
  if (!demo) return { ...real, demo: false };
  /* la demo pertenece a la cuenta que la activó: no se contagia a otras */
  if (demo.usuario != null && String(demo.usuario) !== String(yo?.id)) return { ...real, demo: false };
  const saltos = normalizaSaltos(demo.saltos || SALTOS_MIN);
  return {
    ...PLANES[1],
    demo: true,
    hasta: demo.hasta,
    saltos,
    saltosMax: saltos,
    precio: precioPro(saltos),
    precioTexto: `${precioPro(saltos)} €`,
  };
}

export function fechaCorta(ms) {
  return new Date(ms).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
