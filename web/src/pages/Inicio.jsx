import { PIEZAS, FRASES } from "../lib/contenido.js";
import { VERSION, EDICION } from "../lib/version.js";
import { EQUIPO, NOMBRES } from "../lib/equipo.js";

/* Portada, edición plano técnico.
   Titular de cartel, esquema del circuito como figura y el resto
   en retícula bento. Sin decoración suave: reglas, coordenadas y contraste. */

const BASE = import.meta.env.BASE_URL || "./";

const PARADAS = [
  { n: "TÚ", d: "ORIGEN", q: "Aquí empieza la petición. Tu IP no viaja al otro lado del circuito." },
  { n: "ENTRADA", d: "SOCKS5 :1080", q: "Autentica tu cuenta y abre el circuito. Sabe de dónde vienes, no qué pides." },
  { n: "NODO 01", d: "RELÉ CIEGO", q: "Abre solo su capa del sobre y lo reenvía. No puede leer el resto." },
  { n: "NODO 02", d: "RELÉ CIEGO", q: "El salto del medio no conoce ni el origen ni el destino." },
  { n: "SALIDA", d: "EXIT · 80/443", q: "Valida el destino, sale a internet y devuelve la respuesta con su IP." },
];

const IDEAS = [
  {
    n: "01",
    t: "Entra por SOCKS5",
    d: "Tu navegador o la terminal apuntan al puerto 1080. Se autentica con tu cuenta: no hay túneles que instalar ni configuración de red que tocar.",
    r: "/funciona",
    l: "VER LOS CUATRO PASOS",
  },
  {
    n: "02",
    t: "Cruza tres relés",
    d: "La red elige tres nodos vivos al azar. Cada capa de cifrado solo la abre el siguiente salto.",
    r: "/proyecto",
    l: "VER EL PROYECTO",
  },
  {
    n: "03",
    t: "Sale con otra IP",
    d: "El tercer nodo entrega la petición con su propia dirección. El panel lo comprueba de verdad.",
    r: "/usos",
    l: "PARA QUÉ SIRVE",
  },
];

