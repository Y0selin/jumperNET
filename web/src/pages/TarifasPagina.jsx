import Reveal from "../components/Revela.jsx";
import Tarifas from "../components/Tarifas.jsx";
import { CODIGO_BIENVENIDA } from "../lib/carrito.js";

/* Tarifas: página pública. La parrilla vive en components/Tarifas.jsx para
   que el panel use exactamente los mismos datos y precios. */

export default function TarifasPagina() {
  return (
    <>
      <header className="sp-cabeza jns-tarifas-hero">
        <span className="migas">planes</span>
        <h1 className="sp-h1">Tarifas <span className="texto-gradiente">claras</span></h1>
        <p className="sp-lead">
          Tres formas de usar la misma red: empezar gratis, llevar el circuito más lejos
          o montar algo a medida. Sin permanencia y sin cobros sorpresa.
        </p>
        <div className="sp-promo">
          <span>{CODIGO_BIENVENIDA}</span>
          <span>−10 % en tu primera suscripción · se aplica una sola vez, en el carrito</span>
          <a className="btn" href="#/acceso/registro">Empezar <span aria-hidden>→</span></a>
        </div>
      </header>

      <section className="pp-seccion">
        <Tarifas />
      </section>

      <section className="pp-seccion">
        <Reveal className="pp-cab">
          <span className="migas">antes de pagar</span>
          <h2 className="pp-h2">Lo que puedes <span className="texto-gradiente">comprobar tú</span></h2>
        </Reveal>
        <div className="jns-faq-tres">
          {[
            ["¿Se cobra algo al crear la cuenta?", "No. El plan Free es gratuito y no pide tarjeta. Solo se paga si decides contratar Pro."],
            ["¿Puedo cancelar cuando quiera?", "Sí. La suscripción es mensual y puedes cancelar la renovación desde «Mi suscripción» sin coste."],
            ["¿Dónde se paga?", "Cuando el servicio de pagos esté conectado, el cobro se hará en la pasarela del proveedor. JumperNET nunca almacena tarjetas ni CVV."],
          ].map(([t, d]) => (
            <Reveal key={t} className="jns-faq-item tarjeta">
              <b>{t}</b>
              <p className="nota">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="sp-banda">
        <div>
          <span className="migas">sin tarjeta</span>
          <h2 className="pp-h2">El plan Free <span className="texto-gradiente">no caduca</span></h2>
          <p className="nota">Creas la cuenta y ya está: 3 saltos, cifrado base y refresco diario. Puedes subir cuando quieras.</p>
        </div>
        <div className="sp-banda-acciones">
          <a className="btn primario grande" href="#/acceso/registro">▶ Crear cuenta gratis</a>
          <a className="btn grande" href="#/dudas">Resolver dudas</a>
        </div>
      </Reveal>

      <p className="nota mono sp-nota-final">
        código {CODIGO_BIENVENIDA} · −10 % en la primera suscripción, validado antes de activar el plan
      </p>
    </>
  );
}
