import { useEffect, useMemo, useRef, useState } from "react";
import { me, nodos, nodosVivos, salida, decodificaJwt, getToken, miNodo } from "../lib/api.js";
import { planDe, precioPro } from "../lib/planes.js";
import { leeLog } from "./PanelLog.js";
import { Stat } from "./Piezas.jsx";

/* Dashboard del área privada.
 *
 * Todo lo que se ve aquí sale de /me, /nodos, /nodosvivos o /salida. No hay
 * latencias, disponibilidades ni IPs inventadas: cuando una medida no existe
 * se dice «sin medida». Las animaciones representan el estado real de la
 * cuenta (activa o en espera), no una conexión simulada.
 */

function useReloj(ms = 1000) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return ahora;
}

function duracion(ms) {
  if (ms == null || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min ${s % 60} s`;
}

export function CircuitoVivo({ circuito = [], activo = false, max = 3, compacto = false }) {
  const nombres = circuito.length ? circuito : Array.from({ length: Math.max(3, Math.min(7, max)) }, (_, i) => `nodo${i + 1}`);
  const n = nombres.length;
  const W = 720;
  const H = compacto ? 150 : 210;
  const pad = 64;
  const paso = (W - pad * 2) / Math.max(1, n - 1);
  const pts = nombres.map((nombre, i) => ({
    nombre,
    x: pad + paso * i,
    y: H / 2 + (n > 4 && i > 0 && i < n - 1 ? (i % 2 ? 18 : -18) : 0),
  }));
  const ruta = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const id = useRef(`vivo-${Math.random().toString(36).slice(2)}`).current;

  return (
    <div className={`pu-circuito-vivo ${activo ? "on" : "off"} ${compacto ? "compacto" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={activo ? `Circuito activo con ${n} saltos: ${nombres.join(", ")}` : `Circuito en espera de ${n} saltos`}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="1">
            <stop offset="0%" stopColor="var(--acento-2)" />
            <stop offset="52%" stopColor="var(--acento-1)" />
            <stop offset="100%" stopColor="var(--acento-3)" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={ruta} className="pu-cv-pista" />
        <path d={ruta} className="pu-cv-pista-viva" stroke={`url(#${id}-g)`} />
        {activo && [0, 1, 2].map((k) => (
          <circle key={k} r="3.2" className="pu-cv-paquete" fill={`url(#${id}-g)`}>
            <animateMotion dur={`${3.2 + k * .7}s`} begin={`${k * 1.1}s`} repeatCount="indefinite" path={ruta} />
          </circle>
        ))}
        {pts.map((p, i) => {
          const entrada = i === 0;
          const exit = i === n - 1;
          return (
            <g key={`${p.nombre}-${i}`} className="pu-cv-nodo" style={{ "--i": i }}>
              <circle cx={p.x} cy={p.y} r="18" className="pu-cv-halo" />
              <circle cx={p.x} cy={p.y} r="6.5" className="pu-cv-punto" filter={`url(#${id}-glow)`} />
              <text x={p.x} y={p.y - 27} textAnchor="middle" className="pu-cv-rol mono">
                {entrada ? "entrada" : exit ? "salida" : `relé ${i}`}
              </text>
              <text x={p.x} y={p.y + 38} textAnchor="middle" className="pu-cv-nombre mono">
                {p.nombre.length > 15 ? p.nombre.slice(0, 14) + "…" : p.nombre}
              </text>
            </g>
          );
        })}
        <text x={pts[0].x} y={H - 9} textAnchor="middle" className="pu-cv-extremo mono">TÚ</text>
        <text x={pts[pts.length - 1].x} y={H - 9} textAnchor="middle" className="pu-cv-extremo mono">INTERNET</text>
      </svg>
      <div className="pu-cv-pie mono">
        <span className={`pu-cv-estado ${activo ? "on" : ""}`}><i /> {activo ? "circuito establecido" : "circuito en espera"}</span>
        <span>{n} relés · {activo ? "tráfico cifrado por capas" : "no conecta nada"}</span>
      </div>
    </div>
  );
}

export function Chispa({ valores = [], etiqueta = "latencia de la API", sufijo = "ms" }) {
  const v = valores.filter((n) => Number.isFinite(n));
  const ult = v.length ? v[v.length - 1] : null;
  const max = v.length ? Math.max(...v) : null;
  const min = v.length ? Math.min(...v) : null;
  const media = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  const W = 300, H = 74;
  const pts = v.map((n, i) => [
    (i / Math.max(1, v.length - 1)) * W,
    H - 8 - ((n - min) / Math.max(1, max - min)) * (H - 20),
  ]);
  const linea = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = pts.length > 1 ? `${linea} L${W} ${H} L0 ${H} Z` : "";

  return (
    <div className="pu-chispa">
      <div className="pu-chispa-cab">
        <span className="mono">{etiqueta}</span>
        <b className="mono">{ult != null ? `${ult} ${sufijo}` : "sin medida"}</b>
      </div>
      {v.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="pu-chispa-svg" role="img"
          aria-label={`${etiqueta}: ahora ${ult} ${sufijo}, media ${media}, mínimo ${min}, máximo ${max}`}>
          <path d={area} className="pu-chispa-area" />
          <path d={linea} className="pu-chispa-linea" />
        </svg>
      ) : (
        <div className="pu-chispa-vacia mono">recogiendo medidas reales…</div>
      )}
      <div className="pu-chispa-pie mono">
        <span>media <b>{media ?? "—"}</b></span>
        <span>mín. <b>{min ?? "—"}</b></span>
        <span>máx. <b>{max ?? "—"}</b></span>
        <span>{v.length} medidas</span>
      </div>
    </div>
  );
}

