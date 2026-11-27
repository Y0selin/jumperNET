import { useEffect, useRef, useState } from "react";
import { CAPITULOS, DURACION } from "../lib/video.js";

const BASE = import.meta.env.BASE_URL || "./";

/* El vídeo, accesible desde cualquier página con el botón de la cabecera.
   Se abre en un cine a pantalla completa, arranca mudo (política del
   navegador) y deja activar la música, saltar de capítulo y leer subtítulos. */

export default function VideoModal({ abierto, cerrar }) {
  const video = useRef(null);
  const cerrarRef = useRef(null);
  const [sonido, setSonido] = useState(false);
  const [jugando, setJugando] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [cc, setCc] = useState(true);
  const [dur, setDur] = useState(DURACION);

  const capActivo = CAPITULOS.reduce((a, c, i) => (tiempo + 0.15 >= c.t ? i : a), 0);
  const pct = dur ? Math.min(100, (tiempo / dur) * 100) : 0;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!abierto) {
      v.pause();
      return;
    }
    document.body.classList.add("video-abierto");
    window.dispatchEvent(new Event("jumpernet-callar-musica"));
    v.currentTime = 0;
    v.muted = true;
    setSonido(false);
    setTiempo(0);
    const intenta = () => v.play().then(() => setJugando(true)).catch(() => {});
    intenta();
    const t1 = setTimeout(intenta, 450);
    const t2 = setTimeout(intenta, 1200);
    const alPulsar = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", alPulsar);
    setTimeout(() => cerrarRef.current?.focus(), 60);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", alPulsar);
      document.body.classList.remove("video-abierto");
      v.pause();
    };
  }, [abierto, cerrar]);

  function alterna() {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }
  function alternaSonido() {
    const v = video.current;
    if (!v) return;
    const nuevo = !sonido;
    v.muted = !nuevo;
    if (nuevo) {
      window.dispatchEvent(new Event("jumpernet-callar-musica"));
      v.play().catch(() => {});
    }
    setSonido(nuevo);
  }
  function salta(t) {
    const v = video.current;
    if (!v) return;
    v.currentTime = t;
    setTiempo(t);
    v.play().catch(() => {});
  }
  function busca(e) {
    const v = video.current;
    if (!v) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    v.currentTime = p * (dur || DURACION);
    setTiempo(v.currentTime);
  }

  return (
    <div className={`video-modal ${abierto ? "abierto" : ""}`}
      role="dialog" aria-modal="true" aria-hidden={!abierto}
      aria-label="Vídeo de portada de JumperNET">
      <button type="button" className="video-modal-fondo" onClick={cerrar}
        aria-label="Cerrar el vídeo" tabIndex={-1} />

      <div className="video-modal-caja">
        <header className="video-modal-cab">
          <div>
            <span className="video-modal-kicker mono">// vídeo de portada · {DURACION} s</span>
            <h2 className="video-modal-titulo">JumperNET, <span>de un vistazo</span></h2>
          </div>
          <button ref={cerrarRef} type="button" className="video-modal-cerrar"
            onClick={cerrar} aria-label="Cerrar el vídeo">✕</button>
        </header>

        <div className="video-modal-lienzo">
          <video
            ref={video}
            src={`${BASE}video/portada.webm`}
            poster={`${BASE}video/portada.jpg`}
            muted
            loop
            playsInline
            preload="auto"
            onClick={alterna}
            onTimeUpdate={(e) => setTiempo(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              setDur(Number.isFinite(d) && d > 0 ? d : DURACION);
            }}
            onPlay={() => setJugando(true)}
            onPause={() => setJugando(false)}
            aria-label="Vídeo de portada de JumperNET, 30 segundos, con música"
          />
          <button type="button" className="video-modal-play"
            onClick={alterna} aria-label={jugando ? "Pausar el vídeo" : "Reproducir el vídeo"}>
            <span aria-hidden>{jugando ? "❚❚" : "▶"}</span>
          </button>

          {cc && (
            <p className="video-modal-sub" aria-live="polite">
              <span className="mono">CC</span> {CAPITULOS[capActivo].d}
            </p>
          )}

          <div className="video-modal-barra" onClick={busca} role="presentation">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="video-modal-mando">
          <button type="button" className="video-modal-boton" onClick={alterna}>
            {jugando ? "❚❚ pausa" : "▶ reproducir"}
          </button>
          <button type="button" className={`video-modal-boton ${sonido ? "on" : ""}`}
            onClick={alternaSonido} aria-pressed={sonido}>
            <svg className="video-modal-boton-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6.5 8.6H3.5v6.8h3L11 19z" />
              {sonido
                ? <><path d="M15 9.2a4 4 0 0 1 0 5.6" /><path d="M17.8 6.4a7.6 7.6 0 0 1 0 11.2" /></>
                : <><path d="m15 9.5 5 5M20 9.5l-5 5" /></>}
            </svg>
            {sonido ? "con música" : "activar música"}
          </button>
          <button type="button" className={`video-modal-boton ${cc ? "on" : ""}`}
            onClick={() => setCc((v) => !v)} aria-pressed={cc}>CC subtítulos</button>
          <span className="video-modal-tiempo mono">
            {Math.floor(tiempo)} s / {Math.round(dur)} s
          </span>
        </div>

        <div className="video-modal-caps" aria-label="Capítulos del vídeo">
          {CAPITULOS.map((c, i) => (
            <button key={c.n} type="button"
              className={`video-modal-cap ${capActivo === i ? "activa" : ""}`}
              onClick={() => salta(c.t)}
              aria-current={capActivo === i ? "true" : undefined}>
              <i className="mono">{String(i + 1).padStart(2, "0")}</i>
              <span>{c.n}</span>
            </button>
          ))}
        </div>

        <footer className="video-modal-pie">
          <span className="mono">música original · equipo JumperNET 2026</span>
          <a href="#/acceso/registro" onClick={cerrar}>Crear mi cuenta <span aria-hidden>→</span></a>
        </footer>
      </div>
    </div>
  );
}
