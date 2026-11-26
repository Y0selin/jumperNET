import { useEffect, useMemo, useRef, useState } from "react";
import { comprobar, me, nodos, nodosVivos, salida } from "../lib/api.js";
import { DOCS_URL, GITHUB_URL } from "../lib/enlaces.js";
import { DUDAS } from "../lib/contenido.js";
import { SALTOS_MIN, SALTOS_MAX, precioPro } from "../lib/planes.js";
import { guardaPrefCircuito } from "../lib/panel.jsx";
import CircuitoPlan from "./CircuitoPlan.jsx";
import Descargas from "./Descargas.jsx";
import ContactoVentas from "./ContactoVentas.jsx";
import { CircuitoVivo } from "./PanelDash.jsx";

/* Herramientas del panel. Todo lo educativo se etiqueta como simulación y
   todo lo que consulta la API muestra la medida real o «sin medida». */

const euros = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch { return false; }
  }
}

/* ── comprobación real de la IP de salida ─────────────────────────────── */
export function ComprobacionIP({ yo, aviso, navega }) {
  const [clave, setClave] = useState("");
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const activo = !!yo?.activo;

  async function probar(e) {
    e?.preventDefault();
    if (!clave) { setError("escribe tu contraseña para autenticar el proxy"); return; }
    setCargando(true); setError(""); setRes(null);
    try {
      const r = await comprobar(clave);
      setRes(r);
      setClave("");
      if (!r.ok) setError(r.error || "la comprobación no pudo completarse");
      else aviso?.(r.cambia_tu_ip ? "el destino te ve con otra IP" : "el circuito responde con la IP esperada", "ok");
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / comprobación de IP</span>
          <h1>¿Qué IP ve internet?</h1>
          <p>La API hace una petición real a través de tu circuito SOCKS5 y devuelve la IP que ha visto el destino. La contraseña se usa solo para ese handshake y no se guarda.</p>
        </div>
        <span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "RED ACTIVA" : "RED APAGADA"}</span>
      </header>

      <div className="pu-dos">
        <section className="tarjeta pu-comprobar">
          <h2 className="seccion">Datos de tu sesión</h2>
          <div className="pu-datos">
            <span><small>tu IP real</small><b className="mono">{yo?.ip_real || "sin dato"}</b><i>la que ve el servidor</i></span>
            <span><small>IP de salida</small><b className="mono">{activo ? (yo?.ip_salida || "midiendo") : "—"}</b><i>la que debería ver el destino</i></span>
            <span><small>circuito</small><b className="mono">{activo ? `${yo?.circuito?.length || 0} saltos` : "apagado"}</b><i>{(yo?.circuito || []).join(" → ") || "sin ruta"}</i></span>
          </div>

          {!activo ? (
            <div className="pu-vacio">
              <b>La red está apagada.</b>
              <p>Enciende el circuito para poder comprobar la IP de salida de verdad.</p>
              <button className="btn primario" type="button" onClick={() => navega?.("red")}>Ir al panel de red</button>
            </div>
          ) : (
            <form className="pu-form" onSubmit={probar}>
              <label>
                <span>Contraseña de tu cuenta</span>
                <input className="campo" type="password" value={clave} onChange={(e) => setClave(e.target.value)}
                  autoComplete="current-password" placeholder="solo para esta comprobación" />
              </label>
              <div className="pu-form-pie">
                <span className="pu-nota mono">no se almacena · petición real por el proxy</span>
                <button className="btn primario" type="submit" disabled={cargando}>{cargando ? "comprobando…" : "Comprobar ahora"}</button>
              </div>
            </form>
          )}
          {error && <p className="pu-error" role="alert">{error}</p>}
        </section>

        <section className="tarjeta pu-resultado-ip">
          <h2 className="seccion">Resultado medido</h2>
          {res?.ok ? (
            <>
              <div className={`pu-ip-sello ${res.cambia_tu_ip ? "ok" : "aviso"}`}>
                <small>el destino vio</small>
                <b className="mono">{res.ip_observada}</b>
                <span>{res.cambia_tu_ip ? "distinta de tu IP real" : "igual que tu IP real (puede que ya salieras por ahí)"}</span>
              </div>
              <div className="pu-datos">
                <span><small>IP esperada</small><b className="mono">{res.ip_esperada || "sin dato"}</b><i>calculada por el exit</i></span>
                <span><small>tu IP real</small><b className="mono">{res.tu_ip || "sin dato"}</b><i>medida por el servidor</i></span>
                <span><small>latencia</small><b className="mono">{res.ms} ms</b><i>ida y vuelta</i></span>
                <span><small>destino</small><b className="mono">{res.destino}</b><i>prueba desde el proxy</i></span>
              </div>
            </>
          ) : (
            <div className="pu-vacio">
              <b>Sin comprobación todavía.</b>
              <p>El resultado aparecerá aquí con la IP observada, la esperada y la latencia real de la petición.</p>
            </div>
          )}
        </section>
      </div>
      <p className="pu-nota">Que la IP cambie demuestra que el tráfico sale por el circuito. No demuestra anonimato absoluto ni que todos los destinos se comporten igual.</p>
    </div>
  );
}

