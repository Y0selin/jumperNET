import { useEffect, useRef, useState } from "react";
import {
  abreCarrito, anadePlan, aplicarCodigo, quitaCodigo, quitaPlan,
  resumenCarrito, useCarrito, CODIGO_BIENVENIDA, PCT_BIENVENIDA, verificaElegibilidad,
} from "../lib/carrito.js";
import { formateaEuros } from "../lib/suscripcion.js";
import { ir } from "../lib/router.js";

/* Carrito de suscripciones: icono para la barra y panel lateral.
   El carrito se guarda en el navegador (plan y código, nunca datos de pago)
   y solo admite una suscripción activa a la vez. */

export function BotonCarrito({ compacto = false, onAbrir }) {
  const carrito = useCarrito();
  const [late, setLate] = useState(false);
  const anterior = useRef(carrito.items.length);

  useEffect(() => {
    if (carrito.items.length > anterior.current) {
      setLate(true);
      const t = window.setTimeout(() => setLate(false), 700);
      anterior.current = carrito.items.length;
      return () => window.clearTimeout(t);
    }
    anterior.current = carrito.items.length;
    return undefined;
  }, [carrito.items.length]);

  const cuenta = carrito.items.length;

  return (
    <button
      type="button"
      className={`jns-cart-btn${compacto ? " compacto" : ""}${late ? " late" : ""}${cuenta ? " lleno" : ""}`}
      onClick={() => { if (onAbrir) onAbrir(); else abreCarrito(); }}
      aria-label={cuenta ? `Abrir el carrito (${cuenta} plan)` : "Abrir el carrito (vacío)"}
      title="Carrito"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 4h2.2l2.1 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L20 7H6" />
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17.5" cy="20" r="1.3" />
      </svg>
      {cuenta > 0 && <span className="jns-cart-badge mono">{cuenta}</span>}
    </button>
  );
}

