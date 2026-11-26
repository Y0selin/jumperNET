import { useEffect, useRef, useState } from "react";
import { useCarrito, quitaPro, cambiaSaltosPro } from "../lib/carrito.js";
import { PROMO, SALTOS_MIN, SALTOS_MAX, PRECIO_BASE_PRO, precioPro } from "../lib/planes.js";

/* Carrito lateral: una sola suscripción, sin tienda. Vive en Sitio para que
   esté disponible tanto en páginas públicas como con sesión iniciada. */

const euros = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function CarritoPanel({ abierto, cerrar }) {
  const carrito = useCarrito();
  const cerrarRef = useRef(null);
  const [quitando, setQuitando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", alPulsar);
    const t = setTimeout(() => cerrarRef.current?.focus(), 60);
    return () => { window.removeEventListener("keydown", alPulsar); clearTimeout(t); };
  }, [abierto, cerrar]);

  function eliminar() {
    setQuitando(true);
    setTimeout(() => { quitaPro(); setQuitando(false); }, 180);
  }

  const item = carrito.items[0];

  return (
    <div className={`jn-capa ${abierto ? "abierta" : ""}`} aria-hidden={!abierto}>
      <button type="button" className="jn-capa-fondo" onClick={cerrar} tabIndex={abierto ? 0 : -1} aria-label="Cerrar el carrito" />
      <aside className="jn-drawer" role="dialog" aria-modal="true" aria-label="Carrito de JumperNET">
        <header className="jn-drawer-cab">
          <div>
            <span className="jn-eyebrow"><i aria-hidden /> tu compra</span>
            <h2>Carrito</h2>
          </div>
          <button type="button" className="jn-cerrar" onClick={cerrar} ref={cerrarRef} aria-label="Cerrar el carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>

        {!item ? (
          <div className="jn-drawer-vacio">
            <span className="jn-drawer-vacio-ico" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6" />
                <circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" />
              </svg>
            </span>
            <b>Tu carrito está vacío</b>
            <p>El plan Pro se añade desde Tarifas. Free se crea directo, sin pasar por aquí.</p>
            <a className="jn-btn jn-btn-pro" href="#/tarifas" onClick={cerrar}>Ver los planes <span aria-hidden>→</span></a>
          </div>
        ) : (
          <>
            <div className={`jn-drawer-cuerpo ${quitando ? "quitando" : ""}`}>
              <div className="jn-item">
                <div className="jn-item-cab">
                  <span className="jn-item-ico" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
                    </svg>
                  </span>
                  <div>
                    <b>JumperNET Pro</b>
                    <span className="mono">{carrito.saltos} saltos · suscripción mensual</span>
                  </div>
                  <span className="jn-item-precio mono">{euros(carrito.precio)}</span>
                </div>

                <div className="jn-item-saltos" role="group" aria-label="Número máximo de saltos contratados">
                  <div className="jn-item-saltos-cab">
                    <span>Máximo de saltos</span>
                    <b className="mono">{carrito.saltos}</b>
                  </div>
                  <div className="jn-item-saltos-opciones">
                    {[SALTOS_MIN, 4, 5, 6, SALTOS_MAX].map((n) => (
                      <button key={n} type="button" className={carrito.saltos === n ? "on" : ""}
                        onClick={() => cambiaSaltosPro(n)}
                        aria-pressed={carrito.saltos === n}>
                        <span>{n}</span>
                        <small>{precioPro(n)} €</small>
                      </button>
                    ))}
                  </div>
                  <p className="mono">base {euros(PRECIO_BASE_PRO)} + {carrito.extras ? `${euros(carrito.extras)} de saltos extra` : "sin extras"}</p>
                </div>
                <ul className="jn-item-lista">
                  <li>Circuitos de 3 a {carrito.saltos} saltos</li>
                  <li>Herramientas Pro desbloqueadas</li>
                  <li>Refresco del circuito cada 10 h</li>
                  <li>Todo lo incluido en Free</li>
                </ul>
                <button type="button" className="jn-item-quitar" onClick={eliminar}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5" />
                  </svg>
                  Eliminar del carrito
                </button>
              </div>

              {carrito.promo && (
                <div className="jn-drawer-promo">
                  <span className="mono">{PROMO.codigo}</span>
                  <p>Descuento de bienvenida aplicado solo en el primer pago.</p>
                </div>
              )}

              <dl className="jn-totales">
                <div><dt>Precio base · 3 saltos</dt><dd>{euros(carrito.base)}</dd></div>
                <div><dt>Saltos adicionales · {carrito.saltos - 3}</dt><dd>{carrito.extras ? `+${euros(carrito.extras)}` : "—"}</dd></div>
                <div><dt>Precio del plan</dt><dd>{euros(carrito.precio)}</dd></div>
                {carrito.promo && (
                  <div className="descuento">
                    <dt>Descuento de bienvenida <span className="mono">{PROMO.codigo}</span></dt>
                    <dd>−{euros(carrito.descuento)}</dd>
                  </div>
                )}
                <div className="primer"><dt>Primer pago</dt><dd>{euros(carrito.primerPago)}</dd></div>
                <div className="renovacion"><dt>Renovaciones posteriores</dt><dd>{euros(carrito.renovacion)} al mes</dd></div>
              </dl>

              <p className="jn-drawer-nota">
                El importe se recalcula y valida en el servidor al continuar. Entorno de pruebas:
                todavía no hay pasarela conectada, no se realizará ningún cargo y no pedimos datos de tarjeta.
              </p>
            </div>

            <footer className="jn-drawer-pie">
              <a className="jn-btn jn-btn-pro" href="#/checkout" onClick={cerrar}>
                Continuar con la contratación <span aria-hidden>→</span>
              </a>
              <button type="button" className="jn-btn jn-btn-texto" onClick={cerrar}>Seguir mirando planes</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
