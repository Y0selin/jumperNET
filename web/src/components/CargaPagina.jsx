import { useEffect, useRef, useState } from "react";

/* Pantalla de carga entre páginas: una cortina breve con la marca, los tres
   nodos del circuito y una barra que se llena. No espera a nada —la web es
   una SPA y la página ya está lista—, pero da continuidad al salto y deja
   claro en qué página estás entrando. Se monta con key={ruta}, así que cada
   navegación la reinicia. Respeta prefers-reduced-motion. */

const PASOS = ["entrada", "nodo 1", "nodo 2", "salida"];

export default function CargaPagina({ titulo = "jumpernet", ruta = "/" }) {
  const [fase, setFase] = useState("carga");
  const [pct, setPct] = useState(0);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    const quieto = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (quieto) {
      setPct(100);
      const t = setTimeout(() => setFase("fuera"), 120);
      const t2 = setTimeout(() => { if (vivo.current) setFase("fin"); }, 260);
      return () => { vivo.current = false; clearTimeout(t); clearTimeout(t2); };
    }

    const arranque = performance.now();
    const DURACION = 520;
    const reloj = setInterval(() => {
      const p = Math.min(1, Math.max(0, (performance.now() - arranque) / DURACION));
      setPct(Math.round(100 * (1 - Math.pow(1 - p, 2))));
      if (p >= 1) clearInterval(reloj);
    }, 40);

    const sale = setTimeout(() => setFase("fuera"), 620);
    const fin = setTimeout(() => { if (vivo.current) setFase("fin"); }, 1020);
    return () => {
      vivo.current = false;
      clearInterval(reloj);
      clearTimeout(sale);
      clearTimeout(fin);
    };
  }, [ruta]);

  if (fase === "fin") return null;

  const indice = Math.min(PASOS.length - 1, Math.floor((pct / 100) * PASOS.length));

  return (
    <div className={`vivo-carga ${fase === "fuera" ? "fuera" : ""}`} aria-live="polite" aria-label={`Cargando ${titulo}`}>
      <div className="vivo-carga-luz" aria-hidden />
      <div className="vivo-carga-caja">
        <div className="vivo-carga-marca" aria-hidden>
          <span className="vivo-carga-orbita" />
          <svg viewBox="0 0 48 48" fill="none" focusable="false">
            <path d="M14 34 C 14 40, 20 42, 26 38 L 30 34 L 30 16 L 38 10"
              stroke="url(#vivo-carga-g)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M33 10 L 38 10 L 38 15" stroke="url(#vivo-carga-g)" strokeWidth="3.2"
              strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="14" cy="34" r="3.6" className="vivo-carga-nodo n1" />
            <circle cx="30" cy="34" r="3.6" className="vivo-carga-nodo n2" />
            <circle cx="30" cy="16" r="3.6" className="vivo-carga-nodo n3" />
            <circle cx="38" cy="10" r="2.6" className="vivo-carga-nodo n4" />
            <defs>
              <linearGradient id="vivo-carga-g" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" style={{ stopColor: "var(--logo-a)" }} />
                <stop offset="1" style={{ stopColor: "var(--logo-b)" }} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p className="vivo-carga-nombre">Jumper<span>NET</span></p>
        <p className="vivo-carga-ruta mono">
          <i aria-hidden>//</i> {titulo} <span aria-hidden>·</span> {PASOS[indice]}
        </p>

        <div className="vivo-carga-barra" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="vivo-carga-pie mono">
          <span>{pct}%</span>
          <span>3 saltos · 80/443 · sin histórico</span>
        </div>
      </div>
    </div>
  );
}
