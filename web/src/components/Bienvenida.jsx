import { useEffect, useRef } from "react";

/* Sorpresa de bienvenida: confeti + mensaje gigante al entrar al panel. */
export default function Bienvenida({ nombre }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const colores = ["#7c4dff", "#00b8d9", "#ff5c93", "#ffb454", "#34d47c", "#ffffff"];
    const particulas = Array.from({ length: 150 }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14 - 4,
      g: 0.25 + Math.random() * 0.15,
      r: 3 + Math.random() * 5,
      c: colores[Math.floor(Math.random() * colores.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      vida: 0,
      max: 70 + Math.random() * 40,
      forma: Math.random() > 0.5 ? "circ" : "rect",
    }));

    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let vivas = 0;
      for (const p of particulas) {
        p.vida++;
        if (p.vida > p.max) continue;
        vivas++;
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rot += p.vr;
        const a = 1 - p.vida / p.max;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.forma === "circ") {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        }
        ctx.restore();
      }
      if (vivas > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="bienvenida" role="dialog" aria-modal="true" aria-label="Bienvenida">
      <canvas ref={canvasRef} className="bienvenida-canvas" />
      <div className="bienvenida-txt">
        <span className="bienvenida-etq mono">sesión iniciada · JumperNET</span>
        <h1 className="bienvenida-nombre">
          Hola, <span className="texto-gradiente">{nombre}</span>
        </h1>
        <p className="bienvenida-sub">tu red te estaba esperando. 3 saltos, cifrados, listos para encender.</p>
        <div className="bienvenida-pulso" aria-hidden>
          <i /><i /><i />
        </div>
      </div>
    </div>
  );
}