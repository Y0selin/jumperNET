import { useState } from "react";
import { useCarrito, vaciaCarrito } from "../lib/carrito.js";
import { activaDemoPro, calculaPrecioLocal, fechaCorta, DIAS_DEMO, PROMO, precioPro } from "../lib/planes.js";
import { getToken, getUsuarioGuardado, precioPro as precioServidor } from "../lib/api.js";

/* Contratación en tres pasos. No hay pasarela conectada: el paso de pago es
   un entorno de pruebas identificado y no se recogen datos de tarjeta.
   Al terminar se activa un Pro de DEMO local, nunca un cobro real. */

const euros = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function apiPendiente(e) {
  return e?.estado === 404 || e?.estado === 501 || /sin conexión con la API/i.test(e?.message || "");
}

export default function Checkout({ aviso }) {
  const carrito = useCarrito();
  const [paso, setPaso] = useState(1);
  const [acepta, setAcepta] = useState(false);
  const [compra, setCompra] = useState(null);
  const [demo, setDemo] = useState(null);
  const [validando, setValidando] = useState(false);
  const [errorPrecio, setErrorPrecio] = useState("");

  const usuario = getUsuarioGuardado();
  const conSesion = !!getToken();

  function volverAlCheckout() {
    try { sessionStorage.setItem("jumpernet-volver", "/checkout"); } catch { /* sin sesión */ }
  }

  async function completar() {
    if (!acepta || !carrito.cantidad) return;
    setValidando(true);
    setErrorPrecio("");
    try {
      /* El precio definitivo sale del backend. Si no coincide con la vista
         previa, no continuamos: nunca activamos con un importe manipulado.
         Solo si la API de precios aún no está publicada se usa el mismo
         cálculo local de la demo y se avisa con claridad. */
      let validado;
      let validadoPorServidor = true;
      try {
        validado = await precioServidor(carrito.saltos, carrito.promo);
        if (Number(validado.precio) !== Number(precioPro(carrito.saltos))) {
          setErrorPrecio("El importe del servidor no coincide con la vista previa. Vuelve a cargar el carrito.");
          return;
        }
      } catch (e) {
        if (!apiPendiente(e)) throw e;
        validado = calculaPrecioLocal(carrito.saltos, carrito.promo);
        validadoPorServidor = false;
      }
      const primerPago = carrito.promo ? validado.primer_pago : validado.precio;
      setCompra({ ...validado, saltos: carrito.saltos, primerPago, validadoPorServidor });
      /* La promo se queda para la primera compra real: una demo no la consume. */
      setDemo(activaDemoPro(usuario?.id, carrito.saltos));
      vaciaCarrito();
      setPaso(3);
      aviso?.(
        validadoPorServidor
          ? "modo de prueba activado · no se ha realizado ningún cargo"
          : "demo activada con cálculo local · API de precios pendiente, sin cargo",
        "ok"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErrorPrecio(`No pudimos validar el importe con el servidor: ${e.message}`);
    } finally {
      setValidando(false);
    }
  }

  if (paso === 3 && demo) {
    return (
      <section className="jn-checkout jn-checkout-fin">
        <div className="jn-checkout-sello" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
        </div>
        <span className="jn-eyebrow"><i aria-hidden /> entorno de pruebas</span>
        <h1>Pro de prueba activado</h1>
        <p className="jn-checkout-lead">
          Has recorrido el flujo completo. Este navegador muestra <b>Pro · DEMO</b> durante {DIAS_DEMO} días
          ({fechaCorta(demo.hasta)}). <b>No se ha realizado ningún cargo</b> y el backend sigue aplicando
          los permisos del plan real de tu cuenta hasta que el equipo confirme el pago.
        </p>

        <div className="jn-checkout-tarjeta">
          <div className="jn-checkout-compra">
            <span className="jn-plan-ico jn-plan-ico-pro" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" /></svg>
            </span>
            <div>
              <b>JumperNET Pro · demo</b>
              <span className="mono">hasta el {fechaCorta(demo.hasta)} · sin cobro</span>
            </div>
            <span className="jn-checkout-precio mono">{compra ? euros(compra.primerPago) : "—"}</span>
          </div>
          <ul className="jn-checkout-resumen-lista">
            <li>{compra?.saltos || carrito.saltos} saltos contratados · circuitos de 3 a {compra?.saltos || carrito.saltos}</li>
            <li>Refresco cada 10 h cuando el backend aplique el plan</li>
            <li>Herramientas Pro y cifrado JENC idéntico al resto de planes</li>
          </ul>
        </div>

        <div className="jn-checkout-acciones">
          <a className="jn-btn jn-btn-pro" href="#/panel">Ir a mi panel <span aria-hidden>→</span></a>
          <a className="jn-btn jn-btn-suave" href="#/tarifas">Volver a tarifas</a>
        </div>
        {compra?.validadoPorServidor === false && (
          <p className="jn-checkout-nota">
            <b>API de precios pendiente.</b> La demo se ha activado con el mismo cálculo local, sin cargo.
            El importe definitivo se validará en el servidor cuando contrates de verdad.
          </p>
        )}
        <p className="jn-checkout-nota">
          Para contratar de verdad, el equipo tiene que confirmar el pago y activar Pro desde
          administración. Este modo demo no modifica tu plan en el servidor.
        </p>
      </section>
    );
  }

  if (!carrito.cantidad) {
    return (
      <section className="jn-checkout jn-checkout-vacio">
        <span className="jn-eyebrow"><i aria-hidden /> contratación</span>
        <h1>Tu carrito está vacío</h1>
        <p className="jn-checkout-lead">Añade el plan Pro desde Tarifas y vuelve aquí para revisar la compra.</p>
        <div className="jn-checkout-acciones">
          <a className="jn-btn jn-btn-pro" href="#/tarifas">Ver los planes <span aria-hidden>→</span></a>
          <a className="jn-btn jn-btn-suave" href="#/">Volver al inicio</a>
        </div>
      </section>
    );
  }

  return (
    <section className="jn-checkout">
      <header className="jn-checkout-cab">
        <span className="jn-eyebrow"><i aria-hidden /> contratación · 3 pasos</span>
        <h1>Revisa y continúa</h1>
        <p className="jn-checkout-lead">Sin formularios de más: tu plan, el precio y una cuenta. Nada se cobra en este entorno.</p>
        <ol className="jn-pasos" aria-label="Pasos de la contratación">
          {["Revisar", "Entorno de pruebas", "Listo"].map((t, i) => (
            <li key={t} className={paso === i + 1 ? "activo" : paso > i + 1 ? "hecho" : ""}>
              <span>{paso > i + 1 ? "✓" : i + 1}</span>{t}
            </li>
          ))}
        </ol>
      </header>

      <div className="jn-checkout-rejilla">
        <div className="jn-checkout-tarjeta">
          {paso === 1 && (
            <>
              <h2>Tu plan</h2>
              <div className="jn-checkout-compra">
                <span className="jn-plan-ico jn-plan-ico-pro" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" /></svg>
                </span>
                <div>
                  <b>JumperNET Pro</b>
                  <span className="mono">{carrito.saltos} saltos · mensual</span>
                </div>
                <span className="jn-checkout-precio mono">{euros(carrito.precio)}</span>
              </div>
              <ul className="jn-checkout-resumen-lista">
                <li>Circuitos de 3 a {carrito.saltos} saltos</li>
                <li>Herramientas Pro desbloqueadas · refresco cada 10 h</li>
                <li>Todo lo incluido en Free</li>
              </ul>
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
                <div className="renovacion"><dt>Renovaciones</dt><dd>{euros(carrito.renovacion)} al mes</dd></div>
              </dl>
              <p className="jn-checkout-nota">El 10 % de bienvenida se aplica al primer pago y no se consume al completar la demo.</p>

              {!conSesion ? (
                <div className="jn-checkout-cuenta">
                  <b>Necesitas una cuenta para asociar el plan</b>
                  <p>Se guarda en tu panel y es la misma con la que usas la red. Tarda 20 segundos.</p>
                  <div className="jn-checkout-acciones">
                    <a className="jn-btn jn-btn-pro" href="#/acceso/registro" onClick={volverAlCheckout}>Crear cuenta <span aria-hidden>→</span></a>
                    <a className="jn-btn jn-btn-suave" href="#/acceso/login" onClick={volverAlCheckout}>Ya tengo cuenta</a>
                  </div>
                </div>
              ) : (
                <div className="jn-checkout-acciones">
                  <button type="button" className="jn-btn jn-btn-pro" onClick={() => setPaso(2)}>
                    Continuar al pago de prueba <span aria-hidden>→</span>
                  </button>
                  <a className="jn-btn jn-btn-suave" href="#/tarifas">Cambiar de plan</a>
                </div>
              )}
            </>
          )}

          {paso === 2 && (
            <>
              <div className="jn-test-banner">
                <span aria-hidden>!</span>
                <div>
                  <b>Entorno de pruebas · no se realiza ningún cargo</b>
                  <p>No hay pasarela conectada. No pedimos ni guardamos datos de tarjeta.</p>
                </div>
              </div>
              <h2>Confirma la prueba</h2>
              <p className="jn-checkout-parrafo">
                Al continuar, esta web activará un <b>Pro de demostración durante {DIAS_DEMO} días en este
                navegador</b> para que puedas ver el panel. El plan real de tu cuenta
                {usuario?.plan ? ` (${usuario.plan})` : ""} no cambia: lo activa el equipo desde
                administración cuando exista un pago confirmado.
              </p>
              <label className="jn-check">
                <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
                <span>Entiendo que es una demostración y que no se ha cobrado nada.</span>
              </label>
              {errorPrecio && <p className="jn-form-error" role="alert">{errorPrecio}</p>}
              <div className="jn-checkout-acciones">
                <button type="button" className="jn-btn jn-btn-pro" onClick={completar} disabled={!acepta || validando}>
                  {validando ? "Validando importe…" : "Completar la prueba"} <span aria-hidden>→</span>
                </button>
                <button type="button" className="jn-btn jn-btn-suave" onClick={() => setPaso(1)} disabled={validando}>Volver</button>
              </div>
              <p className="jn-checkout-nota">
                El servidor valida el precio de {carrito.saltos} saltos cuando la API está disponible. Si aún no está publicada,
                la demo se activa con el mismo cálculo local y se avisa; no se cobra nada.
              </p>
            </>
          )}
        </div>

        <aside className="jn-checkout-lado">
          <span className="jn-eyebrow"><i aria-hidden /> qué pasa después</span>
          <ol>
            <li><b>Revisas</b><span>Plan, descuento y precio final antes de nada.</span></li>
            <li><b>Valida el servidor</b><span>El backend recalcula el precio de los saltos antes de continuar.</span></li>
            <li><b>Pruebas</b><span>Recorres la contratación sin datos de pago ni cargos.</span></li>
            <li><b>El equipo activa</b><span>Cuando haya pago confirmado, Pro queda en tu cuenta.</span></li>
          </ol>
          <div className="jn-checkout-seguro">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 5 6v6c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" />
            </svg>
            <p>Sin tarjeta, sin cargos ocultos y sin renovaciones automáticas en esta demo.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
