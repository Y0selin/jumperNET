import { useEffect, useRef, useState } from "react";
import TerminalVivo from "./TerminalVivo.jsx";
import Revela from "./Revela.jsx";
import { Stat, Tuberia, Escalon, Hecho } from "./Piezas.jsx";

const FRASES = [
  "viaja por 3 nodos aleatorios…",
  "va cifrada en cada salto (ChaCha20)…",
  "sale a internet por 80/443…",
  "no deja histórico de tus destinos…",
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
    ico: "📡", tag: "live", tit: "La red la enciendes tú",
    desc: "Nada arranca solo al entrar: ves «red apagada» hasta que pulsas el interruptor. Mientras viajas, el panel te enseña por qué nodo va tu tráfico, en qué salto está y qué IP ve la web de destino.",
    pies: ["interruptor manual", "ruta en vivo", "mapa del viaje"],
  },
];

export default function Landing({ irAuth }) {
  return (
    <div style={{ display: "grid", gap: 46 }}>

      {/* ───────────── hero ───────────── */}
      <section className="hero">
        <span className="etiqueta-seccion mono">[ suite educativa de anonimato por saltos ]</span>
        <h1 className="titulo-animado" style={{ fontSize: "clamp(36px, 7vw, 62px)", lineHeight: 1.08, letterSpacing: "-.03em" }}>
          JumperNAT
        </h1>
        <p className="mono" style={{ fontSize: "clamp(15px, 2.4vw, 20px)", color: "var(--texto)", margin: "12px 0 6px", minHeight: 30 }}>
          Tu conexión <Typewriter phrases={FRASES} />
        </p>
        <p className="nota" style={{ maxWidth: 660, fontSize: 15, margin: "8px auto 24px" }}>
          Un proxy SOCKS5 con cuentas de usuario: entras con tu email, la red elige
          <b> 3 nodos vivos al azar</b>, tu tráfico va cifrado entre ellos y la web de
          destino solo ve el nodo de salida. Es un proyecto educativo — y la red
          permanece <b>apagada hasta que tú la enciendes</b>.
        </p>
        <div className="fila-btn" style={{ maxWidth: 480, margin: "0 auto" }}>
          <button className="btn primario grande" onClick={() => irAuth("registro")}>▶ Crear mi cuenta</button>
          <button className="btn grande" onClick={() => irAuth("login")}>Ya tengo cuenta</button>
        </div>

        {/* flujo animado de bienvenida */}
        <div className="tarjeta brillo apa" style={{ maxWidth: 760, margin: "28px auto 0", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span className="etiqueta-viva">simulación del circuito</span>
            <span className="nota mono" style={{ fontSize: 11, marginLeft: "auto" }}>así viaja tu tráfico</span>
          </div>
          <Tuberia activo saltos={["nodo₁", "nodo₂", "nodo₃ · exit"]} />
          <p className="nota" style={{ marginTop: 12, fontSize: 12 }}>
            La animación es una representación del flujo; los nodos no registran tu tráfico.
          </p>
        </div>

        <div className="tira-stats" style={{ maxWidth: 760, margin: "18px auto 0", textAlign: "left" }}>
          <Stat etq="saltos por circuito" val={<Contador hasta={3} />} pie="elegidos al azar" tono="ok" />
          <Stat etq="cifrado" val="ChaCha20" pie="Poly1305 · por capas" tono="info" />
          <Stat etq="puertos de salida" val="80 / 443" pie="nada más" />
          <Stat etq="sesión" val={<Contador hasta={120} sufijo=" min" />} pie="JWT renovable" tono="aviso" />
        </div>
      </section>

      {/* ───────────── cómo funciona ───────────── */}
      <Revela className="section">
        <div className="seccion-titulo" style={{ marginBottom: 6 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>Cómo funciona</h2>
          <span className="nota">cuatro pasos, cero misterios</span>
        </div>
        <div className="grid-dos" style={{ alignItems: "stretch" }}>
          <div className="tarjeta brillo" style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <Escalon n="1" titulo="Creas tu cuenta">email + contraseña (argon2 en el servidor). Sin datos personales.</Escalon>
            <Escalon n="2" titulo="Pulsas ACTIVAR RED">El circuito no nace solo: se crea cuando tú lo pides.</Escalon>
            <Escalon n="3" titulo="Copias el comando SOCKS5">Puerto 1080 con tus mismas credenciales — terminal o navegador.</Escalon>
            <Escalon n="4" titulo="Ves tu viaje en vivo">Qué nodo, cuál es la salida, latencia y qué IP ve el destino.</Escalon>
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
          <h2 className="seccion">Qué te llevas</h2>
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
            <Hecho><b>Es</b> un proxy SOCKS5 educativo con 3 saltos lógicos y cifrado por capas.</Hecho>
            <Hecho><b>Es</b> tuyo: tú enciendes, giras y apagas la red cuando quieras.</Hecho>
            <Hecho><b>No es</b> una onion de miles de nodos: la salida real es <b>una</b> máquina.</Hecho>
            <Hecho><b>No es</b> magia geográfica: los saltos viven en el mismo servidor (Ashburn).</Hecho>
            <Hecho><b>No</b> guardamos tus destinos: ni la API ni los nodos tienen histórico.</Hecho>
          </div>
        </div>
        <div className="tarjeta brillo">
          <h2 className="seccion">Antes de empezar</h2>
          <div className="tuberia" style={{ gap: 12 }}>
            <div>
              <span className="etiqueta-viva">lo que sí necesitas</span>
              <div className="lista-hechos" style={{ marginTop: 8 }}>
                <Hecho>un email cualquiera (no se verifica identidad)</Hecho>
                <Hecho>conexión a internet estable</Hecho>
                <Hecho>ganas de trastear en la terminal o el navegador</Hecho>
              </div>
            </div>
            <div>
              <span className="etiqueta-viva" style={{ color: "var(--acento-3)" }}>lo que no hace</span>
              <div className="lista-hechos" style={{ marginTop: 8 }}>
                <Hecho>no acelera juegos (añade saltos y latencia real)</Hecho>
                <Hecho>no anonimiza al 100 % (es material educativo)</Hecho>
                <Hecho>no sale a puertos que no sean 80/443</Hecho>
              </div>
            </div>
          </div>
        </div>
      </Revela>

      {/* ───────────── CTA ───────────── */}
      <Revela className="tarjeta destacada brillo" style={{ textAlign: "center", padding: 34 }}>
        <span className="etiqueta-viva" style={{ justifyContent: "center" }}>listo en 20 segundos</span>
        <h3 style={{ fontSize: 23, letterSpacing: "-.015em", margin: "10px 0 6px" }}>¿Enciendes tu propia red?</h3>
        <p className="nota" style={{ margin: "0 auto 20px", maxWidth: 540 }}>
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
