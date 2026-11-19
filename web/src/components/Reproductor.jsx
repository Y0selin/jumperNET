import { useEffect, useRef, useState } from "react";

/* Reproductor de la música de portada.
   Vive flotando junto al dock: se abre con un clic, reproduce el MP3
   (public/audio/portada.mp3) y dibuja un ecualizador real con Web Audio.
   La portada puede abrirlo lanzando el evento «jumpernet-musica». */

const BASE = import.meta.env.BASE_URL || "./";
const BARRAS = 12;

const dos = (n) => String(Math.floor(n || 0)).padStart(2, "0");
const reloj = (s) => (Number.isFinite(s) ? `${dos(s / 60)}:${dos(s % 60)}` : "00:00");

export default function Reproductor() {
  const audio = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [suena, setSuena] = useState(false);
  const [vol, setVol] = useState(0.62);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  const [fallo, setFallo] = useState(false);

  const ctx = useRef(null);
  const ana = useRef(null);
  const datos = useRef(null);
  const barraRefs = useRef([]);
  const raf = useRef(0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.volume = vol;
  }, [vol]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const t = () => setProg(a.currentTime);
    const m = () => setDur(Number.isFinite(a.duration) ? a.duration : 0);
    const p = () => setSuena(true);
    const q = () => setSuena(false);
    const e = () => setFallo(true);
    a.addEventListener("timeupdate", t);
    a.addEventListener("loadedmetadata", m);
    a.addEventListener("play", p);
    a.addEventListener("pause", q);
    a.addEventListener("ended", q);
    a.addEventListener("error", e);
    return () => {
      a.removeEventListener("timeupdate", t);
      a.removeEventListener("loadedmetadata", m);
      a.removeEventListener("play", p);
      a.removeEventListener("pause", q);
      a.removeEventListener("ended", q);
      a.removeEventListener("error", e);
    };
  }, []);

  /* ecualizador: analizador real sobre el propio <audio> */
  useEffect(() => {
    function pinta() {
      raf.current = requestAnimationFrame(pinta);
      const an = ana.current;
      if (!an || !datos.current) return;
      an.getByteFrequencyData(datos.current);
      for (let i = 0; i < BARRAS; i++) {
        const el = barraRefs.current[i];
        if (!el) continue;
        const v = datos.current[Math.min(datos.current.length - 1, 1 + i * 1.6)] / 255;
        el.style.transform = `scaleY(${(0.16 + v * 0.95).toFixed(3)})`;
      }
    }
    raf.current = requestAnimationFrame(pinta);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  function preparaAudio() {
    if (ctx.current) return;
    const a = audio.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!a || !AC) return;
    try {
      const c = new AC();
      const fuente = c.createMediaElementSource(a);
      const an = c.createAnalyser();
      an.fftSize = 64;
      an.smoothingTimeConstant = 0.78;
      fuente.connect(an);
      an.connect(c.destination);
      ctx.current = c;
      ana.current = an;
      datos.current = new Uint8Array(an.frequencyBinCount);
    } catch { /* sin Web Audio: el audio suena igual */ }
  }

  async function alterna() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      preparaAudio();
      try { await ctx.current?.resume?.(); } catch { /* ignorado */ }
      try { await a.play(); } catch { setFallo(true); }
    } else {
      a.pause();
    }
  }

  /* la portada (y cualquier botón) puede abrir el reproductor */
  useEffect(() => {
    const abre = async () => {
      setAbierto(true);
      const a = audio.current;
      if (!a) return;
      preparaAudio();
      try { await ctx.current?.resume?.(); } catch { /* ignorado */ }
      if (a.paused) a.play().catch(() => setFallo(true));
    };
    window.addEventListener("jumpernet-musica", abre);
    return () => window.removeEventListener("jumpernet-musica", abre);
  }, []);

  const pct = dur ? Math.min(100, (prog / dur) * 100) : 0;

  return (
    <div className={`reproductor ${abierto ? "abierto" : ""} ${suena ? "suena" : ""} ${fallo ? "fallo" : ""}`}>
      {abierto && (
        <div className="rep-panel" role="group" aria-label="Música de portada">
          <div className="rep-cab mono">
            <span><i className="punto-vivo" aria-hidden /> pista de portada</span>
            <span>{reloj(prog)} / {reloj(dur)}</span>
          </div>
          <b className="rep-titulo">Señal de JumperNET</b>
          <p className="nota">La misma música que suena en el vídeo de la portada.</p>

          <div className="rep-mando">
            <button type="button" className="rep-play" onClick={alterna}
              aria-label={suena ? "Pausar la música" : "Reproducir la música"}>
              <span aria-hidden>{suena ? "❚❚" : "▶"}</span>
            </button>
            <div className="rep-vol">
              <span className="mono" aria-hidden>vol</span>
              <input type="range" min="0" max="100" value={Math.round(vol * 100)}
                onChange={(e) => setVol(Number(e.target.value) / 100)}
                aria-label="Volumen de la música" />
            </div>
          </div>

          <div className="rep-barra" aria-hidden><i style={{ width: `${pct}%` }} /></div>
          {fallo && <p className="rep-fallo nota">Tu navegador no pudo cargar el audio; el vídeo sigue disponible.</p>}
          <span className="rep-pie mono">43 s · bucle · solo suena si tú lo pides</span>
        </div>
      )}

      <button type="button" className="rep-boton" onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto} aria-label="Música de la portada">
        <span className="rep-ico" aria-hidden>{suena ? "❚❚" : "♪"}</span>
        <span className="rep-eq" aria-hidden>
          {Array.from({ length: BARRAS }, (_, i) => (
            <i key={i} ref={(el) => { barraRefs.current[i] = el; }} style={{ animationDelay: `${i * 0.09}s` }} />
          ))}
        </span>
        <span className="rep-etq mono">música</span>
      </button>

      <audio ref={audio} src={`${BASE}audio/portada.mp3`} loop preload="none" onError={() => setFallo(true)} />
    </div>
  );
}
