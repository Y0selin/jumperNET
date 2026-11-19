import { useEffect, useRef, useState } from "react";
import GlifosFondo from "./GlifosFondo.jsx";
import Autenticacion from "./Autenticacion.jsx";
import Descargas from "./Descargas.jsx";
import Tarifas from "./Tarifas.jsx";
import TerminalVivo from "./TerminalVivo.jsx";
import Revela from "./Revela.jsx";
import { Tuberia, Escalon } from "./Piezas.jsx";
import { nodos as nodosApi } from "../lib/api.js";

/* PortadaPremium: la cara pública del proyecto. Una sola página, con el
   acceso al final (#acceso) tal y como promete el diseño: los botones del
   hero y de la barra desplazan hasta el formulario sin cambiar de vista. */

const FRASES = [
  "viaja por 3 nodos aleatorios…",
  "va cifrada en cada salto…",
  "sale a internet solo por 80/443…",
  "cambia la IP que ve el destino…",
  "solo se mueve si tú la enciendes…",
];

const ENLACES = [
  { id: "circuito", texto: "El circuito" },
  { id: "piezas", texto: "Piezas" },
  { id: "como", texto: "Cómo funciona" },
  { id: "planes", texto: "Tarifas" },
  { id: "preguntas", texto: "Dudas" },
];

const PIEZAS = [
  {
    ico: "◈",
    tag: "route",
    tit: "Circuito de 3 saltos",
    txt: "La red elige tres nodos vivos al azar y abre tu ruta. Si quieres otra, «girar» te da un circuito nuevo sin cortar la sesión.",
    pies: ["nodos al azar", "cambio en caliente"],
  },
  {
    ico: "⛨",
    tag: "crypto",
    tit: "Cifrado por capas",
    txt: "Del primer salto al de salida el flujo viaja con ChaCha20-Poly1305. Los intermedios reenvían a ciegas: no entienden ni guardan lo que llevas.",
    pies: ["JENC", "AEAD", "reenvío ciego"],
  },
  {
    ico: "◎",
    tag: "real",
    tit: "La IP cambia de verdad",
    txt: "Nada de estimaciones: el panel lanza una petición real por tu circuito y te enseña la IP que ha visto el destino.",
    pies: ["comprobación real", "latencia medida"],
  },
  {
    ico: "⛓",
    tag: "hive",
    tit: "La red, a la vista",
    txt: "Cada salto es un contenedor en el servidor. El panel enseña estado por latido, latencia TCP, conexiones vivas y su papel en tu ruta.",
    pies: ["heartbeat", "10 s en vivo"],
  },
];

const DUDAS = [
  ["¿La IP cambia de verdad?", "Sí — y puedes comprobarlo tú: el panel lanza una petición real por el circuito y te enseña la IP que vio el destino. Si no coincide con la tuya, el circuito está haciendo su trabajo."],
  ["¿Se enciende sola al entrar?", "No. La red llega apagada: el interruptor es tuyo. Nada se conecta hasta que lo pulsas, y puedes apagarla o girar el circuito cuando quieras."],
  ["¿Qué guarda el sistema de mí?", "Tu email, el estado del circuito y cuándo cambió. Nada más: no hay histórico de webs ni de destinos, y puedes borrar la cuenta de golpe."],
  ["¿Cuánto añade de latencia?", "La de tres saltos más el cifrado: normalmente entre 40 y 120 ms extra. Bien para navegar y buscar; no lo recomendamos para juegos competitivos."],
  ["¿Los nodos son de terceros?", "Son de laboratorio: contenedores en el servidor del proyecto. Además puedes aportar tu propio equipo como nodo voluntario si aceptas ser salto."],
];

function Typewriter({ frases, velocidad = 46 }) {
  const [txt, setTxt] = useState("");
  const [i, setI] = useState(0);
  const [borra, setBorra] = useState(false);
  useEffect(() => {
    const objetivo = frases[i % frases.length];
    let t;
    if (!borra && txt === objetivo) t = setTimeout(() => setBorra(true), 2000);
    else if (borra && txt === "") { setBorra(false); setI((v) => (v + 1) % frases.length); }
    else t = setTimeout(() => setTxt(objetivo.slice(0, txt.length + (borra ? -1 : 1))), borra ? 22 : velocidad);
    return () => clearTimeout(t);
  }, [txt, borra, i, frases, velocidad]);
  return (
    <span className="pp-maquina" aria-live="off">
      {txt}
      <span className="cursor">▊</span>
    </span>
  );
}

