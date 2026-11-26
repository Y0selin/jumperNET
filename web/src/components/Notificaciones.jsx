import { useEffect, useState } from "react";
import { CATEGORIAS, abreNotificaciones, useNotificaciones } from "../lib/notificaciones.js";
import { haceCuanto } from "../lib/fecha.js";

/* Campana de la barra superior y panel lateral de notificaciones. */

export function BotonCampana({ onAbrir }) {
  const { noLeidas } = useNotificaciones();
  return (
    <button
      type="button"
      className={`jns-bell${noLeidas ? " con-avisos" : ""}`}
      onClick={() => { if (onAbrir) onAbrir(); else abreNotificaciones(); }}
      aria-label={noLeidas ? `Notificaciones (${noLeidas} sin leer)` : "Notificaciones"}
      title="Notificaciones"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 9a6 6 0 1 0-12 0c0 4.5-2 5.5-2 5.5h16S18 13.5 18 9" />
        <path d="M10.4 19a2 2 0 0 0 3.2 0" />
      </svg>
      {noLeidas > 0 && <span className="jns-bell-badge mono">{noLeidas > 9 ? "9+" : noLeidas}</span>}
    </button>
  );
}

export function PanelNotificaciones({ alNavegar }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const { lista, noLeidas, marcaLeida, marcaTodasLeidas, borraNotif, borraTodas } = useNotificaciones();

  useEffect(() => {
    const abre = () => setAbierto(true);
    window.addEventListener("jumpernet-abrir-notificaciones", abre);
    return () => window.removeEventListener("jumpernet-abrir-notificaciones", abre);
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTec = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", alTec);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", alTec);
    };
  }, [abierto]);

  const visibles = filtro === "todas" ? lista : lista.filter((n) => n.cat === filtro);

  function navega(n) {
    marcaLeida(n.id);
    setAbierto(false);
    alNavegar?.(n);
  }

  return (
    <>
      {abierto && <button type="button" className="jns-velo" aria-label="Cerrar notificaciones" onClick={() => setAbierto(false)} />}
      <aside
        className={`jns-drawer jns-notifs${abierto ? " abierto" : ""}`}
        role="dialog"
        aria-modal={abierto ? "true" : undefined}
        aria-label="Centro de notificaciones"
        aria-hidden={!abierto}
      >
        <header className="jns-drawer-cab">
          <div>
            <span className="jns-kicker">centro de actividad</span>
            <h2>Notificaciones</h2>
          </div>
          <button type="button" className="jns-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar notificaciones">✕</button>
        </header>

        <div className="jns-notifs-acciones">
          <div className="jns-filtros" role="group" aria-label="Filtrar notificaciones">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={filtro === c.id ? "on" : ""}
                aria-pressed={filtro === c.id}
                onClick={() => setFiltro(c.id)}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          <div className="jns-notifs-botones">
            {noLeidas > 0 && <button type="button" className="jns-link" onClick={marcaTodasLeidas}>Marcar todas</button>}
            {lista.length > 0 && <button type="button" className="jns-link peligro" onClick={borraTodas}>Vaciar</button>}
          </div>
        </div>

        <div className="jns-drawer-cuerpo">
          {visibles.length === 0 ? (
            <div className="jns-vacio">
              <span className="jns-vacio-ico" aria-hidden>◌</span>
              <b>Sin avisos en esta categoría</b>
              <p>Aquí aparecerán los cambios de red, suscripción y soporte que ocurran de verdad.</p>
            </div>
          ) : (
            <ul className="jns-notif-lista">
              {visibles.map((n) => (
                <li key={n.id} className={n.leida ? "" : "sin-leer"}>
                  <button type="button" className="jns-notif" onClick={() => navega(n)}>
                    <span className={`jns-notif-punto cat-${n.cat}`} aria-hidden />
                    <span className="jns-notif-txt">
                      <span className="jns-notif-top">
                        <b>{n.titulo}</b>
                        <small className="mono">{haceCuanto(n.t)}</small>
                      </span>
                      <span className="jns-notif-texto">{n.texto}</span>
                      <span className={`jns-notif-cat mono cat-${n.cat}`}>{n.cat}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="jns-notif-borrar"
                    onClick={() => borraNotif(n.id)}
                    aria-label={`Eliminar el aviso ${n.titulo}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="jns-drawer-pie">
          <p className="jns-mini">
            Las notificaciones se guardan solo en este navegador. No registramos tu historial de navegación.
          </p>
        </footer>
      </aside>
    </>
  );
}

export function FeedNotificaciones({ limite = 4, onVerTodas }) {
  const { lista, noLeidas } = useNotificaciones();
  const visibles = lista.slice(0, limite);
  return (
    <div className="jns-feed">
      <div className="jns-feed-cab">
        <span className="jns-kicker">notificaciones</span>
        {noLeidas > 0 && <span className="jns-chip vivo mono">{noLeidas} sin leer</span>}
      </div>
      {visibles.length === 0 ? (
        <p className="jns-mini">No hay avisos nuevos.</p>
      ) : (
        <ul className="jns-feed-lista">
          {visibles.map((n) => (
            <li key={n.id} className={n.leida ? "" : "sin-leer"}>
              <span className={`jns-notif-punto cat-${n.cat}`} aria-hidden />
              <span>
                <b>{n.titulo}</b>
                <small className="mono">{haceCuanto(n.t)} · {n.cat}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="jns-link" onClick={onVerTodas}>Ver todas <span aria-hidden>→</span></button>
    </div>
  );
}
