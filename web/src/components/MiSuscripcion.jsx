import { useState } from "react";
import {
  estadoSuscripcion, cancelaRenovacion, reactivaRenovacion,
  formateaFecha, formateaEuros,
} from "../lib/suscripcion.js";
import { creaNotif } from "../lib/notificaciones.js";
import { planDe, puede } from "../lib/planes.js";
import { ir } from "../lib/router.js";

/* Mi suscripción: el centro de facturación del área privada.
 *
 * Enseña el plan real de la cuenta (/me), sus límites reales y el historial de
 * solicitudes guardadas en este navegador. No hay facturas ni cobros si no hay
 * proveedor de pagos: en ese caso se explica y se ofrece el contacto.
 */

export default function MiSuscripcion({ yo, aviso, alCambiarPlan }) {
  const [version, setVersion] = useState(0);
  const [confirmacion, setConfirmacion] = useState(null);
  const estado = estadoSuscripcion(yo);
  const plan = planDe(yo?.plan);

  function refresca() { setVersion((v) => v + 1); }

  function pideCancelar() {
    setConfirmacion({
      tipo: "cancelar",
      titulo: "Cancelar la renovación",
      importe: "0,00 €",
      texto: "La cancelación no tiene coste. Mantienes el acceso hasta el final del periodo ya acordado y no se volverá a cobrar.",
      cta: "Sí, cancelar la renovación",
      alConfirmar: () => {
        cancelaRenovacion();
        creaNotif({
          cat: "suscripcion",
          titulo: "Renovación cancelada",
          texto: "Has pedido cancelar la renovación. El plan sigue activo hasta el final del periodo.",
          href: "#/panel/suscripcion",
        });
        setConfirmacion(null);
        refresca();
        aviso?.("renovación cancelada: no se volverá a cobrar", "ok");
      },
      tono: "peligro",
    });
  }

  function pideReactivar() {
    setConfirmacion({
      tipo: "reactivar",
      titulo: "Reactivar la renovación",
      importe: `${formateaEuros(estado.precio || 0)}/mes`,
      texto: "Al reactivar, el plan volverá a renovarse cada mes por el precio indicado. Puedes cancelarlo otra vez cuando quieras.",
      cta: "Sí, reactivar la renovación",
      alConfirmar: () => {
        reactivaRenovacion();
        creaNotif({
          cat: "suscripcion",
          titulo: "Renovación reactivada",
          texto: `Tu plan ${plan.nombre} volverá a renovarse cada mes.`,
          href: "#/panel/suscripcion",
        });
        setConfirmacion(null);
        refresca();
        aviso?.("renovación reactivada", "ok");
      },
      tono: "primario",
    });
  }

  return (
    <div className="jns-susc" data-version={version}>
      <header className="jns-cab">
        <div>
          <span className="jns-kicker">suscripción y facturación</span>
          <h1>Mi suscripción</h1>
          <p className="jns-mini">Tu plan, su estado y todo lo que se ha acordado. Sin letra pequeña.</p>
        </div>
        <button type="button" className="jns-btn primario" onClick={() => (alCambiarPlan ? alCambiarPlan() : ir("/tarifas"))}>
          Mejorar plan <span aria-hidden>→</span>
        </button>
      </header>

      <div className="jns-susc-rejilla">
        <section className={`jns-plan-card tono-${plan.tono}`}>
          <div className="jns-plan-card-top">
            <span className="jns-plan-ico" aria-hidden>{plan.ico}</span>
            <div>
              <span className="jns-kicker">plan actual</span>
              <h2>{plan.nombre}</h2>
            </div>
            <span className={`jns-chip mono ${estado.estado === "activo" ? "vivo" : estado.estado === "pendiente" ? "aviso" : ""}`}>
              {estado.etiqueta}
            </span>
          </div>
          <p className="jns-mini">{plan.resumen}</p>

          <dl className="jns-plan-datos">
            <div><dt>Precio</dt><dd>{estado.esGratis ? "Gratis" : `${formateaEuros(estado.precio || 0)} / mes`}</dd></div>
            <div><dt>Contratado el</dt><dd>{formateaFecha(estado.desde)}</dd></div>
            <div>
              <dt>Próxima renovación</dt>
              <dd>{estado.renueva ? formateaFecha(estado.renueva) : estado.esGratis ? "No aplica" : "La confirma el equipo"}</dd>
            </div>
            <div><dt>Importe de renovación</dt><dd>{estado.esGratis ? "0 €" : formateaEuros(estado.precio || 0)}</dd></div>
            <div><dt>Origen del dato</dt><dd className="mono">{estado.fuente}</dd></div>
          </dl>

          <div className="jns-plan-acciones">
            {!estado.esGratis && !estado.cancelada && (
              <button type="button" className="jns-btn" onClick={pideCancelar}>Cancelar renovación</button>
            )}
            {!estado.esGratis && estado.cancelada && (
              <button type="button" className="jns-btn primario" onClick={pideReactivar}>Reactivar suscripción</button>
            )}
            <button type="button" className="jns-btn" onClick={() => (alCambiarPlan ? alCambiarPlan() : ir("/tarifas"))}>Cambiar de plan</button>
          </div>

          {estado.fuente === "solicitud registrada en este navegador" && (
            <p className="jns-aviso-info compacto">
              <span aria-hidden>i</span>
              <span>
                Este plan consta como <b>solicitud</b>: se guardó en este navegador y está pendiente de
                activación por el equipo. La cuenta sigue en <b>{plan.nombre}</b> según el servidor hasta
                que se confirme.
              </span>
            </p>
          )}
        </section>

        <section className="jns-panel">
          <div className="jns-panel-cab">
            <div><span className="jns-kicker">qué incluye</span><h2>Tu plan, en detalle</h2></div>
          </div>
          <div className="jns-dos-listas">
            <div>
              <span className="jns-mini mono">incluido</span>
              <ul className="jns-lista-ok">
                {plan.incluido.map((x) => <li key={x}><span aria-hidden>✓</span>{x}</li>)}
              </ul>
            </div>
            <div>
              <span className="jns-mini mono">límites</span>
              <ul className="jns-lista-no">
                {plan.limitaciones.map((x) => <li key={x}><span aria-hidden>–</span>{x}</li>)}
              </ul>
            </div>
          </div>
          {plan.exclusivo.length > 0 && (
            <div className="jns-exclusivo">
              <span className="jns-kicker">exclusivo de {plan.nombre}</span>
              <div className="jns-chips">
                {plan.exclusivo.map((x) => <span key={x} className="jns-chip">{x}</span>)}
              </div>
            </div>
          )}
          <div className="jns-permisos">
            {[
              ["Elegir saltos", puede(yo, "saltosVariables")],
              ["Ficha ampliada de nodos", puede(yo, "nodosAvanzado")],
              ["Diagnóstico avanzado", puede(yo, "diagnosticoAvanzado")],
              ["Personalización del panel", puede(yo, "personalizacion")],
            ].map(([t, ok]) => (
              <span key={t} className={`jns-permiso ${ok ? "ok" : "no"}`}>
                <span aria-hidden>{ok ? "✓" : "🔒"}</span>{t}
              </span>
            ))}
          </div>
        </section>

        <section className="jns-panel">
          <div className="jns-panel-cab">
            <div><span className="jns-kicker">cobros</span><h2>Métodos de pago</h2></div>
          </div>
          {estado.pedidos.length === 0 ? (
            <p className="jns-mini">
              No hay ningún método de pago guardado. JumperNET no almacena tarjetas ni claves bancarias:
              cuando se conecte el proveedor, los métodos se gestionarán en su pasarela segura.
            </p>
          ) : (
            <p className="jns-mini">
              Los métodos de pago los gestiona el proveedor. Esta web solo guarda la referencia del pedido,
              nunca el número de tarjeta.
            </p>
          )}
          <div className="jns-aviso-info compacto">
            <span aria-hidden>🔒</span>
            <span>Nunca pedimos el CVV ni la clave de tu banco por correo o chat.</span>
          </div>
        </section>

        <section className="jns-panel" id="jns-facturas">
          <div className="jns-panel-cab">
            <div><span className="jns-kicker">documentos</span><h2>Facturas</h2></div>
            <span className="jns-chip mono">{estado.facturas.length}</span>
          </div>
          {estado.facturas.length === 0 ? (
            <div className="jns-vacio compacto">
              <b>Todavía no hay facturas</b>
              <p>
                Las facturas las emite el proveedor de pagos al confirmar cada cobro. Mientras no haya
                un cobro confirmado, aquí no aparecerá ninguna: preferimos un hueco a un documento falso.
              </p>
            </div>
          ) : (
            <table className="jns-tabla">
              <thead><tr><th>Fecha</th><th>Concepto</th><th>Importe</th><th></th></tr></thead>
              <tbody>
                {estado.facturas.map((f) => (
                  <tr key={f.ref}>
                    <td className="mono">{formateaFecha(f.fecha)}</td>
                    <td>{f.planNombre} · {f.ciclo}</td>
                    <td className="mono">{formateaEuros(f.total)}</td>
                    <td><span className="jns-chip vivo mono">pagada</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="jns-panel jns-ancho" id="jns-historial">
          <div className="jns-panel-cab">
            <div><span className="jns-kicker">trazabilidad</span><h2>Historial de compras y solicitudes</h2></div>
            <span className="jns-chip mono">{estado.pedidos.length}</span>
          </div>
          {estado.pedidos.length === 0 ? (
            <p className="jns-mini">Aún no has hecho ninguna solicitud desde este navegador.</p>
          ) : (
            <div className="jns-tabla-caja">
              <table className="jns-tabla">
                <thead>
                  <tr><th>Referencia</th><th>Fecha</th><th>Plan</th><th>Total</th><th>Estado</th><th>Origen</th></tr>
                </thead>
                <tbody>
                  {estado.pedidos.map((p) => (
                    <tr key={p.ref}>
                      <td className="mono">{p.ref}</td>
                      <td className="mono">{formateaFecha(p.fecha)}</td>
                      <td>{p.planNombre} · {p.ciclo}</td>
                      <td className="mono">{formateaEuros(p.total)}{p.descuento ? <small className="jns-mini"> (−{formateaEuros(p.descuento)})</small> : null}</td>
                      <td>
                        <span className={`jns-chip mono ${p.estado === "pagado" ? "vivo" : "aviso"}`}>
                          {p.estado === "pagado" ? "pagado" : p.estado === "pendiente" ? "pendiente" : p.estado}
                        </span>
                      </td>
                      <td className="mono jns-mini">{p.fuente === "stripe" ? "proveedor" : "este navegador"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="jns-mini">
            Las solicitudes pendientes no son cobros. Si necesitas una factura o aclarar un importe,
            escríbenos desde <a href="#/panel/soporte">Soporte</a> con la referencia.
          </p>
        </section>
      </div>

      {confirmacion && (
        <div className="jns-modal-velo" role="presentation" onClick={() => setConfirmacion(null)}>
          <div className="jns-modal" role="dialog" aria-modal="true" aria-labelledby="jns-conf-t" onClick={(e) => e.stopPropagation()}>
            <span className="jns-kicker">confirmación</span>
            <h2 id="jns-conf-t">{confirmacion.titulo}</h2>
            <div className="jns-modal-importe">
              <span className="jns-mini">Importe que se aplicará</span>
              <b>{confirmacion.importe}</b>
            </div>
            <p className="jns-mini">{confirmacion.texto}</p>
            <div className="jns-modal-acciones">
              <button type="button" className="jns-btn" onClick={() => setConfirmacion(null)}>Volver</button>
              <button type="button" className={`jns-btn ${confirmacion.tono === "peligro" ? "peligro" : "primario"}`} onClick={confirmacion.alConfirmar}>
                {confirmacion.cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
