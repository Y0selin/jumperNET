import { useEffect, useRef } from "react";

/* Aurora: campo de partículas con constelaciones en canvas puro.
   Respeta el multiplicador --vel-anim y data-anim="off". */
export default function Aurora() {
  const ref = useRef(null);
  const refAnim = useRef({ vel: 1, on: true });

  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    let raf, paradas = [];

    function redimensiona() {
      cv.width = innerWidth; cv.height = innerHeight;
      const densidad = Math.min(90, Math.floor(innerWidth / 16));
      paradas = Array.from({ length: densidad }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.7 + .5, c: Math.random() < .25 ? 2 : Math.random() < .55 ? 1 : 0,
      }));
    }
    redimensiona();
    addEventListener("resize", redimensiona);

    const colores = ["#4f8cff", "#2ecc71", "#a06bff"];
    function leeTema() {
      const s = getComputedStyle(document.documentElement);
      refAnim.current.vel = parseFloat(s.getPropertyValue("--vel-anim")) || 1;
      refAnim.current.on = document.documentElement.dataset.anim !== "off";
      try { colores[0] = s.getPropertyValue("--acento-1").trim() || colores[0];
            colores[1] = s.getPropertyValue("--acento-2").trim() || colores[1];
            colores[2] = s.getPropertyValue("--acento-3").trim() || colores[2]; } catch {}
    }

    function corazon(t) {
      raf = requestAnimationFrame(corazon);
      const { vel, on } = refAnim.current;
      if (!on) { ctx.clearRect(0, 0, cv.width, cv.height); return; }
      ctx.clearRect(0, 0, cv.width, cv.height);

      // constelaciones entre partículas cercanas
      for (let i = 0; i < paradas.length; i++) {
        const a = paradas[i];
        for (let j = i + 1; j < paradas.length; j++) {
          const b = paradas[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.strokeStyle = `rgba(120, 160, 255, ${.14 * (1 - d / 130)})`;
            ctx.lineWidth = .6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // partículas
      paradas.forEach((p) => {
        p.x += p.vx * vel; p.y += p.vy * vel;
        if (p.x < -10) p.x = cv.width + 10; if (p.x > cv.width + 10) p.x = -10;
        if (p.y < -10) p.y = cv.height + 10; if (p.y > cv.height + 10) p.y = -10;
        const brillo = .35 + .3 * Math.sin(t / 900 + p.x);
        ctx.fillStyle = colores[p.c] + Math.round(brillo * 90).toString(16).padStart(2, "0");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      });
    }

    const OBS = new MutationObserver(leeTema);
    OBS.observe(document.documentElement, { attributes: true, attributeFilter: ["data-anim", "style"] });
    leeTema();
    raf = requestAnimationFrame(corazon);
    return () => { cancelAnimationFrame(raf); OBS.disconnect(); removeEventListener("resize", redimensiona); };
  }, []);

  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: .55 }} />;
}