function Tarjeta({ id, titulo, extra, className = "", children }) {
  return (
    <section className={`pu-bento ${className}`} data-tarjeta={id}>
      <header className="pu-bento-cab">
        <h2>{titulo}</h2>
        {extra}
      </header>
      {children}
    </section>
  );
}

export default function PanelDash({ yo, plan, variante = "inicio", prefs, navega, aviso }) {
  const [cuenta, setCuenta] = useState(yo);
  const [vivos, setVivos] = useState(null);
  const [lista, setLista] = useState([]);
  const [apiMs, setApiMs] = useState([]);
  const [ipSalida, setIpSalida] = useState(null);
  const [error, setError] = useState("");
  const ahora = useReloj(1000);

  useEffect(() => {
    let vivo = true;
    async function mide() {
      const t0 = performance.now();
      try {
        const [d, ns, vv] = await Promise.all([
          me(),
          nodos().catch(() => []),
          nodosVivos().catch(() => null),
        ]);
        if (!vivo) return;
        setCuenta(d);
        setLista(Array.isArray(ns) ? ns : []);
        setVivos(vv);
        setApiMs((m) => [...m.slice(-39), Math.round(performance.now() - t0)]);
        setError("");
        if (d?.activo) {
          const s = await salida().catch(() => null);
          if (vivo) setIpSalida(s?.ip_salida || d?.ip_salida || null);
        } else {
          setIpSalida(null);
        }
      } catch (e) {
        if (!vivo) return;
        setError(e.message || "API no disponible");
        setApiMs((m) => [...m.slice(-39), Math.round(performance.now() - t0)]);
      }
    }
    mide();
    const id = setInterval(mide, variante === "inicio" ? 12000 : 7000);
    return () => { vivo = false; clearInterval(id); };
  }, [variante]);

  const planActual = planDe(cuenta || yo);
  const activo = !!cuenta?.activo;
  const circuito = cuenta?.circuito || [];
  const porNombre = useMemo(() => new Map(lista.map((n) => [n.nombre, n])), [lista]);
  const latencias = circuito.map((n) => porNombre.get(n)?.ms).filter((n) => Number.isFinite(n));
  const latMedia = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;
  const nombre = cuenta?.alias || (cuenta?.email || "tú").split("@")[0];
  const jwt = decodificaJwt(getToken() || "");
  const sesionMin = jwt?.cuerpo?.exp ? Math.max(0, Math.round((jwt.cuerpo.exp * 1000 - ahora) / 60000)) : null;
  const desde = cuenta?.ultimo_cambio ? cuenta.ultimo_cambio * 1000 : null;
  const conectado = activo && desde ? Math.max(0, ahora - desde) : 0;
  const cadaH = cuenta?.refresco_cada_h || (planActual.id === "free" ? 24 : 10);
  const proximo = desde ? desde + cadaH * 3600000 : null;
  const refresco = activo && proximo ? Math.max(0, proximo - ahora) : null;
  const log = leeLog();
  const max = Math.max(3, Number(planActual.saltosMax || cuenta?.saltos_max || 3));
  const esPro = planActual.id === "pro" || planActual.id === "empresarial";
  const orden = Array.isArray(prefs?.orden) ? prefs.orden : ["circuito", "red", "metricas", "sesion", "accesos"];
  const ocultas = new Set(prefs?.ocultas || []);
  const tarjetas = orden.filter((id) => !ocultas.has(id));

  const ir = (id) => navega?.(id);

  const acceso = (id, txt, ico) => (
    <button key={id} type="button" className="pu-acceso" onClick={() => ir(id)}>
      <span aria-hidden>{ico}</span>
      <b>{txt}</b>
      <i aria-hidden>→</i>
    </button>
  );

  const contenido = {
    circuito: (
      <Tarjeta key="circuito" id="circuito" titulo="Circuito" className="pu-bento-circuito"
        extra={<span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "ESTABLECIDO" : "EN ESPERA"}</span>}>
        <CircuitoVivo circuito={circuito} activo={activo} max={max} compacto={variante === "inicio"} />
        <div className="pu-bento-acciones">
          <button className="btn primario" type="button" onClick={() => ir("red")}>
            {activo ? "Gestionar la conexión" : "Activar la red"} <span aria-hidden>→</span>
          </button>
          <button className="btn" type="button" onClick={() => ir("circuito")}>Ver mi circuito</button>
        </div>
      </Tarjeta>
    ),
    red: (
      <Tarjeta key="red" id="red" titulo="Estado de la red"
        extra={error ? <span className="chip muerto mono">API sin respuesta</span> : <span className="etiqueta-viva">● en vivo</span>}>
        <div className="pu-datos">
          <span><small>nodos vivos</small><b className="mono">{vivos?.total ?? "…"}</b><i>{vivos ? `${vivos.infra} infra · ${vivos.equipos} equipos` : "midiendo"}</i></span>
          <span><small>tus saltos</small><b className="mono">{activo ? `${circuito.length} / ${max}` : `máx. ${max}`}</b><i>{activo ? "en uso ahora" : "sin circuito"}</i></span>
          <span><small>IP de salida</small><b className="mono pu-ip">{activo ? (ipSalida || cuenta?.ip_salida || "midiendo…") : "—"}</b><i>{activo ? "la que ve internet" : "red apagada"}</i></span>
          <span><small>cifrado</small><b className="mono">JENC</b><i>ChaCha20-Poly1305</i></span>
        </div>
        {activo && (
          <div className="pu-red-pie mono">
            <span>conectado desde hace {duracion(conectado)}</span>
            <span>próximo refresco {refresco ? duracion(refresco) : "—"}</span>
          </div>
        )}
        <p className="pu-nota">Cada salto es un relé lógico de la red, no una ubicación geográfica. Más saltos no equivalen automáticamente a más seguridad.</p>
      </Tarjeta>
    ),
    metricas: (
      <Tarjeta key="metricas" id="metricas" titulo={esPro ? "Rendimiento medido" : "Pulso de la API"}
        extra={esPro ? <button className="btn" type="button" onClick={() => ir("monitor")}>Monitor completo</button> : null}>
        <Chispa valores={apiMs} etiqueta="respuesta de la API" />
        <div className="pu-mini-metricas">
          <span><small>latencia media de tus saltos</small><b className="mono">{latMedia != null ? `${latMedia} ms` : "sin medida"}</b></span>
          <span><small>medidas de esta sesión</small><b className="mono">{apiMs.length}</b></span>
        </div>
        {!esPro && <p className="pu-nota">El monitor histórico, la disponibilidad por nodo y la comparación de circuitos son herramientas Pro. No rellenamos huecos con cifras de ejemplo.</p>}
      </Tarjeta>
    ),
    sesion: (
      <Tarjeta key="sesion" id="sesion" titulo="Sesión y plan"
        extra={<span className={`chip ${esPro ? "acento" : ""} mono`}>{planActual.nombre.toUpperCase()}{planActual.demo ? " · DEMO" : ""}</span>}>
        <div className="pu-datos dos">
          <span><small>sesión</small><b className="mono">{sesionMin != null ? `${sesionMin} min` : "—"}</b><i>JWT restante</i></span>
          <span><small>máximo contratado</small><b className="mono">{max} saltos</b><i>{esPro ? "puedes usar de 3 a " + max : "3 fijos"}</i></span>
          <span><small>plan</small><b>{planActual.nombre}{planActual.demo ? " · demo" : ""}</b><i>{esPro ? `${precioPro(max)} €/mes` : "0 € para siempre"}</i></span>
          <span><small>refresco</small><b className="mono">{cadaH} h</b><i>{activo ? (refresco ? `quedan ${duracion(refresco)}` : "disponible ahora") : "al conectar"}</i></span>
        </div>
        {planActual.demo && (
          <p className="pu-nota pu-nota-aviso">
            Vista previa local. Los permisos reales de la red siguen viniendo del backend ({cuenta?.saltos_max || 3} saltos).
            <button type="button" className="btn" onClick={() => ir("plan")}>Ver mi plan</button>
          </p>
        )}
      </Tarjeta>
    ),
    accesos: (
      <Tarjeta key="accesos" id="accesos" titulo="Accesos rápidos">
        <div className="pu-accesos">
          {acceso("red", "Panel de red", "◉")}
          {acceso("nodos", esPro ? "Gestor de nodos" : "Nodos disponibles", "⛓")}
          {acceso("ip", "Comprobar mi IP", "◎")}
          {acceso("diagnostico", "Diagnóstico", "⌁")}
          {esPro ? acceso("explorer", "Network Explorer", "◈") : acceso("mejorar", "Descubrir Pro", "⚡")}
          {esPro ? acceso("disenador", "Diseñar circuito", "✦") : acceso("guias", "Guías", "▤")}
        </div>
      </Tarjeta>
    ),
  };

  if (variante === "inicio") {
    return (
      <div className="pu-dash pu-dash-inicio">
        <header className="pu-hero">
          <div>
            <span className="pu-kicker">panel / inicio · {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })}</span>
            <h1>Hola, <em>{nombre}</em>.<br />Tu red, a tu ritmo.</h1>
            <p>
              {activo
                ? "El circuito está vivo. Aquí tienes el estado real de tu conexión y lo que puedes hacer ahora."
                : "Todo listo y apagado. Enciende cuando quieras: la red elegirá los nodos, cifrará cada salto y tú mantendrás el control."}
            </p>
            <div className="pu-hero-chips">
              <span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "RED ACTIVA" : "RED OFF"}</span>
              <span className={`chip ${esPro ? "acento" : ""} mono`}>plan {planActual.nombre.toLowerCase()}{planActual.demo ? " · demo" : ""}</span>
              <span className="chip mono">{max} saltos máx.</span>
            </div>
          </div>
          <div className="pu-hero-medidor">
            <div className={`pu-orbe ${activo ? "on" : ""}`} aria-hidden><i /><i /><i /><b>{activo ? circuito.length : 0}</b></div>
            <span className="mono">{activo ? "saltos en uso" : "sin conexión"}</span>
          </div>
        </header>

        <div className="pu-bento-grid">
          {tarjetas.slice(0, 4).map((id) => contenido[id])}
          <Tarjeta id="actividad" titulo="Actividad de esta sesión" className="pu-bento-actividad">
            {log.length ? (
              <ol className="pu-log">
                {log.slice(0, 4).map((x, i) => (
                  <li key={`${x.t}-${i}`} className={x.tipo === "error" ? "mal" : ""}>
                    <span className="mono">{new Date(x.t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{x.texto}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pu-nota">Aquí aparecerán los encendidos, giros y apagados que hagas. Se guarda solo en este navegador; nada viaja al servidor.</p>
            )}
            <div className="pu-bento-acciones">
              <button className="btn" type="button" onClick={() => ir("control")}>Abrir panel de control</button>
              <button className="btn" type="button" onClick={() => ir("novedades")}>Ver novedades</button>
            </div>
          </Tarjeta>
        </div>

        <div className="pu-accesos-inicio">
          {contenido.accesos}
        </div>

        <p className="pu-pie-nota mono">
          no se guarda historial de navegación · las métricas sin medida se muestran como «—» · las simulaciones van etiquetadas
        </p>
      </div>
    );
  }

  const esCentro = variante === "centro";
  return (
    <div className={`pu-dash ${esCentro ? "pu-dash-centro" : "pu-dash-control"}`}>
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / {esCentro ? "centro de control" : "control"} · {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })}</span>
          <h1>{esCentro ? "Todo tu circuito, en una vista." : "El estado real de tu red."}</h1>
          <p>
            {esCentro
              ? "Telemetría medida, nodos de tu circuito y personalización de las tarjetas. Sin métricas de relleno."
              : "Datos de la API, del circuito y de tu cuenta. Si algo no se puede medir, lo verás como «sin medida»."}
          </p>
        </div>
        <div className="pu-cab-acciones">
          {esPro && <button className="btn" type="button" onClick={() => ir("dashboard")}>Personalizar dashboard</button>}
          <button className="btn primario" type="button" onClick={() => ir("red")}>Panel de red</button>
        </div>
      </header>

      <div className="pu-bento-grid">
        {tarjetas.map((id) => contenido[id])}
        {esCentro && (
          <Tarjeta id="nodos-circuito" titulo="Nodos de tu circuito" className="pu-bento-nodos">
            {circuito.length ? (
              <div className="pu-nodos-lista">
                {circuito.map((n, i) => {
                  const nodo = porNombre.get(n);
                  return (
                    <div key={`${n}-${i}`} className="pu-nodo-fila">
                      <span className="pu-nodo-orden mono">{String(i + 1).padStart(2, "0")}</span>
                      <b className="mono">{n}</b>
                      <span className="pu-nodo-rol">{i === circuito.length - 1 ? "salida" : i === 0 ? "entrada" : "relé ciego"}</span>
                      <span className={`chip mono ${nodo?.ms == null ? "" : nodo.ms < 80 ? "vivo" : "aviso"}`}>
                        {nodo?.ms != null ? `${nodo.ms} ms` : "sin medida"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pu-vacio">
                <b>No hay un circuito activo.</b>
                <p>Cuando enciendas la red, aquí verás cada salto con la latencia real que mide el servidor.</p>
                <button className="btn primario" type="button" onClick={() => ir("red")}>Activar la red</button>
              </div>
            )}
          </Tarjeta>
        )}
      </div>

      {esCentro && (
        <div className="pu-centro-pie">
          <span className="mono">medido ahora · {new Date(ahora).toLocaleTimeString("es-ES")}</span>
          <span className="mono">{vivos?.validados != null ? `${vivos.validados} nodos validados por sonda TCP` : "validación de nodos en curso"}</span>
          <button className="btn" type="button" onClick={() => ir("monitor")}>Abrir monitor de rendimiento</button>
        </div>
      )}
    </div>
  );
}

/* ── notificaciones: derivadas del estado real, sin avisos falsos ─────── */
export function Notificaciones({ yo, plan, navega }) {
  const activo = !!yo?.activo;
  const demo = !!plan?.demo;
  const max = plan?.saltosMax || yo?.saltos_max || 3;
  const avisos = [
    {
      id: "red",
      tono: activo ? "ok" : "info",
      titulo: activo ? "Tu circuito está establecido" : "La red está en espera",
      texto: activo
        ? `Tienes ${yo?.circuito?.length || 0} saltos activos y el próximo refresco depende de tu plan (${yo?.refresco_cada_h || (plan?.id === "free" ? 24 : 10)} h).`
        : "Nada se conecta hasta que pulses el interruptor. Puedes revisar nodos y diagnóstico sin activar la red.",
      accion: ["Abrir panel de red", "red"],
    },
    {
      id: "plan",
      tono: demo ? "aviso" : plan?.id === "free" ? "info" : "ok",
      titulo: demo ? "Estás viendo Pro en modo demo" : plan?.id === "free" ? "Plan Free activo" : `Plan ${plan?.nombre || "Pro"} activo`,
      texto: demo
        ? "La demo es local y no cambia los permisos reales del backend. Puedes recorrer las herramientas Pro con datos reales de tu cuenta."
        : plan?.id === "free"
          ? "Tu panel incluye las herramientas básicas. Pro añade más pestañas, control del circuito y herramientas avanzadas."
          : `Máximo contratado: ${max} saltos. Puedes usar circuitos de 3 a ${max} sin volver a pagar.`,
      accion: [plan?.id === "free" ? "Ver planes" : "Mi plan", plan?.id === "free" ? "mejorar" : "plan"],
    },
    {
      id: "seguridad",
      tono: "info",
      titulo: "Cifrado JENC en cada salto",
      texto: "ChaCha20-Poly1305 y reenvío ciego. Más saltos añaden intermediarios y latencia; no se venden como «más seguros» por sí solos.",
      accion: ["Centro de seguridad", plan?.id === "free" ? "diagnostico" : "seguridad"],
    },
    {
      id: "privacidad",
      tono: "ok",
      titulo: "Sin historial de navegación",
      texto: "JumperNET no guarda qué webs visitas ni tus destinos. La actividad del panel vive solo en este navegador.",
      accion: ["Ver privacidad", "perfil"],
    },
  ];

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / notificaciones</span>
          <h1>Avisos de tu cuenta</h1>
          <p>Solo mostramos cosas que podemos comprobar con tu sesión o con la configuración de la red.</p>
        </div>
      </header>
      <div className="pu-avisos">
        {avisos.map((a) => (
          <article key={a.id} className={`pu-aviso ${a.tono}`}>
            <span className="pu-aviso-punto" aria-hidden />
            <div>
              <b>{a.titulo}</b>
              <p>{a.texto}</p>
            </div>
            <button className="btn" type="button" onClick={() => navega?.(a.accion[1])}>{a.accion[0]} →</button>
          </article>
        ))}
      </div>
      <p className="pu-nota">Los avisos de pago o de cambios de plan llegarían aquí cuando exista una pasarela conectada. No inventamos notificaciones de cobros.</p>
    </div>
  );
}

export function Novedades({ navega, plan }) {
  const cambios = [
    {
      v: "2.1", f: "esta versión",
      t: "Precios por saltos y paneles separados",
      d: "El Pro se configura con 3–7 saltos, el carrito guarda el tamaño elegido y el backend valida el importe. Free y Pro tienen navegación y herramientas propias.",
      etiquetas: ["precios", "panel", "carrito"],
    },
    {
      v: "2.0", f: "documentación",
      t: "Documentación y guías nuevas",
      d: "La documentación del proyecto se reorganizó en guías de instalación, red, seguridad y uso. Enlazada desde el panel y desde la web.",
      etiquetas: ["docs", "guías"],
    },
    {
      v: "1.9", f: "panel",
      t: "Circuito en vivo y diagnóstico",
      d: "El panel muestra la latencia real por salto, el estado de los nodos y una comprobación de IP contra el destino.",
      etiquetas: ["red", "diagnóstico"],
    },
  ];
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / novedades</span>
          <h1>Lo que acaba de cambiar</h1>
          <p>Un registro breve y honesto de las mejoras del proyecto. Sin fechas inventadas ni funciones que todavía no existen.</p>
        </div>
        {plan?.id === "free" && <button className="btn primario" type="button" onClick={() => navega?.("mejorar")}>Descubrir Pro →</button>}
      </header>
      <div className="pu-timeline">
        {cambios.map((c) => (
          <article key={c.v} className="pu-cambio">
            <div className="pu-cambio-marca mono">
              <b>v{c.v}</b><span>{c.f}</span>
            </div>
            <div>
              <h2>{c.t}</h2>
              <p>{c.d}</p>
              <div className="pu-etiquetas">{c.etiquetas.map((e) => <span key={e} className="mono">{e}</span>)}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
