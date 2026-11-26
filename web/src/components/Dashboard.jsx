import { useEffect, useRef, useState } from "react";
import {
  me, conectar, desconectar_, rotar, nodos as nodosApi,
  nodosVivos, salida,
} from "../lib/api.js";
import { planDe, puede } from "../lib/planes.js";
import { estadoSuscripcion, formateaFecha } from "../lib/suscripcion.js";
import { FeedNotificaciones } from "./Notificaciones.jsx";
import { abreCarrito } from "../lib/carrito.js";
import { apuntaActividad } from "../lib/actividad.js";
import { creaNotif } from "../lib/notificaciones.js";
import { datosHoy } from "../lib/fecha.js";

/* Inicio del área privada: menos texto, más señal.
 *
 * Las seis fases del interruptor son las llamadas reales al backend; si
 * /connect falla, la fase falla y la red NO se pinta como conectada. Los
 * anillos y contadores solo animan números que vienen de la API.
 */

const FASES = [
  { t: "Inicialización", d: "Sesión y cuenta" },
  { t: "Disponibilidad", d: "Nodos vivos" },
  { t: "Selección", d: "Relés del circuito" },
  { t: "Circuito", d: "Ruta extremo a extremo" },
  { t: "Cifrado", d: "Capas JENC" },
  { t: "Confirmación", d: "Estado del servidor" },
];

const CLAVE_UI = "jumpernet-dashboard-v1";

function leeUI() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_UI) || "{}");
    return { denso: !!d.denso, ocultas: Array.isArray(d.ocultas) ? d.ocultas : [] };
  } catch { return { denso: false, ocultas: [] }; }
}

/* Contador que sube al valor nuevo (solo números reales de la API). */
function useNumero(valor, ms = 700) {
  const [n, setN] = useState(typeof valor === "number" ? valor : 0);
  const previo = useRef(typeof valor === "number" ? valor : 0);
  useEffect(() => {
    if (typeof valor !== "number" || Number.isNaN(valor)) return undefined;
    const desde = previo.current;
    const hasta = valor;
    previo.current = valor;
    if (desde === hasta) { setN(hasta); return undefined; }
    const t0 = performance.now();
    let raf = 0;
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(desde + (hasta - desde) * e));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, ms]);
  return n;
}

function Anillo({ pct = 0, tam = 118, grosor = 8, tono = "teal", etiqueta, children }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const seguro = Math.max(0, Math.min(1, pct));
  return (
    <div className={`jns-anillo tono-${tono}`} style={{ width: tam, height: tam }}>
      <svg viewBox={`0 0 ${tam} ${tam}`} aria-hidden>
        <circle className="jns-anillo-pista" cx={tam / 2} cy={tam / 2} r={r} strokeWidth={grosor} />
        <circle className="jns-anillo-valor" cx={tam / 2} cy={tam / 2} r={r} strokeWidth={grosor}
          strokeDasharray={c} strokeDashoffset={c * (1 - seguro)} />
      </svg>
      <div className="jns-anillo-centro">{children}</div>
      {etiqueta && <span className="jns-anillo-etq mono">{etiqueta}</span>}
    </div>
  );
}

