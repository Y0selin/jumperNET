import { useEffect, useState } from "react";
import GlifosFondo from "./GlifosFondo.jsx";
import { ENLACES } from "../lib/contenido.js";
import { baseRuta } from "../lib/router.js";

/* Marco del sitio público.
   Navegación nueva: barra superior fina (marca + cuenta) y un dock inferior
   flotante con las cinco páginas. El dock es la única navegación entre
   páginas, tanto en escritorio como en móvil, y marca la página activa. */

const TITULOS = {
  "/": "Portada",
  "/proyecto": "Qué es JumperNET",
  "/usos": "Para qué sirve",
  "/funciona": "Cómo funciona",
  "/tarifas": "Tarifas",
  "/dudas": "Dudas",
  "/descargas": "Descargas",
  "/acceso": "Entrar o crear cuenta",
  "/panel": "Panel",
};

export default function Sitio({ ruta, enSesion, children }) {
  const [pegada, setPegada] = useState(false);
  const [arriba, setArriba] = useState(false);
  const [progreso, setProgreso] = useState(0);
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
      <GlifosFondo />

      <header className={`pp-nav ${pegada ? "pegada" : ""}`}>
        <a className="pp-marca" href="#/" aria-label="JumperNET, ir a la portada">
          <span className="logo-cubo">JN</span>
          <span className="pp-marca-txt">Jumper<span>NET</span><i className="cursor">_</i></span>
        </a>

        <div className="pp-nav-centro" aria-hidden>
          <span className="pp-nav-seccion mono">// {TITULOS[activa] || "jumpernet"}</span>
          <span className="pp-nav-linea" />
        </div>

        <div className="pp-nav-acciones">
          <span className="pp-nav-estado mono"><i aria-hidden /> {enSesion ? "sesión activa" : "red educativa"}</span>
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
              aria-current={activa === e.ruta ? "page" : undefined}>
              <span className="dock-ico" aria-hidden>{e.ico}</span>
              <span className="dock-txt">{e.corto}</span>
            </a>
          ))}
        </div>
      </nav>

      <footer className="sp-pie">
        <div className="sp-pie-arriba">
          <div className="sp-pie-marca">
            <span className="logo-cubo">JN</span>
            <div>
              <div className="pp-marca-txt">Jumper<span>NET</span></div>
              <div className="nota mono">red de anonimato por 3 saltos · proyecto educativo</div>
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
            <a href="https://jumpernet.duckdns.org/docs/" target="_blank" rel="noreferrer">Documentación ↗</a>
            <a href="https://github.com/y0selin/jumperNET" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href="#/dudas">Preguntas frecuentes</a>
            <a href="#/descargas">Descargas</a>
          </div>
        </div>

        <p className="nota mono sp-pie-final">
          © {new Date().getFullYear()} JumperNET · hecho para aprender cómo viaja (y cómo se protege) una conexión
        </p>
      </footer>

      <button className={`pp-arriba ${arriba ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Volver arriba">↑</button>
    </div>
  );
}
