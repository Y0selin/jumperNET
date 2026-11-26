import { useMemo, useState } from "react";
import { useTelemetria, demoTelemetria, DEMO_NODOS, formatoBytes } from "../lib/telemetria.js";
import { leeLog } from "./PanelLog.js";
import {
  GraficoLatencia, GraficoTrafico, GraficoBarrasSaltos, GraficoNodos,
  GraficoActividad, Topologia, horaCorta,
} from "./Graficos.jsx";

/* Sección "Estadísticas y rendimiento".
 *
 * Las tarjetas beben de useTelemetria (medidas reales de /me y /nodos) y del
 * tráfico de aplicación que api.js emite. La demostración es explícita: se
 * activa sola mientras no hay una serie real suficiente (cuatro medidas) y
 * lleva su propio sello. "Datos reales" permite ver la serie en crudo.
 */

function promedio(ns) {
  const v = ns.filter(Number.isFinite);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

function PanelGrafico({ titulo, sub, extra, className = "", children }) {
  return (
    <section className={`tarjeta jn-panel-grafico ${className}`}>
      <header className="jn-panel-cab">
        <div>
          <h2>{titulo}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {extra}
      </header>
      {children}
    </section>
  );
}

function eventosDemo(ahora) {
  const base = [
    ["red activada · 3 saltos", "ok", 3.4],
    ["refresco de circuito completado", "ok", 2.8],
    ["comprobación de IP correcta", "ok", 2.1],
    ["nodo de salida rotado", "ok", 1.6],
    ["sonda de latencia", "ok", .9],
    ["intento de conexión fallido", "error", .55],
    ["red desactivada", "ok", .3],
    ["red activada · 3 saltos", "ok", .08],
  ];
  return base.map(([texto, tipo, horas], i) => ({
    t: ahora - horas * 3600000,
    texto,
    tipo,
    demo: true,
    id: `demo-${i}`,
  }));
}

export default function Estadisticas({ yo, plan, aviso }) {
  const tele = useTelemetria({ intervalo: 5000, max: 240 });
  const [rango, setRango] = useState(5);
  const [fuente, setFuente] = useState("auto");

  const reales = tele.muestras.filter((m) => Number.isFinite(m.ms)).length;
  const realDisponible = reales > 0;
  /* Con una o dos medidas no hay una serie que enseñar. Mientras se
     recopilan al menos cuatro, la demo (siempre rotulada) mantiene los
     gráficos legibles; en cuanto hay serie real, entra sola. */
  const pocas = reales < 4;
  const demo = fuente === "demo" || (fuente === "auto" && tele.ultima != null && (!realDisponible || pocas));
  const forzadoReal = fuente === "real";

  const muestras = useMemo(() => {
    if (demo) return demoTelemetria(52, rango);
    const desde = Date.now() - rango * 60000;
    return tele.muestras.filter((m) => m.t >= desde);
  }, [demo, rango, tele.muestras]);

  const ultima = muestras[muestras.length - 1] || null;
  const medias = muestras.map((m) => m.ms).filter(Number.isFinite);
  const latenciaMedia = promedio(medias);
  const latenciaActual = ultima?.ms ?? null;

  const nodos = demo ? DEMO_NODOS : tele.lista;
  const vivos = demo
    ? { total: DEMO_NODOS.filter((n) => n.estado === "vivo").length, infra: 4, equipos: 1 }
    : tele.vivos;
  const disponibles = nodos.length
    ? Math.round((nodos.filter((n) => n.estado === "vivo").length / nodos.length) * 100)
    : null;

  const saltos = useMemo(() => {
    if (demo) return ultima?.saltos || [];
    const delCircuito = ultima?.saltos || [];
    if (delCircuito.length) return delCircuito;
    return tele.lista
      .filter((n) => Number.isFinite(n.ms))
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 3)
      .map((n) => ({ nombre: n.nombre, ms: n.ms }));
  }, [demo, ultima, tele.lista]);

  const ordenados = useMemo(() => [...nodos].sort((a, b) => {
    const aa = Number.isFinite(a.ms) ? a.ms : 99999;
    const bb = Number.isFinite(b.ms) ? b.ms : 99999;
    return aa - bb;
  }).slice(0, 6), [nodos]);

  const traficoTotal = muestras.reduce((a, m) => a + (m.enviado || 0) + (m.recibido || 0), 0);
  const actividad = useMemo(() => {
    if (demo) return eventosDemo(Date.now());
    return leeLog().map((e, i) => ({ ...e, id: `${e.t}-${i}` }));
  }, [demo]);

  const errores = muestras.filter((m) => m.fallo).length;
  const esPro = plan?.id === "pro" || plan?.id === "empresarial";

  return (
    <div className="pu-pagina jn-estadisticas">
      <header className="pu-cab jn-estadisticas-cab">
        <div>
          <span className="pu-kicker">panel / estadísticas y rendimiento</span>
          <h1>La red, en datos que existen.</h1>
          <p>
            Latencia, tráfico de la API, disponibilidad y actividad de esta sesión. Medimos lo que
            podemos comprobar; cuando falta una medida se dice, y la demostración va siempre marcada.
          </p>
        </div>
        <div className="pu-cab-acciones">
          <span className={`chip ${tele.error ? "muerto" : "vivo"} mono`}>
            {tele.pausado ? "PAUSADO" : tele.error ? "API CON ERROR" : "MIDIENDO"}
          </span>
          <button className="btn" type="button" onClick={() => tele.setPausado((p) => !p)}>
            {tele.pausado ? "Reanudar" : "Pausar"}
          </button>
          <button className="btn" type="button" onClick={() => tele.mide()}>Actualizar</button>
        </div>
      </header>

      <div className="jn-barra-filtros">
        <div className="jn-filtro-grupo" role="group" aria-label="Rango temporal">
          <span className="mono">ventana</span>
          {[1, 5, 15].map((m) => (
            <button key={m} type="button" className={rango === m ? "on" : ""} onClick={() => setRango(m)}>
              {m} min
            </button>
          ))}
        </div>
        <div className="jn-filtro-grupo" role="group" aria-label="Fuente de datos">
          <span className="mono">fuente</span>
          <button type="button" className={!demo ? "on" : ""} onClick={() => setFuente("real")}>Datos reales</button>
          <button type="button" className={demo ? "on" : ""} onClick={() => setFuente("demo")}>Demostración</button>
        </div>
        <span className="jn-filtro-nota mono">
          {demo ? "serie simulada · no son medidas de tu red" : `${muestras.length} muestras · ${tele.pausado ? "congelado" : "actualizando cada 5 s"}`}
        </span>
      </div>

      {forzadoReal && (
        <div className="jn-aviso-demo real" role="status">
          <span className="mono">DATOS REALES</span>
          <p>
            {reales
              ? `${reales} medida${reales === 1 ? "" : "s"} de esta sesión. La serie se completará con cada medición automática.`
              : "Aún no hay medidas reales. La primera llegará en unos segundos; mientras tanto no inventamos una serie."}
          </p>
          <button className="btn" type="button" onClick={() => setFuente("auto")}>Ver demostración</button>
        </div>
      )}

      {demo && (
        <div className="jn-aviso-demo" role="status">
          <span className="mono">DEMOSTRACIÓN</span>
          <p>
            {fuente === "demo"
              ? "Estás viendo una serie de ejemplo para explorar los gráficos."
              : realDisponible
                ? `Solo hay ${reales} medida${reales === 1 ? "" : "s"} real${reales === 1 ? "" : "es"}; con cuatro la serie real sustituirá a esta demostración automáticamente. La demo no representa tu conexión.`
                : "No hay medidas reales disponibles ahora mismo. Esta serie es una demostración y no representa tu conexión."}
          </p>
          <button className="btn" type="button" onClick={() => setFuente("real")}>Volver a datos reales</button>
        </div>
      )}

      <div className="jn-kpis">
        <div className="jn-kpi">
          <span className="mono">latencia actual</span>
          <b className="mono">{latenciaActual != null ? `${latenciaActual} ms` : "sin medida"}</b>
          <small>{demo ? "demostración" : "respuesta de /me"}</small>
        </div>
        <div className="jn-kpi">
          <span className="mono">media de la ventana</span>
          <b className="mono">{latenciaMedia != null ? `${latenciaMedia} ms` : "—"}</b>
          <small>{medias.length} medidas</small>
        </div>
        <div className="jn-kpi">
          <span className="mono">disponibilidad</span>
          <b className="mono">{disponibles != null ? `${disponibles} %` : "—"}</b>
          <small>{nodos.length ? `${nodos.filter((n) => n.estado === "vivo").length} de ${nodos.length} vivos` : "sin nodos"}</small>
        </div>
        <div className="jn-kpi">
          <span className="mono">tráfico de la API</span>
          <b className="mono">{formatoBytes(traficoTotal)}</b>
          <small>{errores ? `${errores} respuestas con error` : "enviado + recibido"}</small>
        </div>
      </div>

      <div className="jn-grid-graficos">
        <PanelGrafico
          titulo="Latencia en tiempo real"
          sub="Cada punto es una medida real de la API. La línea discontinua es la media de tus saltos."
          className="jn-ancho-7"
          extra={<span className="jn-panel-etq mono">{rango} min</span>}
        >
          <GraficoLatencia datos={muestras} demo={demo} />
        </PanelGrafico>

        <PanelGrafico
          titulo="Estado de los nodos"
          sub="Disponibilidad instantánea, no un SLA ni un histórico de caídas."
          className="jn-ancho-5"
          extra={<span className="jn-panel-etq mono">{vivos?.total != null ? `${vivos.total} vivos` : "sin dato"}</span>}
        >
          <GraficoNodos nodos={nodos} vivos={vivos} demo={demo} />
        </PanelGrafico>

        <PanelGrafico
          titulo="Topología del circuito"
          sub="Toca un nodo para inspeccionarlo. Los paquetes solo decoran el recorrido lógico; no se captura tráfico."
          className="jn-ancho-12"
          extra={<span className={`chip ${tele.activo ? "vivo" : "muerto"} mono`}>{tele.activo ? "ACTIVO" : "EN ESPERA"}</span>}
        >
          <Topologia
            circuito={demo ? [] : tele.circuito}
            saltos={demo ? (ultima?.saltos || []) : saltos}
            activo={demo ? true : tele.activo}
            demo={demo}
            altura={300}
          />
        </PanelGrafico>

        <PanelGrafico
          titulo="Tráfico de red"
          sub="Bytes de aplicación enviados y recibidos por las llamadas del panel. No es el tráfico de tu navegación."
          className="jn-ancho-7"
          extra={<span className="jn-panel-etq mono">API</span>}
        >
          <GraficoTrafico datos={muestras} demo={demo} />
        </PanelGrafico>

        <PanelGrafico
          titulo="Actividad de conexiones"
          sub="Acciones que has hecho en este navegador, agrupadas por media hora."
          className="jn-ancho-5"
          extra={<span className="jn-panel-etq mono">{actividad.length} eventos</span>}
        >
          <GraficoActividad eventos={actividad} demo={demo} />
        </PanelGrafico>

        <PanelGrafico
          titulo="Rendimiento de los tres saltos"
          sub={tele.circuito.length ? "Latencia publicada para cada nodo de tu circuito." : "Sin circuito activo: mostramos los nodos con mejor latencia medida."}
          className="jn-ancho-12"
          extra={!esPro ? <span className="chip mono">FREE</span> : null}
        >
          <GraficoBarrasSaltos saltos={saltos} demo={demo} />
          {ordenados.length > 0 && (
            <div className="jn-mini-tabla">
              {ordenados.map((n) => (
                <span key={n.nombre}>
                  <b className="mono">{n.nombre}</b>
                  <i className={`jn-punto ${n.estado === "vivo" ? "ok" : "mal"}`} aria-hidden />
                  <span className="mono">{n.ms != null ? `${n.ms} ms` : "sin medida"}</span>
                </span>
              ))}
            </div>
          )}
        </PanelGrafico>
      </div>

      <div className="jn-pie-datos">
        <span className="mono">última medida: {tele.ultima ? horaCorta(tele.ultima) : "—"}</span>
        <span className="mono">ventana solicitada: {rango} min</span>
        <span className="mono">el tráfico es de la API, no del proxy</span>
        <button className="btn" type="button" onClick={() => tele.mide()}>Medir ahora</button>
      </div>
      <p className="pu-nota">
        {yo?.activo
          ? `Circuito activo con ${yo?.circuito?.length || 0} saltos. Las latencias por nodo salen de la última sonda del servidor.`
          : "La red está apagada. Las métricas de la API se siguen midiendo; las de tus saltos aparecerán al conectar."}
        {" "}No inventamos disponibilidad ni tráfico del proxy: ese dato no lo expone el navegador.
      </p>
    </div>
  );
}

