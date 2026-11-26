import { useEffect, useState } from "react";
import { useCarrito, cambiaSaltosPro } from "../lib/carrito.js";
import {
  PROMO, precioPro, normalizaSaltos, SALTOS_MIN, SALTOS_MAX,
  actualizaDemoPro, desactivaDemoPro, fechaCorta, DIAS_DEMO,
} from "../lib/planes.js";
import { precioPro as precioServidor, solicitarSuscripcion } from "../lib/api.js";

/* Suscripción: información real del plan y solicitudes de cambio.
 * Sin pasarela conectada no cobramos nada. En Pro real, el cambio queda
 * pendiente de confirmación humana; en demo, se actualiza solo la vista local
 * y se dice claramente que el backend no cambia. */

const euros = (n) => Number(n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function SuscripcionPanel({ yo, plan, navega, aviso }) {
  const demo = !!plan?.demo;
  const esFree = plan?.id === "free";
  const esEmpresa = plan?.id === "empresarial";
  const max = plan?.saltosMax || yo?.saltos_max || 3;
  const precio = esFree ? 0 : (yo?.precio_mes || precioPro(max));
  const solicitud = yo?.solicitud_suscripcion;

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / {esFree ? "mi suscripción" : "mi plan"}</span>
          <h1>{esFree ? "Free, completo y sin caducidad" : esEmpresa ? "Plan Empresarial" : "JumperNET Pro"}</h1>
          <p>
            {esFree
              ? "Tu cuenta gratuita incluye el panel completo, la comprobación real y tres saltos fijos. No necesitas tarjeta."
              : esEmpresa
                ? "Las condiciones, el tamaño del circuito y los servicios dedicados se acuerdan con el equipo."
                : "El precio depende del máximo de saltos contratado. Puedes cambiar de tamaño cuando quieras; nunca se cobra automáticamente desde esta web."}
          </p>
        </div>
        <span className={`chip ${esFree ? "" : "acento"} mono`}>{demo ? "PRO · DEMO" : esFree ? "FREE" : esEmpresa ? "EMPRESARIAL" : "PRO"}</span>
      </header>

      <div className="pu-plan-hero">
        <div>
          <span className="pu-kicker">plan actual</span>
          <h2>{demo ? "Pro · demo local" : plan?.nombre}</h2>
          <div className="pu-plan-precio mono">
            <b>{esFree ? "0" : esEmpresa ? "A medida" : precio}</b>{!esFree && !esEmpresa && <span>€/mes</span>}
          </div>
          <p className="pu-nota">
            {demo
              ? `Vista previa durante ${DIAS_DEMO} días (hasta ${fechaCorta(plan.hasta)}). No se ha cobrado nada.`
              : esFree
                ? "Sin renovación, sin método de pago y sin fecha de caducidad."
                : esEmpresa
                  ? "Precio y condiciones personalizados según infraestructura."
                  : `Renovación mensual de referencia. El importe definitivo lo valida el backend.`}
          </p>
        </div>
        <div className="pu-datos">
          <span><small>máximo de saltos</small><b className="mono">{max}</b><i>{esFree ? "fijos" : `circuitos de 3 a ${max}`}</i></span>
          <span><small>refresco</small><b className="mono">{yo?.refresco_cada_h || (esFree ? 24 : 10)} h</b><i>del circuito</i></span>
          <span><small>cifrado</small><b>JENC</b><i>ChaCha20</i></span>
          <span><small>estado</small><b>{yo?.activo ? "red activa" : "red apagada"}</b><i>ahora mismo</i></span>
        </div>
      </div>

      {solicitud && solicitud.estado === "pendiente" && (
        <div className="pu-solicitud">
          <span className="pu-solicitud-ico" aria-hidden>◷</span>
          <div>
            <b>Solicitud de cambio pendiente: {solicitud.saltos} saltos</b>
            <p>Precio calculado por el backend: {euros(solicitud.precio)}/mes. No se ha aplicado ni cobrado. El equipo debe confirmarlo.</p>
          </div>
        </div>
      )}

      <div className="pu-dos">
        <section className="tarjeta">
          <h2 className="seccion">Qué incluye</h2>
          <div className="pu-lista-hechos">
            <span>✓ Panel completo y comprobación real de IP</span>
            <span>✓ Cifrado JENC por capas en todos los planes</span>
            <span>✓ {esFree ? "3 saltos fijos" : `circuitos de 3 a ${max} saltos sin coste extra dentro del máximo`}</span>
            <span>✓ {esFree ? "refresco cada 24 h" : esFree ? "" : "refresco cada 10 h"}</span>
            {!esFree && <span>✓ Herramientas Pro: explorer, diseñador, monitor, inspector y más</span>}
            {esEmpresa && <span>✓ Estructura de organización y soporte directo (pendiente de configurar)</span>}
          </div>
          <div className="pu-bento-acciones">
            {esFree ? (
              <>
                <button className="btn primario" type="button" onClick={() => navega?.("mejorar")}>Mejorar a Pro</button>
                <button className="btn" type="button" onClick={() => navega?.("red")}>Ir a mi red</button>
              </>
            ) : (
              <>
                <button className="btn primario" type="button" onClick={() => navega?.(esEmpresa ? "contacto" : "personalizar")}>
                  {esEmpresa ? "Hablar con el equipo" : "Cambiar número de saltos"}
                </button>
                <button className="btn" type="button" onClick={() => navega?.("facturas")}>Ver facturas</button>
              </>
            )}
          </div>
        </section>

        <section className="tarjeta">
          <h2 className="seccion">{demo ? "Modo demostración" : "Renovación y pagos"}</h2>
          {demo ? (
            <>
              <p className="pu-texto">Estás viendo una demo local de Pro. Puedes recorrer las herramientas, pero los permisos de red y el plan del servidor no cambian.</p>
              <div className="pu-bento-acciones">
                <button className="btn" type="button" onClick={() => { desactivaDemoPro(); aviso?.("demo desactivada; vuelves al plan real", "ok"); }}>Desactivar la demo</button>
                <button className="btn" type="button" onClick={() => navega?.("mejorar")}>Ver planes reales</button>
              </div>
            </>
          ) : (
            <>
              <p className="pu-texto">No hay pasarela de pago conectada. Las facturas y los cargos reales se gestionan con el equipo; esta web no cobra ni renueva sola.</p>
              <div className="pu-datos">
                <span><small>próxima renovación</small><b>{esFree ? "no existe" : "gestión manual"}</b><i>{esFree ? "plan gratuito" : "sin cargo automático"}</i></span>
                <span><small>método de pago</small><b>{esFree ? "ninguno" : "no configurado"}</b><i>sin datos de tarjeta</i></span>
              </div>
              <div className="pu-bento-acciones">
                <button className="btn" type="button" onClick={() => navega?.("contacto")}>Consultar con el equipo</button>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="pu-nota">El backend comprueba el plan en cada conexión. Cambiar el número de saltos desde la interfaz no altera el precio que el servidor considera válido.</p>
    </div>
  );
}

export function PersonalizarSuscripcion({ yo, plan, navega, aviso }) {
  const demo = !!plan?.demo;
  const actual = normalizaSaltos(plan?.saltosMax || yo?.saltos_plan || yo?.saltos_max || 3);
  const [saltos, setSaltos] = useState(actual);
  const [revision, setRevision] = useState(null);
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [solicitud, setSolicitud] = useState(yo?.solicitud_suscripcion || null);

  useEffect(() => { setRevision(null); }, [saltos]);

  async function revisar() {
    setCargando(true); setError("");
    try {
      const r = await precioServidor(saltos, true);
      setRevision(r);
      setModal(true);
    } catch (e) {
      setError(e.message);
    } finally { setCargando(false); }
  }

  async function confirmar() {
    setCargando(true); setError("");
    try {
      if (demo) {
        actualizaDemoPro(saltos);
        setSolicitud({ saltos, precio: revision?.precio ?? precioPro(saltos), estado: "demo", fecha: Date.now() / 1000 });
        aviso?.(`demo actualizada a ${saltos} saltos · sin cargo`, "ok");
      } else {
        const d = await solicitarSuscripcion(saltos);
        setSolicitud(d?.solicitud || { saltos, precio: revision?.precio ?? precioPro(saltos), estado: "pendiente", fecha: Date.now() / 1000 });
        aviso?.("solicitud registrada · pendiente de confirmación, sin cargo", "ok");
      }
      setModal(false);
    } catch (e) {
      setError(e.message);
    } finally { setCargando(false); }
  }

  const precio = revision?.precio ?? precioPro(saltos);
  const descuento = revision?.descuento ?? Math.round(precio * PROMO.porcentaje) / 100;
  const primerPago = revision?.primer_pago ?? precio - descuento;

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / personalizar suscripción</span>
          <h1>Elige el tamaño de tu circuito</h1>
          <p>El precio depende del máximo de saltos. Revisa el importe calculado por el backend y confirma el cambio; nada se cobra automáticamente.</p>
        </div>
        <span className="chip mono">actual: {actual} saltos</span>
      </header>

      <div className="pu-suscripcion-config">
        <section className="tarjeta">
          <div className="pu-control">
            <label>
              <span>Máximo de saltos</span>
              <b className="mono">{saltos}</b>
              <input type="range" min={SALTOS_MIN} max={SALTOS_MAX} value={saltos} onChange={(e) => setSaltos(Number(e.target.value))} />
              <small>3 saltos = 5 € · cada salto extra suma 1 €</small>
            </label>
          </div>
          <div className="pu-precio-opciones">
            {[3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" className={saltos === n ? "on" : ""} onClick={() => setSaltos(n)} aria-pressed={saltos === n}>
                <b className="mono">{n}</b><span>saltos</span><small className="mono">{precioPro(n)} €/mes</small>
                {n === actual && <i>actual</i>}
              </button>
            ))}
          </div>
          <div className="pu-desglose-suscripcion">
            <div><span>Precio base · 3 saltos</span><b className="mono">{euros(5)}</b></div>
            <div><span>Saltos adicionales · {saltos - 3}</span><b className="mono">{saltos > 3 ? `+${euros(saltos - 3)}` : "—"}</b></div>
            <div className="total"><span>Renovación mensual</span><b className="mono">{euros(precio)}</b></div>
            <div><span>Primer pago con {PROMO.codigo}</span><b className="mono">{euros(primerPago)}</b></div>
          </div>
          <div className="pu-bento-acciones">
            <button className="btn primario" type="button" onClick={revisar} disabled={cargando || saltos === actual}>
              {cargando ? "validando…" : saltos === actual ? "Ese es tu máximo actual" : "Revisar cambio"}
            </button>
            <button className="btn" type="button" onClick={() => navega?.("plan")}>Volver a mi plan</button>
          </div>
          {error && <p className="pu-error">{error}</p>}
          <p className="pu-nota">El importe de la revisión lo calcula la API. La promoción no se puede verificar sin pasarela: se muestra como estimación y el equipo confirma la elegibilidad.</p>
        </section>

        <aside className="tarjeta">
          <h2 className="seccion">Cómo funciona</h2>
          <ol className="pu-pasos-cambio">
            <li><b>Eliges el máximo</b><span>Dentro de tu plan Pro. Los circuitos pueden ser de 3 a ese máximo.</span></li>
            <li><b>Revisas el precio</b><span>El backend calcula base, extras y renovación. No hay cobro en esta web.</span></li>
            <li><b>Solicitas el cambio</b><span>En Pro real queda pendiente de que el equipo confirme el pago.</span></li>
          </ol>
          {demo && <p className="pu-nota pu-nota-aviso">Estás en demo: el cambio actualizará la vista local, no el plan real del backend.</p>}
          {solicitud && (
            <div className="pu-solicitud-mini">
              <span className="mono">solicitud {solicitud.estado}</span>
              <b>{solicitud.saltos} saltos · {euros(solicitud.precio)}/mes</b>
              <p>{solicitud.nota || "sin cargo automático"}</p>
            </div>
          )}
        </aside>
      </div>

      {modal && (
        <div className="pu-modal-capa" role="dialog" aria-modal="true" aria-labelledby="pu-cambio-titulo">
          <button type="button" className="pu-modal-fondo" onClick={() => !cargando && setModal(false)} aria-label="Cerrar" />
          <div className="pu-modal">
            <span className="pu-kicker">revisión del cambio</span>
            <h2 id="pu-cambio-titulo">{saltos} saltos · {euros(precio)}/mes</h2>
            <p>
              {demo
                ? "Se actualizará solo la demo de este navegador. El plan real del backend no cambia y no se cobra nada."
                : "La solicitud quedará pendiente de confirmación. No se aplica el cambio ni se cobra hasta que el equipo lo valide."}
            </p>
            <dl className="pu-totales">
              <div><dt>Precio base</dt><dd>{euros(5)}</dd></div>
              <div><dt>Saltos adicionales</dt><dd>{saltos > 3 ? `+${euros(saltos - 3)}` : "—"}</dd></div>
              <div><dt>Descuento estimado</dt><dd>−{euros(descuento)}</dd></div>
              <div className="total"><dt>Primer pago estimado</dt><dd>{euros(primerPago)}</dd></div>
              <div><dt>Renovación</dt><dd>{euros(precio)}/mes</dd></div>
            </dl>
            <div className="pu-lista-hechos">
              <span>✓ sin cobro automático</span>
              <span>✓ los circuitos actuales siguen hasta que gires o reconectes</span>
              <span>✓ puedes cambiar de máximo cuando quieras</span>
            </div>
            <div className="pu-modal-acciones">
              <button className="btn" type="button" onClick={() => setModal(false)} disabled={cargando}>Cancelar</button>
              <button className="btn primario" type="button" onClick={confirmar} disabled={cargando}>
                {cargando ? "registrando…" : demo ? "Actualizar la demo" : "Solicitar el cambio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FacturasPanel({ yo, navega }) {
  const hayServicio = yo?.plan && yo.plan !== "free";
  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / facturas</span>
          <h1>Facturas y recibos</h1>
          <p>Solo enseñamos documentos que existan de verdad. Todavía no hay pasarela de pago conectada.</p>
        </div>
      </header>
      <div className="pu-vacio grande">
        <span className="pu-vacio-ico" aria-hidden>▤</span>
        <b>No hay facturas disponibles</b>
        <p>
          {hayServicio
            ? "Tu plan está activo, pero los cobros y las facturas se gestionan fuera de esta web. Cuando el equipo active la facturación, aparecerán aquí."
            : "El plan Free no genera cargos ni facturas. Si contratas Pro, la facturación se acordará con el equipo."}
        </p>
        <div className="pu-bento-acciones">
          <button className="btn" type="button" onClick={() => navega?.("contacto")}>Consultar facturación</button>
          <button className="btn" type="button" onClick={() => navega?.("plan")}>Ver mi plan</button>
        </div>
      </div>
    </div>
  );
}

export function CarritoPagina({ navega, aviso }) {
  const carrito = useCarrito();
  const item = carrito.items[0];

  if (!item) {
    return (
      <div className="pu-pagina">
        <header className="pu-cab">
          <div>
            <span className="pu-kicker">panel / carrito</span>
            <h1>Carrito</h1>
            <p>La suscripción Pro se configura desde Tarifas o desde el carrito.</p>
          </div>
        </header>
        <div className="pu-vacio grande">
          <span className="pu-vacio-ico" aria-hidden>⌁</span>
          <b>Tu carrito está vacío</b>
          <p>Puedes ver los planes y elegir el número de saltos antes de añadir Pro.</p>
          <button className="btn primario" type="button" onClick={() => navega?.("mejorar")}>Ver planes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pu-pagina">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / carrito</span>
          <h1>JumperNET Pro</h1>
          <p>El importe se recalcula en el servidor al continuar. Esta vista es una previsualización honesta del coste.</p>
        </div>
        <button className="btn" type="button" onClick={() => window.dispatchEvent(new CustomEvent("jumpernet-carrito-abrir"))}>Abrir carrito lateral</button>
      </header>

      <div className="pu-dos">
        <section className="tarjeta">
          <div className="pu-dato-copiable">
            <div><small>plan</small><b>JumperNET Pro</b><span className="pu-nota">{carrito.saltos} saltos · mensual</span></div>
            <b className="mono">{euros(carrito.precio)}</b>
          </div>
          <div className="pu-item-saltos" role="group" aria-label="Cambiar el máximo de saltos">
            <div className="pu-item-saltos-cab"><span>Máximo de saltos</span><b className="mono">{carrito.saltos}</b></div>
            <div className="pu-item-saltos-opciones">
              {[3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" className={carrito.saltos === n ? "on" : ""} onClick={() => cambiaSaltosPro(n)}>
                  <b>{n}</b><small>{precioPro(n)} €</small>
                </button>
              ))}
            </div>
          </div>
          <dl className="pu-totales">
            <div><dt>Precio base · 3 saltos</dt><dd>{euros(carrito.base)}</dd></div>
            <div><dt>Saltos adicionales</dt><dd>{carrito.extras ? `+${euros(carrito.extras)}` : "—"}</dd></div>
            {carrito.promo && <div><dt>Descuento de bienvenida</dt><dd>−{euros(carrito.descuento)}</dd></div>}
            <div className="total"><dt>Primer pago</dt><dd>{euros(carrito.primerPago)}</dd></div>
            <div><dt>Renovación</dt><dd>{euros(carrito.renovacion)}/mes</dd></div>
          </dl>
          <div className="pu-bento-acciones">
            <a className="btn primario" href="#/checkout">Continuar con la contratación</a>
            <button className="btn" type="button" onClick={() => navega?.("plan")}>Ver mi plan</button>
          </div>
          <p className="pu-nota">Entorno de pruebas sin pasarela: no se cobra ni se piden datos de tarjeta. La elegibilidad de la promoción se confirma al contratar.</p>
        </section>
        <aside className="tarjeta">
          <h2 className="seccion">Antes de continuar</h2>
          <div className="pu-lista-hechos">
            <span>✓ el precio final lo valida el backend</span>
            <span>✓ no hay cargos automáticos</span>
            <span>✓ puedes cambiar el máximo de saltos sin salir del carrito</span>
            <span>✓ los circuitos nuevos usarán hasta el máximo contratado</span>
          </div>
          <p className="pu-nota">La promoción de bienvenida es un 10 % en el primer pago. No hay verificación de primera compra porque no existe pasarela conectada.</p>
        </aside>
      </div>
    </div>
  );
}
