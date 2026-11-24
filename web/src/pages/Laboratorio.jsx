import { useEffect, useRef, useState } from "react";
import { nodos as nodosApi } from "../lib/api.js";
import { DOCS_URL } from "../lib/enlaces.js";

/* JumperNET Lab: cuatro herramientas educativas de verdad.
   · Consola: comandos que cambian un estado local (no toca la red real).
   · Explorador: topología y datos de los nodos que devuelve la API.
   · Inspector: qué ve y qué no ve cada salto.
   · Fallos: simulación de caídas y reruta.
   La etiqueta «simulación» no es decorativa: el panel real es el único que
   enciende el circuito. */

const DEMO = ["nodo1", "nodo2", "nodo3", "nodo4", "nodo5"];
const PARADAS = [
  { t: "Tú", sub: "origen", rol: "tu equipo", ve: "La web que quieres abrir y tu IP real.", no: "Todavía no hay circuito.", nota: "Nada sale de aquí hasta que tú lo enciendes." },
  { t: "Salto 1", sub: "relé ciego", rol: "entrada", ve: "Un sobre cifrado y el nombre del siguiente salto.", no: "El destino final y el contenido.", nota: "Solo puede entregar el sobre a quien le indican." },
  { t: "Salto 2", sub: "relé ciego", rol: "tránsito", ve: "Otro sobre y los nodos anterior y siguiente.", no: "Tu IP, tu destino y el contenido.", nota: "Es el tramo que rompe la relación entre origen y destino." },
  { t: "Salto 3", sub: "exit", rol: "salida", ve: "El destino y la petición ya descifrada.", no: "Quién eres ni de dónde vienes.", nota: "Solo permite 80/443 y descarta destinos privados." },
  { t: "Internet", sub: "destino", rol: "servicio", ve: "La IP del nodo de salida.", no: "Tu IP y tu operador.", nota: "La respuesta vuelve por el mismo circuito, en sentido inverso." },
];

const AYUDA = [
  ["help", "esta lista de comandos"],
  ["status", "estado del circuito de demostración"],
  ["nodes", "nodos que devuelve la API (o muestra local)"],
  ["route", "los tres saltos de la ruta actual"],
  ["connect", "abre un circuito de demostración"],
  ["disconnect", "apaga el circuito de demostración"],
  ["rotate", "cambia los saltos sin cortar la sesión"],
  ["encryption", "las tres capas JENC del paquete"],
  ["clear", "limpia la consola"],
];

const TABS = [
  { id: "consola", t: "Consola", d: "Comandos del circuito", ico: "▰" },
  { id: "explorador", t: "Explorador", d: "La red, salto a salto", ico: "⌁" },
  { id: "inspector", t: "Inspector", d: "Qué ve cada nodo", ico: "◫" },
  { id: "fallos", t: "Fallos", d: "Caídas y reruta", ico: "⚠" },
];

function eligeRuta(lista, anterior = []) {
  const vivos = (lista || []).filter((n) => n.estado === "vivo" && n.nombre);
  const base = vivos.length >= 3 ? vivos : DEMO.map((n) => ({ nombre: n }));
  const nombres = base.map((n) => n.nombre);
  const salida = [];
  const usados = new Set();
  for (const n of nombres) {
    if (salida.length === 3) break;
    if (usados.has(n)) continue;
    salida.push(n);
    usados.add(n);
  }
  let i = 0;
  while (salida.length < 3) {
    const n = DEMO[i++ % DEMO.length];
    if (!usados.has(n)) { salida.push(n); usados.add(n); }
  }
  if (anterior.length === 3 && salida.join() === anterior.join()) salida.push(salida.shift());
  return salida;
}