/* ── terminal educativa: comandos seguros, sin shell del sistema ──────── */
export function TerminalEducativa({ yo, plan, aviso }) {
  const [lineas, setLineas] = useState([
    { t: "JumperNET · terminal educativa", tipo: "ok" },
    { t: "No es un shell: solo interpreta los comandos de esta lista. Escribe «help».", tipo: "nota" },
  ]);
  const [texto, setTexto] = useState("");
  const caja = useRef(null);
  const esPro = plan?.id === "pro" || plan?.id === "empresarial";

  useEffect(() => {
    if (caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [lineas]);

  function ejecutar(e) {
    e.preventDefault();
    const cmd = texto.trim();
    if (!cmd) return;
    const salida = [{ t: `${yo?.email?.split("@")[0] || "tú"}@jumpernet:~$ ${cmd}`, tipo: "cmd" }];
    const [base, ...args] = cmd.toLowerCase().split(/\s+/);
    if (base === "help" || base === "ayuda") {
      salida.push({ t: "comandos: help · status · plan · nodos · circuito · ip · clear", tipo: "out" });
      salida.push({ t: esPro ? "pro: explorer · monitor · seguridad (abren su pestaña)" : "con Pro se añaden explorer, monitor y seguridad", tipo: "nota" });
    } else if (base === "status") {
      salida.push({ t: `red: ${yo?.activo ? "ACTIVA" : "APAGADA"} · saltos: ${yo?.circuito?.length || 0}/${yo?.saltos_max || 3}`, tipo: yo?.activo ? "ok" : "warn" });
      salida.push({ t: `IP real: ${yo?.ip_real || "sin dato"} · IP salida: ${yo?.activo ? (yo?.ip_salida || "midiendo") : "—"}`, tipo: "out" });
    } else if (base === "plan") {
      salida.push({ t: `plan ${plan?.nombre || yo?.plan || "free"} · máximo ${plan?.saltosMax || yo?.saltos_max || 3} saltos`, tipo: "ok" });
      if (plan?.id === "pro") salida.push({ t: `precio de referencia: ${euros(precioPro(yo?.saltos_max || 3))}/mes`, tipo: "out" });
      if (plan?.demo) salida.push({ t: "modo DEMO local: los permisos reales siguen viniendo del backend", tipo: "warn" });
    } else if (base === "nodos") {
      nodosVivos().then((d) => {
        setLineas((l) => [...l, { t: `nodos vivos ahora: ${d.total} (${d.infra} infra + ${d.equipos} equipos)`, tipo: "out" }]);
      }).catch((err) => setLineas((l) => [...l, { t: `error: ${err.message}`, tipo: "error" }]));
      salida.push({ t: "consultando nodos…", tipo: "nota" });
    } else if (base === "circuito") {
      salida.push({ t: yo?.circuito?.length ? yo.circuito.join(" → ") : "sin circuito activo", tipo: "out" });
    } else if (base === "ip") {
      salida.push({ t: `IP real: ${yo?.ip_real || "sin dato"}`, tipo: "out" });
      salida.push({ t: `IP de salida: ${yo?.activo ? (yo?.ip_salida || "midiendo") : "red apagada"}`, tipo: "out" });
    } else if (base === "clear") {
      setLineas([]);
      setTexto("");
      return;
    } else if (["explorer", "monitor", "seguridad"].includes(base)) {
      if (!esPro) salida.push({ t: "ese comando necesita Pro; el plan Free no abre herramientas avanzadas", tipo: "error" });
      else salida.push({ t: `abre «${base}» desde el menú lateral; la terminal no navega por ti`, tipo: "nota" });
    } else {
      salida.push({ t: `comando no reconocido: ${base}. Prueba «help».`, tipo: "error" });
    }
    setLineas((l) => [...l, ...salida].slice(-80));
    setTexto("");
  }

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / terminal</span>
          <h1>Terminal educativa</h1>
          <p>Un intérprete de comandos de JumperNET, no un shell. Sirve para consultar tu estado sin abrir una consola del sistema.</p>
        </div>
        <span className="chip mono">simulación segura</span>
      </header>
      <div className="pu-terminal">
        <div className="pu-terminal-cab mono">
          <span className="punto" style={{ background: "#ff5f57" }} />
          <span className="punto" style={{ background: "#febc2e" }} />
          <span className="punto" style={{ background: "#28c840" }} />
          <span style={{ marginLeft: 8 }}>jumpernet · educational shell</span>
          <button type="button" className="pu-terminal-limpiar" onClick={() => setLineas([])}>clear</button>
        </div>
        <div className="pu-terminal-cuerpo" ref={caja} aria-live="polite">
          {lineas.map((l, i) => <div key={i} className={`pu-linea ${l.tipo}`}>{l.t}</div>)}
        </div>
        <form className="pu-terminal-form" onSubmit={ejecutar}>
          <span className="mono">$</span>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" spellCheck="false"
            aria-label="Comando de la terminal educativa" placeholder="help · status · plan · nodos · circuito · ip" />
          <button className="btn" type="submit">Ejecutar</button>
        </form>
      </div>
      <p className="pu-nota">Los comandos solo leen datos de tu sesión y de la API. No ejecutan programas del sistema, no leen archivos y no envían tráfico.</p>
    </div>
  );
}

/* ── simulador de red: elige nodos y mira una ruta de ejemplo ─────────── */
export function SimuladorRed({ yo, plan, aviso }) {
  const max = Math.max(3, Math.min(7, plan?.saltosMax || yo?.saltos_max || 3));
  const [saltos, setSaltos] = useState(Math.min(5, max));
  const [lista, setLista] = useState([]);
  const [ruta, setRuta] = useState([]);
  const [modo, setModo] = useState("todos");
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    nodos().then((d) => { if (vivo) setLista(Array.isArray(d) ? d : []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  function candidatos() {
    const vivos = lista.filter((n) => n.estado === "vivo" && n.nombre);
    const base = modo === "externos" ? vivos.filter((n) => (n.tipo || "infra") === "usuario" && n.saltable) : vivos;
    return base.length ? base : [];
  }

  function generar() {
    const pool = [...candidatos()];
    if (!pool.length) {
      setRuta(Array.from({ length: saltos }, (_, i) => `sim_nodo${i + 1}`));
      setCorriendo(true);
      aviso?.("no hay nodos vivos con esos filtros: se muestra una ruta de ejemplo", "error");
      return;
    }
    const elegidos = [];
    while (elegidos.length < Math.min(saltos, pool.length)) {
      elegidos.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    setRuta(elegidos.map((n) => n.nombre));
    setCorriendo(true);
  }

  useEffect(() => { setCorriendo(false); }, [saltos, modo]);

  const nodosRuta = ruta.map((n) => lista.find((x) => x.nombre === n)).filter(Boolean);
  const latencias = nodosRuta.map((n) => n.ms).filter((n) => Number.isFinite(n));
  const media = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;
  const ejemplo = ruta.length && nodosRuta.length === 0;

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / simulador</span>
          <h1>Simulador de red</h1>
          <p>Monta una ruta con nodos reales de la red y observa cómo se encadenan. Es una simulación: no abre un circuito ni cambia tu conexión.</p>
        </div>
        <span className="chip mono">simulación educativa</span>
      </header>

      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Configura la ruta</h2>
          <div className="pu-control">
            <label>
              <span>Saltos</span>
              <b className="mono">{saltos}</b>
              <input type="range" min="3" max={max} value={saltos} onChange={(e) => setSaltos(Number(e.target.value))} />
              <small>de 3 a {max} según tu plan</small>
            </label>
            <label>
              <span>Origen de nodos</span>
              <select className="campo" value={modo} onChange={(e) => setModo(e.target.value)}>
                <option value="todos">todos los nodos vivos</option>
                <option value="externos">solo equipos externos validados</option>
              </select>
            </label>
          </div>
          <div className="pu-form-pie">
            <span className="pu-nota">{lista.length ? `${lista.filter((n) => n.estado === "vivo").length} nodos vivos disponibles ahora` : "consultando la red…"}</span>
            <button className="btn primario" type="button" onClick={generar}>Generar ruta de ejemplo</button>
          </div>
          {modo === "externos" && !candidatos().length && <p className="pu-nota">No hay equipos externos validados con esos filtros; se usará una ruta de ejemplo claramente etiquetada.</p>}
        </section>

        <section className="tarjeta">
          <h2 className="seccion">Lo que mediría</h2>
          <div className="pu-datos dos">
            <span><small>saltos simulados</small><b className="mono">{ruta.length || 0}</b><i>de 3 a {max}</i></span>
            <span><small>latencia media</small><b className="mono">{media != null ? `${media} ms` : "sin medida"}</b><i>de los nodos elegidos</i></span>
            <span><small>modo</small><b>{modo === "externos" ? "externos" : "todos"}</b><i>filtro de la simulación</i></span>
            <span><small>conexión real</small><b>{yo?.activo ? "activa" : "apagada"}</b><i>no se toca desde aquí</i></span>
          </div>
          {ejemplo && <p className="pu-nota pu-nota-aviso">La ruta mostrada es un ejemplo: no hay suficientes nodos reales para completar la simulación.</p>}
        </section>
      </div>

      <section className="tarjeta pu-simulador-escena">
        <CircuitoVivo circuito={ruta} activo={corriendo && !ejemplo} max={max} />
        {ruta.length > 0 && (
          <div className="pu-sim-lista">
            {ruta.map((n, i) => (
              <span key={`${n}-${i}`} className="mono"><b>{i + 1}</b>{n}</span>
            ))}
          </div>
        )}
      </section>
      <p className="pu-nota">Los paquetes que se mueven son una animación didáctica. La latencia mostrada es la última medida real de cada nodo, cuando existe.</p>
    </div>
  );
}

/* ── inspector de paquetes: capas educativas, sin captura ─────────────── */
export function InspectorPaquetes({ yo, plan }) {
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(false);
  const max = plan?.saltosMax || yo?.saltos_max || 3;
  const saltos = Math.max(3, Math.min(max, yo?.circuito?.length || 3));
  const nombre = yo?.circuito?.[0] || "nodo₁";

  useEffect(() => {
    if (!auto) return;
    if (paso >= saltos + 1) { setAuto(false); return; }
    const t = setTimeout(() => setPaso((p) => p + 1), 900);
    return () => clearTimeout(t);
  }, [auto, paso, saltos]);

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / inspector</span>
          <h1>Inspector de paquetes</h1>
          <p>Una vista educativa de las capas JENC. No captura tráfico, no lee contenido y no guarda lo que haces.</p>
        </div>
        <span className="chip mono">sin captura</span>
      </header>

      <section className="tarjeta pu-inspector">
        <div className="pu-inspector-cab">
          <div>
            <span className="pu-kicker">paquete simulado</span>
            <b className="mono">JENC · ChaCha20-Poly1305</b>
          </div>
          <div className="pu-inspector-acciones">
            <button className="btn" type="button" onClick={() => { setPaso(0); setAuto(true); }}>{auto ? "recorriendo…" : "Recorrer capas"}</button>
            <button className="btn" type="button" onClick={() => { setAuto(false); setPaso((p) => Math.min(saltos + 1, p + 1)); }}>Siguiente →</button>
          </div>
        </div>

        <div className="pu-paquete" aria-label="Representación de un paquete con capas de cifrado">
          <div className="pu-paquete-nucleo">
            <span>destino</span>
            <b className="mono">solo lo ve el exit</b>
          </div>
          {Array.from({ length: saltos }).map((_, i) => (
            <div key={i} className={`pu-capa ${paso > i ? "abierta" : ""}`} style={{ "--i": i }}>
              <span className="mono">capa {i + 1}</span>
              <b>{i === saltos - 1 ? "exit" : i === 0 ? nombre : `relé ${i + 1}`}</b>
            </div>
          ))}
        </div>

        <ol className="pu-pasos-inspector">
          <li className={paso >= 0 ? "hecho" : ""}><b>Origen</b><span>Tu equipo entrega el paquete al primer salto por SOCKS5.</span></li>
          {Array.from({ length: saltos }).map((_, i) => (
            <li key={i} className={paso > i ? "hecho" : paso === i ? "activo" : ""}>
              <b>{i === saltos - 1 ? "Salida" : `Relé ${i + 1}`}</b>
              <span>{i === saltos - 1 ? "El exit valida el destino y entrega. Ve la IP de salida, no la tuya." : "Quita su capa, reenvía a ciegas y no puede leer el contenido."}</span>
            </li>
          ))}
        </ol>
        <p className="pu-nota">La animación es una explicación del diseño. El panel no inspecciona paquetes reales ni almacena contenido privado de las comunicaciones.</p>
      </section>
    </div>
  );
}

/* ── comparador de circuitos ──────────────────────────────────────────── */
export function ComparadorCircuitos({ yo, plan, aviso, navega }) {
  const max = Math.max(3, Math.min(7, plan?.saltosMax || yo?.saltos_max || 3));
  const [a, setA] = useState(3);
  const [b, setB] = useState(max);
  const [lista, setLista] = useState([]);
  useEffect(() => {
    nodos().then((d) => setLista(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  const vivos = lista.filter((n) => n.estado === "vivo");
  const medidas = vivos.map((n) => n.ms).filter((n) => Number.isFinite(n));
  const media = medidas.length ? Math.round(medidas.reduce((s, n) => s + n, 0) / medidas.length) : null;
  const comparar = (n) => ({
    saltos: n,
    estructura: n === 3 ? "circuito mínimo" : `${n - 3} salto${n - 3 === 1 ? "" : "s"} adicional${n - 3 === 1 ? "" : "es"}`,
    latencia: media != null ? `≈ ${media * n} ms de referencia` : "sin medida",
    precio: precioPro(n),
  });
  const fa = comparar(a);
  const fb = comparar(b);

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / comparador</span>
          <h1>Dos tamaños, lado a lado</h1>
          <p>Compara la estructura de dos circuitos permitidos por tu plan. La latencia de referencia sale de los nodos vivos medidos; no es una promesa de rendimiento.</p>
        </div>
      </header>
      <div className="pu-comparador-selectores">
        <label>Circuito A <b className="mono">{a}</b><input type="range" min="3" max={max} value={a} onChange={(e) => setA(Number(e.target.value))} /></label>
        <label>Circuito B <b className="mono">{b}</b><input type="range" min="3" max={max} value={b} onChange={(e) => setB(Number(e.target.value))} /></label>
      </div>
      <div className="pu-dos">
        {[fa, fb].map((c, i) => (
          <section key={i} className="tarjeta pu-comparador">
            <div className="pu-comparador-cab">
              <span className="mono">circuito {i ? "B" : "A"}</span>
              <b>{c.saltos} saltos · {euros(c.precio)}/mes</b>
            </div>
            <CircuitoPlan saltos={c.saltos} tono={i ? "pro" : "free"} compacto max={max} etiqueta={false} />
            <dl className="pu-tabla-datos">
              <div><dt>estructura</dt><dd>{c.estructura}</dd></div>
              <div><dt>latencia de referencia</dt><dd>{c.latencia}</dd></div>
              <div><dt>precio Pro</dt><dd>{euros(c.precio)}/mes</dd></div>
              <div><dt>cifrado</dt><dd>JENC · ChaCha20</dd></div>
            </dl>
            <button className="btn" type="button" onClick={() => { guardaPrefCircuito({ saltos: c.saltos, modo: "todos" }); aviso?.(`${c.saltos} saltos guardados para la próxima configuración`, "ok"); navega?.("disenador"); }}>Usar en el diseñador →</button>
          </section>
        ))}
      </div>
      <p className="pu-nota">Más saltos añaden intermediarios. No se presentan como una mejora automática de seguridad: el cifrado es el mismo y la latencia depende de los nodos.</p>
    </div>
  );
}

/* ── simulador de fallos ──────────────────────────────────────────────── */
export function SimuladorFallos({ yo, plan, aviso }) {
  const max = Math.max(3, Math.min(7, plan?.saltosMax || yo?.saltos_max || 3));
  const [n, setN] = useState(Math.min(5, max));
  const [fallidos, setFallidos] = useState([]);
  const [lista, setLista] = useState([]);
  useEffect(() => { nodos().then((d) => setLista(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const vivos = lista.filter((x) => x.estado === "vivo").slice(0, n);
  const ruta = vivos.length >= n ? vivos : Array.from({ length: n }, (_, i) => ({ nombre: `nodo${i + 1}`, ms: null, simulado: true }));
  const restantes = ruta.filter((_, i) => !fallidos.includes(i));
  const activo = restantes.length >= 3;

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / simulador de fallos</span>
          <h1>¿Y si un nodo cae?</h1>
          <p>Marca nodos como caídos y observa la ruta que quedaría. Es una simulación educativa: no derriba nodos reales ni cambia tu circuito activo.</p>
        </div>
        <span className="chip mono">simulación</span>
      </header>
      <section className="tarjeta">
        <div className="pu-control">
          <label><span>Saltos de la ruta</span><b className="mono">{n}</b>
            <input type="range" min="3" max={max} value={n} onChange={(e) => { setN(Number(e.target.value)); setFallidos([]); }} />
          </label>
          <span className="pu-nota">{ruta[0]?.simulado ? "nombres de ejemplo: no hay suficientes nodos vivos" : "nodos reales vivos en este momento"}</span>
        </div>
        <div className="pu-fallos">
          {ruta.map((x, i) => (
            <label key={`${x.nombre}-${i}`} className={`pu-fallo ${fallidos.includes(i) ? "caido" : ""}`}>
              <input type="checkbox" checked={fallidos.includes(i)} onChange={(e) => setFallidos((f) => e.target.checked ? [...f, i] : f.filter((v) => v !== i))} />
              <span className="mono">{i + 1}</span>
              <b>{x.nombre}</b>
              <small>{fallidos.includes(i) ? "caído en la simulación" : x.ms != null ? `${x.ms} ms` : "sin medida"}</small>
            </label>
          ))}
        </div>
        <CircuitoVivo circuito={restantes.map((x) => x.nombre)} activo={activo} max={max} compacto />
        <p className={activo ? "pu-nota" : "pu-nota pu-nota-aviso"}>
          {activo
            ? `Quedan ${restantes.length} relés: la red podría seguir con un circuito más corto. En la red real, /rotate elige nodos vivos de nuevo.`
            : "Con menos de 3 nodos no se puede formar un circuito. La red real intentaría elegir otros nodos disponibles."}
        </p>
      </section>
    </div>
  );
}

/* ── configurador SOCKS5 ──────────────────────────────────────────────── */
export function ConfiguradorSocks({ yo, aviso }) {
  const [copiado, setCopiado] = useState("");
  const host = "jumpernet.duckdns.org";
  const puerto = "1080";

  async function copiar(texto, clave) {
    const ok = await copiarTexto(texto);
    setCopiado(ok ? clave : "");
    aviso?.(ok ? "copiado al portapapeles" : "no se pudo copiar", ok ? "ok" : "error");
    if (ok) setTimeout(() => setCopiado(""), 1800);
  }

  const curl = `curl --socks5-hostname ${yo?.email || "tu@correo"}:TU_CLAVE@${host}:${puerto} https://ifconfig.me`;

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / SOCKS5</span>
          <h1>Conecta tus aplicaciones</h1>
          <p>El proxy SOCKS5 escucha en el puerto 1080 y autentica con tu correo y tu contraseña. Las credenciales son las mismas de esta web.</p>
        </div>
        <span className="chip mono">80/443 de salida</span>
      </header>
      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Credenciales</h2>
          <div className="pu-dato-copiable">
            <div><small>host</small><b className="mono">{host}</b></div>
            <button className="btn" type="button" onClick={() => copiar(host, "host")}>{copiado === "host" ? "✓ copiado" : "copiar"}</button>
          </div>
          <div className="pu-dato-copiable">
            <div><small>puerto</small><b className="mono">{puerto}</b></div>
            <button className="btn" type="button" onClick={() => copiar(puerto, "puerto")}>{copiado === "puerto" ? "✓ copiado" : "copiar"}</button>
          </div>
          <div className="pu-dato-copiable">
            <div><small>usuario</small><b className="mono">{yo?.email || "—"}</b></div>
            <button className="btn" type="button" onClick={() => copiar(String(yo?.email || ""), "usuario")}>{copiado === "usuario" ? "✓ copiado" : "copiar"}</button>
          </div>
          <p className="pu-nota">La contraseña no se muestra aquí. Es la misma que usas para entrar en JumperNET.</p>
        </section>
        <section className="tarjeta">
          <h2 className="seccion">Prueba en terminal</h2>
          <pre className="pu-codigo mono">{curl}</pre>
          <button className="btn" type="button" onClick={() => copiar(curl, "curl")}>{copiado === "curl" ? "✓ copiado" : "copiar comando"}</button>
          <p className="pu-nota">Sustituye <span className="mono">TU_CLAVE</span> por tu contraseña. El comando pide una web que devuelve la IP observada; no envía datos privados.</p>
        </section>
      </div>
      <section className="tarjeta">
        <h2 className="seccion">Configuración por aplicación</h2>
        <div className="pu-guia-grid">
          <div><b>Navegador</b><p>Configura un proxy SOCKS5 manual con el host y el puerto. Si el navegador lo permite, activa «usar SOCKS5 para DNS».</p></div>
          <div><b>Firefox</b><p>Ajustes → Red → Configuración de conexión → Proxy SOCKS5. Marca «Proxy DNS al usar SOCKS5».</p></div>
          <div><b>Extensiones</b><p>FoxyProxy o similar: host, puerto y autenticación. La extensión de JumperNET ya lo configura sola.</p></div>
          <div><b>Terminal</b><p>Usa <span className="mono">--socks5-hostname</span> para que el DNS también viaje por el circuito.</p></div>
        </div>
      </section>
    </div>
  );
}

/* ── guías, FAQ, docs, estado y contacto ──────────────────────────────── */
export function GuiasPanel({ navega }) {
  const guias = [
    { t: "Crear cuenta y activar la red", d: "Registro, primer circuito y comprobación de IP.", icono: "01" },
    { t: "Instalar la extensión", d: "Chrome, Edge, Brave y Firefox en modo desarrollador.", icono: "02" },
    { t: "Configurar SOCKS5", d: "Host, puerto y autenticación en aplicaciones y terminal.", icono: "03" },
    { t: "Entender el cifrado", d: "JENC, ChaCha20-Poly1305 y reenvío ciego por capas.", icono: "04" },
    { t: "Diagnóstico de red", d: "Qué comprobar cuando el circuito no responde.", icono: "05" },
    { t: "Privacidad y límites", d: "Qué no guarda JumperNET y qué no promete.", icono: "06" },
  ];
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / guías</span>
          <h1>Configura sin adivinar</h1>
          <p>Guías breves para usar la red, el proxy y el panel. La documentación completa está a un clic.</p>
        </div>
        <a className="btn primario" href={DOCS_URL} target="_blank" rel="noreferrer">Abrir documentación ↗</a>
      </header>
      <div className="pu-guia-grid grande">
        {guias.map((g) => (
          <article key={g.t} className="pu-guia">
            <span className="mono">{g.icono}</span>
            <h2>{g.t}</h2>
            <p>{g.d}</p>
            <a href={DOCS_URL} target="_blank" rel="noreferrer">Leer la guía ↗</a>
          </article>
        ))}
      </div>
      <div className="pu-bento-acciones">
        <button className="btn" type="button" onClick={() => navega?.("descargas")}>Ir a descargas</button>
        <button className="btn" type="button" onClick={() => navega?.("socks")}>Configurador SOCKS5</button>
      </div>
    </div>
  );
}

export function FAQPanel({ navega }) {
  const [abierta, setAbierta] = useState(0);
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / preguntas frecuentes</span>
          <h1>Respuestas directas</h1>
          <p>Las mismas dudas de la web pública, dentro de tu panel.</p>
        </div>
      </header>
      <div className="pu-faq">
        {DUDAS.map(([q, r], i) => (
          <article key={q} className={`pu-faq-item ${abierta === i ? "abierta" : ""}`}>
            <button type="button" onClick={() => setAbierta(abierta === i ? -1 : i)} aria-expanded={abierta === i}>
              <span>{q}</span><i aria-hidden>+</i>
            </button>
            {abierta === i && <p>{r}</p>}
          </article>
        ))}
      </div>
      <div className="pu-bento-acciones">
        <a className="btn" href={DOCS_URL} target="_blank" rel="noreferrer">Documentación completa ↗</a>
        <button className="btn" type="button" onClick={() => navega?.("contacto")}>Hablar con el equipo</button>
      </div>
    </div>
  );
}

export function DocsPanel() {
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / documentación</span>
          <h1>La red, por dentro</h1>
          <p>Arquitectura, guías de instalación, seguridad y límites del proyecto. Sin marketing.</p>
        </div>
        <a className="btn primario" href={DOCS_URL} target="_blank" rel="noreferrer">Abrir docs ↗</a>
      </header>
      <div className="pu-docs-grid">
        <a className="pu-doc" href={DOCS_URL} target="_blank" rel="noreferrer"><span className="mono">01</span><b>Primeros pasos</b><p>Cuenta, panel, conexión y primera comprobación real.</p></a>
        <a className="pu-doc" href={DOCS_URL} target="_blank" rel="noreferrer"><span className="mono">02</span><b>Arquitectura</b><p>API, proxy SOCKS5, nodos, circuitos y flujo de un paquete.</p></a>
        <a className="pu-doc" href={DOCS_URL} target="_blank" rel="noreferrer"><span className="mono">03</span><b>Seguridad</b><p>Cifrado JENC, reenvío ciego y qué no promete el proyecto.</p></a>
        <a className="pu-doc" href={GITHUB_URL} target="_blank" rel="noreferrer"><span className="mono">04</span><b>Código fuente</b><p>Repositorio, incidencias y estado del desarrollo.</p></a>
      </div>
      <p className="pu-nota">La documentación externa se abre en una pestaña nueva. Si no responde, el estado del servicio te dirá si la API está disponible.</p>
    </div>
  );
}

export function EstadoServicio({ aviso }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cuando, setCuando] = useState(null);

  async function medir() {
    setCargando(true);
    const t0 = performance.now();
    const resultados = [];
    try {
      const c = await me();
      resultados.push({ k: "API de control", ok: true, v: `${Math.round(performance.now() - t0)} ms`, d: `cuenta #${c.id} · plan ${c.plan}` });
    } catch (e) {
      resultados.push({ k: "API de control", ok: false, v: "sin respuesta", d: e.message });
    }
    const t1 = performance.now();
    try {
      const v = await nodosVivos();
      resultados.push({ k: "Nodos vivos", ok: v.total > 0, v: `${v.total}`, d: `${v.infra} infra · ${v.equipos} equipos · ${Math.round(performance.now() - t1)} ms` });
    } catch (e) {
      resultados.push({ k: "Nodos vivos", ok: false, v: "sin datos", d: e.message });
    }
    try {
      const s = await salida();
      resultados.push({ k: "Salida a internet", ok: !!s.ip_salida, v: s.ip_salida || "sin dato", d: "IP pública medida por el servidor" });
    } catch (e) {
      resultados.push({ k: "Salida a internet", ok: false, v: "sin datos", d: e.message });
    }
    setFilas(resultados);
    setCuando(new Date());
    setCargando(false);
    aviso?.("estado del servicio actualizado", "ok");
  }

  useEffect(() => { medir(); }, []);

  const todo = filas.length && filas.every((f) => f.ok);
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / estado del servicio</span>
          <h1>Lo que responde ahora</h1>
          <p>Comprobaciones hechas desde tu navegador contra la API. No es un panel de uptime histórico ni inventa porcentajes.</p>
        </div>
        <button className="btn primario" type="button" onClick={medir} disabled={cargando}>{cargando ? "midiendo…" : "Volver a medir"}</button>
      </header>
      <div className={`pu-estado ${todo ? "ok" : filas.length ? "aviso" : ""}`}>
        <span className="pu-estado-orbe" aria-hidden />
        <div>
          <b>{filas.length ? (todo ? "Servicios principales respondiendo" : "Hay algún servicio sin respuesta") : "Midiendo…"}</b>
          <span className="mono">{cuando ? `última comprobación ${cuando.toLocaleTimeString("es-ES")}` : "sin comprobación todavía"}</span>
        </div>
      </div>
      <div className="pu-estado-lista">
        {filas.map((f) => (
          <div key={f.k} className="pu-estado-fila">
            <span className={`pu-estado-punto ${f.ok ? "ok" : "mal"}`} aria-hidden />
            <b>{f.k}</b>
            <span className="mono">{f.v}</span>
            <span className="pu-nota">{f.d}</span>
          </div>
        ))}
        {cargando && !filas.length && <p className="pu-nota">consultando la API…</p>}
      </div>
    </div>
  );
}

export function ContactoPanel({ plan }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / contacto</span>
          <h1>Habla con el equipo</h1>
          <p>Para soporte técnico, facturación o una configuración empresarial. Respondemos con datos, no con respuestas automáticas.</p>
        </div>
      </header>
      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Soporte y ventas</h2>
          <p className="pu-texto">El formulario prepara un correo real en tu cliente. No hay un servicio de envío conectado en la web, así que no mostramos una confirmación que no podemos comprobar.</p>
          <div className="pu-bento-acciones">
            <button className="btn primario" type="button" onClick={() => setAbierto(true)}>Abrir formulario de contacto</button>
            <a className="btn" href="mailto:diseo-jumpernat-admin@jumpernet.local">Escribir por correo</a>
          </div>
        </section>
        <section className="tarjeta">
          <h2 className="seccion">Antes de escribir</h2>
          <div className="pu-lista-hechos">
            <span>✓ cuéntanos el plan y el tamaño de circuito que usas</span>
            <span>✓ adjunta el diagnóstico copiado desde el panel</span>
            <span>✓ no envíes tu contraseña ni datos de tarjeta</span>
            <span>✓ para cambios de plan, primero confirmamos condiciones</span>
          </div>
          {plan?.id === "empresarial" && <p className="pu-nota">Tu plan es Empresarial: indícalo para que el equipo revise la configuración de la organización.</p>}
        </section>
      </div>
      <ContactoVentas abierto={abierto} cerrar={() => setAbierto(false)} />
    </div>
  );
}

export function OrganizacionPanel({ yo, plan, navega }) {
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / organización</span>
          <h1>Panel de empresa</h1>
          <p>La estructura está preparada, pero solo se activarán las funciones que la infraestructura real pueda sostener y que se acuerden con el equipo.</p>
        </div>
        <span className="chip acento mono">EMPRESARIAL</span>
      </header>
      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Estado de la organización</h2>
          <div className="pu-datos dos">
            <span><small>cuenta</small><b className="mono">#{yo?.id}</b><i>{yo?.email}</i></span>
            <span><small>plan</small><b>Empresarial</b><i>condiciones acordadas</i></span>
            <span><small>saltos configurados</small><b className="mono">{yo?.saltos_max || 7}</b><i>según contrato</i></span>
            <span><small>organización</small><b>Sin configurar</b><i>pendiente de alta</i></span>
          </div>
          <p className="pu-nota">No mostramos usuarios, permisos ni facturas de una organización que todavía no existe en el backend. Sería un dato falso.</p>
        </section>
        <section className="tarjeta">
          <h2 className="seccion">Qué se puede activar</h2>
          <div className="pu-lista-hechos">
            <span>✓ gestión de usuarios de la organización, cuando exista el modelo</span>
            <span>✓ infraestructura dedicada según disponibilidad</span>
            <span>✓ permisos y roles empresariales</span>
            <span>✓ facturación y soporte directo acordados</span>
          </div>
          <div className="pu-bento-acciones">
            <button className="btn primario" type="button" onClick={() => navega?.("contacto")}>Hablar con ventas</button>
            <button className="btn" type="button" onClick={() => navega?.("plan")}>Ver mi suscripción</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function DescargasPanel() {
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / descargas</span>
          <h1>Descarga y navega</h1>
          <p>La extensión para tu navegador o el navegador completo con el circuito ya preparado.</p>
        </div>
      </header>
      <Descargas />
    </div>
  );
}
