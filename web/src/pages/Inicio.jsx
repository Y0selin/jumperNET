import { useEffect, useRef, useState } from "react";
import VideoPortada from "../components/VideoPortada";

/* Datos del héroe (modo claro/oscuro) */
const TITULO = { principal: "JumperNET", secundario: "tu conexión no va sola" };
const ESLOGAN = "Un proxy SOCKS5 con tres nodos, cifrado real y cuentas que elige el circuito.";
const CARACTERISTICAS = [
  { icono: "⚡", titulo: "3 saltos por circuito", desc: "Cada petición usa un circuito distinto de tres nodos vivos al azar." },
  { icono: "🔒", titulo: "Cifrado ChaCha20-Poly1305", desc: "Cada salto cifra su capa; ningún nodo ve el contenido completo." },
  { icono: "🌐", titulo: "Puertos 80 y 443", desc: "Solo estos puertos salen a internet, todo el tráfico por SOCKS5." },
  { icono: "👁️", titulo: "Nodos del proyecto", desc: "Un conjunto fijo de voluntades que mantienen la red viva." },
];
const BTNS = { principal: "Crear cuenta gratis", secundario: "Probar el circuito" };

/* --------------------------------------------------------------
   Hero principal: dos columnas, titular, características, video
   --------------------------------------------------------------*/
function Hero() {
  const [mostrarVideo, setMostrarVideo] = useState(false);
  const [jugando, setJugando] = useState(false);

  useEffect(() => {
    const v = refs?.current?.querySelector("video");
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    let montado = true;
    let enVista = false;
    const obs = new IntersectionObserver(
      ([e]) => {
        enVista = e.isIntersecting;
        if (enVista) {
          v.play().then(() => setJugando(true)).catch(() => {});
          setTimeout(() => v.play(), 200);
        } else {
          v.pause();
          setJugando(false);
        }
      },
      { threshold: [0.1, 0.5] }
    );
    if (refs.current) obs.observe(refs.current);
    if (v?.readyState >= 2) setMostrarVideo(true);
    return () => {
      montado = false;
      obs.disconnect();
    };
  }, []);

  return (
    <section className="hn-hero">
      <div className="hn-contenedor">
        <div className="hn-izquierda">
          <h1 className="hn-titulo">
            {TITULO.principal}{" "}<span className="hn-acento">‍</span>{TITULO.secundario}
          </h1>
          <p className="hn-lead">{ESLOGAN}</p>
          <div className="hn-caracteristicas">
            {CARACTERISTICAS.map((c, i) => (
              <div key={i} className="hn-ficha">
                <span className="hn-icono">{c.icono}</span>
                <div>
                  <h3>{c.titulo}</h3>
                  <p>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hn-acciones">
            <button className="btn-primario">{BTNS.principal}</button>
            <button className="btn-secundario">{BTNS.secundario}</button>
          </div>
        </div>

        <div className="hn-derecha">
          <div className="hn-video-wrapper">
            <video
              ref={refs => (refs.current = refs)}
              playsInline
              autoPlay={mostrarVideo}
              muted
              style={{
                width: "100%",
                borderRadius: 20,
                background: "#000",
                objectFit: "cover",
              }}
            >
              <source
                src={`${import.meta.env.BASE_URL || "./"}video/JumperNET_El_Viaje.mp4`}
                type="video/mp4"
              />
              Tu navegador no soporta vídeo HTML5.
            </video>
            <button
              className="btn-play-pause"
              onClick={() => {
                const v = refs?.current;
                if (v?.paused) v.play();
                else v.pause();
              }}
              aria-label="Play/pause"
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                width: 48,
                height: 48,
                background: "rgba(255,255,255,.2)",
                border: "2px solid #FFFFFF",
                borderRadius: 50,
                color: "#FFFFFF",
                fontSize: 24,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                zIndex: 10,
                transition: "background .2s",
              }}
            >
              ▶️
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   Portada completa
   --------------------------------------------------------------*/
export default function Inicio() {
  return (
    <div className="pagina inicio">
      <Hero />
    </div>
  );
}