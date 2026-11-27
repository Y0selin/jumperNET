import { useEffect, useRef, useState } from "react";
import { CAPITULOS } from "../lib/video.js";

const BASE = import.meta.env.BASE_URL || "./";

/* El vídeo largo del proyecto. Se usa en su página y en la portada,
   para no duplicar el marcado ni el archivo. El reproductor es propio
   —no el nativo del navegador— para que hable el mismo idioma visual
   que el resto de la web: barra de progreso, tiempo, sonido, capítulos
   y pantalla completa. */

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

export default function VideoViaje({ className = "" }) {
  const caja = useRef(null);
  const video = useRef(null);
  const [jugando, setJugando] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [dur, setDur] = useState(0);
  const [mudo, setMudo] = useState(false);
  const [completo, setCompleto] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const meta = () => { if (Number.isFinite(v.duration)) setDur(v.duration); };
    const avanza = () => {
      setTiempo(v.currentTime);
      if (v.duration) setCompleto(v.currentTime >= v.duration - 0.2);
    };
    const alPlay = () => { setJugando(true); setCompleto(false); };
    const alPausa = () => setJugando(false);
    v.addEventListener("loadedmetadata", meta);
    v.addEventListener("durationchange", meta);
    v.addEventListener("timeupdate", avanza);
    v.addEventListener("play", alPlay);
    v.addEventListener("pause", alPausa);
    v.addEventListener("ended", () => { setJugando(false); setCompleto(true); });
    if (v.readyState >= 1) meta();
    return () => {
      v.removeEventListener("loadedmetadata", meta);
      v.removeEventListener("durationchange", meta);
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
  function salta(e) {
    const v = video.current;
    if (!v || !dur) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setTiempo(t);
    setCompleto(t >= dur - 0.2);
  }
  function capítulo(t) {
    const v = video.current;
    if (!v) return;
    v.currentTime = t;
    setTiempo(t);
    v.play().catch(() => {});
  }
  function alternaMudo() {
    const v = video.current;
    if (!v) return;
    const nuevo = !mudo;
    v.muted = nuevo;
    setMudo(nuevo);
    if (!nuevo) v.play().catch(() => {});
  }
  function pantalla() {
    const cajaEl = caja.current;
    if (!cajaEl) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else cajaEl.requestFullscreen?.().catch(() => {});
  }
  function alTecla(e) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); alterna(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); video.current && (video.current.currentTime += 5); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); video.current && (video.current.currentTime -= 5); }
  }

  const pct = dur ? Math.min(100, (tiempo / dur) * 100) : 0;
  const activo = CAPITULOS.reduce((a, c, i) => (tiempo + 0.2 >= c.t ? i : a), 0);

  return (
    <figure className={`vp-video tarjeta vv ${jugando ? "viendo" : ""} ${className}`.trim()}>
      <div className="vv-marco" ref={caja}>
        <video
          ref={video}
          className="vv-lienzo"
          playsInline
          preload="metadata"
          poster={`${BASE}video/portada.jpg`}
          onClick={alterna}
          aria-label="Vídeo completo del proyecto JumperNET: el viaje de principio a fin"
        >
          <source src={`${BASE}video/JumperNET_El_Viaje.mp4`} type="video/mp4" />
          Tu navegador no puede reproducir este vídeo.
        </video>

        <button type="button" className="vv-play" onClick={alterna}
          aria-label={jugando ? "Pausar el vídeo" : "Reproducir el vídeo"}>
          <span aria-hidden>{jugando ? "❚❚" : "▶"}</span>
        </button>

        <div className="vv-barra" onClick={(e) => e.stopPropagation()}>
          <input
            type="range"
            min="0"
            max={dur || 0}
            step="0.1"
            value={Math.min(tiempo, dur || 0)}
            onChange={salta}
            onKeyDown={alTecla}
            aria-label="Posición del vídeo"
            aria-valuetext={`${fmt(tiempo)} de ${fmt(dur)}`}
            style={{ "--pct": `${pct}%` }}
          />
        </div>

        <div className="vv-mando">
          <button type="button" className="vv-boton vv-boton-play" onClick={alterna}
            aria-label={jugando ? "Pausar" : "Reproducir"}>
            <span aria-hidden>{jugando ? "❚❚" : "▶"}</span>
          </button>
          <span className="vv-tiempo mono">{fmt(tiempo)} <i>/ {fmt(dur)}</i></span>
          <span className="vv-capitulo mono">{CAPITULOS[activo]?.n}</span>
          <span className="vv-flex" />
          <button type="button" className={`vv-boton ${mudo ? "on" : ""}`} onClick={alternaMudo}
            aria-pressed={mudo} aria-label={mudo ? "Activar el sonido" : "Silenciar el vídeo"}>
            <span aria-hidden>{mudo ? "🔇" : "🔊"}</span>
          </button>
          <button type="button" className="vv-boton vv-boton-pantalla" onClick={pantalla}
            aria-label={completo ? "Pantalla completa" : "Pantalla completa"}>
            <span aria-hidden>⛶</span>
          </button>
        </div>
      </div>

      <figcaption className="vp-video-pie vv-caps">
        <span className="mono vv-caps-etq">el viaje completo · JumperNET</span>
        <nav className="vv-caps-lista" aria-label="Capítulos del vídeo">
          {CAPITULOS.map((c, i) => (
            <button key={c.n} type="button" className={activo === i ? "activa" : ""}
              onClick={() => capítulo(c.t)} aria-current={activo === i ? "true" : undefined}>
              <i className="mono">{String(i + 1).padStart(2, "0")}</i>
              {c.n}
            </button>
          ))}
        </nav>
        <span className="nota vv-caps-pie">si quieres, ábrelo a pantalla completa</span>
      </figcaption>
    </figure>
  );
}