/* contador que arranca cuando entra en pantalla */
function Cuenta({ hasta, sufijo = "", duracion = 1100 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const ya = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const arranca = () => {
      if (ya.current) return;
      ya.current = true;
      const t0 = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - t0) / duracion);
        setN(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };
    if (typeof IntersectionObserver !== "function") { arranca(); return; }
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { arranca(); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasta, duracion]);
  return <span ref={ref} className="mono">{n}{sufijo}</span>;
}

function Orbita() {
  return (
    <div className="pp-orbita" aria-hidden>
      <div className="pp-orbita-halo" />
      <div className="pp-anillo pp-anillo-1" />
      <div className="pp-anillo pp-anillo-2" />
      <div className="pp-anillo pp-anillo-3" />
      <div className="pp-nucleo">
        <span className="pp-nucleo-logo">JN</span>
        <span className="pp-nucleo-etq mono">exit · 80/443</span>
      </div>
      <div className="pp-giro pp-giro-1"><span className="pp-satelite">n1</span></div>
      <div className="pp-giro pp-giro-2"><span className="pp-satelite pp-satelite-b">n2</span></div>
      <div className="pp-giro pp-giro-3"><span className="pp-satelite pp-satelite-c">n3</span></div>
      <span className="pp-chispa pp-chispa-1" />
      <span className="pp-chispa pp-chispa-2" />
    </div>
  );
}

