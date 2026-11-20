import { useEffect, useRef, useState } from "react";

/* Reproductor de la música de portada.
   Arranca solo al entrar, se puede parar con un clic y recuerda si lo has
   parado. Si el navegador bloquea el autoplay con sonido, el primer gesto
   del usuario lo desbloquea. Vive flotando junto al dock y dibuja un
   ecualizador real con Web Audio. */

const BASE = import.meta.env.BASE_URL || "./";
const BARRAS = 12;
const CLAVE_PREF = "jumpernet-musica-off";

const dos = (n) => String(Math.floor(n || 0)).padStart(2, "0");
const reloj = (s) => (Number.isFinite(s) ? `${dos(s / 60)}:${dos(s % 60)}` : "00:00");
const bloqueadoPorElNavegador = (e) => e?.name === "NotAllowedError" || e?.name === "SecurityError";

export default function Reproductor() {
  const audio = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [suena, setSuena] = useState(false);
  const [necesitaGesto, setNecesitaGesto] = useState(false);
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
    const p = () => { setSuena(true); setNecesitaGesto(false); };
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

  function recordar(activa) {
    try {
      if (activa) localStorage.removeItem(CLAVE_PREF);
      else localStorage.setItem(CLAVE_PREF, "off");
    } catch { /* sin almacenamiento: solo afecta a esta pestaña */ }
  }

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

  async function pon() {
    const a = audio.current;
    if (!a) return;
    preparaAudio();
    try { await ctx.current?.resume?.(); } catch { /* contexto ya activo */ }
    try {
      await a.play();
      recordar(true);
      setNecesitaGesto(false);
    } catch (e) {
      if (bloqueadoPorElNavegador(e)) setNecesitaGesto(true);
      else if (e?.name !== "AbortError") setFallo(true);
    }
  }

  function parar() {
    const a = audio.current;
    if (!a) return;
    a.pause();
    recordar(false);
    setNecesitaGesto(false);
  }

  async function alterna() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) await pon();
    else parar();
  }

  /* autoplay al montar. Si el navegador lo bloquea, el primer gesto
     (clic, toque o tecla) lo desbloquea sin pedir otro botón. */
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    let vivo = true;

    const quita = () => {
      window.removeEventListener("pointerdown", gesto, true);
      window.removeEventListener("keydown", gesto, true);
    };
    const intenta = async () => {
      if (!vivo) return;
      try {
        if (localStorage.getItem(CLAVE_PREF) === "off") return;
      } catch { /* sin almacenamiento: intenta igualmente */ }
      try {
        await a.play();
        if (vivo) { setNecesitaGesto(false); quita(); }
      } catch (e) {
        if (!vivo) return;
        if (bloqueadoPorElNavegador(e)) setNecesitaGesto(true);
        else if (e?.name !== "AbortError") setFallo(true);
      }
    };
    const gesto = () => { quita(); intenta(); };

    intenta();
    window.addEventListener("pointerdown", gesto, { once: true, capture: true });
    window.addEventListener("keydown", gesto, { once: true, capture: true });
    return () => { vivo = false; quita(); };
  }, []);

  /* la portada (y cualquier botón) puede abrir el reproductor */
  useEffect(() => {
    const abre = () => {
      setAbierto(true);
      if (audio.current?.paused) pon();
    };
    window.addEventListener("jumpernet-musica", abre);
    return () => window.removeEventListener("jumpernet-musica", abre);
  }, []);

  /* si el vídeo activa su propia pista, la música de fondo se calla
     para que no suenen las dos a la vez */
  useEffect(() => {
    const calla = () => audio.current?.pause();
    window.addEventListener("jumpernet-callar-musica", calla);
    return () => window.removeEventListener("jumpernet-callar-musica", calla);
  }, []);

  /* controles del sistema: auriculares, teclas multimedia y pantalla de bloqueo */
  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const acciones = { play: pon, pause: parar, stop: parar };
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Señal de JumperNET",
        artist: "JumperNET",
        album: "Portada 2026",
      });
      Object.entries(acciones).forEach(([accion, fn]) => {
        try { navigator.mediaSession.setActionHandler(accion, fn); } catch { /* acción no soportada */ }
      });
    } catch { return; }
    return () => Object.keys(acciones).forEach((accion) => {
      try { navigator.mediaSession.setActionHandler(accion, null); } catch { /* ignorado */ }
    });
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try { navigator.mediaSession.playbackState = suena ? "playing" : "paused"; } catch { /* ignorado */ }
  }, [suena]);

  const pct = dur ? Math.min(100, (prog / dur) * 100) : 0;
  const etiqueta = necesitaGesto && !suena ? "activar" : "música";

  return (
    <div className={`reproductor ${abierto ? "abierto" : ""} ${suena ? "suena" : ""} ${fallo ? "fallo" : ""} ${necesitaGesto ? "pidiendo" : ""}`}>
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
          <span className="rep-pie mono">bucle · arranca al entrar · tú la paras</span>
        </div>
      )}

      <div className="rep-fila">
        {suena && (
          <button type="button" className="rep-parar" onClick={parar}
            aria-label="Parar la música" title="Parar la música">
            <span aria-hidden>■</span>
            <span className="rep-parar-txt">parar</span>
          </button>
        )}
        <button type="button" className="rep-boton"
          onClick={() => {
            setAbierto((v) => !v);
            if (necesitaGesto && !suena) pon();
          }}
          aria-expanded={abierto}
          aria-label={necesitaGesto && !suena ? "Activar la música de la portada" : "Música de la portada"}>
          <span className="rep-ico" aria-hidden>{suena ? "❚❚" : "♪"}</span>
          <span className="rep-eq" aria-hidden>
            {Array.from({ length: BARRAS }, (_, i) => (
              <i key={i} ref={(el) => { barraRefs.current[i] = el; }} style={{ animationDelay: `${i * 0.09}s` }} />
            ))}
          </span>
          <span className="rep-etq mono">{etiqueta}</span>
        </button>
      </div>

      <audio ref={audio} src={`${BASE}audio/portada.mp3`} loop preload="auto" onError={() => setFallo(true)} />
    </div>
  );
}
