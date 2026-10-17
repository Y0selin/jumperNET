import { useEffect, useRef } from "react";

/* Revela: envuelve contenido y le añade la clase .visto cuando entra en
   pantalla (IntersectionObserver). Sin observer (navegador viejo) o con
   las animaciones apagadas, el contenido se muestra igualmente. */
export default function Revela({ children, className = "", as: Etiqueta = "section", retardo = 0, ...resto }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") { el.classList.add("visto"); return; }
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("visto"); obs.unobserve(e.target); }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Etiqueta ref={ref} className={`revela ${retardo ? "revela-" + retardo : ""} ${className}`.trim()} {...resto}>
      {children}
    </Etiqueta>
  );
}