export default function Inicio() {
  return (
    <div className="sx-inicio">
      {/* ── hero ── */}
      <section className="sx-hero">
        <div className="sx-hero-meta">
          <span className="sx-live"><i aria-hidden /> RED SOCKS5 · 3 SALTOS</span>
          <span>{EDICION} / V{VERSION} / 2026</span>
          <span className="sx-coord">40.4168° N · 3.7038° W</span>
        </div>

        <h1 className="sx-title">
          <span>Tu conexión</span>
          <span>no va sola.</span>
        </h1>

        <div className="sx-hero-body">
          <div className="sx-hero-copy">
            <p className="sx-lead">
              Un proxy SOCKS5 con cuentas que elige tres nodos vivos al azar, cifra cada
              salto y sale a internet por la red de salida. Sin histórico, sin configuración
              de red y sin encenderse hasta que tú lo decides.
            </p>
            <div className="sx-acciones">
              <a className="sx-btn sx-btn--fill" href="#/acceso/registro">
                Crear cuenta <span aria-hidden>→</span>
              </a>
              <a className="sx-btn" href="#/funciona">Cómo funciona</a>
            </div>
            <dl className="sx-stats">
              <div><dt>saltos</dt><dd>3</dd></div>
              <div><dt>cifrado</dt><dd>ChaCha20</dd></div>
              <div><dt>salida</dt><dd>80/443</dd></div>
              <div><dt>registro</dt><dd>0</dd></div>
            </dl>
          </div>

          <div className="sx-schema" aria-label="Esquema del circuito de JumperNET">
            <div className="sx-schema-cab">
              <span>FIG. 01 — CIRCUITO</span>
              <span>3 SALTOS / 2 H</span>
            </div>
            <div className="sx-map">
              {PARADAS.map((p, i) => (
                <div className={`sx-stop ${i === PARADAS.length - 1 ? "is-exit" : ""}`} key={p.n}>
                  <span className="sx-dot" aria-hidden />
                  <b>{p.n}</b>
                  <span className="sx-stop-d">{p.d}</span>
                </div>
              ))}
            </div>
            <div className="sx-schema-pie">
              <span><i aria-hidden /> EN VIVO</span>
              <span>CHACHA20-POLY1305</span>
              <span>80 / 443</span>
            </div>
            <p className="sx-schema-note">La red no se enciende hasta que tú lo decides.</p>
          </div>
        </div>
      </section>

      {/* ── cinta ── */}
      <div className="sx-ticker" aria-hidden="true">
        <div className="sx-ticker-track">
          {[0, 1].map((k) => (
            <div className="sx-ticker-group" key={k}>
              {[...FRASES, "3 SALTOS AL AZAR", "CHACHA20-POLY1305", "SOLO 80/443", "SIN HISTÓRICO"].map((t, i) => (
                <span key={`${k}-${i}`}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── 01 · qué es ── */}
      <section className="sx-seccion" id="que-es">
        <header className="sx-sec-head">
          <div>
            <span className="sx-kicker">01 / QUÉ ES</span>
            <h2 className="sx-h2">No es magia.<br /><em>Es un circuito.</em></h2>
          </div>
          <p className="sx-sec-note">
            JumperNET reparte una conexión entre tres intermediarios que no se conocen entre
            sí. Ninguno sabe a la vez de dónde vienes y qué pides. Es un proxy real que puedes
            encender, girar y mirar por dentro.
          </p>
        </header>

        <div className="sx-bento">
          <article className="sx-tile sx-tile--big">
            <span className="sx-tile-n">/01</span>
            <h3>{IDEAS[0].t}</h3>
            <p>{IDEAS[0].d}</p>
            <a className="sx-link" href={`#${IDEAS[0].r}`}>{IDEAS[0].l} →</a>
          </article>

          {IDEAS.slice(1).map((x) => (
            <article className="sx-tile sx-tile--small" key={x.n}>
              <span className="sx-tile-n">/{x.n}</span>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
              <a className="sx-link" href={`#${x.r}`}>{x.l} →</a>
            </article>
          ))}

          <article className="sx-tile sx-tile--lime sx-tile--stat">
            <span className="sx-tile-n">/04 · LA RED</span>
            <b>3</b>
            <span className="sx-stat-label">saltos por circuito, elegidos al azar entre nodos vivos</span>
          </article>

          <article className="sx-tile sx-tile--wide sx-tile--manifiesto">
            <p>
              No es una VPN comercial ni anonimato de grado onion. Es un circuito de
              laboratorio: tres relés, cifrado por capas y una salida que solo permite
              80 y 443. Lo que protege, lo dice; lo que no, también.
            </p>
            <a className="sx-link" href="#/proyecto">LEER EL PROYECTO COMPLETO →</a>
          </article>
        </div>
      </section>

      {/* ── 02 · recorrido ── */}
      <section className="sx-seccion">
        <header className="sx-sec-head">
          <div>
            <span className="sx-kicker">02 / EL RECORRIDO</span>
            <h2 className="sx-h2">Tres relés.<br /><em>Cero confianza.</em></h2>
          </div>
          <p className="sx-sec-note">
            Esto es lo que pasa desde que pulsas el interruptor hasta que llega la respuesta.
            En el panel verás el estado, la latencia y la IP de salida reales.
          </p>
        </header>

        <div className="sx-route">
          {PARADAS.map((p, i) => (
            <div className="sx-route-row" key={p.n}>
              <span className="sx-route-n">{String(i + 1).padStart(2, "0")}</span>
              <b>{p.n}</b>
              <span className="mono">{p.d}</span>
              <p>{p.q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 03 · piezas ── */}
      <section className="sx-seccion">
        <header className="sx-sec-head">
          <div>
            <span className="sx-kicker">03 / QUÉ TE LLEVAS</span>
            <h2 className="sx-h2">Cuatro piezas.<br /><em>Una red.</em></h2>
          </div>
          <p className="sx-sec-note">
            Lo que puedes usar hoy, sin promesas de más: un circuito, cifrado por capas,
            una comprobación real y un panel que enseña el estado de cada salto.
          </p>
        </header>

        <div className="sx-bento sx-bento--piezas">
          {PIEZAS.map((p, i) => (
            <article className={`sx-tile sx-tile--pieza ${i === 0 ? "sx-tile--lime" : i === 1 ? "sx-tile--pink" : ""}`} key={p.tit}>
              <div className="sx-pieza-top">
                <span className="sx-tile-n">{p.tag}</span>
                <span className="sx-pieza-ico" aria-hidden>{p.ico}</span>
              </div>
              <h3>{p.tit}</h3>
              <p>{p.txt}</p>
              <div className="sx-chips">
                {p.pies.map((x) => <span key={x}>{x}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 04 · vídeo ── */}
      <section className="sx-seccion">
        <div className="sx-video-grid">
          <figure className="sx-video">
            <video controls preload="metadata" poster={`${BASE}video/portada.jpg`}>
              <source src={`${BASE}video/portada.webm`} type="video/webm" />
              <source src={`${BASE}video/JumperNET_El_Viaje.mp4`} type="video/mp4" />
              Tu navegador no puede reproducir este vídeo.
            </video>
            <figcaption>JUMPERNET · EL VIAJE · MÚSICA ORIGINAL</figcaption>
          </figure>

          <div className="sx-video-side">
            <span className="sx-kicker">04 / EN MOVIMIENTO · 30 S</span>
            <h2 className="sx-h2">Así viaja<br /><em>tu tráfico.</em></h2>
            <p>
              El vídeo de portada cuenta el circuito de principio a fin. Si prefieres los
              detalles, estos son los cuatro pasos.
            </p>
            <ol className="sx-list">
              <li><span>01</span>Creas la cuenta: solo email y contraseña.</li>
              <li><span>02</span>Pulsas el interruptor: el circuito nace entonces.</li>
              <li><span>03</span>Copias el comando SOCKS5 del panel.</li>
              <li><span>04</span>Compruebas la IP que ve el destino y navegas.</li>
            </ol>
            <button
              type="button"
              className="sx-btn"
              onClick={() => window.dispatchEvent(new Event("jumpernet-video"))}
            >
              Abrir el vídeo en grande
            </button>
          </div>
        </div>
      </section>

      {/* ── 05 · equipo ── */}
      <section className="sx-seccion">
        <header className="sx-sec-head">
          <div>
            <span className="sx-kicker">05 / QUIÉNES ESTÁN DETRÁS</span>
            <h2 className="sx-h2">Cinco personas.<br /><em>Una red.</em></h2>
          </div>
          <p className="sx-sec-note">
            JumperNET no salió de una plantilla: lo montamos entre cinco, probando,
            rompiendo y volviendo a montar. La marca es el propio circuito: tres paradas
            y una salida.
          </p>
        </header>

        <div className="sx-equipo">
          <p className="sx-names">
            {EQUIPO.map((p, i) => (
              <span key={p.nombre}>
                {i > 0 && <i aria-hidden>/</i>}
                {p.nombre}
              </span>
            ))}
          </p>
          <div className="sx-equipo-txt">
            <p>
              Detrás de cada salto hay una persona. La red firma con sus nombres y el
              proyecto se explica sin humo: lo que protege, lo que no y por qué.
            </p>
            <a className="sx-btn" href="#/equipo">Conocer al equipo →</a>
          </div>
        </div>
      </section>

      {/* ── cierre ── */}
      <section className="sx-cierre">
        <span className="sx-kicker">06 / EL ÚLTIMO PASO</span>
        <h2 className="sx-cierre-title">Enciende<br /><em>tu red.</em></h2>
        <p>
          Crea la cuenta, elige el circuito y comprueba la IP que ve el destino. El
          interruptor sigue en tu mano: nada se conecta sin tu permiso.
        </p>
        <div className="sx-acciones">
          <a className="sx-btn sx-btn--black" href="#/acceso/registro">
            Crear mi cuenta <span aria-hidden>→</span>
          </a>
          <a className="sx-btn sx-btn--ghost" href="#/acceso/login">Ya tengo cuenta</a>
        </div>
      </section>
    </div>
  );
}
