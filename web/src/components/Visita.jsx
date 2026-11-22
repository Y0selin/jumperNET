import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "./Logo.jsx";

/* Intro + invitación + visita guiada de la portada.
   Todo se guarda en localStorage para no repetirse. La visita no navega:
   ilumina elementos que ya están en la portada y en el dock. */

const CLAVE_INTRO = "jumpernet-intro-v31";
const CLAVE_VISITA = "jumpernet-visita-v31";
const CLAVE_TOUR = "jumpernet-tour-v31";

const PASOS = [
  {
    sel: '[data-tour="hero"]',
    etq: "bienvenida",
    titulo: "Tu conexión no va sola",
    texto: "JumperNET elige tres nodos vivos y reparte el viaje en capas. Aquí puedes verlo, tocarlo y comprobarlo sin instalar nada.",
  },
  {
    sel: '[data-tour="video"]',
    etq: "el resumen",
    titulo: "Treinta segundos para entenderlo",
    texto: "El vídeo de portada resume el problema, los tres saltos y la salida. Puedes activar la música o verlo entero cuando quieras.",
  },
  {
    sel: '[data-tour="simulador"]',
    etq: "el simulador",
    titulo: "Enciende, gira y mira",
    texto: "Toca una parada para ver qué sabe cada relé. Gira el circuito para comprobar que la ruta cambia sin cortar la sesión.",
  },
  {
    sel: '[data-tour="mapa"]',
    etq: "el viaje",
    titulo: "Sigue el paquete",
    texto: "Lanza el paquete y acompáñalo de tu equipo a internet. Cada casilla explica qué ve y qué sabe ese salto.",
  },
  {
    sel: '[data-tour="recursos"]',
    etq: "para profundizar",
    titulo: "Las dudas, a un toque",
    texto: "En Recursos y Dudas tienes la documentación, las preguntas frecuentes y las descargas. Sin humo y sin promesas de más.",
  },
  {
    sel: '[data-tour="panel"]',
    etq: "tu cuenta",
    titulo: "Cuando quieras, entras",
    texto: "Crea tu cuenta o abre tu panel. La red llega apagada y solo se enciende cuando tú lo decides.",
  },
];

