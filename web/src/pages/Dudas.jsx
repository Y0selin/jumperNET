import { useState } from "react";
import Revela from "../components/Revela.jsx";
import { DUDAS } from "../lib/contenido.js";

/* Dudas: las preguntas de siempre, en su propia página, con el acordeón
   accesible y dos salidas claras (documentación o crear cuenta). */

export default function Dudas() {
  const [abierta, setAbierta] = useState(0);

  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">antes de entrar</span>
        <h1 className="sp-h1">Dudas <span className="texto-gradiente">rápidas</span></h1>
        <p className="sp-lead">
          Lo que más nos preguntan sobre la IP, la latencia, los datos y los límites del proyecto.
          Si falta algo, la documentación entra en detalle.
        </p>
      </header>

      <section className="pp-seccion sp-faq-seccion">
        <div className="pp-faq">
          {DUDAS.map(([q, r], i) => (
            <Revela key={q} retardo={Math.min(3, i)}>
              <button
                className={`pp-faq-item ${abierta === i ? "abierta" : ""}`}
                onClick={() => setAbierta(abierta === i ? -1 : i)}
                aria-expanded={abierta === i}
              >
                <span className="pp-faq-q"><i>▸</i>{q}</span>
                <span className="pp-faq-r">{r}</span>
              </button>
            </Revela>
          ))}
        </div>
      </section>

      <section className="pp-seccion">
        <div className="pp-dos">
          <Revela className="tarjeta">
            <span className="etiqueta-viva">documentación</span>
            <h3 className="sp-h3">La arquitectura, con detalle</h3>
            <p className="nota">
              El cifrado de los saltos (JENC), la seguridad, los problemas que hubo y cómo se
              resolvieron. Sin marketing: lo que hay debajo del panel.
            </p>
            <a className="btn primario" style={{ marginTop: 12 }} href="https://jumpernet.duckdns.org/docs/" target="_blank" rel="noreferrer">
              ▤ Abrir documentación ↗
            </a>
          </Revela>
          <Revela retardo={1} className="tarjeta">
            <span className="etiqueta-viva">empezar</span>
            <h3 className="sp-h3">La mejor duda es probarlo</h3>
            <p className="nota">
              El plan Free no pide tarjeta y la red llega apagada. Puedes crear la cuenta, mirar el
              panel y encenderla solo cuando quieras.
            </p>
            <a className="btn primario" style={{ marginTop: 12 }} href="#/acceso/registro">▶ Crear cuenta gratis</a>
          </Revela>
        </div>
      </section>
    </>
  );
}
