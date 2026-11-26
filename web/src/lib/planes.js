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
      "Tú decides cuán largo es el circuito. Hasta siete relés y un refresco nuevo cada diez horas.",
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
        titulo: "Hasta siete saltos en nodos",
        detalle:
          "Puedes montar circuitos de 3, 4, 5, 6 o 7 relés. Más saltos añaden intermediarios y latencia; no convierten el plan en «más seguro» por sí solo.",
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
        titulo: "Elección de 3 a 7 saltos",
        detalle:
          "El selector del panel aplica el número elegido la próxima vez que conectes o gires el circuito.",
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

export function activaDemoPro(usuarioId = null) {
  const demo = { plan: "pro", usuario: usuarioId, desde: Date.now(), hasta: Date.now() + DIAS_DEMO * 86400000 };
  try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(demo)); } catch { /* sin persistencia */ }
  window.dispatchEvent(new CustomEvent("jumpernet-plan", { detail: demo }));
  return demo;
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
  return { ...PLANES[1], demo: true, hasta: demo.hasta };
}

export function fechaCorta(ms) {
  return new Date(ms).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