const reducir = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function lee(clave) {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function guarda(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch { /* navegación privada */ }
}

export default function Visita({ activa }) {
  const [intro, setIntro] = useState(() => activa === "/" && !lee(CLAVE_INTRO));
  const [saliendo, setSaliendo] = useState(false);
  const [bienvenida, setBienvenida] = useState(false);
  const [tour, setTour] = useState(-1);
  const [rect, setRect] = useState(null);
  const [aviso, setAviso] = useState("");
  const tarjeta = useRef(null);
  const disparador = useRef(null);
  const temporizadores = useRef([]);

  const limpia = useCallback(() => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  }, []);

  const terminarIntro = useCallback((saltada = false) => {
    if (!intro || saliendo) return;
    guarda(CLAVE_INTRO, saltada ? "saltada" : "vista");
    setSaliendo(true);
    const t = setTimeout(() => {
      setIntro(false);
      setSaliendo(false);
      if (!lee(CLAVE_VISITA)) {
        const t2 = setTimeout(() => setBienvenida(true), 260);
        temporizadores.current.push(t2);
      }
    }, reducir() ? 60 : 430);
    temporizadores.current.push(t);
  }, [intro, saliendo]);

  /* primera visita: intro; si ya la vio pero no la invitación, se invita igual */
  useEffect(() => {
    if (activa !== "/") return;
    const t = setTimeout(() => {
      if (!lee(CLAVE_INTRO)) {
        if (!intro) setIntro(true);
      } else if (!lee(CLAVE_VISITA) && tour < 0) {
        setBienvenida(true);
      }
    }, 450);
    return () => clearTimeout(t);
    // solo al montar / cambiar de página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa]);

  /* temporizador de la intro (la animación dura ~3,9 s) */
  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => terminarIntro(false), reducir() ? 1200 : 4050);
    return () => clearTimeout(t);
  }, [intro, terminarIntro]);

  /* bloquear el fondo y devolver el foco al cerrar */
  useEffect(() => {
    const abierto = intro || bienvenida || tour >= 0;
    if (!abierto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [intro, bienvenida, tour]);

  useEffect(() => {
    if (intro || bienvenida || tour >= 0) return;
    if (disparador.current) {
      disparador.current.focus?.();
      disparador.current = null;
    }
  }, [intro, bienvenida, tour]);

  const abrirTour = useCallback((desde = null) => {
    limpia();
    setIntro(false);
    setSaliendo(false);
    setBienvenida(false);
    guarda(CLAVE_INTRO, "vista");
    guarda(CLAVE_VISITA, "vista");
    disparador.current = desde || document.activeElement;
    setTour(0);
  }, [limpia]);

  /* el botón «?» de la cabecera y el de Dudas abren la visita */
  useEffect(() => {
    const abre = (e) => {
      if (activa !== "/") {
        setAviso("La visita se abre desde la portada.");
        const t = setTimeout(() => setAviso(""), 3200);
        temporizadores.current.push(t);
        return;
      }
      abrirTour(e?.detail?.origen || null);
    };
    window.addEventListener("jumpernet-tour", abre);
    return () => window.removeEventListener("jumpernet-tour", abre);
  }, [activa, abrirTour]);

  /* medir el objetivo de cada parada */
  const mide = useCallback(() => {
    if (tour < 0) return;
    const paso = PASOS[tour];
    const el = document.querySelector(paso.sel);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [tour]);

  useEffect(() => {
    if (tour < 0) return;
    const paso = PASOS[tour];
    const el = document.querySelector(paso.sel);
    if (!el) return;
    el.scrollIntoView({ behavior: reducir() ? "auto" : "smooth", block: "center", inline: "nearest" });
    const t = setTimeout(mide, reducir() ? 40 : 480);
    const alRedimensionar = () => mide();
    window.addEventListener("resize", alRedimensionar);
    window.addEventListener("scroll", alRedimensionar, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", alRedimensionar);
      window.removeEventListener("scroll", alRedimensionar);
    };
  }, [tour, mide]);

  const cerrarTour = useCallback((estado = "completado") => {
    guarda(CLAVE_TOUR, estado);
    setTour(-1);
    setRect(null);
  }, []);

  function siguiente() {
    if (tour < 0) return;
    if (tour >= PASOS.length - 1) cerrarTour("completado");
    else setTour((n) => n + 1);
  }
  function anterior() {
    if (tour > 0) setTour((n) => n - 1);
  }

  /* teclado: Esc cierra, Tab se queda dentro de la tarjeta */
  function teclas(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (tour >= 0) cerrarTour("omitido");
      else if (bienvenida) { guarda(CLAVE_VISITA, "omitida"); setBienvenida(false); }
      else if (intro) terminarIntro(true);
      return;
    }
    if (e.key !== "Tab") return;
    const caja = tour >= 0 ? tarjeta.current : document.querySelector("[data-jn-modal]");
    if (!caja) return;
    const focos = [...caja.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  useEffect(() => {
    if (!(intro || bienvenida || tour >= 0)) return;
    document.addEventListener("keydown", teclas);
    return () => document.removeEventListener("keydown", teclas);
  });

  /* foco inicial en cada superficie */
  useEffect(() => {
    if (!bienvenida) return;
    const t = setTimeout(() => {
      document.querySelector("[data-jn-modal] .jn-visita__primario")?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [bienvenida]);
  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => document.querySelector(".jn-intro__saltar")?.focus(), 60);
    return () => clearTimeout(t);
  }, [intro]);
  useEffect(() => {
    if (tour < 0) return;
    const t = setTimeout(() => tarjeta.current?.querySelector("button, a")?.focus(), 60);
    return () => clearTimeout(t);
  }, [tour]);

  useEffect(() => () => limpia(), [limpia]);

  if (activa !== "/") return aviso ? <div className="jn-aviso-visita" role="status">{aviso}</div> : null;

  return (
    <>
      {intro && (
        <div className={`jn-intro ${saliendo ? "saliendo" : ""}`} role="dialog" aria-modal="true"
          aria-label="Introducción a JumperNET" data-jn-intro data-jn-modal>
          <button type="button" className="jn-intro__saltar" onClick={() => terminarIntro(true)}>
            Saltar intro <kbd>Esc</kbd>
          </button>

          <div className="jn-intro__escena">
            <div className="jn-intro__marca">
              <Logo tam={62} />
              <span className="jn-intro__nombre">Jumper<span>NET</span></span>
              <small>red educativa de tres saltos</small>
            </div>

            <svg className="jn-intro__red" viewBox="0 0 660 190" aria-hidden="true">
              <defs>
                <linearGradient id="jn-linea-31" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="var(--acento-2)" stopOpacity=".1" />
                  <stop offset=".5" stopColor="var(--acento-1)" stopOpacity=".9" />
                  <stop offset="1" stopColor="var(--acento-3)" stopOpacity=".1" />
                </linearGradient>
              </defs>
              <path className="jn-intro__trazo" d="M80 112 C 180 112 180 58 300 58 S 420 142 520 142"
                fill="none" stroke="url(#jn-linea-31)" strokeWidth="2" strokeLinecap="round" pathLength="1" />
              <g className="jn-intro__nodos">
                <g style={{ "--retraso": ".55s" }}>
                  <circle cx="80" cy="112" r="19" className="jn-intro__halo" />
                  <circle cx="80" cy="112" r="7" />
                  <text x="80" y="150" textAnchor="middle">origen</text>
                </g>
                <g style={{ "--retraso": "1.02s" }}>
                  <circle cx="300" cy="58" r="24" className="jn-intro__halo" />
                  <circle cx="300" cy="58" r="9" />
                  <text x="300" y="96" textAnchor="middle">salto 2</text>
                </g>
                <g style={{ "--retraso": "1.49s" }}>
                  <circle cx="520" cy="142" r="19" className="jn-intro__halo" />
                  <circle cx="520" cy="142" r="7" />
                  <text x="520" y="180" textAnchor="middle">destino</text>
                </g>
              </g>
              <circle className="jn-intro__chispa" r="4.5" fill="#fff">
                <animateMotion dur="2.2s" begin=".9s" fill="freeze" path="M80 112 C 180 112 180 58 300 58 S 420 142 520 142" />
              </circle>
            </svg>

            <p className="jn-intro__frase">Tu conexión <em>no va sola</em>.</p>
            <p className="jn-intro__pie">tres saltos · tres capas · una explicación</p>
          </div>

          <div className="jn-intro__barra" aria-hidden="true"><i /></div>
        </div>
      )}

      {bienvenida && (
        <div className="jn-visita-velo" data-jn-modal>
          <div className="jn-visita" role="dialog" aria-modal="true" aria-labelledby="jn-visita-titulo">
            <div className="jn-visita__visual" aria-hidden="true">
              <span className="jn-visita__visual-punto" />
              <span className="jn-visita__visual-punto" />
              <span className="jn-visita__visual-punto" />
              <svg viewBox="0 0 220 120" preserveAspectRatio="none">
                <path d="M12 92 C 58 92 58 28 110 28 S 162 76 208 76" />
              </svg>
              <b>6 paradas</b>
              <small>menos de un minuto</small>
            </div>
            <div className="jn-visita__texto">
              <span className="jn-visita__etq">primera visita</span>
              <h2 id="jn-visita-titulo">¿Es tu primera vez en JumperNET?</h2>
              <p>Te enseñamos cómo funciona en menos de un minuto. Sin registros, sin tutoriales interminables.</p>
              <div className="jn-visita__acciones">
                <button type="button" className="jn-visita__primario jn-visita__primario--btn"
                  onClick={(e) => abrirTour(e.currentTarget)}>
                  Empezar recorrido <span aria-hidden>→</span>
                </button>
                <button type="button" className="jn-visita__secundario"
                  onClick={() => { guarda(CLAVE_VISITA, "omitida"); setBienvenida(false); }}>
                  Explorar por mi cuenta
                </button>
              </div>
              <button type="button" className="jn-visita__cerrar" aria-label="Cerrar la invitación"
                onClick={() => { guarda(CLAVE_VISITA, "omitida"); setBienvenida(false); }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {tour >= 0 && (
        <div className="jn-tour" role="dialog" aria-modal="true" aria-labelledby="jn-tour-titulo">
          <div className="jn-tour__bloqueo" aria-hidden="true" />
          {rect && (
            <div className="jn-tour__foco" style={{
              top: Math.max(8, rect.top - 10),
              left: Math.max(8, rect.left - 10),
              width: Math.max(0, Math.min(window.innerWidth - 16, rect.width + 20)),
              height: Math.max(0, rect.height + 20),
            }} aria-hidden="true" />
          )}
          <section className="jn-tour__tarjeta" ref={tarjeta} style={{
            "--paso": tour,
            ...(rect && rect.top > window.innerHeight * 0.52
              ? { bottom: "auto", top: 84 }
              : { bottom: 24, top: "auto" }),
          }}>
            <header className="jn-tour__cab">
              <span className="jn-tour__etq">{PASOS[tour].etq}</span>
              <span className="jn-tour__cuenta mono">{tour + 1} de {PASOS.length}</span>
              <button type="button" className="jn-tour__saltar" onClick={() => cerrarTour("omitido")}>Saltar visita</button>
            </header>
            <h2 id="jn-tour-titulo">{PASOS[tour].titulo}</h2>
            <p>{PASOS[tour].texto}</p>
            <footer className="jn-tour__pie">
              <div className="jn-tour__puntos" role="group" aria-label="Progreso de la visita">
                {PASOS.map((p, i) => (
                  <button key={p.etq} type="button" className={i === tour ? "activo" : ""}
                    aria-label={`Ir a la parada ${i + 1}: ${p.titulo}`}
                    aria-current={i === tour ? "step" : undefined}
                    onClick={() => setTour(i)} />
                ))}
              </div>
              <div className="jn-tour__botones">
                <button type="button" className="jn-tour__atras" onClick={anterior} disabled={tour === 0}>← Anterior</button>
                <button type="button" className="jn-tour__siguiente" onClick={siguiente}>
                  {tour === PASOS.length - 1 ? "Terminar" : "Siguiente →"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {aviso && <div className="jn-aviso-visita" role="status">{aviso}</div>}
    </>
  );
}