export default function Laboratorio() {
  const [tab, setTab] = useState("consola");
  const [lista, setLista] = useState(null);
  const [api, setApi] = useState("cargando");
  const [conectado, setConectado] = useState(false);
  const [ruta, setRuta] = useState(["nodo1", "nodo2", "nodo3"]);

  useEffect(() => {
    let vivo = true;
    nodosApi()
      .then((n) => { if (!vivo) return; setLista(Array.isArray(n) ? n : []); setApi("ok"); })
      .catch(() => { if (vivo) { setLista([]); setApi("error"); } });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const salta = (e) => {
      const sec = e.detail?.seccion;
      if (sec) {
        setTab(sec);
        window.scrollTo({ top: 150, behavior: "smooth" });
      }
    };
    window.addEventListener("jumpernet-lab", salta);
    return () => window.removeEventListener("jumpernet-lab", salta);
  }, []);

  const reales = api === "ok" ? (lista || []) : [];
  const vivos = reales.filter((n) => n.estado === "vivo").length;
  const totalNodos = reales.length;
  const modo = api === "ok" ? "api" : api === "error" ? "demo" : "cargando";

  function nuevaRuta() {
    const r = eligeRuta(reales, ruta);
    setRuta(r);
    return r;
  }

  return (
    <div className="lab">
      <header className="lab-cabeza">
        <div className="lab-cabeza-txt">
          <span className="lab-sello mono"><i aria-hidden /> laboratorio educativo · sin registro</span>
          <h1 className="lab-h1">Mira dentro de <span>la red.</span></h1>
          <p className="lab-lead">
            Una consola, un explorador, un inspector de paquetes y un simulador de fallos.
            Todo lo que pasa aquí es local y reversible; el circuito real se enciende desde
            el panel, nunca desde una demo.
          </p>
          <div className="lab-cabeza-acc">
            <a className="btn primario" href="#/acceso/registro">Crear cuenta <span aria-hidden>→</span></a>
            <a className="btn" href={DOCS_URL} target="_blank" rel="noreferrer">Documentación ↗</a>
            <a className="lab-enlace-panel" href="#/panel">Panel real <span aria-hidden>↗</span></a>
          </div>
        </div>
        <div className="lab-metricas" aria-label="Estado de la red">
          <div className="lab-metrica">
            <span className="mono">nodos vivos</span>
            <b>{api === "ok" ? vivos : "—"}</b>
            <em>{api === "ok" ? `${totalNodos} registrados` : api === "cargando" ? "consultando API…" : "API no accesible"}</em>
          </div>
          <div className="lab-metrica">
            <span className="mono">circuito</span>
            <b className={conectado ? "on" : ""}>{conectado ? "3 saltos" : "apagado"}</b>
            <em>{conectado ? "simulación local" : "nada en marcha"}</em>
          </div>
          <div className="lab-metrica">
            <span className="mono">cifrado</span>
            <b>JENC</b>
            <em>ChaCha20-Poly1305</em>
          </div>
          <div className="lab-metrica lab-metrica-modo">
            <span className="mono">fuente</span>
            <b>{modo === "api" ? "API" : modo === "demo" ? "local" : "…"}</b>
            <em>{modo === "api" ? "datos reales de nodos" : "demostración sin red"}</em>
          </div>
        </div>
      </header>

      <div className="lab-marco">
        <nav className="lab-tabs" role="tablist" aria-label="Herramientas del laboratorio">
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              id={`lab-tab-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls={`lab-panel-${x.id}`}
              className={tab === x.id ? "activa" : ""}
              onClick={() => setTab(x.id)}
            >
              <span className="lab-tab-ico" aria-hidden>{x.ico}</span>
              <span><b>{x.t}</b><em>{x.d}</em></span>
              <i aria-hidden>↗</i>
            </button>
          ))}
          <div className="lab-tabs-pie mono">
            <span className="punto-vivo" /> entorno local
            <small>nada de esto toca la red real</small>
          </div>
        </nav>

        <section className="lab-panel" id={`lab-panel-${tab}`} role="tabpanel" aria-labelledby={`lab-tab-${tab}`}>
          {tab === "consola" && (
            <Consola
              api={api} reales={reales} ruta={ruta} conectado={conectado}
              setConectado={setConectado} nuevaRuta={nuevaRuta}
            />
          )}
          {tab === "explorador" && <Explorador ruta={ruta} reales={reales} api={api} />}
          {tab === "inspector" && <Inspector />}
          {tab === "fallos" && <Fallos ruta={ruta} reales={reales} api={api} />}
        </section>
      </div>
    </div>
  );
}

/* ─────────────── Consola ─────────────── */
function Consola({ api, reales, ruta, conectado, setConectado, nuevaRuta }) {
  const [lineas, setLineas] = useState([
    { k: "sistema", t: "JUMPERNET LAB · consola educativa v1" },
    { k: "dim", t: "Escribe «help» para ver los comandos. Nada de lo que hagas aquí sale de tu navegador." },
    { k: "out", t: "" },
    { k: "out", t: "  circuito    ○ apagado" },
    { k: "out", t: "  saltos      —" },
    { k: "out", t: "  cifrado     JENC · ChaCha20-Poly1305" },
    { k: "out", t: "  registros   0" },
    { k: "dim", t: "Prueba: connect → status → rotate → disconnect" },
  ]);
  const [valor, setValor] = useState("");
  const [historial, setHistorial] = useState([]);
  const [hpos, setHpos] = useState(-1);
  const salida = useRef(null);
  const entrada = useRef(null);

  useEffect(() => {
    const el = salida.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lineas]);

  function añade(...nuevas) {
    setLineas((l) => [...l, ...nuevas.map((x) => (typeof x === "string" ? { k: "out", t: x } : x))]);
  }

  function ejecuta(orden) {
    const cmd = orden.trim();
    if (!cmd) return;
    añade({ k: "cmd", t: `visitante@jumpernet:~$ ${cmd}` });
    setHistorial((h) => [cmd, ...h].slice(0, 40));
    setHpos(-1);
    const [base, ...args] = cmd.split(/\s+/);

    switch (base.toLowerCase()) {
      case "help":
        añade(
          { k: "ok", t: "COMANDOS DISPONIBLES" },
          ...AYUDA.map(([c, d]) => ({ k: "ayuda", t: `  ${c.padEnd(12)} ${d}` })),
          { k: "dim", t: "También puedes usar: about, whoami." }
        );
        break;
      case "status":
        añade(
          { k: conectado ? "ok" : "warn", t: conectado ? "● CIRCUITO SIMULADO ENCENDIDO" : "○ CIRCUITO APAGADO" },
          { k: "out", t: `  saltos      ${conectado ? ruta.join(" → ") : "—"}` },
          { k: "out", t: `  cifrado     ${conectado ? "JENC · ChaCha20-Poly1305" : "en espera"}` },
          { k: "out", t: `  registros   ${conectado ? "0 (no se guarda tráfico)" : "0"}` },
          { k: "dim", t: `  fuente      ${api === "ok" ? "nombres de nodos leídos de la API" : "demostración local"}` }
        );
        break;
      case "nodes":
        if (api === "ok" && reales.length) {
          añade({ k: "ok", t: `NODOS DEVUELTOS POR LA API · ${reales.length}` });
          reales.slice(0, 8).forEach((n) => {
            añade({ k: "ayuda", t: `  ${String(n.nombre).padEnd(14)} ${n.estado === "vivo" ? "● vivo" : "○ " + (n.estado || "sin estado")}${n.ms != null ? ` · ${n.ms} ms` : ""}${n.tipo === "usuario" ? " · equipo" : ""}` });
          });
          if (reales.length > 8) añade({ k: "dim", t: `  … y ${reales.length - 8} más` });
        } else {
          añade(
            { k: "warn", t: api === "cargando" ? "La API todavía está respondiendo; te enseño la lista local." : "API no accesible ahora mismo; lista de demostración." },
            ...DEMO.map((n, i) => ({ k: "ayuda", t: `  ${n.padEnd(14)} ● vivo · ${4 + i} ms · demo` }))
          );
        }
        break;
      case "route":
        añade(
          { k: conectado ? "ok" : "warn", t: conectado ? "RUTA ACTUAL (SIMULADA)" : "No hay ruta: el circuito está apagado." },
          ...(conectado ? ruta.map((n, i) => ({ k: "out", t: `  ${i + 1}. ${n}${i === 2 ? "  ← exit" : ""}` })) : [])
        );
        break;
      case "connect":
        if (conectado) { añade({ k: "warn", t: "Ya hay un circuito simulado encendido. Usa rotate o disconnect." }); break; }
        setConectado(true);
        añade(
          { k: "ok", t: "Abriendo circuito de demostración…" },
          { k: "out", t: `[✓] 3 saltos: ${nuevaRuta().join(" → ")}` },
          { k: "out", t: "[✓] capas JENC preparadas · 0 registros" },
          { k: "dim", t: api === "ok" ? "Los nombres vienen de la API; la conexión es local y educativa." : "Modo demostración: no se ha abierto ninguna conexión real." }
        );
        break;
      case "disconnect":
        if (!conectado) añade({ k: "warn", t: "El circuito ya estaba apagado." });
        else { setConectado(false); añade({ k: "ok", t: "Circuito simulado apagado. Ningún paquete sale." }); }
        break;
      case "rotate":
        if (!conectado) añade({ k: "warn", t: "Enciende primero el circuito con «connect»." });
        else añade({ k: "ok", t: `Nueva ruta: ${nuevaRuta().join(" → ")}` }, { k: "dim", t: "La sesión no se corta: es el mismo gesto que el botón «girar relés» del panel." });
        break;
      case "encryption":
        añade(
          { k: "ok", t: "TRES CAPAS, UN SOBRE" },
          { k: "out", t: "  JENC-3  capa externa · la abre el salto 1" },
          { k: "out", t: "  JENC-2  capa media   · la abre el salto 2" },
          { k: "out", t: "  JENC-1  capa interna · la abre el exit" },
          { k: "dim", t: "Cada nodo retira solo su capa. ChaCha20-Poly1305 autentica el paquete en cada tramo." }
        );
        break;
      case "clear":
        setLineas([{ k: "dim", t: "Consola limpia. Escribe «help» cuando quieras." }]);
        break;
      case "about":
        añade(
          { k: "ok", t: "JUMPERNET LAB" },
          { k: "out", t: "Un laboratorio para entender cómo viaja una conexión por tres saltos." },
          { k: "dim", t: "No es una VPN ni una red de anonimato de grado onion. Es una herramienta educativa con un proxy real detrás." }
        );
        break;
      case "whoami":
        añade({ k: "out", t: "visitante local · sin cuenta y sin datos guardados en esta consola" });
        break;
      default:
        añade({ k: "error", t: `orden no reconocida: ${base}${args.length ? " " + args.join(" ") : ""}` }, { k: "dim", t: "Prueba con «help»." });
    }
  }

  function teclas(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      ejecuta(valor);
      setValor("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!historial.length) return;
      const p = Math.min(historial.length - 1, hpos + 1);
      setHpos(p);
      setValor(historial[p]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const p = Math.max(-1, hpos - 1);
      setHpos(p);
      setValor(p < 0 ? "" : historial[p]);
    }
  }

  const rapidos = ["help", "status", conectado ? "rotate" : "connect", "nodes", "encryption"];

  return (
    <div className="lab-consola">
      <div className="lab-ventana" onClick={() => entrada.current?.focus()}>
        <header className="lab-ventana-cab">
          <span className="lab-puntos" aria-hidden><i /><i /><i /></span>
          <span className="mono">jumpernet@lab — zsh</span>
          <span className={`lab-conexion mono ${conectado ? "on" : ""}`}>
            <i aria-hidden /> {conectado ? "circuito simulado" : "sin circuito"}
          </span>
        </header>

        <div className="lab-salida" ref={salida} role="log" aria-live="polite" aria-label="Salida de la consola">
          {lineas.map((l, i) => <div key={i} className={`lab-linea ${l.k}`}>{l.t}</div>)}
        </div>

        <div className="lab-entrada">
          <span className="mono lab-prompt">visitante@jumpernet:~$</span>
          <input
            ref={entrada}
            className="mono"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={teclas}
            placeholder="help"
            aria-label="Escribe un comando del laboratorio"
            autoComplete="off"
            spellCheck="false"
          />
          <span className="lab-caret" aria-hidden>▊</span>
        </div>
      </div>

      <aside className="lab-lateral">
        <div className="lab-lateral-bloque">
          <span className="migas">comandos rápidos</span>
          <div className="lab-chips">
            {rapidos.map((c) => (
              <button key={c} type="button" className="mono" onClick={() => ejecuta(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="lab-lateral-bloque lab-ayuda">
          <span className="migas">qué puedes probar</span>
          <ol>
            <li><b>connect</b><span>abre una ruta simulada con nombres reales de nodos.</span></li>
            <li><b>rotate</b><span>cambia los saltos sin perder la sesión.</span></li>
            <li><b>encryption</b><span>entiende las tres capas JENC.</span></li>
          </ol>
        </div>
        <p className="lab-nota mono">
          <i aria-hidden>!</i> Consola local. El circuito real se controla desde el panel y empieza apagado.
        </p>
      </aside>
    </div>
  );
}

/* ─────────────── Explorador ─────────────── */
function Explorador({ ruta, reales, api }) {
  const [sel, setSel] = useState(0);
  const paradas = [
    { ...PARADAS[0], nombre: "Tú" },
    ...ruta.map((n, i) => ({ ...PARADAS[i + 1], nombre: n })),
    { ...PARADAS[4], nombre: "Internet" },
  ];
  const p = paradas[sel];
  const dato = reales.find((n) => n.nombre === p.nombre);

  return (
    <div className="lab-explorador">
      <div className="lab-explorador-cab">
        <div>
          <span className="migas">topología actual · simulación</span>
          <h2>Tres saltos hasta el destino</h2>
        </div>
        <span className={`lab-fuente mono ${api}`}>
          {api === "ok" ? "nombres reales de la API" : api === "error" ? "API no accesible · nombres de muestra" : "consultando API…"}
        </span>
      </div>

      <div className="lab-ruta" role="group" aria-label="Saltos del circuito">
        {paradas.map((x, i) => (
          <div className="lab-ruta-paso" key={`${x.nombre}-${i}`}>
            {i > 0 && <span className="lab-ruta-flecha" aria-hidden>→</span>}
            <button
              type="button"
              className={`lab-nodo ${sel === i ? "sel" : ""} ${i === 4 ? "destino" : ""}`}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
            >
              <span className="lab-nodo-n mono">0{i + 1}</span>
              <span className="lab-nodo-punto" aria-hidden />
              <b>{x.nombre}</b>
              <em>{x.sub}</em>
              <span className="lab-nodo-rol mono">{x.rol}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="lab-ficha" aria-live="polite">
        <div className="lab-ficha-cab">
          <div>
            <span className="mono">{String(sel).padStart(2, "0")} · {p.sub}</span>
            <h3>{p.nombre}</h3>
          </div>
          <span className={`lab-ficha-estado mono ${dato?.estado === "vivo" ? "on" : ""}`}>
            <i aria-hidden /> {dato ? (dato.estado === "vivo" ? "vivo" : dato.estado || "sin estado") : "simulado"}
          </span>
        </div>
        <div className="lab-ficha-dos">
          <div><span className="mono">qué ve</span><p>{p.ve}</p></div>
          <div><span className="mono">qué no ve</span><p>{p.no}</p></div>
        </div>
        <p className="lab-ficha-nota">{p.nota}</p>
        <dl className="lab-ficha-datos">
          <div><dt className="mono">latencia</dt><dd>{dato?.ms != null ? `${dato.ms} ms` : "—"}</dd></div>
          <div><dt className="mono">conexiones</dt><dd>{dato?.conexiones != null ? dato.conexiones : "—"}</dd></div>
          <div><dt className="mono">último latido</dt><dd>{dato?.ultimo_hb != null ? `hace ${Math.max(0, Math.round(dato.ultimo_hb))} s` : "—"}</dd></div>
          <div><dt className="mono">tipo</dt><dd>{dato ? (dato.tipo === "usuario" ? "equipo" : dato.tipo || "infra") : "—"}</dd></div>
        </dl>
        {api !== "ok" && (
          <p className="lab-ficha-aviso mono">Las métricas de los nodos necesitan la API. La ruta y el papel de cada salto sí son funcionales.</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Inspector ─────────────── */
function Inspector() {
  const [paso, setPaso] = useState(0);
  const p = PARADAS[paso];
  const capas = paso === 0 ? 3 : Math.max(0, 3 - paso);

  return (
    <div className="lab-inspector">
      <div className="lab-inspector-cab">
        <div>
          <span className="migas">el paquete, por dentro</span>
          <h2>Qué se lleva y qué se queda en cada salto</h2>
        </div>
        <div className="lab-inspector-pasos" role="group" aria-label="Paso del paquete">
          <button type="button" className="btn" onClick={() => setPaso((n) => Math.max(0, n - 1))} disabled={paso === 0}>←</button>
          <span className="mono">{paso + 1} / {PARADAS.length}</span>
          <button type="button" className="btn" onClick={() => setPaso((n) => Math.min(PARADAS.length - 1, n + 1))} disabled={paso === PARADAS.length - 1}>→</button>
        </div>
      </div>

      <div className="lab-inspector-cuerpo">
        <div className="lab-paquete-visual">
          <div className="lab-paquete">
            {[3, 2, 1].map((n) => (
              <div key={n} className={`lab-capa c${n} ${n > capas ? "abierta" : ""}`}>
                <span className="mono">JENC · capa {n}</span>
                <i aria-hidden />
              </div>
            ))}
            <div className="lab-paquete-nucleo">
              <span className="mono">destino</span>
              <b>{paso >= 3 ? "api.ipify.org" : "cifrado"}</b>
              <em>{paso === 0 ? "tu equipo lo sella" : paso >= 3 ? "el exit lo entrega" : "solo viaja el sobre"}</em>
            </div>
          </div>
          <div className="lab-pasos">
            {PARADAS.map((x, i) => (
              <button key={x.t} type="button" className={i === paso ? "activo" : ""} onClick={() => setPaso(i)} aria-label={`Ver ${x.nombre}`}>
                <i aria-hidden />
                <span className="mono">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lab-inspector-ficha" aria-live="polite">
          <span className="mono lab-inspector-kicker">parada {paso + 1} · {p.sub}</span>
          <h3>{p.nombre}</h3>
          <div className="lab-inspector-bloques">
            <div className="lab-inspector-bloque ver">
              <span className="mono">✓ puede ver</span>
              <p>{p.ve}</p>
            </div>
            <div className="lab-inspector-bloque nover">
              <span className="mono">✕ no puede ver</span>
              <p>{p.no}</p>
            </div>
          </div>
          <table className="lab-tabla">
            <caption className="mono">el paquete en este punto</caption>
            <tbody>
              <tr><th>capas JENC restantes</th><td>{capas} de 3</td></tr>
              <tr><th>remitente visible</th><td>{paso === 0 ? "tú" : "el salto anterior"}</td></tr>
              <tr><th>destino visible</th><td>{paso >= 3 ? "api.ipify.org:443" : "solo el siguiente salto"}</td></tr>
              <tr><th>contenido</th><td>{paso >= 4 ? "respuesta HTTP" : "cifrado"}</td></tr>
            </tbody>
          </table>
          <p className="lab-nota mono">El inspector muestra el modelo educativo de JENC. No descifra tráfico real.</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Fallos ─────────────── */
function Fallos({ ruta, reales, api }) {
  const [caidos, setCaidos] = useState([false, false, false]);
  const activos = caidos.filter((c) => !c).length;
  const reserva = reales.find((n) => n.estado === "vivo" && !ruta.includes(n.nombre))?.nombre || null;
  const estado = activos === 3 ? "estable" : activos === 2 ? "reruta" : "critico";

  function alterna(i) {
    setCaidos((c) => c.map((v, k) => (k === i ? !v : v)));
  }

  return (
    <div className="lab-fallos">
      <div className="lab-inspector-cab">
        <div>
          <span className="migas">simulador de fallos · educativo</span>
          <h2>¿Qué pasa si un salto se cae?</h2>
        </div>
        <span className={`lab-fallos-estado mono ${estado}`}>
          <i aria-hidden /> {estado === "estable" ? "circuito estable" : estado === "reruta" ? "rerutando" : "sin ruta suficiente"}
        </span>
      </div>

      <div className="lab-fallos-cuerpo">
        <div className="lab-fallos-controles">
          <p className="lab-lead-corto">
            Apaga un nodo y mira la reacción. La simulación no cambia el circuito real:
            el panel es el único que puede hacerlo.
          </p>
          <div className="lab-fallos-lista">
            {ruta.map((n, i) => (
              <div key={`${n}-${i}`} className={`lab-fallo ${caidos[i] ? "caido" : ""}`}>
                <span className="mono">0{i + 1}</span>
                <div><b>{n}</b><em>{caidos[i] ? "fuera de servicio" : "vivo · reenviando"}</em></div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={caidos[i]}
                  aria-label={`${caidos[i] ? "Recuperar" : "Tumbar"} ${n}`}
                  className="lab-fallo-switch"
                  onClick={() => alterna(i)}
                >
                  <span />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => setCaidos([false, false, false])} disabled={estado === "estable"}>
            Restablecer los tres nodos
          </button>
          <p className="lab-nota mono">
            {api === "ok" ? "La lista de nodos de reserva viene de la API." : "Sin API no hay reserva real: la reruta se muestra como concepto."}
          </p>
        </div>

        <div className={`lab-fallos-diagrama ${estado}`}>
          <div className="lab-fallos-titulo mono">
            <span>tu equipo</span><span>salto 1</span><span>salto 2</span><span>salida</span><span>destino</span>
          </div>
          <div className="lab-fallos-linea" aria-hidden>
            <span className="lab-fallos-paquete" />
          </div>
          <div className="lab-fallos-nodos">
            <span className="lab-fallos-nodo fijo">TÚ</span>
            {ruta.map((n, i) => (
              <span key={`${n}-${i}`} className={`lab-fallos-nodo ${caidos[i] ? "muerto" : ""}`}>
                <b>{caidos[i] ? "×" : "●"}</b>
                <em>{n}</em>
              </span>
            ))}
            <span className="lab-fallos-nodo fijo">WEB</span>
          </div>

          <div className="lab-fallos-resultado">
            {estado === "estable" && (
              <>
                <b>Ruta completa.</b>
                <p>Los tres saltos responden. El paquete cruza el circuito y vuelve por el mismo camino.</p>
              </>
            )}
            {estado === "reruta" && (
              <>
                <b>Reruta simulada.</b>
                <p>Dos saltos siguen vivos. El circuito buscaría {reserva ? <span className="mono">{reserva}</span> : "un nodo de reserva"} y continuaría sin revelar tu IP.</p>
              </>
            )}
            {estado === "critico" && (
              <>
                <b>Sin ruta suficiente.</b>
                <p>Quedan menos de dos relés sanos. Un circuito de tres saltos no puede completarse: el tráfico no saldría.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
