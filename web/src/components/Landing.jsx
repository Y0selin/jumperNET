import { useEffect, useRef, useState } from "react";
import TerminalVivo from "./TerminalVivo.jsx";
import Descargas from "./Descargas.jsx";
import Revela from "./Revela.jsx";
import { Stat, Tuberia, Escalon, Hecho } from "./Piezas.jsx";

const FRASES = [
  "viaja por 3 nodos aleatorios…",
  "va cifrada en cada salto (ChaCha20)…",
  "sale a internet por 80/443…",
  "cambia la IP que ve el destino…",
  "solo se mueve si tú enciendes el interruptor…",
];

function Typewriter({ phrases, speed = 52 }) {
  const [txt, setTxt] = useState("");
  const [pi, setPi] = useState(0);
  const [borrar, setBorrar] = useState(false);
  useEffect(() => {
    const objetivo = phrases[pi % phrases.length];
    let t;
    if (!borrar && txt === objetivo) t = setTimeout(() => setBorrar(true), 2100);
    else if (borrar && txt === "") { setBorrar(false); setPi((p) => (p + 1) % phrases.length); }
    else t = setTimeout(() => setTxt(objetivo.slice(0, txt.length + (borrar ? -1 : 1))), borrar ? 24 : speed);
    return () => clearTimeout(t);
  }, [txt, borrar, pi, phrases, speed]);
  return <span>{txt}<span className="cursor">▊</span></span>;
}