export default function PortadaPremium({ enSesion = false, alEntrar, aviso, ir }) {
  const [modoAuth, setModoAuth] = useState("login");
  const [pegada, setPegada] = useState(false);
  const [vivos, setVivos] = useState(null);
  const [sinApi, setSinApi] = useState(false);
  const [abierta, setAbierta] = useState(0);

  useEffect(() => {
    const alScroll = () => setPegada(window.scrollY > 14);
    window.addEventListener("scroll", alScroll, { passive: true });
    alScroll();
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  useEffect(() => {
    let vivo = true;
    /* /nodos es público (no pide sesión), al contrario que /nodosvivos:
       así el contador funciona para cualquiera que llegue a la portada. */
    const pide = () => nodosApi()
      .then((lista) => {
        if (!vivo) return;
        const vivos = (lista || []).filter((n) => n.estado === "vivo");
        setVivos({
          total: vivos.length,
          infra: vivos.filter((n) => n.tipo !== "usuario").length,
          equipos: vivos.filter((n) => n.tipo === "usuario").length,
        });
        setSinApi(false);
      })
      .catch(() => { if (vivo) setSinApi(true); });
    pide();
    const t = setInterval(pide, 15000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  function acceso(modo = "login") {
    setModoAuth(modo);
    window.setTimeout(() => document.getElementById("acceso")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function salta(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const total = vivos?.total;
  const infra = vivos?.infra;
  const equipos = vivos?.equipos;

  return (
    <div className="pp">
      <GlifosFondo />

      {/* ───── barra superior ───── */}
      <header className={`pp-nav ${pegada ? "pegada" : ""}`}>
        <a className="pp-marca" href="#arriba" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <span className="logo-cubo">JN</span>
          <span className="pp-marca-txt">Jumper<span>NET</span><i className="cursor">_</i></span>
          <span className="chip mono pp-nav-chip">3 saltos</span>
        </a>
        <nav className="pp-enlaces" aria-label="Secciones">
          {ENLACES.map((e) => (
            <button key={e.id} className="pp-enlace" onClick={() => salta(e.id)}>{e.texto}</button>
          ))}
        </nav>
        <div className="pp-nav-acciones">
          {enSesion ? (
            <button className="btn primario" onClick={() => ir?.("red")}>Abrir panel →</button>
          ) : (
            <>
              <button className="btn pp-oculto-movil" onClick={() => acceso("login")}>Entrar</button>
              <button className="btn primario" onClick={() => acceso("registro")}>Crear cuenta</button>
            </>
          )}
        </div>
      </header>

      <main id="arriba" className="pp-main">

        {/* ───── hero ───── */}
        <section className="pp-hero hero">
          <span className="pp-badge mono apa">
            <span className="punto-vivo" /> red de anonimato casera · 3 saltos · cifrado JENC
          </span>
          <h1 className="pp-titulo apa-1 apa">
            <span className="pp-titulo-marca mono">JumperNET</span>
            Tu conexión <span className="pp-titulo-grad">no va sola</span>
          </h1>
          <p className="pp-sub mono apa-2 apa">
            <Typewriter frases={FRASES} />
          </p>
          <p className="pp-lead nota apa-3 apa">
            Un proxy <b>SOCKS5 con cuentas</b> que elige tres nodos vivos al azar, cifra cada salto
            y sale a internet por los nodos de salida. Tú enciendes la red cuando quieres y ves
            por dónde va tu tráfico, salto a salto.
          </p>

          <div className="pp-acciones apa-4 apa">
            {enSesion ? (
              <button className="btn primario grande" onClick={() => ir?.("red")}>▸ Ir a mi panel</button>
            ) : (
              <>
                <button className="btn primario grande" onClick={() => acceso("registro")}>▸ Crear mi cuenta</button>
                <button className="btn grande" onClick={() => acceso("login")}>Ya tengo cuenta</button>
              </>
            )}
          </div>

          <div className="pp-hero-escena">
            <Orbita />
            <div className="pp-hero-panel tarjeta brillo">
              <div className="pp-panel-cab">
                <span className="etiqueta-viva">circuito en vivo</span>
                <span className={`chip ${total ? "vivo" : ""} mono`}>
                  {total != null ? `${total} nodos activos` : sinApi ? "red no consultable" : "midiendo red…"}
                </span>
              </div>
              <Tuberia activo saltos={["nodo₁", "nodo₂", "nodo₃ · exit"]} paquetes={5} />
              <div className="pp-hero-datos">
                <div><span className="etq mono">cifrado</span><b className="val mono">ChaCha20</b></div>
                <div><span className="etq mono">puertos</span><b className="val mono">80 / 443</b></div>
                <div><span className="etq mono">sesión</span><b className="val mono">2 h</b></div>
                <div><span className="etq mono">histórico</span><b className="val mono">ninguno</b></div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── cinta infinita ───── */}
        <div className="pp-cinta" aria-hidden>
          <div className="pp-cinta-pista">
            {[0, 1].map((k) => (
              <div className="pp-cinta-grupo" key={k}>
                {["SOCKS5 autenticado", "3 saltos al azar", "ChaCha20-Poly1305", "REENVÍO CIEGO",
                  "Solo 80/443", "Anti-IP-privada", "Anti-metadata", "JWT 2 h", "Latencia real",
                  "Nodos en Docker"].map((t) => (
                    <span key={t} className="pp-cinta-item mono"><i>◆</i>{t}</span>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* ───── el circuito ───── */}
        <section id="circuito" className="pp-seccion">
          <Revela className="pp-cab">
            <span className="migas">por dentro</span>
            <h2 className="pp-h2">Un circuito de tres saltos,<br /><span className="texto-gradiente">sin cajas negras</span></h2>
            <p className="pp-sub2 nota">
              Entrada SOCKS5 autenticada con tu misma cuenta, tres relés que solo reenvían y una
              salida que valida el destino antes de tocar internet. Esto es lo que pasa con cada paquete.
            </p>
          </Revela>

          <div className="pp-flujo">
            <div className="pp-flujo-linea" />
            {[
              { n: "TÚ", d: "tu equipo", t: "origen" },
              { n: "entrada", d: "SOCKS5 :1080", t: "auth" },
              { n: "nodo₁", d: "relé ciego", t: "jenc" },
              { n: "nodo₂", d: "relé ciego", t: "jenc" },
              { n: "nodo₃", d: "salida · exit", t: "exit" },
              { n: "internet", d: "solo 80/443", t: "destino" },
            ].map((p, i) => (
              <Revela key={p.n} retardo={Math.min(4, i + 1)} className={`pp-parada pp-parada-${p.t}`}>
                <span className="pp-parada-n mono">{String(i + 1).padStart(2, "0")}</span>
                <b>{p.n}</b>
                <span className="mono">{p.d}</span>
              </Revela>
            ))}
          </div>

          <div className="pp-cascada">
            <div className="pp-cascada-item"><span className="mono">01</span><div><b>Autenticación real</b><p className="nota">Usuario y contraseña de tu cuenta, verificados contra la API con argon2id.</p></div></div>
            <div className="pp-cascada-item"><span className="mono">02</span><div><b>Cifrado por capas</b><p className="nota">Cada salto añade su capa JENC; solo el exit puede descifrar el contenido.</p></div></div>
            <div className="pp-cascada-item"><span className="mono">03</span><div><b>Salida validada</b><p className="nota">Se resuelve y revalida el destino: nada de IP privadas, loopback ni metadata.</p></div></div>
          </div>
        </section>

        {/* ───── piezas ───── */}
        <section id="piezas" className="pp-seccion">
          <Revela className="pp-cab">
            <span className="migas">qué te llevas</span>
            <h2 className="pp-h2">Cuatro piezas, <span className="texto-gradiente">una red</span></h2>
          </Revela>
          <div className="pp-grid">
            {PIEZAS.map((p, i) => (
              <Revela key={p.tit} retardo={Math.min(4, i + 1)} className="pp-pieza tarjeta brillo">
                <div className="pp-pieza-top">
                  <span className="pp-pieza-ico flota" style={{ animationDelay: `${i * 0.35}s` }}>{p.ico}</span>
                  <span className="pp-pieza-tag mono">{p.tag}</span>
                  <span className="pp-pieza-num mono">0{i + 1}</span>
                </div>
                <h3>{p.tit}</h3>
                <p className="nota">{p.txt}</p>
                <div className="pp-pieza-pies">
                  {p.pies.map((x) => <span key={x} className="chip mono">{x}</span>)}
                </div>
              </Revela>
            ))}
          </div>
        </section>

        {/* ───── cómo funciona ───── */}
        <section id="como" className="pp-seccion">
          <Revela className="pp-cab">
            <span className="migas">de cero a navegar</span>
            <h2 className="pp-h2">Cuatro pasos y <span className="texto-gradiente">estás dentro</span></h2>
          </Revela>
          <div className="pp-dos">
            <Revela className="tarjeta pp-pasos">
              <Escalon n="1" titulo="Creas tu cuenta">solo email y contraseña; nada de datos personales.</Escalon>
              <Escalon n="2" titulo="Pulsas el interruptor">el circuito nace cuando tú lo pides, no antes.</Escalon>
              <Escalon n="3" titulo="Copias el comando SOCKS5">el puerto 1080 acepta tus mismas credenciales.</Escalon>
              <Escalon n="4" titulo="Compruebas y navegas">ves los saltos, su latencia y la IP con la que sales.</Escalon>
              <div className="pp-codigo copiabloque">
                <header><span className="rotulo"><span className="punto" style={{ background: "var(--acento-1)" }} />terminal</span><span className="mono">tu@correo</span></header>
                <pre>{`curl --socks5-hostname jumpernet.duckdns.org:1080 \\
     --proxy-user 'tu@correo:TU_CLAVE' \\
     https://api.ipify.org`}</pre>
              </div>
            </Revela>
            <Revela className="pp-terminal" retardo={1}>
              <TerminalVivo />
              <div className="pp-terminal-pie nota">
                La terminal es una <b>simulación</b> del flujo. Los datos reales los enseña el panel
                cuando enciendes la red: estado, latencia y la IP observada por el destino.
              </div>
            </Revela>
          </div>
        </section>

        {/* ───── métricas vivas ───── */}
        <Revela className="pp-metricas tarjeta">
          <div className="pp-metricas-cab">
            <span className="etiqueta-viva">la red ahora mismo</span>
            <span className="nota mono">se actualiza cada 15 s · sin sesión</span>
          </div>
          <div className="pp-metricas-grid">
            <div className="pp-metrica"><span className="etq mono">nodos activos</span><b>{total != null ? <Cuenta hasta={total} /> : "—"}</b><span className="pie mono">{sinApi ? "API no accesible ahora" : `${infra != null ? `${infra} infra` : "…"} · ${equipos != null ? `${equipos} equipos` : "…"}`}</span></div>
            <div className="pp-metrica"><span className="etq mono">saltos por circuito</span><b><Cuenta hasta={3} /></b><span className="pie mono">elegidos al azar</span></div>
            <div className="pp-metrica"><span className="etq mono">cifrado</span><b className="pp-b-txt">ChaCha20</b><span className="pie mono">Poly1305 · JENC</span></div>
            <div className="pp-metrica"><span className="etq mono">puertos de salida</span><b className="pp-b-txt">80 / 443</b><span className="pie mono">nada más</span></div>
          </div>
        </Revela>

        {/* ───── descargas ───── */}
        <section className="pp-seccion">
          <Revela className="pp-cab">
            <span className="migas">público · sin entrar</span>
            <h2 className="pp-h2">Lleva el circuito a <span className="texto-gradiente">tu navegador</span></h2>
            <p className="pp-sub2 nota">Extensión para el navegador que ya usas, o el navegador completo ya conectado. Descargas siempre disponibles.</p>
          </Revela>
          <Revela><Descargas compacto /></Revela>
        </section>

        {/* ───── tarifas ───── */}
        <section id="planes" className="pp-seccion">
          <Tarifas irAuth={acceso} />
        </section>

        {/* ───── dudas ───── */}
        <section id="preguntas" className="pp-seccion">
          <Revela className="pp-cab">
            <span className="migas">antes de entrar</span>
            <h2 className="pp-h2">Dudas <span className="texto-gradiente">rápidas</span></h2>
          </Revela>
          <div className="pp-faq">
            {DUDAS.map(([q, r], i) => (
              <Revela key={q} retardo={Math.min(3, i)}>
                <button
                  className={`pp-faq-item ${abierta === i ? "abierta" : ""}`}
                  onClick={() => setAbierta(abierta === i ? -1 : i)}
                  aria-expanded={abierta === i}
                >
                  <span className="pp-faq-q"><i>▸</i>{q}</span>
                  <span className="pp-faq-r">{r}</span>
                </button>
              </Revela>
            ))}
          </div>
        </section>

        {/* ───── acceso ───── */}
        <section id="acceso" className="pp-acceso">
          <div className="pp-acceso-lado">
            <Revela>
              <span className="migas">el último paso</span>
              <h2 className="pp-h2">Enciende tu <span className="texto-gradiente">propia red</span></h2>
              <p className="pp-sub2 nota">
                Entras con tu email, la red elige tres nodos vivos y tú decides cuándo se enciende.
                Sin datos personales, sin histórico y con el interruptor siempre en tu mano.
              </p>
              <div className="pp-acceso-ventajas">
                {[
                  ["⚡", "Listo en 20 segundos", "crear cuenta y entrar; nada más"],
                  ["⏻", "Apagada por defecto", "nada se conecta sin tu permiso"],
                  ["◎", "Comprobación real", "verás la IP que ve internet"],
                  ["⛨", "Sin histórico", "ni webs, ni destinos, ni contenido"],
                ].map(([ic, t, d]) => (
                  <div key={t} className="pp-ventaja">
                    <span className="pp-ventaja-ico">{ic}</span>
                    <div><b>{t}</b><span className="nota mono">{d}</span></div>
                  </div>
                ))}
              </div>
              <div className="pp-acceso-mini mono">
                <span className="punto-vivo" />
                {total != null ? `${total} nodos activos ahora mismo` : sinApi ? "la API no responde ahora mismo" : "consultando la red…"}
              </div>
            </Revela>
          </div>

          <div className="pp-acceso-form">
            <Revela retardo={1}>
              <Autenticacion alEntrar={alEntrar} aviso={aviso} modoInicial={modoAuth} autoenfocar={false} />
            </Revela>
          </div>
        </section>

        <footer className="pp-pie">
          <div className="pp-pie-marca">
            <span className="logo-cubo">JN</span>
            <div>
              <div className="pp-marca-txt">Jumper<span>NET</span></div>
              <div className="nota mono">red de anonimato por 3 saltos · proyecto educativo</div>
            </div>
          </div>
          <div className="pp-pie-enlaces">
            <button onClick={() => salta("circuito")}>El circuito</button>
            <button onClick={() => salta("planes")}>Tarifas</button>
            <button onClick={() => salta("preguntas")}>Dudas</button>
            <a href="https://jumpernet.duckdns.org/docs/" target="_blank" rel="noreferrer">Documentación ↗</a>
            <a href="https://github.com/y0selin/jumperNET" target="_blank" rel="noreferrer">GitHub ↗</a>
          </div>
          <div className="nota mono pp-pie-legal">
            jumpernet.duckdns.org · API HTTPS · los saltos son lógicos, no geográficos ·
            no es anonimato de grado onion
          </div>
        </footer>
      </main>

      <button className={`pp-arriba ${pegada ? "visible" : ""}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Volver arriba">↑</button>
    </div>
  );
}