export function PanelCarrito({ onPago }) {
  const carrito = useCarrito();
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState(null);
  const [elegibilidad, setElegibilidad] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const cerrarRef = useRef(null);
  const resumen = resumenCarrito();

  useEffect(() => {
    const abre = () => setAbierto(true);
    window.addEventListener("jumpernet-abrir-carrito", abre);
    return () => window.removeEventListener("jumpernet-abrir-carrito", abre);
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTec = (e) => { if (e.key === "Escape") cierra(); };
    document.addEventListener("keydown", alTec);
    const t = window.setTimeout(() => cerrarRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", alTec);
      window.clearTimeout(t);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    verificaElegibilidad().then((r) => { if (vivo) setElegibilidad(r); });
    return () => { vivo = false; };
  }, [abierto, carrito.items.length]);

  function cierra() {
    setAbierto(false);
    setAviso(null);
  }

  async function aplica(e) {
    e.preventDefault();
    setAplicando(true);
    const r = aplicarCodigo(codigo);
    setAviso({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
    if (r.ok) setCodigo("");
    setAplicando(false);
  }

  function paga() {
    if (!resumen.item) return;
    setAbierto(false);
    if (onPago) onPago();
    else ir("/pago");
  }

  return (
    <>
      {abierto && <button type="button" className="jns-velo" aria-label="Cerrar el carrito" onClick={cierra} />}
      <aside
        className={`jns-drawer jns-carrito${abierto ? " abierto" : ""}`}
        role="dialog"
        aria-modal={abierto ? "true" : undefined}
        aria-label="Carrito de suscripciones"
        aria-hidden={!abierto}
      >
        <header className="jns-drawer-cab">
          <div>
            <span className="jns-kicker">tu selección</span>
            <h2>Carrito <span className="mono">({resumen.cantidad})</span></h2>
          </div>
          <button ref={cerrarRef} type="button" className="jns-cerrar" onClick={cierra} aria-label="Cerrar el carrito">✕</button>
        </header>

        <div className="jns-drawer-cuerpo">
          {!resumen.item ? (
            <div className="jns-vacio">
              <span className="jns-vacio-ico" aria-hidden>▱</span>
              <b>Tu carrito está vacío</b>
              <p>Elige un plan para llevar tu circuito más lejos. El plan Free se activa al crear la cuenta y no pasa por aquí.</p>
              <button type="button" className="jns-btn primario" onClick={() => { cierra(); ir("/tarifas"); }}>
                Ver los planes <span aria-hidden>→</span>
              </button>
            </div>
          ) : (
            <>
              <article className="jns-linea">
                <div className="jns-linea-ico" aria-hidden>{resumen.plan.ico}</div>
                <div className="jns-linea-txt">
                  <b>{resumen.plan.nombre}</b>
                  <span className="mono">suscripción · {resumen.plan.periodo}</span>
                  <span className="jns-linea-renueva">
                    Se renueva cada mes · {resumen.plan.renovacion}
                  </span>
                </div>
                <div className="jns-linea-precio">
                  <b>{formateaEuros(resumen.subtotal)}</b>
                  <span className="mono">/mes</span>
                </div>
              </article>

              <div className="jns-linea-acciones">
                <button type="button" className="jns-link" onClick={() => { cierra(); ir("/tarifas"); }}>
                  Cambiar de plan
                </button>
                <button type="button" className="jns-link peligro" onClick={() => { quitaPlan(); setAviso(null); }}>
                  Eliminar
                </button>
              </div>

              <div className="jns-promo">
                {resumen.hayPromo ? (
                  <div className="jns-promo-on">
                    <span className="jns-promo-sello mono">{CODIGO_BIENVENIDA}</span>
                    <span>
                      <b>−{PCT_BIENVENIDA} % aplicado</b>
                      <small>Primera compra · {PCT_BIENVENIDA} % de descuento</small>
                    </span>
                    <button type="button" className="jns-link" onClick={quitaCodigo}>Quitar</button>
                  </div>
                ) : (
                  <form onSubmit={aplica} className="jns-promo-form">
                    <label htmlFor="jns-codigo" className="jns-kicker">código promocional</label>
                    <div className="jns-promo-fila">
                      <input
                        id="jns-codigo"
                        className="jns-input"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        placeholder={CODIGO_BIENVENIDA}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={aplicando || elegibilidad?.elegible === false}
                      />
                      <button type="submit" className="jns-btn" disabled={aplicando || !codigo.trim() || elegibilidad?.elegible === false}>
                        {aplicando ? "…" : "Aplicar"}
                      </button>
                    </div>
                  </form>
                )}

                {aviso && <p className={`jns-mini ${aviso.tipo}`} role="status">{aviso.texto}</p>}

                {elegibilidad && !resumen.hayPromo && (
                  <p className={`jns-mini ${elegibilidad.elegible ? "ok" : "error"}`}>
                    {elegibilidad.elegible
                      ? elegibilidad.fuente === "servidor"
                        ? "El servidor confirma que puedes usar la promoción de bienvenida."
                        : "Promoción disponible para tu primera compra. El equipo la validará al activar el plan."
                      : elegibilidad.motivo || "La promoción de bienvenida ya no está disponible para esta cuenta."}
                  </p>
                )}

                <details className="jns-condiciones">
                  <summary>Condiciones de la promoción</summary>
                  <ul>
                    <li>10 % de descuento en la primera suscripción de pago.</li>
                    <li>Válida una sola vez por cuenta; no acumulable con otras ofertas.</li>
                    <li>No se aplica a planes gratuitos ni a acuerdos empresariales.</li>
                    <li>Si no se completa la compra, el descuento sigue disponible.</li>
                  </ul>
                </details>
              </div>

              <dl className="jns-totales">
                <div><dt>Subtotal</dt><dd className="mono">{formateaEuros(resumen.subtotal)}</dd></div>
                {resumen.hayPromo && (
                  <div className="descuento">
                    <dt>Descuento bienvenida ({resumen.pct} %)</dt>
                    <dd className="mono">−{formateaEuros(resumen.descuento)}</dd>
                  </div>
                )}
                <div><dt>Periodo</dt><dd className="mono">mensual · sin permanencia</dd></div>
                <div className="total"><dt>Importe final</dt><dd className="mono">{formateaEuros(resumen.total)}<small>/mes</small></dd></div>
              </dl>
              {resumen.hayPromo && (
                <p className="jns-ahorro">
                  <span aria-hidden>✦</span> Ahorras <b>{formateaEuros(resumen.descuento)}</b> en tu primer mes.
                </p>
              )}
            </>
          )}
        </div>

        {resumen.item && (
          <footer className="jns-drawer-pie">
            <button type="button" className="jns-btn primario grande" onClick={paga}>
              Continuar con el pago <span aria-hidden>→</span>
            </button>
            <p className="jns-mini">No guardamos datos de tarjeta. El cobro se gestiona en el proveedor de pagos.</p>
          </footer>
        )}
      </aside>
    </>
  );
}

/* Atajo para añadir desde una tarjeta de plan. */
export function anadirAlCarrito(planId) {
  const r = anadePlan(planId);
  if (r.ok) abreCarrito();
  return r;
}