function Contador({ hasta, sufijo = "" }) {
  const [n, setN] = useState(0);
  const visto = useRef(false);
  useEffect(() => {
    if (visto.current) return;
    visto.current = true;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1200);
      setN(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [hasta]);
  return <span className="mono">{n}{sufijo}</span>;
}

const FEATURES = [
  {
    ico: "🔀", tag: "route", tit: "Circuito de 3 saltos",
    desc: "Tu tráfico entra por el proxy SOCKS5 y salta por tres nodos elegidos al azar entre los vivos. Cada circuito es distinto: «girar» te da una ruta nueva al instante.",
    pies: ["nodos al azar", "cambio en caliente", "sin cortar la sesión"],
  },
  {
    ico: "🔒", tag: "crypto", tit: "Cifrado en capas",
    desc: "Del primer salto al de salida, tu stream viaja cifrado con ChaCha20-Poly1305 (AEAD). Los intermedios son reenvío ciego: no entienden ni guardan lo que llevas. Solo salen puertos 80/443.",
    pies: ["ChaCha20-Poly1305", "anti-IP-privada", "anti-metadata"],
  },
  {
    ico: "🛰", tag: "real", tit: "La IP sí cambia",
    desc: "Al salir por el circuito, internet ve la IP del nodo de salida, no la tuya. Y no tienes que creérnoslo: el panel lanza una petición real por tu circuito y te enseña la IP que vio el destino.",
    pies: ["comprobación real", "IP observada", "no es una estimación"],
  },
  {
    ico: "⛓", tag: "nodos", tit: "Todos los nodos a la vista",
    desc: "Los saltos son contenedores Docker reales en el servidor. El panel lista todos: estado por heartbeat, latencia TCP medida, cuántas conexiones reenvía cada uno y qué papel juega en tu circuito.",
    pies: ["heartbeat", "latencia real", "conexiones vivas"],
  },
];

export default function Landing({ irAuth }) {
  return (
    <div style={{ display: "grid", gap: 46 }}>

      {/* ───────────── hero ───────────── */}
      <section className="hero">
        <span className="etiqueta-seccion mono">[ red de anonimato por saltos · casera, como una TOR de laboratorio ]</span>
        <h1 className="titulo-animado" style={{ fontSize: "clamp(36px, 7vw, 62px)", lineHeight: 1.08, letterSpacing: "-.03em" }}>
          JumperNET
        </h1>
        <p className="mono" style={{ fontSize: "clamp(15px, 2.4vw, 20px)", color: "var(--texto)", margin: "12px 0 6px", minHeight: 30 }}>
          Tu conexión <Typewriter phrases={FRASES} />
        </p>
        <p className="nota" style={{ maxWidth: 680, fontSize: 15, margin: "8px auto 24px" }}>
          Un proxy SOCKS5 con cuentas de usuario: entras con tu email, la red elige
          <b> 3 nodos vivos al azar</b>, tu tráfico va cifrado entre ellos y la web de
          destino ve <b>la IP del nodo de salida</b>, no la tuya. Cada salto es un contenedor
          real en el servidor, y puedes verlos todos desde el panel.
        </p>
        <div className="fila-btn" style={{ maxWidth: 500, margin: "0 auto" }}>
          <button className="btn primario grande" onClick={() => irAuth("registro")}>▶ Crear mi cuenta</button>
          <button className="btn grande" onClick={() => irAuth("login")}>Ya tengo cuenta</button>
        </div>

        {/* flujo animado de bienvenida */}
        <div className="tarjeta brillo apa" style={{ maxWidth: 780, margin: "28px auto 0", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span className="etiqueta-viva">simulación del circuito</span>
            <span className="nota mono" style={{ fontSize: 11, marginLeft: "auto" }}>así viaja tu tráfico</span>
          </div>
          <Tuberia activo saltos={["nodo₁", "nodo₂", "nodo₃ · exit"]} />
          <p className="nota" style={{ marginTop: 12, fontSize: 12 }}>
            La animación es una representación del flujo; los nodos no registran tu tráfico.
          </p>
        </div>

        <div className="tira-stats" style={{ maxWidth: 780, margin: "18px auto 0", textAlign: "left" }}>
          <Stat etq="saltos por circuito" val={<Contador hasta={3} />} pie="elegidos al azar" tono="ok" />
          <Stat etq="cifrado" val="ChaCha20" pie="Poly1305 · por capas" tono="info" />
          <Stat etq="puertos de salida" val="80 / 443" pie="nada más" />
          <Stat etq="sesión" val={<Contador hasta={120} sufijo=" min" />} pie="JWT renovable" tono="aviso" />
        </div>
      </section>

      {/* ───────────── descargas (siempre, con o sin sesión) ───────────── */}
      <Revela>
        <div className="cab-seccion">
          <div className="cubo-ico">⬇</div>
          <div>
            <span className="migas">público · antes y después de la sesión</span>
            <h1>Descargas: extensión y navegador</h1>
            <p className="sub">Los tres caminos para llevar el circuito a tu vida diaria — disponibles siempre, sin entrar.</p>
          </div>
        </div>
        <Descargas compacto />
      </Revela>

      {/* ───────────── la IP cambia de verdad ───────────── */}
      <Revela>
        <div className="cab-seccion">
          <div className="cubo-ico">🛰</div>
          <div>
            <span className="migas">lo primero que querrás comprobar</span>
            <h1>La IP pública cambia (y puedes verificarlo)</h1>
            <p className="sub">Sin estimaciones ni promesas: el servidor sale por el circuito con tu cuenta y pregunta a internet qué IP ve.</p>
          </div>
        </div>
        <div className="grid-dos" style={{ alignItems: "stretch" }}>
          <div className="tarjeta">
            <h2 className="seccion">Cómo se comprueba</h2>
            <div className="escalera">
              <Escalon n="1" titulo="Activa la red en el panel">Se eligen 3 nodos vivos al azar y se abre el circuito.</Escalon>
              <Escalon n="2" titulo="Escribe tu contraseña y pulsa comprobar">Se usa solo para el handshake SOCKS5 y no se guarda.</Escalon>
              <Escalon n="3" titulo="El destino contesta qué IP vio">Tu IP de origen frente a la IP de salida, con la latencia real.</Escalon>
            </div>
            <div className="banner-info" style={{ marginTop: 12 }}>
              <span>ℹ</span>
              <span>Si tu IP de origen y la de salida no coinciden, el circuito está haciendo su trabajo.</span>
            </div>
          </div>
          <div className="copiabloque" style={{ alignSelf: "stretch" }}>
            <header><span className="rotulo"><span className="punto" style={{ background: "var(--acento-1)" }} />terminal · a mano</span></header>
            <pre>{`curl --socks5-hostname jumpernet.duckdns.org:1080 \\
     --proxy-user 'tu@correo:TU_CLAVE' \\
     https://api.ipify.org`}</pre>
            <div className="nota" style={{ padding: "8px 14px 12px", fontSize: 11.5 }}>
              Devuelve la IP que ve internet al usar tu circuito (la del nodo de salida). Con <b>--proxy-user</b> la arroba
              de tu email no rompe el comando.
            </div>
          </div>
        </div>
      </Revela>

      {/* ───────────── cómo funciona ───────────── */}
      <Revela>
        <div className="cab-seccion">
          <div className="cubo-ico">⌘</div>
          <div>
            <span className="migas">de cero a navegar</span>
            <h1>Cómo funciona</h1>
            <p className="sub">Cuatro pasos, cero misterios.</p>
          </div>
        </div>
        <div className="grid-dos" style={{ alignItems: "stretch" }}>
          <div className="tarjeta brillo" style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <Escalon n="1" titulo="Creas tu cuenta">email + contraseña (argon2 en el servidor). Sin datos personales.</Escalon>
            <Escalon n="2" titulo="Pulsas ACTIVAR RED">El circuito no nace solo: se crea cuando tú lo pides.</Escalon>
            <Escalon n="3" titulo="Copias el comando SOCKS5">Puerto 1080 con tus mismas credenciales — terminal o navegador.</Escalon>
            <Escalon n="4" titulo="Compruebas y navegas">Ves los nodos, la latencia y la IP con la que sales.</Escalon>
            <pre className="mono diagrama" style={{ fontSize: 11, marginTop: 4 }}>
{`  TÚ ──▶ SOCKS5:1080 ──▶ nodo₁ ──▶ nodo₂ ──▶ nodo₃ (exit) ──▶ internet
         auth argon2     └────── ChaCha20-Poly1305 cifrado ─────┘  solo 80/443`}
            </pre>
          </div>
          <TerminalVivo />
        </div>
      </Revela>

      {/* ───────────── features ───────────── */}
      <div style={{ display: "grid", gap: 16 }}>
        <Revela>
          <div className="cab-seccion" style={{ marginBottom: 0 }}>
            <div className="cubo-ico">✦</div>
            <div>
              <span className="migas">qué te llevas</span>
              <h1>Piezas del sistema</h1>
            </div>
          </div>
        </Revela>
        {FEATURES.map((f, i) => (
          <Revela key={f.tit} className="tarjeta apa brillo" retardo={i + 1}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div className="cubo-paso flota" style={{ animationDelay: `${i * .4}s` }}>{f.ico}</div>
              <div style={{ flex: 1 }}>
                <span className="etiqueta-seccion mono" style={{ fontSize: 10.5 }}>{f.tag}</span>
                <h3 style={{ fontSize: 19, margin: "4px 0 6px", letterSpacing: "-.01em" }}>{f.tit}</h3>
                <p className="nota" style={{ fontSize: 14, maxWidth: 780 }}>{f.desc}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {f.pies.map((p) => <span key={p} className="chip mono">{p}</span>)}
                </div>
              </div>
            </div>
          </Revela>
        ))}
      </div>

      {/* ───────────── honestidad ───────────── */}
      <Revela className="grid-dos">
        <div className="tarjeta brillo">
          <h2 className="seccion">Qué es (y qué no es)</h2>
          <div className="lista-hechos" style={{ marginTop: 4 }}>
            <Hecho><b>Es</b> una red de 3 saltos casera, montada con contenedores Docker reales.</Hecho>
            <Hecho><b>Es</b> tuyo: tú enciendes, giras y apagas la red cuando quieras.</Hecho>
            <Hecho><b>Está</b> verificado: la IP de salida se comprueba contra internet de verdad.</Hecho>
            <Hecho><b>No es</b> la red TOR pública: aquí los saltos son nodos de laboratorio.</Hecho>
            <Hecho><b>No es</b> magia geográfica: los saltos viven en el mismo servidor de salida.</Hecho>
          </div>
        </div>
        <div className="tarjeta brillo">
          <h2 className="seccion">Antes de empezar</h2>
          <div className="lista-hechos">
            <Hecho>un email cualquiera (no se verifica identidad)</Hecho>
            <Hecho>conexión a internet estable</Hecho>
            <Hecho>ganas de trastear en la terminal o el navegador</Hecho>
            <Hecho><b>no</b> acelera juegos: añade saltos y latencia real</Hecho>
            <Hecho><b>no</b> sale a puertos que no sean 80/443</Hecho>
          </div>
        </div>
      </Revela>

      {/* ───────────── CTA ───────────── */}
      <Revela className="tarjeta destacada brillo" style={{ textAlign: "center", padding: 34 }}>
        <span className="etiqueta-viva" style={{ justifyContent: "center" }}>listo en 20 segundos</span>
        <h3 style={{ fontSize: 23, letterSpacing: "-.015em", margin: "10px 0 6px" }}>¿Enciendes tu propia red?</h3>
        <p className="nota" style={{ margin: "0 auto 20px", maxWidth: 560 }}>
          Crea tu cuenta y entra al panel. Verás el interruptor apagado: el primer movimiento es tuyo.
        </p>
        <div className="fila-btn" style={{ maxWidth: 460, margin: "0 auto" }}>
          <button className="btn primario grande" onClick={() => irAuth("registro")}>▶ Crear mi cuenta</button>
          <button className="btn grande" onClick={() => irAuth("login")}>Entrar</button>
        </div>
      </Revela>
    </div>
  );
}
