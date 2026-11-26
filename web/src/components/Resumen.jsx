import { useEffect, useState } from "react";
import { nodos as nodosApi, nodosVivos } from "../lib/api.js";
import { leeActividad } from "../lib/actividad.js";
import { PROMO, copiarTexto } from "../lib/promo.js";
import { datosHoy, haceCuanto } from "../lib/fecha.js";
import { Stat } from "./Piezas.jsx";

/* Resumen del panel: la primera pantalla después de entrar.
   Mezcla datos reales de la cuenta y de la API con tres cosas locales:
   progreso de primeros pasos, actividad del navegador y el pase de
   lanzamiento. No inventa métricas: si la API no responde, lo dice. */

const CLAVE_COMPROBACION = "jumpernet-ip-comprobada";

function comprobacionHecha() {
  try { return !!localStorage.getItem(CLAVE_COMPROBACION); } catch { return false; }
}

export default function Resumen({ yo, setTab, aviso }) {
  const [red, setRed] = useState({ nodos: null, vivos: null, ms: null, fallo: false });
  const [actividad, setActividad] = useState(() => leeActividad(5));
  const [comprobada, setComprobada] = useState(comprobacionHecha);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    let t = 0;
    async function mide() {
      const t0 = performance.now();
      const [lista, vivos] = await Promise.allSettled([nodosApi(), nodosVivos()]);
      if (!vivo) return;
      setRed({
        nodos: lista.status === "fulfilled" ? lista.value : null,
        vivos: vivos.status === "fulfilled" ? vivos.value : null,
        ms: Math.round(performance.now() - t0),
        fallo: lista.status !== "fulfilled",
      });
      t = window.setTimeout(mide, 15000);
    }
    mide();
    const alVolver = () => {
      if (!document.hidden) mide();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      clearTimeout(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActividad(leeActividad(5));
      setComprobada(comprobacionHecha());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const activo = !!yo?.activo;
  const saltos = yo?.circuito?.length ? yo.circuito : [];
  const porNombre = new Map((red.nodos || []).map((n) => [n.nombre, n]));
  const latencias = saltos
    .map((n) => porNombre.get(n)?.ms)
    .filter((x) => typeof x === "number");
  const latenciaMedia = latencias.length
    ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length)
    : null;
  const totalNodos = red.vivos?.total
    ?? (Array.isArray(red.nodos) ? red.nodos.filter((n) => n.estado === "vivo").length : null);
  const equipos = red.vivos?.equipos;
  const nombre = yo?.alias || (yo?.email || "invitado").split("@")[0];
  const inicial = nombre.trim().charAt(0).toUpperCase();
  const hoy = datosHoy();
  const hora = new Date().getHours();
  const saludo = hora < 13 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches";
  const plan = yo?.plan || "free";

  const alta = yo?.alta ? new Date(yo.alta * 1000) : null;
  const dias = alta ? Math.max(1, Math.floor((Date.now() - alta.getTime()) / 86400000)) : null;

  const pasos = [
    {
      id: "perfil",
      t: "Completa tu perfil",
      d: yo?.alias ? `te verás como ${yo.alias}` : "pon un alias para que el panel sea tuyo",
      hecho: !!yo?.alias,
      cta: "Editar perfil",
      tab: "cuenta",
    },
    {
      id: "red",
      t: "Enciende tu circuito",
      d: activo ? "la red está viva ahora mismo" : "elige tres nodos y abre el circuito",
      hecho: activo || !!yo?.ultimo_cambio,
      cta: activo ? "Gestionar red" : "Abrir el interruptor",
      tab: "red",
    },
    {
      id: "comprobar",
      t: "Comprueba la IP de salida",
      d: comprobada ? "ya lanzaste una comprobación real" : "mira qué IP ve el destino al salir",
      hecho: comprobada,
      cta: "Comprobar ahora",
      tab: "red",
    },
  ];
  const completos = pasos.filter((p) => p.hecho).length;

  async function copiaCodigo() {
    const ok = await copiarTexto(PROMO.codigo);
    if (ok) {
      setCopiado(true);
      aviso?.(`código ${PROMO.codigo} copiado ✓`, "ok");
      window.setTimeout(() => setCopiado(false), 2400);
    } else {
      aviso?.(`no se pudo copiar; el código es ${PROMO.codigo}`, "error");
    }
  }

  return (
    <div className="pn-rv">
      <header className="pn-rv-cab">
        <div className="pn-rv-cab-txt">
          <span className="pn-kicker">resumen / {hoy.dia} {hoy.numero} de {hoy.mes}</span>
          <h1 className="pn-rv-h1">
            {saludo}, <em>{nombre}</em>.<br />
            <span>Tu red, de un vistazo.</span>
          </h1>
          <p className="nota pn-rv-sub">
            {activo
              ? "El circuito está en marcha. Aquí tienes el estado, lo que toca hacer y un atajo a cada herramienta."
              : "Todo listo y apagado. Empieza por lo que necesites: el interruptor, una comprobación real o tu perfil."}
          </p>
          <div className="pn-rv-cab-chips">
            <span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "RED ACTIVA" : "RED OFF"}</span>
            <span className="chip mono">plan {plan}</span>
            <span className="chip mono">API {red.ms != null ? `${red.ms} ms` : "…"}</span>
            {dias != null && <span className="chip mono">{dias} día{dias === 1 ? "" : "s"} en la red</span>}
          </div>
        </div>

        <div className={`pn-rv-avatar ${activo ? "on" : ""}`} aria-hidden="true">
          <span className="pn-rv-avatar-aro a" />
          <span className="pn-rv-avatar-aro b" />
          <span className="pn-rv-avatar-inicial">{inicial}</span>
          <span className="pn-rv-avatar-pie mono">{activo ? "en línea" : "en espera"}</span>
        </div>
      </header>

      <section className={`pn-rv-circuito tarjeta ${activo ? "on" : "off"}`} aria-label="Tu circuito ahora mismo">
        <div className="pn-rv-circuito-cab">
          <div>
            <span className="pn-kicker">tu circuito</span>
            <h2 className="pn-rv-h2">{activo ? "Tres relés, en marcha" : "Tres relés, esperando"}</h2>
          </div>
          <div className="pn-rv-circuito-estado">
            {red.fallo
              ? <span className="chip muerto mono">API sin respuesta</span>
              : <span className="chip vivo mono"><span className="punto-vivo" /> live</span>}
            <span className="chip mono">{latenciaMedia != null ? `${latenciaMedia} ms` : "sin medida"}</span>
          </div>
        </div>

        <div className={`pn-rv-flujo ${activo ? "on" : ""}`}>
          <div className="pn-rv-riel" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="pn-rv-paradas">
            <div className="pn-rv-parada tu">
              <span className="mono">01</span>
              <b>TÚ</b>
              <small>{yo?.ip_real || "origen"}</small>
            </div>
            {(saltos.length ? saltos : ["nodo₁", "nodo₂", "nodo₃"]).map((nombreNodo, i) => {
              const nodo = porNombre.get(nombreNodo);
              return (
                <div className="pn-rv-parada" key={`${nombreNodo}-${i}`}>
                  <span className="mono">{String(i + 2).padStart(2, "0")}</span>
                  <b>{nombreNodo}</b>
                  <small>{nodo?.ms != null ? `${nodo.ms} ms` : i === 2 ? "exit" : "relé ciego"}</small>
                </div>
              );
            })}
            <div className="pn-rv-parada web">
              <span className="mono">05</span>
              <b>WEB</b>
              <small>{activo ? (yo?.ip_salida || "IP de salida") : "destino"}</small>
            </div>
          </div>
        </div>

        <div className="pn-rv-circuito-pie">
          <span className="nota">
            {activo
              ? "La IP que ve internet es la del último nodo, no la tuya. Cada salto recibe un sobre cerrado."
              : "Nada se conecta hasta que tú lo enciendas. El circuito se elige al pulsar el interruptor."}
          </span>
          <button type="button" className="btn" onClick={() => setTab("red")}>
            {activo ? "Abrir control de red" : "Encender la red"} <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      <div className="pn-rv-stats">
        <Stat etq="nodos vivos" val={totalNodos ?? "—"} pie={red.vivos ? `${red.vivos.infra} infra · ${equipos ?? 0} equipos` : "consultando la red"} tono="ok" />
        <Stat etq="latencia de tus saltos" val={latenciaMedia != null ? `${latenciaMedia} ms` : "—"} pie="TCP connect real" tono="info" />
        <Stat etq="tu plan" val={plan} pie={`hasta ${yo?.saltos_max || 3} saltos`} tono={plan === "free" ? "off" : "ok"} />
        <Stat etq="IP de salida" val={<span className="pn-rv-ip">{activo ? (yo?.ip_salida || "midiendo…") : "—"}</span>} pie={activo ? "la que ve el destino" : "red apagada"} tono="aviso" />
      </div>

      <div className="pn-rv-columnas">
        <section className="pn-rv-panel pn-rv-pasos" aria-labelledby="pn-rv-pasos-t">
          <div className="pn-rv-panel-cab">
            <div>
              <span className="pn-kicker">empieza por aquí</span>
              <h2 className="pn-rv-h2" id="pn-rv-pasos-t">Tus primeros pasos</h2>
            </div>
            <span className="pn-rv-cuenta mono">{completos}/{pasos.length}</span>
          </div>
          <div className="pn-rv-barra" role="progressbar" aria-valuemin="0" aria-valuemax={pasos.length} aria-valuenow={completos}>
            <i style={{ width: `${(completos / pasos.length) * 100}%` }} />
          </div>
          <ul className="pn-rv-lista-pasos">
            {pasos.map((p, i) => (
              <li key={p.id} className={p.hecho ? "hecho" : ""}>
                <span className="pn-rv-paso-n mono">{p.hecho ? "✓" : String(i + 1).padStart(2, "0")}</span>
                <span className="pn-rv-paso-txt"><b>{p.t}</b><small>{p.d}</small></span>
                <button type="button" className="pn-rv-paso-cta" onClick={() => setTab(p.tab)}>
                  {p.cta} <span aria-hidden>→</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="pn-rv-panel pn-rv-actividad" aria-labelledby="pn-rv-actividad-t">
          <div className="pn-rv-panel-cab">
            <div>
              <span className="pn-kicker">solo en este navegador</span>
              <h2 className="pn-rv-h2" id="pn-rv-actividad-t">Actividad reciente</h2>
            </div>
            <span className="pn-rv-latido" aria-hidden><i /></span>
          </div>
          {actividad.length ? (
            <ol className="pn-rv-log">
              {actividad.map((x, i) => (
                <li key={`${x.t}-${i}`} className={x.tipo === "error" ? "mal" : ""}>
                  <span className="mono">{haceCuanto(x.t)}</span>
                  <span>{x.texto}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="pn-rv-vacio">
              <span aria-hidden>◌</span>
              <p>Aún no hay movimientos. Enciende, gira o comprueba el circuito y lo verás aquí.</p>
              <button type="button" className="btn" onClick={() => setTab("red")}>Ir al panel de red</button>
            </div>
          )}
          <p className="pn-rv-nota-pie">Se guarda en este navegador; no viaja al servidor.</p>
        </aside>
      </div>

      <div className="pn-rv-columnas pn-rv-columnas-b">
        <section className="pn-rv-panel pn-rv-atajos" aria-labelledby="pn-rv-atajos-t">
          <div className="pn-rv-panel-cab">
            <div>
              <span className="pn-kicker">a un clic</span>
              <h2 className="pn-rv-h2" id="pn-rv-atajos-t">Atajos del panel</h2>
            </div>
          </div>
          <div className="pn-rv-atajos-grid">
            <button type="button" className="pn-rv-atajo" onClick={() => setTab("red")}>
              <span className="pn-rv-atajo-ico" aria-hidden>⏻</span>
              <span><b>{activo ? "Gestionar la red" : "Encender la red"}</b><small>interruptor, saltos y comprobación</small></span>
              <i aria-hidden>→</i>
            </button>
            <button type="button" className="pn-rv-atajo" onClick={() => setTab("nodos")}>
              <span className="pn-rv-atajo-ico" aria-hidden>⛓</span>
              <span><b>Ver todos los nodos</b><small>{totalNodos != null ? `${totalNodos} activos ahora` : "estado en vivo"}</small></span>
              <i aria-hidden>→</i>
            </button>
            <button type="button" className="pn-rv-atajo" onClick={() => setTab("descargas")}>
              <span className="pn-rv-atajo-ico" aria-hidden>⬇</span>
              <span><b>Descargar extensión</b><small>lleva el circuito a tu navegador</small></span>
              <i aria-hidden>→</i>
            </button>
            <button type="button" className="pn-rv-atajo" onClick={() => setTab("ajustes")}>
              <span className="pn-rv-atajo-ico" aria-hidden>✦</span>
              <span><b>Diseñar tu panel</b><small>colores, forma y tipografía</small></span>
              <i aria-hidden>→</i>
            </button>
          </div>
          <a className="pn-rv-lab" href="#/lab">
            <span className="mono" aria-hidden>⌘</span>
            <span><b>JumperNET Lab</b><small>consola, inspector y simulador de fallos</small></span>
            <span aria-hidden>↗</span>
          </a>
        </section>

        <aside className="pn-rv-promo" aria-labelledby="pn-rv-promo-t">
          <div className="pn-rv-promo-arte" aria-hidden="true">
            <span>10</span><i>%</i>
            <small>en Pro</small>
          </div>
          <span className="pn-kicker">pase de lanzamiento</span>
          <h2 className="pn-rv-h2" id="pn-rv-promo-t">Más saltos, mismo control.</h2>
          <p className="nota">
            Hasta 7 saltos, elección de circuito y refresco cada 10 h.
            Usa el código en la activación de Pro.
          </p>
          <button type="button" className="pn-rv-codigo" onClick={copiaCodigo}>
            <span className="mono">{PROMO.codigo}</span>
            <span>{copiado ? "copiado ✓" : "copiar"}</span>
          </button>
          <a className="pn-rv-promo-link" href="#/tarifas">Ver el plan Pro <span aria-hidden>→</span></a>
        </aside>
      </div>
    </div>
  );
}
