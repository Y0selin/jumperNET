import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import BotonModo from "./BotonModo.jsx";
import Reproductor from "./Reproductor.jsx";
import VideoModal from "./VideoModal.jsx";
import { ENLACES } from "../lib/contenido.js";
import { NOMBRES } from "../lib/equipo.js";
import { baseRuta } from "../lib/router.js";
import { VERSION } from "../lib/version.js";

/* Marco del sitio público, edición plano técnico.
   Una sola barra de cabecera con la navegación numerada; en móvil la
   navegación baja a un dock de alto contraste. */

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
  "/acceso": "Entrar o crear cuenta",
  "/panel": "Panel",
};

const NAV = [...ENLACES, { ruta: "/descargas", texto: "Descargas", corto: "Descargas", ico: "↓" }];

export default function Sitio({ ruta, enSesion, children }) {
  const [pegada, setPegada] = useState(false);
  const [arriba, setArriba] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [videoAbierto, setVideoAbierto] = useState(false);
  const activa = baseRuta(ruta);

  useEffect(() => {
    const alScroll = () => {
      setPegada(window.scrollY > 10);
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

  useEffect(() => {
    const abre = () => setVideoAbierto(true);
    window.addEventListener("jumpernet-video", abre);
    return () => window.removeEventListener("jumpernet-video", abre);
  }, []);

  useEffect(() => setVideoAbierto(false), [activa]);

  return (
    <div className="sp sx">
      <header className={`sx-cab ${pegada ? "is-pegada" : ""}`}>
        <a
          className={`sx-marca ${activa === "/" ? "is-activa" : ""}`}
          href="#/"
          aria-label="JumperNET, ir a la portada"
          aria-current={activa === "/" ? "page" : undefined}
        >
          <Logo tam={30} />
          <span className="sx-marca-txt">Jumper<span>NET</span></span>
          <span className="sx-marca-v">v{VERSION}</span>
        </a>

        <nav className="sx-nav" aria-label="Páginas del sitio">
          {NAV.map((e, i) => (
            <a
              key={e.ruta}
              href={`#${e.ruta}`}
              className={activa === e.ruta ? "is-activa" : ""}
              aria-current={activa === e.ruta ? "page" : undefined}
            >
              <b aria-hidden>{String(i + 1).padStart(2, "0")}</b>
              {e.corto}
            </a>
          ))}
        </nav>

        <div className="sx-acciones">
          <span className="sx-status mono"><i aria-hidden /> {enSesion ? "SESIÓN ACTIVA" : "RED EDUCATIVA"}</span>
          <button
            type="button"
            className="sx-video-btn"
            onClick={() => setVideoAbierto(true)}
            aria-label="Ver el vídeo de portada de JumperNET"
            aria-haspopup="dialog"
          >
            <span aria-hidden>▶</span> vídeo
          </button>
          <BotonModo compacto />
          {enSesion ? (
            <a className="sx-btn sx-btn--fill" href="#/panel">Panel <span aria-hidden>→</span></a>
          ) : (
            <>
              <a className="sx-entrar" href="#/acceso/login">Entrar</a>
              <a className="sx-btn sx-btn--fill" href="#/acceso/registro">Crear cuenta</a>
            </>
          )}
        </div>

        <span className="sx-progreso" style={{ transform: `scaleX(${progreso})` }} aria-hidden />
      </header>

      <main className="sx-main sp-main">
        <div className="sp-pagina" key={activa}>{children}</div>
      </main>

      <nav className="sx-dock" aria-label="Páginas del sitio en móvil">
        <div className="sx-dock-lista">
          {NAV.map((e, i) => (
            <a
              key={e.ruta}
              href={`#${e.ruta}`}
              className={activa === e.ruta ? "is-activa" : ""}
              aria-current={activa === e.ruta ? "page" : undefined}
            >
              <span className="sx-dock-n" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              {e.corto}
            </a>
          ))}
        </div>
      </nav>

      <Reproductor />
      <VideoModal abierto={videoAbierto} cerrar={() => setVideoAbierto(false)} />

      <footer className="sx-pie">
        <div className="sx-pie-word" aria-hidden>JUMPERNET</div>
        <div className="sx-pie-top">
          <div className="sx-pie-marca">
            <span className="sx-kicker">RED SOCKS5 · 3 SALTOS · 2026</span>
            <p className="sx-pie-lema">Tu conexión<br />no va sola.</p>
            <p className="sx-pie-meta mono">ChaCha20-Poly1305 · salida 80/443 · sin histórico</p>
          </div>

          <nav className="sx-pie-cols" aria-label="Enlaces del pie">
            <div>
              <span className="sx-pie-tit">navegar</span>
              {ENLACES.slice(0, 4).map((e) => (
                <a key={e.ruta} href={`#${e.ruta}`}>{e.texto}</a>
              ))}
            </div>
            <div>
              <span className="sx-pie-tit">más</span>
              {ENLACES.slice(4).map((e) => (
                <a key={e.ruta} href={`#${e.ruta}`}>{e.texto}</a>
              ))}
              <a href="https://jumpernet.duckdns.org/docs/" target="_blank" rel="noreferrer">Documentación ↗</a>
            </div>
            <div>
              <span className="sx-pie-tit">tu cuenta</span>
              <a href="#/acceso/login">Entrar</a>
              <a href="#/acceso/registro">Crear cuenta</a>
              <a href="#/panel">Panel de red</a>
              <a href="#/tarifas">Planes</a>
              <a href="#/descargas">Descargas</a>
            </div>
          </nav>
        </div>

        <div className="sx-pie-bottom">
          <span>© {new Date().getFullYear()} JUMPERNET · V{VERSION}</span>
          <span>HECHO POR {NOMBRES}</span>
          <span>LOS SALTOS SON LÓGICOS, NO GEOGRÁFICOS</span>
        </div>
      </footer>

      <button
        className={`sx-arriba ${arriba ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Volver arriba"
      >
        ↑
      </button>
    </div>
  );
}
