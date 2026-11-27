import { useEffect, useRef } from "react";

/* Atmósfera del sitio: una capa de luz fija detrás del contenido.
   Tres halos que respiran muy despacio, una rejilla tenue, un grano de
   película y un foco que sigue al cursor. Todo con CSS y variables, así
   el modo claro y el oscuro se afinan por separado sin tocar componentes.
   No captura clics ni anuncia nada: es luz. */

export default function Atmosfera() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;

    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.3;
    let destinoX = x;
    let destinoY = y;

    const alMover = (e) => { destinoX = e.clientX; destinoY = e.clientY; };
    const paso = () => {
      x += (destinoX - x) * 0.06;
      y += (destinoY - y) * 0.06;
      el.style.setProperty("--jx", `${x.toFixed(1)}px`);
      el.style.setProperty("--jy", `${y.toFixed(1)}px`);
      raf = requestAnimationFrame(paso);
    };

    window.addEventListener("pointermove", alMover, { passive: true });
    raf = requestAnimationFrame(paso);
    return () => {
      window.removeEventListener("pointermove", alMover);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="vivo-atmosfera" ref={ref} aria-hidden="true">
      <span className="vivo-foco" />
      <span className="vivo-halo h1" />
      <span className="vivo-halo h2" />
      <span className="vivo-halo h3" />
      <span className="vivo-rejilla" />
      <span className="vivo-grano" />
    </div>
  );
}
