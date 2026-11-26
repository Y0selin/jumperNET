import { useEffect, useMemo, useRef, useState } from "react";
import { me, nodos, nodosVivos, salida } from "../lib/api.js";
import { precioPro, SALTOS_MIN, SALTOS_MAX, normalizaSaltos } from "../lib/planes.js";
import {
  usePrefCircuito, guardaPrefCircuito, leeCircuitosGuardados, guardaCircuitosGuardados,
  usePrefsPanel, PREFS_DEFECTO,
} from "../lib/panel.jsx";
import CircuitoPlan from "./CircuitoPlan.jsx";
import { CircuitoVivo, Chispa } from "./PanelDash.jsx";

/* Herramientas avanzadas de Pro. Todas usan datos reales cuando existen y
   marcan como simulación lo que es una simulación. */

const euros = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/* ── Network Explorer ─────────────────────────────────────────────────── */
export function NetworkExplorer({ yo, plan, aviso }) {
  const [lista, setLista] = useState([]);
  const [vivos, setVivos] = useState(null);
  const [modo, setModo] = useState("constelacion");
  const [filtro, setFiltro] = useState("vivos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState(null);
  const max = Math.max(3, plan?.saltosMax || yo?.saltos_max || 3);

  useEffect(() => {
    let vivo = true;
    async function trae() {
      try {
        const [ns, vv] = await Promise.all([nodos(), nodosVivos().catch(() => null)]);
        if (!vivo) return;
        setLista(Array.isArray(ns) ? ns : []);
        setVivos(vv);
      } catch (e) { if (vivo) aviso?.(e.message, "error"); }
    }
    trae();
    const id = setInterval(trae, 10000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  const circuito = yo?.circuito || [];
  const visibles = useMemo(() => {
    let l = [...lista];
    if (filtro === "vivos") l = l.filter((n) => n.estado === "vivo");
    if (filtro === "usuarios") l = l.filter((n) => (n.tipo || "infra") === "usuario");
    if (filtro === "circuito") l = l.filter((n) => circuito.includes(n.nombre));
    const q = busca.trim().toLowerCase();
    if (q) l = l.filter((n) => [n.nombre, n.alias, n.direccion].filter(Boolean).join(" ").toLowerCase().includes(q));
    return l.sort((a, b) => Number(circuito.includes(b.nombre)) - Number(circuito.includes(a.nombre))).slice(0, 32);
  }, [lista, filtro, busca, circuito.join()]);

  const enCirculo = useMemo(() => {
    const W = 760, H = 440, cx = W / 2, cy = H / 2, r = Math.min(W, H) * .34;
    return visibles.map((n, i) => {
      const angle = (i / Math.max(1, visibles.length)) * Math.PI * 2 - Math.PI / 2;
      const radio = circuito.includes(n.nombre) ? r * .62 : r;
      return { ...n, x: cx + Math.cos(angle) * radio, y: cy + Math.sin(angle) * radio };
    });
  }, [visibles, circuito.join()]);

  const pos = new Map(enCirculo.map((n) => [n.nombre, n]));
  const aristas = circuito.map((n, i) => i ? [pos.get(circuito[i - 1]), pos.get(n)] : null).filter((x) => x && x[0] && x[1]);

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / network explorer</span>
          <h1>La red, como un mapa</h1>
          <p>Explora los nodos registrados y las conexiones de tu circuito. Los nodos sin latencia aparecen como «sin medida», no con cifras de ejemplo.</p>
        </div>
        <span className="chip acento mono">{vivos?.total != null ? `${vivos.total} nodos vivos` : "midiendo…"}</span>
      </header>

      <div className="pu-explorer-barra">
        <div className="pu-tabs-mini" role="group" aria-label="Modo de visualización">
          {[["constelacion", "Constelación"], ["circuito", "Mi circuito"], ["tabla", "Tabla"]].map(([id, t]) => (
            <button key={id} type="button" className={modo === id ? "on" : ""} onClick={() => setModo(id)}>{t}</button>
          ))}
        </div>
        <select className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar nodos">
          <option value="vivos">solo vivos</option>
          <option value="todos">todos</option>
          <option value="usuarios">equipos de usuarios</option>
          <option value="circuito">mi circuito</option>
        </select>
        <input className="campo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar nodo…" aria-label="Buscar nodo" />
      </div>

      {modo === "tabla" ? (
        <div className="pu-tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>nodo</th><th>tipo</th><th>estado</th><th>latencia</th><th>conexiones</th><th>en tu circuito</th></tr></thead>
            <tbody>
              {visibles.map((n) => (
                <tr key={n.nombre}>
                  <td><b className="mono">{n.nombre}</b>{n.alias ? <span className="pu-nota"> · {n.alias}</span> : null}</td>
                  <td>{(n.tipo || "infra") === "usuario" ? "equipo de usuario" : "infraestructura"}</td>
                  <td><span className={`chip ${n.estado === "vivo" ? "vivo" : "muerto"} mono`}>{n.estado}</span></td>
                  <td className="mono">{n.ms != null ? `${n.ms} ms` : "sin medida"}</td>
                  <td className="mono">{n.conexiones ?? 0}</td>
                  <td>{circuito.includes(n.nombre) ? <span className="chip acento mono">sí · {circuito.indexOf(n.nombre) + 1}</span> : "—"}</td>
                </tr>
              ))}
              {!visibles.length && <tr><td colSpan="6" className="pu-nota">no hay nodos con ese filtro</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pu-explorer-escena">
          <svg viewBox="0 0 760 440" role="img" aria-label="Mapa de nodos y conexiones">
            <defs>
              <radialGradient id="pu-explorador-glow">
                <stop offset="0%" stopColor="var(--acento-2)" stopOpacity=".22" />
                <stop offset="100%" stopColor="var(--acento-2)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="380" cy="220" r="205" fill="url(#pu-explorador-glow)" />
            {aristas.map((a, i) => (
              <line key={i} x1={a[0].x} y1={a[0].y} x2={a[1].x} y2={a[1].y} className="pu-explorador-arista" />
            ))}
            {enCirculo.map((n) => {
              const enRuta = circuito.includes(n.nombre);
              return (
                <g key={n.nombre} className={`pu-explorador-nodo ${enRuta ? "ruta" : ""}`} onClick={() => setSel(n)} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSel(n); }}
                  role="button" aria-label={`${n.nombre}, ${n.estado}, ${n.ms != null ? n.ms + " ms" : "sin medida"}`}>
                  <circle cx={n.x} cy={n.y} r={enRuta ? 12 : 8} />
                  <text x={n.x} y={n.y - 16} textAnchor="middle" className="mono">{(n.nombre || "").slice(0, 12)}</text>
                </g>
              );
            })}
          </svg>
          <div className="pu-explorer-detalle">
            {sel ? (
              <>
                <span className="pu-kicker">nodo seleccionado</span>
                <h2 className="mono">{sel.nombre}</h2>
                <div className="pu-datos dos">
                  <span><small>estado</small><b>{sel.estado}</b><i>heartbeat</i></span>
                  <span><small>latencia</small><b className="mono">{sel.ms != null ? `${sel.ms} ms` : "sin medida"}</b><i>TCP connect</i></span>
                  <span><small>conexiones</small><b className="mono">{sel.conexiones ?? 0}</b><i>reenviando</i></span>
                  <span><small>dirección</small><b className="mono">{sel.direccion || "—"}</b><i>interna</i></span>
                </div>
                <p className="pu-nota">{circuito.includes(sel.nombre) ? `Es el salto ${circuito.indexOf(sel.nombre) + 1} de tu circuito.` : "No forma parte de tu circuito actual."}</p>
              </>
            ) : (
              <div className="pu-vacio">
                <b>Toca un nodo.</b>
                <p>Verás su estado, latencia medida y si forma parte de tu ruta.</p>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="pu-nota">Máximo {max} saltos contratados. El mapa no guarda historial de navegación ni posiciones geográficas: los nodos son relés lógicos.</p>
    </div>
  );
}

/* ── diseñador de circuitos ───────────────────────────────────────────── */
export function DisenadorCircuitos({ yo, plan, aviso, navega }) {
  const max = Math.max(3, Math.min(7, plan?.saltosMax || yo?.saltos_max || 3));
  const [pref, guarda] = usePrefCircuito(yo);
  const [saltos, setSaltos] = useState(pref.saltos);
  const [modo, setModo] = useState(pref.modo);
  const [guardados, setGuardados] = useState(leeCircuitosGuardados);

  useEffect(() => {
    setSaltos(Math.min(pref.saltos, max));
    setModo(pref.modo);
  }, [max]);

  function guardarPreset() {
    const nombre = `Circuito ${saltos} · ${modo === "externos" ? "solo externos" : "todos"}`;
    const nuevo = [{ id: Date.now(), nombre, saltos, modo }, ...guardados.filter((g) => !(g.saltos === saltos && g.modo === modo))].slice(0, 8);
    guardaCircuitosGuardados(nuevo);
    setGuardados(nuevo);
    aviso?.("circuito guardado en este navegador", "ok");
  }

  function aplicar() {
    guarda({ saltos, modo });
    aviso?.(`se aplicará al conectar: ${saltos} saltos · ${modo === "externos" ? "solo externos" : "todos"}`, "ok");
    navega?.("red");
  }

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / diseñador</span>
          <h1>Diseña tu circuito</h1>
          <p>Elige un tamaño entre 3 y {max} saltos y el modo de selección. Guardar o aplicar aquí no cobra nada y no cambia el circuito hasta que conectes.</p>
        </div>
        <span className="chip mono">{max} saltos contratados</span>
      </header>
      <div className="pu-disenador">
        <section className="tarjeta">
          <div className="pu-control">
            <label><span>Saltos</span><b className="mono">{saltos}</b>
              <input type="range" min={SALTOS_MIN} max={max} value={saltos} onChange={(e) => setSaltos(Number(e.target.value))} />
              <small>sin coste adicional dentro de tu suscripción</small>
            </label>
            <label><span>Modo</span>
              <select className="campo" value={modo} onChange={(e) => setModo(e.target.value)}>
                <option value="todos">todos los nodos</option>
                <option value="externos">solo equipos externos validados</option>
              </select>
              <small>{modo === "externos" ? "puede haber menos nodos disponibles" : "infraestructura y equipos de usuarios"}</small>
            </label>
          </div>
          <CircuitoPlan saltos={saltos} tono="pro" max={max} etiqueta={false} />
          <div className="pu-bento-acciones">
            <button className="btn primario" type="button" onClick={aplicar}>Aplicar al panel de red</button>
            <button className="btn" type="button" onClick={guardarPreset}>Guardar configuración</button>
          </div>
        </section>
        <aside className="tarjeta pu-disenador-lado">
          <span className="pu-kicker">resumen</span>
          <div className="pu-datos">
            <span><small>circuito</small><b className="mono">{saltos} saltos</b><i>{modo === "externos" ? "solo externos" : "todos"}</i></span>
            <span><small>contratado</small><b className="mono">{max}</b><i>tu máximo actual</i></span>
            <span><small>coste ahora</small><b>0 €</b><i>dentro de tu plan</i></span>
          </div>
          {plan?.demo && <p className="pu-nota pu-nota-aviso">Demo local: el backend real sigue limitando los saltos. La configuración se guarda, pero la red no aceptará más de lo permitido por tu cuenta real.</p>}
          <p className="pu-nota">Más saltos añaden intermediarios y latencia. El cifrado es idéntico en todos los tamaños.</p>
        </aside>
      </div>
      {guardados.length > 0 && (
        <section className="tarjeta">
          <h2 className="seccion">Guardados en este navegador</h2>
          <div className="pu-guardados">
            {guardados.map((g) => (
              <div key={g.id} className="pu-guardado">
                <b>{g.nombre}</b>
                <span className="mono">{g.saltos} saltos · {g.modo}</span>
                <button className="btn" type="button" onClick={() => { setSaltos(g.saltos); setModo(g.modo); }}>Cargar</button>
              </div>
            ))}
          </div>
          <p className="pu-nota">Solo guardamos tamaño y modo. No se guardan nodos concretos ni historial de navegación.</p>
        </section>
      )}
    </div>
  );
}

/* ── mis circuitos ────────────────────────────────────────────────────── */
export function MisCircuitos({ yo, plan, aviso, navega }) {
  const [guardados, setGuardados] = useState(leeCircuitosGuardados);
  const [pref, guarda] = usePrefCircuito(yo);
  const activo = !!yo?.activo;

  function borrar(id) {
    const nuevo = guardados.filter((g) => g.id !== id);
    guardaCircuitosGuardados(nuevo);
    setGuardados(nuevo);
  }

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / mis circuitos</span>
          <h1>Tu circuito actual y tus ajustes</h1>
          <p>El circuito activo sale del backend. Los guardados son solo tamaño y modo, viven en este navegador y no contienen historial de navegación.</p>
        </div>
        <span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "CONECTADO" : "EN ESPERA"}</span>
      </header>

      <section className="tarjeta">
        <h2 className="seccion">Ahora mismo</h2>
        <CircuitoVivo circuito={yo?.circuito || []} activo={activo} max={plan?.saltosMax || yo?.saltos_max || 3} />
        <div className="pu-datos">
          <span><small>estado</small><b>{activo ? "activo" : "apagado"}</b><i>{activo ? "tráfico por el circuito" : "sin tráfico"}</i></span>
          <span><small>saltos</small><b className="mono">{yo?.circuito?.length || 0} / {plan?.saltosMax || yo?.saltos_max || 3}</b><i>en uso</i></span>
          <span><small>IP de salida</small><b className="mono">{activo ? (yo?.ip_salida || "midiendo") : "—"}</b><i>la que ve internet</i></span>
          <span><small>modo</small><b>{yo?.modo === "externos" ? "solo externos" : "todos"}</b><i>al conectar</i></span>
        </div>
        <div className="pu-bento-acciones">
          <button className="btn primario" type="button" onClick={() => navega?.("red")}>Abrir panel de red</button>
          <button className="btn" type="button" onClick={() => navega?.("disenador")}>Diseñar otro circuito</button>
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="seccion">Configuraciones guardadas</h2>
        {guardados.length ? (
          <div className="pu-guardados">
            {guardados.map((g) => (
              <div key={g.id} className="pu-guardado">
                <b>{g.nombre}</b>
                <span className="mono">{g.saltos} saltos · {g.modo}</span>
                <div className="pu-bento-acciones">
                  <button className="btn" type="button" onClick={() => { guarda({ saltos: g.saltos, modo: g.modo }); aviso?.("configuración cargada; se aplicará al conectar", "ok"); }}>Aplicar</button>
                  <button className="btn" type="button" onClick={() => borrar(g.id)}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pu-vacio">
            <b>No has guardado configuraciones.</b>
            <p>Puedes crear una en el diseñador y aplicarla cuando quieras. No guardaremos destinos ni webs visitadas.</p>
            <button className="btn primario" type="button" onClick={() => navega?.("disenador")}>Abrir diseñador</button>
          </div>
        )}
        <p className="pu-nota">La configuración elegida ({pref.saltos} saltos) se aplica la próxima vez que conectes. El backend sigue mandando sobre el máximo real.</p>
      </section>
    </div>
  );
}

/* ── monitor de rendimiento ───────────────────────────────────────────── */
export function MonitorRendimiento({ yo, plan, aviso }) {
  const [api, setApi] = useState([]);
  const [lista, setLista] = useState([]);
  const [vivos, setVivos] = useState(null);
  const [error, setError] = useState("");
  const [pausa, setPausa] = useState(false);
  const [cuando, setCuando] = useState(null);

  useEffect(() => {
    let vivo = true;
    async function mide() {
      if (pausa) return;
      const t0 = performance.now();
      try {
        const [d, ns, vv] = await Promise.all([me(), nodos(), nodosVivos().catch(() => null)]);
        if (!vivo) return;
        setApi((a) => [...a.slice(-59), Math.round(performance.now() - t0)]);
        setLista(Array.isArray(ns) ? ns : []);
        setVivos(vv);
        setCuando(new Date());
        setError("");
        if (d) { /* la cuenta se refresca en el panel; aquí solo medimos */ }
      } catch (e) { if (vivo) setError(e.message); }
    }
    mide();
    const id = setInterval(mide, 6000);
    return () => { vivo = false; clearInterval(id); };
  }, [pausa]);

  const circuito = yo?.circuito || [];
  const nodosRuta = circuito.map((n) => lista.find((x) => x.nombre === n)).filter(Boolean);
  const latencias = nodosRuta.map((n) => n.ms).filter((n) => Number.isFinite(n));
  const media = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;
  const vivosN = vivos?.total || 0;
  const disponibles = lista.length ? Math.round((lista.filter((n) => n.estado === "vivo").length / lista.length) * 100) : null;
  const activo = !!yo?.activo;

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / monitor</span>
          <h1>Rendimiento de la sesión</h1>
          <p>Solo métricas reales medidas desde tu navegador y por el servidor. No guardamos un histórico ni inventamos disponibilidad.</p>
        </div>
        <div className="pu-cab-acciones">
          <button className="btn" type="button" onClick={() => setPausa((p) => !p)}>{pausa ? "Reanudar" : "Pausar"}</button>
          <span className={`chip ${error ? "muerto" : "vivo"} mono`}>{error ? "API con error" : "midiendo"}</span>
        </div>
      </header>

      <div className="pu-bento-grid">
        <section className="tarjeta pu-monitor-principal">
          <Chispa valores={api} etiqueta="respuesta de la API" />
          <div className="pu-datos dos">
            <span><small>latencia media de tus saltos</small><b className="mono">{media != null ? `${media} ms` : "sin medida"}</b><i>TCP connect</i></span>
            <span><small>nodos vivos</small><b className="mono">{vivos?.total ?? "…"}</b><i>{vivos ? `${vivos.infra} infra · ${vivos.equipos} equipos` : "midiendo"}</i></span>
            <span><small>disponibilidad de la red</small><b className="mono">{disponibles != null ? `${disponibles} %` : "sin medida"}</b><i>nodos vivos / registrados</i></span>
            <span><small>última medida</small><b className="mono">{cuando ? cuando.toLocaleTimeString("es-ES") : "—"}</b><i>esta sesión</i></span>
          </div>
          {!api.length && <p className="pu-nota">Sin medidas todavía. El gráfico se llena con respuestas reales de la API.</p>}
        </section>

        <section className="tarjeta">
          <h2 className="seccion">Saltos de tu circuito</h2>
          {circuito.length ? (
            <div className="pu-barras">
              {circuito.map((n, i) => {
                const nodo = lista.find((x) => x.nombre === n);
                const ms = nodo?.ms;
                return (
                  <div key={`${n}-${i}`} className="pu-barra">
                    <div><b className="mono">{n}</b><span className="mono">{ms != null ? `${ms} ms` : "sin medida"}</span></div>
                    <i style={{ width: ms != null ? `${Math.min(100, Math.max(6, 100 - ms / 2))}%` : "0%" }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pu-vacio"><b>Sin circuito activo.</b><p>Activa la red para medir cada salto.</p></div>
          )}
          <p className="pu-nota">{activo ? "Los valores salen de la última sonda del servidor." : "La red está apagada; las métricas de la API siguen disponibles."}</p>
        </section>

        <section className="tarjeta">
          <h2 className="seccion">Nodos medidos</h2>
          <div className="pu-tabla-envoltura">
            <table className="tabla">
              <thead><tr><th>nodo</th><th>estado</th><th>latencia</th><th>conexiones</th></tr></thead>
              <tbody>
                {lista.filter((n) => n.estado === "vivo").slice(0, 12).map((n) => (
                  <tr key={n.nombre}><td className="mono">{n.nombre}</td><td><span className="chip vivo mono">vivo</span></td><td className="mono">{n.ms != null ? `${n.ms} ms` : "sin medida"}</td><td className="mono">{n.conexiones ?? 0}</td></tr>
                ))}
                {!lista.filter((n) => n.estado === "vivo").length && <tr><td colSpan="4" className="pu-nota">sin nodos vivos medidos</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="pu-nota">Se actualiza cada 6 s. No se almacena fuera de esta pestaña.</p>
        </section>
      </div>
      {error && <p className="pu-error">No se pudo medir: {error}</p>}
      <p className="pu-nota">La disponibilidad es la proporción de nodos vivos registrados en este instante, no un SLA ni un histórico de caídas.</p>
    </div>
  );
}

/* ── centro de seguridad ──────────────────────────────────────────────── */
export function CentroSeguridad({ yo, plan }) {
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const activo = !!yo?.activo;

  async function comprobar() {
    setCargando(true);
    try {
      const [d, v, s] = await Promise.all([me(), nodosVivos().catch(() => null), salida().catch(() => null)]);
      setRes({ cuenta: d, vivos: v, salida: s, fecha: new Date() });
    } catch (e) { setRes({ error: e.message }); }
    finally { setCargando(false); }
  }
  useEffect(() => { comprobar(); }, []);

  const cifrado = [
    ["Algoritmo declarado", "ChaCha20-Poly1305 (JENC)", "según la implementación del proyecto"],
    ["Capa por salto", "Sí · reenvío ciego", "cada relé recibe un sobre cifrado"],
    ["Salida permitida", "80 / 443", "no se abre tráfico arbitrario"],
    ["Historial de navegación", "No se guarda", "regla del proyecto"],
  ];

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / seguridad</span>
          <h1>Lo que protege y lo que no</h1>
          <p>Estado de la configuración comprobable de tu cuenta. Sin puntuaciones de seguridad inventadas y sin prometer anonimato absoluto.</p>
        </div>
        <button className="btn primario" type="button" onClick={comprobar} disabled={cargando}>{cargando ? "comprobando…" : "Volver a comprobar"}</button>
      </header>

      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Cifrado y proxy</h2>
          <div className="pu-tabla-datos">
            {cifrado.map(([k, v, d]) => (
              <div key={k}><dt>{k}</dt><dd><b>{v}</b><span>{d}</span></dd></div>
            ))}
          </div>
          <p className="pu-nota">Más saltos no significan automáticamente más seguridad. El cifrado es el mismo en Free y en Pro.</p>
        </section>
        <section className="tarjeta">
          <h2 className="seccion">Tu configuración</h2>
          <div className="pu-datos dos">
            <span><small>red</small><b>{activo ? "activa" : "apagada"}</b><i>{activo ? `${yo?.circuito?.length || 0} saltos` : "sin tráfico"}</i></span>
            <span><small>plan</small><b>{plan?.nombre || yo?.plan}</b><i>máximo {plan?.saltosMax || yo?.saltos_max} saltos</i></span>
            <span><small>IP de salida</small><b className="mono">{activo ? (yo?.ip_salida || "midiendo") : "—"}</b><i>la que ve internet</i></span>
            <span><small>proxy</small><b className="mono">1080</b><i>jumpernet.duckdns.org</i></span>
          </div>
          {res?.error && <p className="pu-error">{res.error}</p>}
          {res && !res.error && (
            <div className="pu-checks">
              <span className={res.cuenta?.id ? "ok" : "mal"}>✓ sesión válida</span>
              <span className={res.vivos?.total > 0 ? "ok" : "mal"}>✓ nodos vivos: {res.vivos?.total ?? "sin dato"}</span>
              <span className={res.salida?.ip_salida ? "ok" : "aviso"}>✓ salida: {res.salida?.ip_salida || "red apagada"}</span>
              <span className="ok">✓ sin historial de navegación</span>
              <span className="mono">medido {res.fecha?.toLocaleTimeString("es-ES")}</span>
            </div>
          )}
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="seccion">Comprobaciones de privacidad disponibles</h2>
        <div className="pu-lista-hechos">
          <span>✓ Tu IP real y la de salida se muestran por separado.</span>
          <span>✓ La comprobación de IP hace una petición real por el proxy y no guarda la contraseña.</span>
          <span>✓ Los nodos de tu circuito se pueden inspeccionar sin revelar destinos.</span>
          <span>✓ El panel no almacena webs visitadas ni contenido de comunicaciones.</span>
          <span>○ La verificación de fugas DNS depende del navegador o del sistema, no de esta web.</span>
          <span>○ No hay auditoría externa ni certificación de anonimato.</span>
        </div>
      </section>
    </div>
  );
}

/* ── personalizar dashboard ───────────────────────────────────────────── */
const NOMBRES_TARJETAS = {
  circuito: "Circuito en vivo",
  red: "Estado de la red",
  metricas: "Rendimiento medido",
  sesion: "Sesión y plan",
  accesos: "Accesos rápidos",
};

export function PersonalizarDashboard({ aviso }) {
  const [prefs, actualiza] = usePrefsPanel();
  const visibles = prefs.orden.filter((id) => !prefs.ocultas.includes(id));

  function mueve(id, dir) {
    const orden = [...prefs.orden];
    const i = orden.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= orden.length) return;
    [orden[i], orden[j]] = [orden[j], orden[i]];
    actualiza({ orden });
  }

  function alterna(id) {
    const ocultas = prefs.ocultas.includes(id) ? prefs.ocultas.filter((x) => x !== id) : [...prefs.ocultas, id];
    actualiza({ ocultas });
  }

  function reset() {
    actualiza({ ...PREFS_DEFECTO });
    aviso?.("dashboard restaurado", "ok");
  }

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / dashboard</span>
          <h1>Tu dashboard, a tu manera</h1>
          <p>Elige qué tarjetas ves y en qué orden. Se guarda solo en este navegador y se aplica al centro de control.</p>
        </div>
        <button className="btn" type="button" onClick={reset}>Restaurar</button>
      </header>

      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Orden y visibilidad</h2>
          <div className="pu-prefs-lista">
            {prefs.orden.map((id, i) => {
              const activa = !prefs.ocultas.includes(id);
              return (
                <div key={id} className={`pu-pref-fila ${activa ? "" : "oculta"}`}>
                  <span className="pu-pref-num mono">{String(i + 1).padStart(2, "0")}</span>
                  <b>{NOMBRES_TARJETAS[id] || id}</b>
                  <div className="pu-pref-acciones">
                    <button className="btn" type="button" onClick={() => mueve(id, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                    <button className="btn" type="button" onClick={() => mueve(id, 1)} disabled={i === prefs.orden.length - 1} aria-label="Bajar">↓</button>
                    <button className="btn" type="button" onClick={() => alterna(id)}>{activa ? "Ocultar" : "Mostrar"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="tarjeta">
          <h2 className="seccion">Preferencias visuales</h2>
          <label className="pu-switch-fila">
            <span><b>Animaciones</b><small>Movimiento de paquetes y transiciones</small></span>
            <input type="checkbox" checked={prefs.animaciones} onChange={(e) => actualiza({ animaciones: e.target.checked })} />
          </label>
          <label className="pu-switch-fila">
            <span><b>Densidad compacta</b><small>Menos espacio entre tarjetas</small></span>
            <input type="checkbox" checked={prefs.compacto} onChange={(e) => actualiza({ compacto: e.target.checked })} />
          </label>
          <label className="pu-switch-fila">
            <span><b>Acento turquesa Pro</b><small>Detalle visual exclusivo del plan Pro</small></span>
            <input type="checkbox" checked={prefs.turquesa} onChange={(e) => actualiza({ turquesa: e.target.checked })} />
          </label>
          <label className="pu-switch-fila">
            <span><b>Notificaciones del panel</b><small>Avisos de red y cuenta</small></span>
            <input type="checkbox" checked={prefs.notificaciones} onChange={(e) => actualiza({ notificaciones: e.target.checked })} />
          </label>
          <p className="pu-nota">Estas preferencias no cambian permisos ni precios. Solo la forma de mostrar el panel.</p>
          <div className="pu-mini-preview">
            <span className="mono">orden actual</span>
            <div>{visibles.map((id) => <i key={id}>{NOMBRES_TARJETAS[id] || id}</i>)}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
