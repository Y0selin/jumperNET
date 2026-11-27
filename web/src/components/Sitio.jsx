import { useEffect, useRef, useState } from "react";
import Logo from "./Logo.jsx";
import BotonModo from "./BotonModo.jsx";
import Reproductor from "./Reproductor.jsx";
import VideoModal from "./VideoModal.jsx";
import Nieve from "./Nieve.jsx";
import FondoRed from "./FondoRed.jsx";
import Atmosfera from "./Atmosfera.jsx";
import CentroAvisos from "./CentroAvisos.jsx";
import CargaPagina from "./CargaPagina.jsx";
import Visita from "./Visita.jsx";
import AvisoDocs from "./AvisoDocs.jsx";
import Buscador from "./Buscador.jsx";
import CarritoPanel from "./CarritoPanel.jsx";
import PromoAviso from "./PromoAviso.jsx";
import { useCarrito } from "../lib/carrito.js";
import { ENLACES } from "../lib/contenido.js";
import { DOCS_URL } from "../lib/enlaces.js";
import { NOMBRES } from "../lib/equipo.js";
import { baseRuta } from "../lib/router.js";
import { VERSION } from "../lib/version.js";

/* Marco del sitio público.
   Navegación nueva: barra superior fina (marca + cuenta) y un dock inferior
   flotante con las cinco páginas. El dock es la única navegación entre
   páginas, tanto en escritorio como en móvil, y marca la página activa. */

const TITULOS = {
  "/": "Portada",
  "/proyecto": "Qué es JumperNET",
  "/equipo": "El equipo",
  "/usos": "Para qué sirve",
  "/funciona": "Cómo funciona",
  "/tarifas": "Tarifas",
  "/dudas": "Dudas",
  "/recursos": "Recursos",
  "/descargas": "Descargas",
  "/video": "El viaje en vídeo",
  "/lab": "Laboratorio interactivo",
  "/acceso": "Entrar o crear cuenta",
  "/checkout": "Contratación",
  "/panel": "Panel",
};

/* Iconos de línea del dock: nada de emojis ni glifos de fuente. */
const DOCK_ICONOS = {
  "/": <><path d="M3 10.7 12 3l9 7.7" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  "/usos": <><circle cx="12" cy="12" r="8.4" /><circle cx="12" cy="12" r="3.6" /><path d="M12 3.6V7M12 17v3.4M3.6 12H7M17 12h3.4" /></>,
  "/proyecto": <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  "/equipo": <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5" /><path d="M16 5.4a3 3 0 0 1 0 5.7M17.5 14.7c2 .7 3.5 2.4 3.5 5.3" /></>,
  "/funciona": <><circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7.2 6h9.6M6.5 8l4.3 7.8M17.5 8l-4.3 7.8" /></>,
  "/lab": <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m7 9 2.7 2.7L7 14.4M12.5 14.5H17" /></>,
  "/tarifas": <><rect x="2.8" y="5" width="18.4" height="14" rx="2.5" /><path d="M2.8 9.6h18.4M6.5 14.8h4" /></>,
  "/dudas": <><circle cx="12" cy="12" r="8.6" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.7 2.3c-.8.4-1.3 1-1.3 2" /><path d="M12 17.1h.01" /></>,
  "/recursos": <><path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H20v15.5H6.2A2.2 2.2 0 0 0 4 20.7z" /><path d="M4 20.7V5.2M8 7h8M8 10.5h5" /></>,
};

const TOAST_ICONO = { ok: "✓", info: "→", error: "⚠" };

