import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import BotonModo from "./BotonModo.jsx";
import Reproductor from "./Reproductor.jsx";
import VideoModal from "./VideoModal.jsx";
import Nieve from "./Nieve.jsx";
import FondoRed from "./FondoRed.jsx";
import Visita from "./Visita.jsx";
import AvisoDocs from "./AvisoDocs.jsx";
import Buscador from "./Buscador.jsx";
import Oferta from "./Oferta.jsx";
import { BotonCarrito } from "./Carrito.jsx";
import { BotonCampana } from "./Notificaciones.jsx";
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
  "/contacto": "Contacto y soporte",
  "/pago": "Contratar un plan",
  "/panel": "Panel",
};

export default function Sitio({ ruta, enSesion, children }) {
  const [pegada, setPegada] = useState(false);
  const [arriba, setArriba] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [videoAbierto, setVideoAbierto] = useState(false);
  const [buscador, setBuscador] = useState(false);
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

  /* el hero y el reproductor pueden abrir el vídeo en grande */
  useEffect(() => {
    const abre = () => setVideoAbierto(true);
    window.addEventListener("jumpernet-video", abre);
    return () => window.removeEventListener("jumpernet-video", abre);
  }, []);

  useEffect(() => { setVideoAbierto(false); setBuscador(false); }, [activa]);

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
          <span className="pp-nav-badge mono" aria-hidden>EN VIVO</span>
          <span className="pp-nav-estado mono"><i aria-hidden /> {enSesion ? "sesión activa" : "red educativa"}</span>
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
          <BotonCampana />
          <BotonCarrito compacto />
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

      <nav className="pp-dock" aria-label="Páginas del sitio">
        <div className="dock-lista">
          {ENLACES.map((e) => (
            <a key={e.ruta} href={`#${e.ruta}`}
              className={`dock-enlace ${activa === e.ruta ? "activa" : ""}`}
              data-tour={e.ruta === "/recursos" ? "recursos" : undefined}
              aria-current={activa === e.ruta ? "page" : undefined}>
              <span className="dock-ico" aria-hidden>{e.ico}</span>
              <span className="dock-txt">{e.corto}</span>
            </a>
          ))}
        </div>
      </nav>

      <Reproductor />
      <VideoModal abierto={videoAbierto} cerrar={() => setVideoAbierto(false)} />
      <Buscador abierto={buscador} cerrar={() => setBuscador(false)} />
      <Oferta activa={activa} />

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
            <a href="#/contacto">Contacto y soporte</a>
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
