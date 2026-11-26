import Reveal from "../components/Revela.jsx";
import Tarifas from "../components/Tarifas.jsx";
import { ir } from "../lib/router.js";
import { PLANES_RESUMEN } from "../lib/contenido.js";

/* Tarifas: página propia. Reutiliza el componente de planes del panel y le
   añade una guía rápida para elegir. */

export default function TarifasPagina() {
  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">planes</span>
        <h1 className="sp-h1">Tarifas de <span className="texto-gradiente">la red</span></h1>
        <p className="sp-lead">
          Una barra de supersaltos con tres velocidades: elige cuántos nodos hay entre tú y la
          salida. El plan Free sirve para probarlo todo; Pro añade más saltos y mejor cifrado.
        </p>
      </header>

      <section className="pp-seccion">
        <Tarifas dentroPanel irAuth={(modo) => ir(`/acceso/${modo === "ventas" ? "login" : modo}`)} />
      </section>

      <section className="pp-seccion">
        <Reveal className="pp-cab">
          <span className="migas">¿cuál me conviene?</span>
          <h2 className="pp-h2">Elige por lo que <span className="texto-gradiente">vas a hacer</span></h2>
        </Reveal>
        <div className="sp-tres">
          {PLANES_RESUMEN.map((p, k) => (
            <Reveal key={p.nombre} retardo={k + 1} className="sp-tres-item tarjeta">
              <div className="sp-plan-cab">
                <b>{p.nombre}</b>
                <span className="mono sp-plan-precio">{p.precio}</span>
              </div>
              <p className="nota">{p.nota}</p>
            </Reveal>
          ))}
        </div>
        <p className="nota mono sp-nota-final">
          el plan lo cambia el administrador · si compras Pro te llega activado en tu cuenta sin tocar nada más
        </p>
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
    </>
  );
}
