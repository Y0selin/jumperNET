import { useEffect, useRef, useState } from "react";

/* Vídeo de portada: se reproduce solo (mudo) cuando entra en pantalla, se
   pausa al salir y trae controles propios mínimos. El archivo lo genera
   scripts/generar-video.mjs (WebM VP9) y vive en public/video/. */
const BASE = import.meta.env.BASE_URL || "./";

export default function VideoPortada() {
  const caja = useRef(null);
  const video = useRef(null);
  const [jugando, setJugando] = useState(false);
  const [error, setError] = useState(false);
  const [dur, setDur] = useState(0);
  const [tiempo, setTiempo] = useState(0);

  /* autoplay solo cuando el vídeo está a la vista */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (typeof IntersectionObserver !== "function") {
      v.play().then(() => setJugando(true)).catch(() => {});
      return;
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().then(() => setJugando(true)).catch(() => {});
      else { v.pause(); setJugando(false); }
    }, { threshold: 0.35 });
    obs.observe(caja.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const meta = () => { if (Number.isFinite(v.duration)) setDur(v.duration); };
    const avanza = () => setTiempo(v.currentTime);
    const alPlay = () => setJugando(true);
    const alPausa = () => setJugando(false);
    v.addEventListener("loadedmetadata", meta);
    v.addEventListener("timeupdate", avanza);
    v.addEventListener("play", alPlay);
    v.addEventListener("pause", alPausa);
    if (v.readyState >= 1) meta();
    return () => {
      v.removeEventListener("loadedmetadata", meta);
      v.removeEventListener("timeupdate", avanza);
      v.removeEventListener("play", alPlay);
      v.removeEventListener("pause", alPausa);
    };
  }, []);

  function alterna() {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }
  function repetir() {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  const pct = dur ? Math.min(100, (tiempo / dur) * 100) : 0;

  return (
    <figure ref={caja} className={`pp-video ${jugando ? "en-marcha" : ""}`}>
      <video
        ref={video}
        className="pp-video-lienzo"
        src={`${BASE}video/portada.webm`}
        poster={`${BASE}video/portada.jpg`}
        muted
        loop
        playsInline
        preload="metadata"
        onClick={alterna}
        onError={() => setError(true)}
        aria-label="Vídeo de portada: cómo funciona JumperNET en 25 segundos"
      />

      {!error && (
        <>
          <button
            type="button"
            className="pp-video-play"
            onClick={alterna}
            aria-label={jugando ? "Pausar el vídeo" : "Reproducir el vídeo"}
          >
            <span aria-hidden>{jugando ? "❚❚" : "▶"}</span>
          </button>

          <figcaption className="pp-video-pie">
            <span className="pp-video-tag mono">
              <span className="punto-vivo" /> 25 s · sin sonido · texto en pantalla
            </span>
            <span className="pp-video-controles">
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
  );
}
