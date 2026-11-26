import { me, nodosVivos, salida, geoApi, getToken, decodificaJwt } from "./api.js";
import { leePrefCircuito, hayPrefCircuitoGuardada } from "./panel.jsx";
import { planDe } from "./planes.js";

/* Informe de red: reúne lo que la API confirma, lo que está guardado en este
   navegador y el último diagnóstico. No rellena huecos con datos de ejemplo. */

const CLAVE_DIAGNOSTICO = "jumpernet-diagnostico-v1";

export function leeUltimoDiagnostico() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_DIAGNOSTICO) || "null");
    return d && Array.isArray(d.filas) ? d : null;
  } catch { return null; }
}

export function modoLegible(modo) {
  return modo === "externos" ? "solo equipos externos" : "todos los nodos";
}

function fechaLarga(valor) {
  try {
    return new Date(valor).toLocaleString("es-ES", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function minutosSesion() {
  const jwt = decodificaJwt(getToken() || "");
  const exp = jwt?.cuerpo?.exp;
  return exp ? Math.max(0, Math.round((exp * 1000 - Date.now()) / 60000)) : null;
}

export async function recolectaInforme(yo) {
  const t0 = performance.now();
  let cuenta = yo;
  let errorCuenta = "";
  try {
    cuenta = await me();
  } catch (e) {
    errorCuenta = e.message || "no se pudo actualizar la cuenta";
  }

  const plan = planDe(cuenta || yo);
  const activo = !!cuenta?.activo;
  const circuito = Array.isArray(cuenta?.circuito) ? cuenta.circuito : [];
  const pref = leePrefCircuito(cuenta || yo);
  const guardada = hayPrefCircuitoGuardada();

  const [vivos, sal] = await Promise.all([
    nodosVivos().catch((e) => ({ error: e.message })),
    activo ? salida().catch((e) => ({ error: e.message })) : Promise.resolve(null),
  ]);

  const ipSalida = activo ? (sal?.ip_salida || cuenta?.ip_salida || null) : null;
  let geo = null;
  if (activo && ipSalida) {
    geo = await geoApi(ipSalida).catch(() => ({ ok: false, error: "sin respuesta de geolocalización" }));
  }

  const modo = cuenta?.modo || pref.modo;
  const saltosMax = plan.saltosMax || cuenta?.saltos_max || yo?.saltos_max || 3;

  return {
    generado: new Date().toISOString(),
    apiMs: Math.round(performance.now() - t0),
    errorCuenta,
    cuenta: {
      id: cuenta?.id ?? yo?.id ?? null,
      email: cuenta?.email || yo?.email || "—",
      alias: cuenta?.alias || null,
      plan: plan.id,
      planNombre: plan.nombre,
      demo: !!plan.demo,
      activo,
      ipReal: cuenta?.ip_real || yo?.ip_real || null,
      ipSalida,
      nodoExit: cuenta?.nodo_exit || circuito[circuito.length - 1] || null,
      circuito,
      ultimoCambio: cuenta?.ultimo_cambio || null,
      saltosMax,
      refrescoCadaH: cuenta?.refresco_cada_h || (plan.id === "free" ? 24 : 10),
      modo,
    },
    red: {
      activa: activo,
      estado: activo ? "configurada y activa" : guardada ? "apagada, con configuración guardada" : "sin configurar",
      saltosEnUso: circuito.length,
      modo,
    },
    config: {
      guardada,
      saltos: pref.saltos,
      modo: pref.modo,
      modoTexto: modoLegible(pref.modo),
      nota: guardada
        ? "Hay una configuración guardada en este navegador; se aplicará la próxima vez que conectes."
        : "No hay configuración guardada en este navegador. Al conectar se usarán 3 saltos y todos los nodos.",
    },
    resultados: {
      vivos: vivos?.error ? null : vivos,
      vivosError: vivos?.error || "",
      salidaError: sal?.error || "",
      geo,
      sesionMin: minutosSesion(),
      diagnostico: leeUltimoDiagnostico(),
    },
  };
}

/* PDF generado en el propio navegador. Se carga jsPDF solo al pulsar el botón
   para no meter la librería en la carga normal del panel. */
export async function descargarInformePDF(datos) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 16;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ancho = W - M * 2;
  const verde = [27, 116, 96];
  const tinta = [27, 48, 41];
  const suave = [71, 96, 87];
  const linea = [214, 228, 219];
  let y = M;

  doc.setProperties({
    title: "JumperNET · informe de red",
    subject: "Estado, configuración y resultados de la red",
    author: "JumperNET",
    creator: "JumperNET",
  });

  function pie() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...suave);
    doc.text("JumperNET · informe generado localmente · no se envía al servidor", M, H - 8);
    doc.text(String(doc.getNumberOfPages()), W - M, H - 8, { align: "right" });
  }

  function nuevaPagina() {
    pie();
    doc.addPage();
    y = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...verde);
    doc.text("JumperNET · informe de red (continuación)", M, y);
    y += 7;
  }

  function salto(alto) {
    if (y + alto > H - 20) nuevaPagina();
  }

  function seccion(titulo) {
    salto(13);
    y += 2;
    doc.setFillColor(...verde);
    doc.rect(M, y - 3.5, 2.5, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...tinta);
    doc.text(titulo, M + 5, y);
    y += 7;
  }

  function fila(etiqueta, valor) {
    const lineas = doc.splitTextToSize(String(valor ?? "—"), ancho - 48);
    const alto = Math.max(6, lineas.length * 4.6);
    salto(alto + 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.setTextColor(...suave);
    doc.text(etiqueta, M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(...tinta);
    doc.text(lineas, M + 48, y);
    y += alto;
    doc.setDrawColor(...linea);
    doc.line(M, y - 3, W - M, y - 3);
  }

  function nota(texto) {
    const lineas = doc.splitTextToSize(String(texto), ancho);
    const alto = lineas.length * 4.2;
    salto(alto + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...suave);
    doc.text(lineas, M, y);
    y += alto + 1;
  }

  const activa = datos.red.activa;
  const guardada = datos.config.guardada;
  const estado = activa ? "Red configurada y activa" : guardada ? "Red apagada · configuración guardada" : "Red no configurada";
  const mensaje = activa
    ? `Circuito de ${datos.cuenta.circuito.length} saltos · ${modoLegible(datos.red.modo)} · IP de salida ${datos.cuenta.ipSalida || "sin respuesta"}.`
    : guardada
      ? `No hay un circuito activo. La próxima conexión usará ${datos.config.saltos} saltos · ${datos.config.modoTexto}.`
      : "No hay un circuito activo ni preferencias guardadas. Al conectar se usarán 3 saltos y todos los nodos.";

  doc.setFillColor(...verde);
  doc.rect(0, 0, W, 38, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.setTextColor(255, 255, 255);
  doc.text("JumperNET", M, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Informe de red y configuración", M, 25);
  doc.setFontSize(8.3);
  doc.text(`Generado: ${fechaLarga(datos.generado)}`, M, 32);
  doc.text(`Cuenta: ${datos.cuenta.email}`, W - M, 17, { align: "right" });
  doc.text(`Plan: ${datos.cuenta.planNombre}${datos.cuenta.demo ? " · demo" : ""}`, W - M, 24, { align: "right" });
  doc.text(`ID: ${datos.cuenta.id ?? "—"}`, W - M, 31, { align: "right" });

  y = 48;
  const estadoBg = activa ? [227, 242, 235] : guardada ? [251, 244, 229] : [246, 238, 234];
  const estadoFg = activa ? [27, 116, 96] : guardada ? [124, 90, 23] : [146, 45, 35];
  doc.setFillColor(...estadoBg);
  doc.roundedRect(M, y, ancho, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...estadoFg);
  doc.text(estado, M + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...tinta);
  doc.text(doc.splitTextToSize(mensaje, ancho - 10), M + 5, y + 13);
  y += 27;

  if (datos.errorCuenta) {
    nota(`Aviso: no se pudo actualizar la cuenta (${datos.errorCuenta}). Los datos de sesión pueden ser los últimos guardados.`);
  }

  seccion("Estado de la red");
  fila("Estado", datos.red.estado);
  fila("Plan", `${datos.cuenta.planNombre}${datos.cuenta.demo ? " · demo local" : ""} · máximo ${datos.cuenta.saltosMax} saltos`);
  fila("Circuito", datos.cuenta.circuito.length ? datos.cuenta.circuito.join(" → ") : "Sin circuito activo");
  fila("Saltos en uso", activa ? `${datos.cuenta.circuito.length} de ${datos.cuenta.saltosMax}` : `0 · próxima conexión: ${datos.config.saltos}`);
  fila("Modo", modoLegible(datos.cuenta.modo));
  fila("IP real", datos.cuenta.ipReal || "sin dato");
  fila("IP de salida", activa ? (datos.cuenta.ipSalida || "sin respuesta") : "— (red apagada)");
  fila("Nodo de salida", datos.cuenta.nodoExit || "sin dato");
  fila("Último cambio", datos.cuenta.ultimoCambio ? fechaLarga(datos.cuenta.ultimoCambio * 1000) : "sin dato");
  fila("Próximo refresco", activa ? `cada ${datos.cuenta.refrescoCadaH} h` : `cada ${datos.cuenta.refrescoCadaH} h al conectar`);

  seccion("Configuración del panel");
  fila("Configuración guardada", guardada ? "Sí, en este navegador" : "No");
  fila("Próxima conexión", `${datos.config.saltos} saltos · ${datos.config.modoTexto}`);
  fila("SOCKS5", "jumpernet.duckdns.org:1080");
  fila("Autenticación", datos.cuenta.email);
  nota(datos.config.nota);

  seccion("Resultados medidos");
  fila("Respuesta de la API", `${datos.apiMs} ms`);
  fila("Sesión restante", datos.resultados.sesionMin != null ? `${datos.resultados.sesionMin} min` : "sin datos");
  fila(
    "Nodos vivos",
    datos.resultados.vivos
      ? `${datos.resultados.vivos.total ?? "—"} · ${datos.resultados.vivos.infra ?? "—"} infra · ${datos.resultados.vivos.equipos ?? "—"} equipos · ${datos.resultados.vivos.validados ?? "—"} validados`
      : `sin datos${datos.resultados.vivosError ? ` · ${datos.resultados.vivosError}` : ""}`,
  );
  fila("Comprobación de salida", datos.resultados.salidaError ? `error · ${datos.resultados.salidaError}` : activa ? "respuesta recibida" : "no ejecutada (red apagada)");
  fila(
    "Geolocalización de salida",
    datos.resultados.geo?.ok
      ? [datos.resultados.geo.ciudad, datos.resultados.geo.pais].filter(Boolean).join(", ")
      : datos.resultados.geo?.error || "sin datos",
  );

  const diag = datos.resultados.diagnostico;
  if (diag?.filas?.length) {
    seccion("Último diagnóstico");
    fila("Fecha", fechaLarga(diag.fecha));
    diag.filas.forEach((f) => fila(f.k, `${f.v}${f.d ? ` · ${f.d}` : ""}`));
  } else {
    seccion("Último diagnóstico");
    nota("Sin diagnóstico ejecutado. Abre «Diagnóstico» en el panel, ejecútalo y vuelve a generar el informe para incluirlo.");
  }

  y += 4;
  nota("Este documento se ha generado en tu navegador. No incluye historial de navegación, contraseñas ni destinos visitados. Las medidas sin respuesta se muestran como «sin dato».");
  pie();

  const d = new Date(datos.generado);
  const dos = (n) => String(n).padStart(2, "0");
  const nombre = `jumpernet-informe-${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}.pdf`;
  doc.save(nombre);
  return nombre;
}
