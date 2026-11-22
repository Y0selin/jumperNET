import { useEffect, useState } from "react";

/* Progreso de aprendizaje local: cuatro hitos reales de la portada.
   No hay cuentas ni servidor: solo se guarda en este navegador y el
   usuario puede borrarlo cuando quiera. */

const CLAVE = "jumpernet-progreso-v31";

const HITOS = [
  { id: "video", t: "Vídeo de 30 s", d: "has llegado al final del resumen" },
  { id: "simulador", t: "Simulador", d: "has encendido o girado el circuito" },
  { id: "mapa", t: "Mapa del paquete", d: "has lanzado el paquete" },
  { id: "dudas", t: "Dudas", d: "has abierto la página de preguntas" },
];

function lee() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}
function guarda(v) {
  try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch { /* navegación privada */ }
}

export default function Progreso() {
  const [hechos, setHechos] = useState(lee);

  useEffect(() => {
    const marca = (id) => {
      setHechos((prev) => {
        if (prev[id]) return prev;
        const next = { ...prev, [id]: true };
        guarda(next);
        return next;
      });
    };
    const alVideo = () => marca("video");
    const alSimulador = () => marca("simulador");
    const alMapa = () => marca("mapa");
    const alDudas = () => marca("dudas");
    window.addEventListener("jumpernet-video-visto", alVideo);
    window.addEventListener("jumpernet-simulador", alSimulador);
    window.addEventListener("jumpernet-mapa", alMapa);
    window.addEventListener("jumpernet-dudas", alDudas);
    return () => {
      window.removeEventListener("jumpernet-video-visto", alVideo);
      window.removeEventListener("jumpernet-simulador", alSimulador);
      window.removeEventListener("jumpernet-mapa", alMapa);
      window.removeEventListener("jumpernet-dudas", alDudas);
    };
  }, []);

  const total = HITOS.filter((h) => hechos[h.id]).length;
  const pct = (total / HITOS.length) * 100;

  function reiniciar() {
    setHechos({});
    try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  }

  return (
    <div className="jn-progreso" aria-labelledby="jn-progreso-titulo">
      <div className="jn-progreso__cab">
        <div>
          <span className="jn-progreso__etq">tu recorrido · se guarda en este navegador</span>
          <h3 id="jn-progreso-titulo">Aprende tocando, no leyendo</h3>
          <p>Cuatro gestos de la portada. No hay examen ni cuenta: solo una forma de ver lo que ya has explorado.</p>
        </div>
        <div className="jn-progreso__cuenta" aria-live="polite">
          <b>{total}<small> / {HITOS.length}</small></b>
          <span>completado</span>
        </div>
      </div>

      <div className="jn-progreso__barra" role="progressbar" aria-valuemin="0" aria-valuemax="4"
        aria-valuenow={total} aria-label="Progreso de aprendizaje">
        <i style={{ width: `${pct}%` }} />
      </div>

      <ul className="jn-progreso__lista">
        {HITOS.map((h) => (
          <li key={h.id} className={hechos[h.id] ? "hecho" : ""}>
            <span className="jn-progreso__punto" aria-hidden>{hechos[h.id] ? "✓" : "·"}</span>
            <b>{h.t}</b>
            <span>{h.d}</span>
          </li>
        ))}
      </ul>

      <div className="jn-progreso__pie">
        <span className="nota mono">
          {total === HITOS.length ? "recorrido completo · puedes repetirlo cuando quieras" : "sin registro · sin métricas inventadas"}
        </span>
        <button type="button" className="jn-progreso__reset" onClick={reiniciar}>Reiniciar progreso</button>
      </div>
    </div>
  );
}
