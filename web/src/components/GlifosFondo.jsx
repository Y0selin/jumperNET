import { useEffect, useRef } from "react";

/* GlifosFondo: glifos que se escriben y se desvanecen sobre la malla
   tenue, como en la referencia de HackNexus. Respeta --vel-anim y
   data-anim="off" (Diseñador/Accesibilidad). */
const GLIFOS = "アカサタナハマヤラワイキシチニヒミリヰウクスツヌフムユルエケセテネヘメレヱオコソトノホモヨロヲ01▓▚▞Ξ├┤§¶ΔΣλ{}<>[]#$%&+=~^|·:/\\".split("");

export default function GlifosFondo() {
  const ref = useRef(null);
  const ctl = useRef({ vel: 1, on: true });

  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    let raf, celdas = [], CV, CH, CE = 30;

    function leeTema() {
      const s = getComputedStyle(document.documentElement);
      ctl.current.vel = parseFloat(s.getPropertyValue("--vel-anim")) || 1;
      ctl.current.on = document.documentElement.dataset.anim !== "off";
      ctl.current.color = (s.getPropertyValue("--acento-1") || "#2ee88a").trim();
    }

    function redimensiona() {
      CV = cv.width = innerWidth; CH = cv.height = innerHeight;
      const ncols = Math.floor(CV / CE), nfils = Math.floor(CH / CE);
      celdas = [];
      for (let y = 0; y < nfils; y++)
        for (let x = 0; x < ncols; x++)
          if (Math.random() < 0.04)
            celdas.push({ x: x * CE + CE, y: y * CE + CE, g: "", a: 0, objetivo: 0, proximo: Math.random() * 400 });
    }
    redimensiona();
    addEventListener("resize", redimensiona);

    function corazon(t) {
      raf = requestAnimationFrame(corazon);
      const { vel, on, color } = ctl.current;
      ctx.clearRect(0, 0, CV, CH);
      if (!on) return;
      ctx.font = `${11 + (CE / 30) * 3}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      for (const c of celdas) {
        if (t > c.proximo) {
          c.objetivo = c.objetivo > 0 ? 0 : 0.2 + Math.random() * 0.16;
          if (c.objetivo > 0) c.g = GLIFOS[(Math.random() * GLIFOS.length) | 0];
          c.proximo = t + (c.objetivo > 0 ? 1200 + Math.random() * 3800 : 220 + Math.random() * 900) / Math.max(.2, vel);
        }
        c.a += (c.objetivo - c.a) * 0.04 * vel;
        if (c.a > 0.012) {
          ctx.fillStyle = color + Math.round(c.a * 255).toString(16).padStart(2, "0");
          ctx.fillText(c.g, c.x, c.y);
        }
      }
    }

    const OBS = new MutationObserver(leeTema);
    OBS.observe(document.documentElement, { attributes: true, attributeFilter: ["data-anim", "style"] });
    leeTema();
    raf = requestAnimationFrame(corazon);
    return () => { cancelAnimationFrame(raf); OBS.disconnect(); removeEventListener("resize", redimensiona); };
  }, []);

  return (
    <div className="fondo-fijo" aria-hidden>
      {/* halos de color suaves */}
      <div className="halo" style={{ left: "-10%", top: "-15%", width: 520, height: 520, background: "rgb(from var(--acento-1) r g b / .05)" }} />
      <div className="halo" style={{ right: "-12%", top: "30%", width: 460, height: 460, background: "rgb(from var(--acento-2) r g b / .04)" }} />
      <div className="halo" style={{ bottom: "-20%", left: "30%", width: 500, height: 500, background: "rgb(from var(--acento-3) r g b / .03)" }} />
      {/* malla */}
      <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: .45 }} />
      {/* glifos */}
      <canvas ref={ref} style={{ position: "absolute", inset: 0 }} />
      {/* vieta para que el texto siempre se lea */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 65% at 50% 0%, transparent 35%, rgb(from var(--bg-1) r g b / .9) 100%)" }} />
    </div>
  );
}
