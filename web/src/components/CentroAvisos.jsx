import { useCallback, useEffect, useRef, useState } from "react";
import { AVISOS, leeLeidos, guardaLeidos, cuentaNoLeidos } from "../lib/avisos.js";

/* Centro de avisos: la campana de la cabecera. Guarda qué se ha leído en
   el navegador, se cierra con Escape o al pulsar fuera y enlaza cada aviso
   con la página donde se comprueba. Los avisos se marcan como leídos al
   cerrar el panel, para que al abrirlo se vea qué es nuevo. */

const ICONOS = {
  nuevo: <><path d="M12 3.5 14.2 9l5.8.5-4.4 3.8 1.3 5.6L12 15.8 7.1 18.9l1.3-5.6L4 9.5 9.8 9Z" /></>,
  media: <><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="m10.5 10 4.5 2.5-4.5 2.5Z" /></>,
  lab: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m7 9 2.7 2.7L7 14.4M12.5 14.5H17" /></>,
  ok: <><path d="M12 3.2 20 6v6c0 5-3.4 8.2-8 9.2-4.6-1-8-4.2-8-9.2V6z" /><path d="m8.6 12.2 2.3 2.3 4.6-4.8" /></>,
};

export default function CentroAvisos() {
  const [abierto, setAbierto] = useState(false);
  const [leidos, setLeidos] = useState(leeLeidos);
  const caja = useRef(null);
  const boton = useRef(null);
  const sinLeer = cuentaNoLeidos(leidos);

  const cerrar = useCallback(() => {
    setAbierto(false);
    const todos = AVISOS.map((a) => a.id);
    setLeidos(todos);
    guardaLeidos(todos);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (!caja.current?.contains(e.target)) cerrar();
    };
    const tecla = (e) => {
      if (e.key === "Escape") { cerrar(); boton.current?.focus(); }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto, cerrar]);

  return (
    <div className="pp-avisos" ref={caja}>
      <button
        ref={boton}
        type="button"
        className={`pp-campana ${abierto ? "activa" : ""} ${sinLeer ? "con-avisos" : ""}`}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label={sinLeer ? `Centro de avisos, ${sinLeer} sin leer` : "Centro de avisos"}
        title="Centro de avisos"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6.5 9.6a5.5 5.5 0 0 1 11 0c0 3.2.9 5.2 2 6.4H4.5c1.1-1.2 2-3.2 2-6.4Z" />
          <path d="M10 19.2a2.2 2.2 0 0 0 4 0" />
        </svg>
        {sinLeer > 0 && <span className="pp-campana-badge" aria-hidden>{sinLeer}</span>}
      </button>

      {abierto && (
        <div className="pp-avisos-panel" role="dialog" aria-label="Centro de avisos">
          <header className="pp-avisos-cab">
            <div>
              <span className="mono">// centro de avisos</span>
              <b>{AVISOS.length} novedades del circuito</b>
            </div>
            <button type="button" className="pp-avisos-cerrar" onClick={cerrar}
              aria-label="Cerrar el centro de avisos">✕</button>
          </header>

          <ul className="pp-avisos-lista">
            {AVISOS.map((a) => {
              const nuevo = !leidos.includes(a.id);
              return (
                <li key={a.id} className={`pp-aviso-item ${nuevo ? "nuevo" : ""}`} data-tono={a.tono}>
                  <a href={`#${a.ruta}`} onClick={cerrar}>
                    <span className="pp-aviso-item-ico" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" strokeLinejoin="round">{ICONOS[a.tono] || ICONOS.ok}</svg>
                    </span>
                    <span className="pp-aviso-item-txt">
                      <b>{a.titulo}</b>
                      <span>{a.texto}</span>
                      <i className="mono">
                        {a.cuando}
                        <em>{a.cta} →</em>
                      </i>
                    </span>
                    {nuevo && <span className="pp-aviso-item-punto" aria-label="sin leer" />}
                  </a>
                </li>
              );
            })}
          </ul>

          <footer className="pp-avisos-pie mono">
            <span>sin cuentas · sin rastreo</span>
            <a href="#/dudas" onClick={cerrar}>dudas →</a>
          </footer>
        </div>
      )}
    </div>
  );
}