export default function Dashboard({ yo: yo0, setTab, alRecargar, aviso, irSeccion }) {
  const [yo, setYo] = useState(yo0);
  const [ui, setUi] = useState(leeUI);
  const [fase, setFase] = useState(null);
  const [fallo, setFallo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nodosv, setNodosv] = useState(null);
  const [lista, setLista] = useState([]);
  const [ipSalida, setIpSalida] = useState(null);
  const [apiMs, setApiMs] = useState(null);
  const [seg, setSeg] = useState(0);
  const vivo = useRef(true);

  const activo = !!yo?.activo;
  const plan = planDe(yo?.plan);
  const susc = estadoSuscripcion(yo);
  const hoy = datosHoy();
  const nombre = yo?.alias || (yo?.email || "invitado").split("@")[0];
  const hora = new Date().getHours();
  const saludo = hora < 6 ? "Buenas noches" : hora < 13 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches";

  useEffect(() => { setYo(yo0); }, [yo0]);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useEffect(() => {
    try { localStorage.setItem(CLAVE_UI, JSON.stringify(ui)); } catch { /* privado */ }
  }, [ui]);

  useEffect(() => {
    let cancelado = false;
    async function carga() {
      const t0 = performance.now();
      const [vivos, ns] = await Promise.allSettled([nodosVivos(), nodosApi()]);
      if (cancelado) return;
      setApiMs(Math.round(performance.now() - t0));
      setNodosv(vivos.status === "fulfilled" ? vivos.value : null);
      setLista(ns.status === "fulfilled" ? ns.value : []);
    }
    carga();
    const id = window.setInterval(carga, 15000);
    return () => { cancelado = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelado = false;
    if (!activo) { setIpSalida(null); return undefined; }
    salida()
      .then((d) => { if (!cancelado) setIpSalida(d?.ip_salida || null); })
      .catch(() => { /* se queda «midiendo» */ });
    return () => { cancelado = true; };
  }, [activo, yo?.ultimo_cambio]);

  useEffect(() => {
    if (!activo || !yo?.ultimo_cambio) { setSeg(0); return undefined; }
    const calcula = () => setSeg(Math.max(0, Math.floor(Date.now() / 1000) - Number(yo.ultimo_cambio)));
    calcula();
    const id = window.setInterval(calcula, 1000);
    return () => clearInterval(id);
  }, [activo, yo?.ultimo_cambio]);

  const visible = (id) => !ui.ocultas.includes(id);
  const alterna = (id) => setUi((u) => ({
    ...u,
    ocultas: u.ocultas.includes(id) ? u.ocultas.filter((x) => x !== id) : [...u.ocultas, id],
  }));

  async function conecta() {
    setOcupado(true);
    setFallo("");
    try {
      setFase(0);
      await me();
      if (!vivo.current) return;
      setFase(1);
      await nodosVivos();
      if (!vivo.current) return;
      setFase(2);
      await new Promise((r) => window.setTimeout(r, 340));
      setFase(3);
      await conectar(null, "todos");
      if (!vivo.current) return;
      setFase(4);
      await new Promise((r) => window.setTimeout(r, 280));
      setFase(5);
      const conf = await me();
      if (!vivo.current) return;
      if (!conf?.activo) throw new Error("el servidor no confirma la conexión");

      setYo(conf);
      alRecargar?.(conf);
      apuntaActividad(`red conectada · ${conf.circuito?.length || 3} saltos`);
      creaNotif({
        cat: "red",
        titulo: "Red conectada",
        texto: `Circuito abierto con ${conf.circuito?.length || 3} saltos. La IP de salida la confirma el servidor.`,
        href: "#/panel",
      });
      aviso?.("red conectada y confirmada por el servidor", "ok");
      window.setTimeout(() => { if (vivo.current) setFase(null); }, 850);
    } catch (e) {
      if (!vivo.current) return;
      setFallo(e.message || "no se pudo conectar");
      apuntaActividad(`fallo al conectar: ${e.message}`, "error");
      creaNotif({ cat: "red", titulo: "No se pudo conectar", texto: e.message || "Error desconocido", href: "#/panel" });
      aviso?.(`fallo al conectar: ${e.message}`, "error");
      setFase(null);
    } finally {
      if (vivo.current) setOcupado(false);
    }
  }

  async function desconecta() {
    setOcupado(true);
    try {
      await desconectar_();
      const conf = await me();
      setYo(conf);
      alRecargar?.(conf);
      setFase(null);
      apuntaActividad("red desconectada");
      creaNotif({ cat: "red", titulo: "Red desconectada", texto: "El circuito está cerrado. No hay tráfico saliendo por él.", href: "#/panel" });
      aviso?.("red desconectada", "ok");
    } catch (e) {
      aviso?.(e.message, "error");
    } finally { setOcupado(false); }
  }

  async function gira() {
    setOcupado(true);
    try {
      await rotar();
      const conf = await me();
      setYo(conf);
      alRecargar?.(conf);
      apuntaActividad("circuito girado: nuevos relés");
      aviso?.("circuito girado", "ok");
    } catch (e) { aviso?.(e.message, "error"); }
    finally { setOcupado(false); }
  }

  const saltos = yo?.circuito || [];
  const porNombre = new Map(lista.map((n) => [n.nombre, n]));
  const latencias = saltos.map((n) => porNombre.get(n)?.ms).filter((x) => typeof x === "number");
  const latMedia = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;
  const vivos = nodosv?.total ?? (lista.length ? lista.filter((n) => n.estado === "vivo").length : null);
  const maxSaltos = yo?.saltos_max || 3;
  const fasesVisibles = fase != null;
  const tiempo = `${String(Math.floor(seg / 3600)).padStart(2, "0")}:${String(Math.floor((seg % 3600) / 60)).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;

  const vivosNum = useNumero(vivos);
  const latNum = useNumero(latMedia);
  const msNum = useNumero(apiMs);

  return (
    <div className={`jns-dash${ui.denso ? " denso" : ""}`}>
      <header className="jns-dash-cab">
        <div>
          <span className="jns-kicker">{hoy.dia} {hoy.numero} de {hoy.mes}</span>
          <h1>{saludo}, <em>{nombre}</em>.</h1>
          <p className="jns-dash-linea">
            <span className={`jns-linea-punto${activo ? " on" : ""}`} aria-hidden />
            {activo ? `Red en marcha · ${saltos.length} relés` : "Red apagada · nada sale de tu equipo"}
          </p>
        </div>

        <Anillo
          pct={activo ? ((seg % 3600) / 3600) : 0}
          etiqueta={activo ? "sesión" : "en espera"}
          tono={activo ? "teal" : "gris"}
        >
          <b className="mono">{activo ? tiempo : "OFF"}</b>
          <small>{activo ? "activa" : "seguro"}</small>
        </Anillo>
      </header>

      <div className="jns-bento">
        {/* ── interruptor ── */}
        <section className={`jns-card jns-hero ancha${activo ? " on" : " off"}`} style={{ "--i": 0 }} id="jns-sec-circuito">
          <div className="jns-hero-cab">
            <div>
              <span className="jns-kicker">interruptor maestro</span>
              <h2>{activo ? "La red está en marcha" : "Todo listo para despegar"}</h2>
            </div>
            <span className={`jns-chip ${activo ? "vivo" : ""} mono`}>{activo ? "ON" : "OFF"}</span>
          </div>

          <div className="jns-hero-cuerpo">
            <div className={`jns-orbe${activo || fasesVisibles ? " on" : ""}`} aria-hidden>
              <i className="a" /><i className="b" /><i className="c" />
              <span className="jns-orbe-nucleo">
                {activo ? saltos.length : fasesVisibles ? <span className="spin" /> : "0"}
                <small>{activo ? "saltos" : "relés"}</small>
              </span>
            </div>

            <div className="jns-hero-switch">
              <button
                type="button"
                className={`jns-switch${activo ? " on" : ""}${ocupado ? " ocupado" : ""}`}
                onClick={activo ? desconecta : conecta}
                disabled={ocupado}
                aria-pressed={activo}
                aria-label={activo ? "Desconectar la red" : "Conectar la red"}
              >
                <span className="jns-switch-bola" />
              </button>
              <div className="jns-hero-estado">
                <b>{ocupado ? "Trabajando…" : activo ? "Conectado" : "Desconectado"}</b>
                <small>{activo ? "confirmado por el servidor" : "pulsa para abrir un circuito"}</small>
              </div>
            </div>

            <div className="jns-hero-mini">
              <span><b className="mono">{plan.ico} {plan.nombre}</b><small>tu plan</small></span>
              <span><b className="mono">{vivos != null ? vivosNum : "—"}</b><small>nodos vivos</small></span>
              <span><b className="mono">{saltos.length}/{maxSaltos}</b><small>saltos</small></span>
            </div>
          </div>

          {fasesVisibles && (
            <div className="jns-fases-caja">
              <div className="jns-fases-barra" aria-hidden>
                <i style={{ width: `${((fase + 1) / FASES.length) * 100}%` }} />
              </div>
              <ol className="jns-fases" aria-live="polite">
                {FASES.map((f, i) => {
                  const estadoFase = i < fase ? "hecha" : i === fase ? "curso" : "espera";
                  return (
                    <li key={f.t} className={estadoFase}>
                      <span className="jns-fase-marca mono" aria-hidden>
                        {estadoFase === "hecha" ? "✓" : estadoFase === "curso" ? <span className="spin" /> : String(i + 1).padStart(2, "0")}
                      </span>
                      <span><b>{f.t}</b><small>{f.d}</small></span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {fallo && !fasesVisibles && <p className="jns-error-caja" role="alert">⚠ {fallo}</p>}

          {activo && !fasesVisibles && (
            <>
              <div className="jns-circuito" aria-label="Circuitos activos">
                <span className="jns-circuito-tu mono">TÚ</span>
                <div className="jns-circuito-riel" aria-hidden><i /><i /><i /></div>
                <div className="jns-circuito-saltos">
                  {saltos.map((n, i) => (
                    <div key={n + i} className="jns-nodo-mini">
                      <span className="jns-nodo-punto" aria-hidden />
                      <b className="mono">{n}</b>
                      <small>{i === saltos.length - 1 ? "exit" : i === 0 ? "entrada" : "ciego"}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="jns-datos">
                <div><span className="mono">IP de salida</span><b className="mono">{yo?.ip_salida || ipSalida || "midiendo…"}</b></div>
                <div><span className="mono">latencia</span><b className="mono">{latMedia != null ? `${latNum} ms` : "—"}</b></div>
                <div><span className="mono">cifrado</span><b>JENC</b></div>
                <div><span className="mono">proxy</span><b className="mono">SOCKS5 :1080</b></div>
              </div>

              <div className="jns-card-acciones">
                <button type="button" className="jns-btn" onClick={gira} disabled={ocupado}>🌀 Cambiar relés</button>
                <button type="button" className="jns-btn" onClick={() => (irSeccion ? irSeccion("red", "diagnostico") : setTab("red"))}>◈ Diagnóstico</button>
                <button type="button" className="jns-btn peligro" onClick={desconecta} disabled={ocupado}>⏻ Desconectar</button>
              </div>
            </>
          )}

          {!activo && !fasesVisibles && (
            <p className="jns-mini">
              Al encender, el servidor elige los nodos y abre la ruta. Si algo falla se dice aquí:
              nunca se pinta una conexión que el backend no haya confirmado.
            </p>
          )}
        </section>

        {/* ── plan ── */}
        <section className={`jns-card jns-plan-tile tono-${plan.tono}`} style={{ "--i": 1 }}>
          <div className="jns-card-cab">
            <span className="jns-kicker">tu plan</span>
            <span className={`jns-chip ${susc.estado === "activo" ? "vivo" : susc.estado === "pendiente" ? "aviso" : ""}`}>{susc.etiqueta}</span>
          </div>
          <div className="jns-plan-fila">
            <Anillo pct={saltos.length / maxSaltos} tam={92} grosor={7} tono={plan.tono === "pro" ? "ambar" : "teal"}>
              <b className="mono">{saltos.length || 0}/{maxSaltos}</b>
              <small>saltos</small>
            </Anillo>
            <div>
              <h2>{plan.ico} {plan.nombre}</h2>
              <span className="jns-mini mono">{plan.precioTexto} · {plan.periodo}</span>
            </div>
          </div>
          <p className="jns-mini jns-plan-nota">
            {plan.id === "free" ? "3 saltos fijos. Sube a Pro para elegir hasta 7." : plan.exclusivo[0]}
          </p>
          <div className="jns-plan-mini-acciones">
            <button type="button" className="jns-btn primario" onClick={() => setTab("suscripcion")}>Gestionar</button>
            <a className="jns-btn" href="#/tarifas">Mejorar</a>
          </div>
          {susc.renueva && <p className="jns-mini">Renueva el <b>{formateaFecha(susc.renueva)}</b></p>}
        </section>

        {/* ── nodos + servicio ── */}
        <section className="jns-card" style={{ "--i": 2 }}>
          <div className="jns-card-cab">
            <div><span className="jns-kicker">en vivo</span><h2>Nodos</h2></div>
            <span className={`jns-chip ${nodosv ? "vivo" : "aviso"} mono`}>{vivos != null ? vivosNum : "—"} vivos</span>
          </div>
          <ul className="jns-nodos-lista">
            {(saltos.length ? saltos : lista.slice(0, 3).map((n) => n.nombre)).map((nombreNodo, i) => {
              const n = porNombre.get(nombreNodo);
              return (
                <li key={nombreNodo + i}>
                  <span className="jns-nodo-punto" aria-hidden />
                  <b className="mono">{nombreNodo}</b>
                  <small>{n?.ms != null ? `${n.ms} ms` : n?.estado || "sin medida"}</small>
                </li>
              );
            })}
          </ul>
          <div className="jns-servicio mono">
            <span><i className={apiMs != null ? "ok" : "mal"} /> API {msNum != null ? `${msNum} ms` : "…"}</span>
            <span><i className={activo ? "ok" : "neutro"} /> cifrado {activo ? "activo" : "listo"}</span>
          </div>
          <button type="button" className="jns-link" onClick={() => setTab("nodos")}>Ver gestor de nodos →</button>
        </section>

        {/* ── IP ── */}
        {visible("sesion") && (
          <section className="jns-card" style={{ "--i": 3 }} id="jns-sec-ip">
            <span className="jns-kicker">tu conexión</span>
            <h2>IP de origen y salida</h2>
            <div className="jns-ips">
              <div><span className="mono">origen</span><b className="mono">{yo?.ip_real || "—"}</b></div>
              <span className="jns-ips-flecha" aria-hidden>→</span>
              <div><span className="mono">destino</span><b className="mono">{activo ? (yo?.ip_salida || ipSalida || "…") : "—"}</b></div>
            </div>
            <p className="jns-mini">{activo ? "Internet ve la IP del nodo de salida." : "Con la red apagada usas tu IP real."}</p>
            <button type="button" className="jns-btn" onClick={() => (irSeccion ? irSeccion("red", "ip") : setTab("red"))}>Comprobar de verdad</button>
          </section>
        )}

        {/* ── atajos ── */}
        {visible("atajos") && (
          <section className="jns-card" style={{ "--i": 4 }}>
            <span className="jns-kicker">a un clic</span>
            <h2>Accesos rápidos</h2>
            <div className="jns-atajos">
              <button type="button" onClick={() => setTab("nodos")}><span aria-hidden>⛓</span><b>Nodos</b></button>
              <button type="button" onClick={() => abreCarrito()}><span aria-hidden>▱</span><b>Carrito</b></button>
              <button type="button" onClick={() => setTab("soporte")}><span aria-hidden>✉</span><b>Soporte</b></button>
              <button type="button" className={puede(yo, "personalizacion") ? "" : "bloqueada"} onClick={() => setTab("ajustes")}>
                <span aria-hidden>{puede(yo, "personalizacion") ? "✦" : "🔒"}</span><b>Apariencia</b>
              </button>
            </div>
          </section>
        )}

        {/* ── avisos ── */}
        {visible("avisos") && (
          <section className="jns-card" style={{ "--i": 5 }}>
            <FeedNotificaciones limite={2} onVerTodas={() => setTab("notificaciones")} />
          </section>
        )}

        {/* ── seguridad ── */}
        {visible("seguridad") && (
          <section className="jns-card" style={{ "--i": 6 }} id="jns-sec-cifrado">
            <div className="jns-card-cab">
              <div><span className="jns-kicker">seguridad</span><h2>Siempre contigo</h2></div>
              <span className="jns-chip mono">JENC</span>
            </div>
            <ul className="jns-lista-ok compacta">
              <li><span aria-hidden>✓</span>ChaCha20-Poly1305 por salto</li>
              <li><span aria-hidden>✓</span>Sin historial de webs ni destinos</li>
              <li><span aria-hidden>✓</span>Apagado y comprobación en todos los planes</li>
            </ul>
          </section>
        )}
      </div>

      <section className="jns-personaliza" aria-label="Personalizar el panel">
        <div>
          <span className="jns-kicker">personalización</span>
          <b>Ajusta el panel a tu manera</b>
        </div>
        <div className="jns-personaliza-acciones">
          <button type="button" className={`jns-toggle ${ui.denso ? "on" : ""}`} onClick={() => setUi((u) => ({ ...u, denso: !u.denso }))} aria-pressed={ui.denso}>
            <span aria-hidden>{ui.denso ? "▤" : "▦"}</span> {ui.denso ? "Compacta" : "Amplia"}
          </button>
          {[["sesion", "IP"], ["atajos", "Atajos"], ["avisos", "Avisos"], ["seguridad", "Seguridad"]].map(([id, t]) => (
            <button key={id} type="button" className={`jns-toggle ${visible(id) ? "on" : ""}`} onClick={() => alterna(id)} aria-pressed={visible(id)}>
              {visible(id) ? "◉" : "○"} {t}
            </button>
          ))}
          <button type="button" className="jns-link" onClick={() => setUi({ denso: false, ocultas: [] })}>Restaurar</button>
        </div>
      </section>
    </div>
  );
}