/* Vista compacta para el dashboard: solo lo imprescindible, con salida a la
   sección completa. Recibe las medidas que ya hace PanelDash para no duplicar
   peticiones a la API. */
export function VistazoRendimiento({ apiMs = [], lista = [], vivos = null, navega }) {
  const ahora = Date.now();
  const datos = useMemo(() => (apiMs || []).map((ms, i) => ({
    t: ahora - (apiMs.length - 1 - i) * 12000,
    ms,
    saltos: [],
  })), [apiMs, ahora]);
  const media = promedio(apiMs);
  const disponibles = lista.length
    ? Math.round((lista.filter((n) => n.estado === "vivo").length / lista.length) * 100)
    : null;

  return (
    <section className="jn-vistazo tarjeta" aria-labelledby="jn-vistazo-titulo">
      <header className="jn-vistazo-cab">
        <div>
          <span className="pu-kicker">telemetría de esta sesión</span>
          <h2 id="jn-vistazo-titulo">El pulso de tu red</h2>
        </div>
        <button className="btn primario" type="button" onClick={() => navega?.("estadisticas")}>
          Estadísticas y rendimiento <span aria-hidden>→</span>
        </button>
      </header>
      <div className="jn-vistazo-grid">
        <div className="jn-vistazo-grafico">
          <div className="jn-vistazo-etq"><span className="mono">respuesta de la API</span><b className="mono">{apiMs[apiMs.length - 1] ?? "—"} ms</b></div>
          <GraficoLatencia datos={datos} altura={150} compacto />
        </div>
        <div className="jn-vistazo-dona">
          <GraficoNodos nodos={lista} vivos={vivos} altura={150} />
        </div>
        <div className="jn-vistazo-kpis">
          <span><small className="mono">media</small><b className="mono">{media != null ? `${media} ms` : "—"}</b></span>
          <span><small className="mono">disponibilidad</small><b className="mono">{disponibles != null ? `${disponibles} %` : "—"}</b></span>
          <span><small className="mono">muestras</small><b className="mono">{apiMs.length}</b></span>
        </div>
      </div>
    </section>
  );
}
