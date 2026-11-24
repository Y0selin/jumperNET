import { useEffect, useRef } from "react";

/* Revela: envuelve contenido y le añade la clase .visto cuando entra en
   pantalla (IntersectionObserver). Sin observer (navegador viejo) o con
   las animaciones apagadas, el contenido se muestra igualmente. */
export default function Revela({ children, className = "", as: Etiqueta = "section", retardo = 0, ...resto }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* Si el observer no está disponible —o el navegador lo pospone—, un
       comprobador de scroll garantiza que el contenido nunca se quede a 0. */
    let hecho = false;
    let obs = null;
    let vigia = 0;
    const marca = () => {
      if (hecho) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.94 && r.bottom > -40) {
        hecho = true;
        el.classList.add("visto");
        obs?.disconnect();
        clearInterval(vigia);
        window.removeEventListener("scroll", alScroll);
        window.removeEventListener("resize", alScroll);
      }
    };
    vigia = setInterval(marca, 550);
    let raf = 0;
    const alScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; marca(); });
    };

    if (typeof IntersectionObserver === "function") {
      obs = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((e) => {
            if (e.isIntersecting) {
              hecho = true;
              e.target.classList.add("visto");
              obs.disconnect();
              window.removeEventListener("scroll", alScroll);
              window.removeEventListener("resize", alScroll);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      obs.observe(el);
    }

    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll);
    const t = setTimeout(marca, 180);
    return () => {
      clearTimeout(t);
      clearInterval(vigia);
      cancelAnimationFrame(raf);
      obs?.disconnect();
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
    };
  }, []);

  return (
    <Etiqueta ref={ref} className={`revela ${retardo ? "revela-" + retardo : ""} ${className}`.trim()} {...resto}>
      {children}
    </Etiqueta>
  );
}