export default function Sitio({ ruta, enSesion, children }) {
  const [pegada, setPegada] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [carga, setCarga] = useState(null);
  const primeraRuta = useRef(true);
  const [arriba, setArriba] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [videoAbierto, setVideoAbierto] = useState(false);
  const [buscador, setBuscador] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const carrito = useCarrito();
  const activa = baseRuta(ruta);

  useEffect(() => {
    const alScroll = () => {
      setPegada(window.scrollY > 14);
      setArriba(window.scrollY > 620);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgreso(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    window.addEventListener("scroll", alScroll, { passive: true });
    alScroll();
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  useEffect(() => {
    document.title = `${TITULOS[activa] || "JumperNET"} · JumperNET`;
  }, [activa]);

  /* la cortina de carga solo acompaña las navegaciones: en la primera
     pintura manda la intro de bienvenida de la portada */
  useEffect(() => {
    if (primeraRuta.current) { primeraRuta.current = false; return; }
    setCarga({ ruta: activa, id: `${activa}-${Date.now()}` });
  }, [activa]);

  /* cualquier componente puede avisar con lanzarAviso(): el mensaje llega
     aquí y se pinta como toast, sin props ni estado compartido */
  useEffect(() => {
    const alAvisar = (e) => {
      const { texto, tipo = "ok" } = e.detail || {};
      if (!texto) return;
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts.slice(-2), { id, texto, tipo, sale: false }]);
      setTimeout(() => {
        setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, sale: true } : t)));
        setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 280);
      }, 3600);
    };
    window.addEventListener("jumpernet-aviso", alAvisar);
    return () => window.removeEventListener("jumpernet-aviso", alAvisar);
  }, []);

  /* el hero y el reproductor pueden abrir el vídeo en grande */
  useEffect(() => {
    const abre = () => setVideoAbierto(true);
    window.addEventListener("jumpernet-video", abre);
    return () => window.removeEventListener("jumpernet-video", abre);
  }, []);

  useEffect(() => { setVideoAbierto(false); setBuscador(false); setCarritoAbierto(false); }, [activa]);

  /* el carrito se abre desde la barra, el dock o cualquier CTA de tarifas */
  useEffect(() => {
    const abre = () => setCarritoAbierto(true);
    window.addEventListener("jumpernet-carrito-abrir", abre);
    return () => window.removeEventListener("jumpernet-carrito-abrir", abre);
  }, []);

  /* Ctrl/Cmd + K: el buscador global, desde cualquier página */
  useEffect(() => {
    const alPulsar = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key?.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        e.stopPropagation();
        setBuscador((v) => !v);
        return;
      }
      /* atajo de reserva: «/» cuando no se está escribiendo */
      const escribiendo = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
        || document.activeElement?.isContentEditable;
      if (e.key === "/" && !escribiendo) {
        e.preventDefault();
        setBuscador(true);
      }
    };
    window.addEventListener("keydown", alPulsar, true);
    return () => window.removeEventListener("keydown", alPulsar, true);
  }, []);

  /* spotlight: las tarjetas iluminan alrededor del cursor */
  useEffect(() => {
    const alMover = (e) => {
      const t = e.target && e.target.closest ? e.target.closest(".tarjeta, .hn-panel") : null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", alMover, { passive: true });
    return () => window.removeEventListener("pointermove", alMover);
  }, []);

  return (
    <div className="pp sp">
      {carga && (
        <CargaPagina key={carga.id} ruta={carga.ruta} titulo={TITULOS[carga.ruta] || "jumpernet"} />
      )}
      <Atmosfera />
      <FondoRed />
      <Nieve />
      <Visita activa={activa} />
      <AvisoDocs activa={activa} />

      <header className={`pp-nav ${pegada ? "pegada" : ""}`}>
        <a className="pp-marca" href="#/" aria-label="JumperNET, ir a la portada">
          <Logo tam={40} />
          <span className="pp-marca-txt">Jumper<span>NET</span><i className="cursor">_</i></span>
          <span className="pp-marca-ver mono">v{VERSION}</span>
        </a>

        <div className="pp-nav-centro" aria-hidden>
          <span className="pp-nav-seccion mono">// {TITULOS[activa] || "jumpernet"}</span>
          <span className="pp-nav-linea" />
        </div>

        <div className="pp-nav-acciones" data-tour="panel">
          <span className="pp-nav-estado mono"><i aria-hidden /> {enSesion ? "sesión activa" : "red educativa"}</span>
          <CentroAvisos />
          <button type="button" className="pp-buscar" onClick={() => setBuscador(true)}
            aria-label="Buscar en JumperNET" title="Buscar (Ctrl + K)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="6.4" /><path d="m15.8 15.8 4.2 4.2" />
            </svg>
            <span className="pp-buscar-txt">Buscar</span>
            <kbd>⌘K</kbd>
          </button>
          <a className="pp-docs-link" href={DOCS_URL} target="_blank" rel="noreferrer"
            title="Documentación de JumperNET" aria-label="Abrir la documentación de JumperNET">
            <svg className="pp-docs-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
              <path d="M4 20.5V5.5" />
              <path d="M8 7h8M8 10.5h5" />
            </svg>
            <span className="pp-docs-txt pp-docs-largo">documentación</span>
            <span className="pp-docs-txt pp-docs-corto">docs</span>
            <span className="pp-docs-flecha" aria-hidden>↗</span>
          </a>
          <button type="button" className="pp-video-abrir" onClick={() => setVideoAbierto(true)}
            aria-label="Ver el vídeo de portada de JumperNET" aria-haspopup="dialog">
            <span className="pp-video-abrir-ico" aria-hidden>▶</span>
            <span className="pp-video-abrir-txt">vídeo</span>
            <i className="pp-video-abrir-punto" aria-hidden />
          </button>
          {activa === "/" && (
            <button type="button" className="pp-tour-abrir"
              onClick={() => window.dispatchEvent(new Event("jumpernet-tour"))}
              aria-label="Abrir la visita guiada" title="Visita guiada">?</button>
          )}
          <button type="button" className={`jn-cartbtn ${carrito.cantidad ? "con-plan" : ""}`}
            onClick={() => setCarritoAbierto(true)}
            aria-label={carrito.cantidad ? `Abrir el carrito, ${carrito.cantidad} plan` : "Abrir el carrito, vacío"}
            title="Carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 4h2l2.4 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6" />
              <circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" />
            </svg>
            {carrito.cantidad > 0 && <span className="jn-cartbtn-badge">{carrito.cantidad}</span>}
          </button>
          <BotonModo />
          {enSesion ? (
            <a className="btn primario" href="#/panel">Abrir panel <span aria-hidden>→</span></a>
          ) : (
            <>
              <a className="pp-entrar" href="#/acceso/login">Entrar</a>
              <a className="btn primario" href="#/acceso/registro">
                <span className="larga">Crear cuenta</span>
                <span className="corta">Crear</span>
              </a>
            </>
          )}
        </div>

        <span className="pp-progreso" style={{ transform: `scaleX(${progreso})` }} aria-hidden />
      </header>

      <main className="pp-main sp-main">
        <div className="sp-pagina" key={activa}>{children}</div>
      </main>

      <nav className="pp-dock jn-dock" aria-label="Páginas del sitio">
        <span className="jn-dock-luz" aria-hidden />
        <div className="jn-dock-lista">
          {ENLACES.map((e) => (
            <a key={e.ruta} href={`#${e.ruta}`}
              className={`jn-dock-item ${activa === e.ruta ? "activa" : ""}`}
              data-tour={e.ruta === "/recursos" ? "recursos" : undefined}
              aria-current={activa === e.ruta ? "page" : undefined}>
              <span className="jn-dock-ico" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {DOCK_ICONOS[e.ruta]}
                </svg>
              </span>
              <span className="jn-dock-txt">{e.corto}</span>
              <span className="jn-dock-tip" aria-hidden>{e.texto}</span>
            </a>
          ))}
        </div>
      </nav>

      <div className="vivo-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`vivo-toast ${t.tipo} ${t.sale ? "sale" : ""}`}>
            <span className="vivo-toast-ico" aria-hidden>{TOAST_ICONO[t.tipo] || "✓"}</span>
            <span className="vivo-toast-txt">
              <b>{t.tipo === "error" ? "no se pudo" : t.tipo === "info" ? "ten en cuenta" : "hecho"}</b>
              <span>{t.texto}</span>
            </span>
          </div>
        ))}
      </div>

      <CarritoPanel abierto={carritoAbierto} cerrar={() => setCarritoAbierto(false)} />
      <PromoAviso />
      <Reproductor />
      <VideoModal abierto={videoAbierto} cerrar={() => setVideoAbierto(false)} />
      <Buscador abierto={buscador} cerrar={() => setBuscador(false)} />

      <footer className="sp-pie">
        <div className="sp-pie-arriba">
          <div className="sp-pie-marca">
            <Logo tam={34} />
            <div>
              <div className="pp-marca-txt">Jumper<span>NET</span></div>
              <div className="nota mono">red de anonimato por 3 saltos · equipo 2026</div>
              <div className="sp-pie-firma mono">
                por <a href="#/equipo">{NOMBRES}</a>
              </div>
            </div>
          </div>
          <div className="sp-pie-legal nota mono">
            jumpernet.duckdns.org · API HTTPS · los saltos son lógicos, no geográficos ·
            no es anonimato de grado onion
          </div>
        </div>

        <div className="sp-pie-columnas">
          <div>
            <span className="sp-pie-tit mono">páginas</span>
            {ENLACES.map((e) => <a key={e.ruta} href={`#${e.ruta}`}>{e.texto}</a>)}
          </div>
          <div>
            <span className="sp-pie-tit mono">tu cuenta</span>
            <a href="#/acceso/login">Entrar</a>
            <a href="#/acceso/registro">Crear cuenta</a>
            <a href="#/panel">Panel de red</a>
            <a href="#/tarifas">Planes</a>
          </div>
          <div>
            <span className="sp-pie-tit mono">recursos</span>
            <a href={DOCS_URL} target="_blank" rel="noreferrer">Documentación ↗</a>
            <a href="https://github.com/y0selin/jumperNET" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href="#/dudas">Preguntas frecuentes</a>
            <a href="#/descargas">Descargas</a>
            <a href="#/video">El viaje en vídeo</a>
          </div>
        </div>

        <p className="nota mono sp-pie-final">
          © {new Date().getFullYear()} JumperNET · v{VERSION} · creado por {NOMBRES} · hecho para aprender cómo viaja (y cómo se protege) una conexión
        </p>
      </footer>

      <button className={`pp-arriba ${arriba ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Volver arriba">↑</button>
    </div>
  );
}
