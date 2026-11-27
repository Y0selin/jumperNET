import { useEffect, useRef, useState } from "react";
import { CAPITULOS, DURACION } from "../lib/video.js";
import { lanzarAviso } from "../lib/avisos.js";

/* Vídeo de portada con música y capítulos.
   Sigue reproduciéndose solo (mudo) al entrar en pantalla; el sonido se
   activa con un clic —los navegadores no permiten otra cosa— y los
   capítulos llevan a cada escena. El archivo lo genera
   scripts/generar-video.mjs y vive en public/video/. */
const BASE = import.meta.env.BASE_URL || "./";

export default function VideoPortada() {
  const caja = useRef(null);
  const video = useRef(null);
  const [jugando, setJugando] = useState(false);
  const [error, setError] = useState(false);
  const [conAudio, setConAudio] = useState(false);
  const [cc, setCc] = useState(true);
  const [dur, setDur] = useState(DURACION);
  const [tiempo, setTiempo] = useState(0);
  const [fin, setFin] = useState(false);
  const finRef = useRef(false);

  function marcarFin() {
    if (finRef.current) return;
    finRef.current = true;
    video.current?.pause();
    setJugando(false);
    setFin(true);
    setTiempo((t) => Math.max(t, Math.min(DURACION, video.current?.duration || DURACION)));
    window.dispatchEvent(new Event("jumpernet-video-visto"));
  }

  /* autoplay mudo solo cuando el vídeo está a la vista.
     Se insiste un par de veces: al llegar desde otra página el primer
     play() puede coincidir con el cambio de scroll y quedarse en espera. */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    let montado = true;
    let enVista = false;
    const intenta = () => {
      if (!montado || !enVista || finRef.current) return;
      v.muted = true;
      v.play().then(() => { if (montado) setJugando(true); }).catch(() => {});
    };
    if (typeof IntersectionObserver !== "function") {
      enVista = true;
      intenta();
      return;
    }
    const obs = new IntersectionObserver(([e]) => {
      enVista = e.isIntersecting;
      document.body.classList.toggle("video-en-vista", enVista && e.intersectionRatio > .5);
      if (enVista) {
        intenta();
        setTimeout(intenta, 500);
        setTimeout(intenta, 1400);
      } else {
        v.pause();
        setJugando(false);
      }
    }, { threshold: [0.12, 0.55], rootMargin: "0px 0px -4% 0px" });
    obs.observe(caja.current);
    if (v.readyState >= 2) intenta();
    return () => {
      montado = false;
      obs.disconnect();
      document.body.classList.remove("video-en-vista");
    };
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const meta = () => { if (Number.isFinite(v.duration)) setDur(v.duration); };
    const avanza = () => {
      setTiempo(v.currentTime);
      const corte = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : DURACION;
      if (v.currentTime >= corte - 0.15) marcarFin();
    };
    const alPlay = () => setJugando(true);
    const alPausa = () => setJugando(false);
    v.addEventListener("loadedmetadata", meta);
    v.addEventListener("timeupdate", avanza);
    v.addEventListener("play", alPlay);
    v.addEventListener("pause", alPausa);
    v.addEventListener("ended", marcarFin);
    if (v.readyState >= 1) meta();
    return () => {
      v.removeEventListener("loadedmetadata", meta);
      v.removeEventListener("timeupdate", avanza);
      v.removeEventListener("play", alPlay);
      v.removeEventListener("pause", alPausa);
      v.removeEventListener("ended", marcarFin);
    };
  }, []);

  function alterna() {
    const v = video.current;
    if (!v) return;
    if (fin) { repetir(); return; }
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }
  function repetir() {
    const v = video.current;
    if (!v) return;
    finRef.current = false;
    setFin(false);
    setTiempo(0);
    v.currentTime = 0;
    if (!conAudio) v.muted = true;
    v.play().catch(() => {});
  }
  function alternaSonido() {
    const v = video.current;
    if (!v) return;
    const nuevo = !conAudio;
    v.muted = !nuevo;
    if (nuevo) {
      window.dispatchEvent(new Event("jumpernet-callar-musica"));
      v.play().catch(() => {});
      lanzarAviso("Música del vídeo activada; la música del fondo se calla.", "info");
    }
    setConAudio(nuevo);
  }
  function salta(t) {
    const v = video.current;
    if (!v) return;
    if (fin) { finRef.current = false; setFin(false); }
    v.currentTime = t;
    setTiempo(t);
    v.play().catch(() => {});
  }

  const pct = dur ? Math.min(100, (tiempo / dur) * 100) : 0;
  const capActivo = CAPITULOS.reduce((a, c, i) => (tiempo + 0.15 >= c.t ? i : a), 0);
  const cap = CAPITULOS[capActivo];

  return (
    <div className="pp-video-bloque">
      <figure ref={caja} className={`pp-video ${jugando ? "en-marcha" : ""} ${conAudio ? "con-audio" : ""} ${fin ? "fin" : ""}`}>
        <video
          ref={video}
          className="pp-video-lienzo"
          src={`${BASE}video/portada.webm`}
          poster={`${BASE}video/portada.jpg`}
          muted
          playsInline
          preload="metadata"
          onClick={alterna}
          onError={() => setError(true)}
          aria-label="Vídeo de portada: cómo funciona JumperNET en 30 segundos, con música"
        />

        {fin && !error && (
          <div className="pp-video-fin">
            <div className="pp-video-fin__caja">
              <span className="pp-video-fin__etq">fin del resumen · 30 s</span>
              <h3>Ahora descubre cómo funciona por dentro.</h3>
              <div className="pp-video-fin__acciones">
                <a href="#/funciona">Explorar los tres saltos →</a>
                <button type="button" onClick={repetir}>↺ Volver a ver</button>
              </div>
            </div>
          </div>
        )}

        {!error && (
          <>
            {cc && (
              <p className="pp-video-sub" aria-live="polite">
                <span className="mono">CC</span> {cap.d}
              </p>
            )}

            <button
              type="button"
              className="pp-video-play"
              onClick={alterna}
              aria-label={jugando ? "Pausar el vídeo" : "Reproducir el vídeo"}
            >
              <span aria-hidden>{jugando ? "❚❚" : "▶"}</span>
            </button>

            <button
              type="button"
              className="pp-video-sonido"
              onClick={alternaSonido}
              aria-pressed={conAudio}
              aria-label={conAudio ? "Silenciar el vídeo" : "Activar la música del vídeo"}
            >
              <svg className="pp-video-sonido-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 5 6.5 8.6H3.5v6.8h3L11 19z" />
                {conAudio
                  ? <><path d="M15 9.2a4 4 0 0 1 0 5.6" /><path d="M17.8 6.4a7.6 7.6 0 0 1 0 11.2" /></>
                  : <><path d="m15 9.5 5 5M20 9.5l-5 5" /></>}
              </svg>
              {conAudio ? "con música" : "activar música"}
            </button>

            <figcaption className="pp-video-pie">
              <span className="pp-video-tag mono">
                <span className="punto-vivo" /> {DURACION} s · música + subtítulos
              </span>
              <span className="pp-video-controles">
                <button type="button" className={`pp-video-btn ${cc ? "on" : ""}`}
                  onClick={() => setCc((v) => !v)} aria-pressed={cc}
                  aria-label="Mostrar u ocultar subtítulos">CC</button>
                <button type="button" className="pp-video-btn"
                  onClick={() => window.dispatchEvent(new Event("jumpernet-video"))}>
                  ⛶ grande
                </button>
                <button type="button" className="pp-video-btn" onClick={repetir} aria-label="Repetir el vídeo">↺ repetir</button>
                <a className="pp-video-btn" href={`${BASE}video/portada.webm`} download>⬇ descargar</a>
              </span>
            </figcaption>

            <div className={`pp-video-barra ${dur ? "" : "indeterminada"}`} aria-hidden>
              <i style={dur ? { width: `${pct}%` } : undefined} />
            </div>
          </>
        )}

        {error && (
          <div className="pp-video-fallo">
            <b>Tu navegador no reproduce el vídeo (WebM)</b>
            <span className="nota">Abajo tienes el circuito explicado paso a paso, sin vídeo.</span>
          </div>
        )}
      </figure>

      <nav className="pp-video-caps" aria-label="Capítulos del vídeo">
        {CAPITULOS.map((c, i) => (
          <button key={c.n} type="button"
            className={`pp-video-cap ${capActivo === i ? "activa" : ""}`}
            onClick={() => salta(c.t)}
            aria-current={capActivo === i ? "true" : undefined}>
            <i className="mono">{String(i + 1).padStart(2, "0")}</i>{c.n}
          </button>
        ))}
      </nav>
    </div>
  );
}
