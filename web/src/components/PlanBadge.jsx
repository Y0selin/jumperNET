import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { planDe, fechaCorta, desactivaDemoPro, precioPro } from "../lib/planes.js";

/* Indicador del plan actual. Se usa en el lateral y la barra superior del
   panel. Al pulsarlo abre una ficha breve con lo que incluye y la gestión. */

const ICONOS = {
  free: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21V9M12 9C8 9 5 6.5 5 3c4 0 7 2.5 7 6Zm0 4c4 0 7-2.5 7-6-4 0-7 2.5-7 6ZM7 21h10" /></svg>,
  pro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" /></svg>,
  empresarial: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 21V5.5A2.5 2.5 0 0 1 6.5 3H14v18M14 9h4.5A1.5 1.5 0 0 1 20 10.5V21M2 21h20M7 7h3M7 11h3M7 15h3" /></svg>,
};

const euros = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function PlanBadge({ yo, compacto = false }) {
  const [abierto, setAbierto] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const actualiza = () => setTick((t) => t + 1);
    window.addEventListener("jumpernet-plan", actualiza);
    window.addEventListener("storage", actualiza);
    return () => {
      window.removeEventListener("jumpernet-plan", actualiza);
      window.removeEventListener("storage", actualiza);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  const plan = planDe(yo);
  const nombre = plan.demo ? `${plan.nombre} · demo` : plan.nombre;
  const precio = plan.id === "pro" ? (yo?.precio_mes || precioPro(plan.saltosMax || 3)) : null;
  const detalle = plan.id === "free"
    ? "Sin renovación ni cargos"
    : plan.demo
      ? `Demo hasta ${fechaCorta(plan.hasta)}`
      : plan.id === "pro"
        ? `Renovación mensual · ${precio} €`
        : "Condiciones acordadas";

  return (
    <span className={`jn-planbadge-envoltura ${compacto ? "compacto" : ""}`} data-tick={tick}>
      <button
        type="button"
        className={`jn-planbadge jn-planbadge-${plan.id} ${plan.demo ? "demo" : ""}`}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        title={`Plan ${nombre} · ver detalles`}
      >
        <span className="jn-planbadge-ico">{ICONOS[plan.id]}</span>
        <span className="jn-planbadge-txt">
          <small>PLAN</small>
          <b>{plan.nombre.toUpperCase()}</b>
        </span>
        {plan.demo && <span className="jn-planbadge-demo mono">DEMO</span>}
      </button>

      {abierto && createPortal(
        <>
          <button type="button" className="jn-planbadge-velo" aria-label="Cerrar la ficha del plan" onClick={() => setAbierto(false)} />
          <div className="jn-planficha" role="dialog" aria-modal="false" aria-label={`Detalles del plan ${nombre}`}>
            <header>
              <span className={`jn-planbadge-ico grande jn-planbadge-${plan.id}`}>{ICONOS[plan.id]}</span>
              <div>
                <span className="jn-eyebrow"><i aria-hidden /> tu plan</span>
                <h3>{nombre}</h3>
                <span className="jn-planficha-precio mono">
                  {plan.id === "free" ? "0 € / siempre" : plan.demo ? `${precio} €/mes · no cobrado` : plan.id === "pro" ? `${precio} € / mes` : "a medida"}
                </span>
              </div>
              <button type="button" className="jn-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </header>

            <ul className="jn-planficha-lista">
              {(plan.caracteristicas || []).slice(0, 4).map((c) => (
                <li key={c.titulo}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7" /></svg>
                  {c.titulo}
                </li>
              ))}
            </ul>

            <div className="jn-planficha-dato">
              <span className="mono">próxima renovación</span>
              <b>{plan.id === "free" ? "No existe" : plan.demo ? `Demo hasta ${fechaCorta(plan.hasta)}` : plan.id === "pro" ? "Mensual · gestión del equipo" : "Según contrato"}</b>
            </div>

            <div className="jn-planficha-acciones">
              <a className="jn-btn jn-btn-pro" href="#/tarifas" onClick={() => setAbierto(false)}>
                {plan.id === "free" ? "Mejorar el plan" : "Gestionar la suscripción"} <span aria-hidden>→</span>
              </a>
              {plan.id !== "free" && (
                <a className="jn-btn jn-btn-suave" href="#/tarifas" onClick={() => setAbierto(false)}>
                  {plan.id === "empresarial" ? "Hablar con el equipo" : "Pasar a Empresarial"}
                </a>
              )}
              {plan.demo && (
                <button type="button" className="jn-btn jn-btn-suave" onClick={() => { desactivaDemoPro(); setAbierto(false); }}>
                  Desactivar la demo
                </button>
              )}
            </div>
            {plan.demo && (
              <p className="jn-planficha-nota">
                Modo de prueba local: no se ha cobrado nada. Los permisos de red siguen saliendo del backend.
              </p>
            )}
            {plan.id === "pro" && !plan.demo && (
              <p className="jn-planficha-nota">
                La activación y los cambios de plan los aplica el equipo desde administración.
              </p>
            )}
          </div>
        </>,
        document.body
      )}
    </span>
  );
}
