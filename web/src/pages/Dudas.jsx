import { useEffect, useState } from "react";
import Revela from "../components/Revela.jsx";
import { DUDAS } from "../lib/contenido.js";
import { ir } from "../lib/router.js";

const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* Se guarda el hito aunque el componente de progreso no esté montado
   (esta página es otra ruta): la portada lo leerá al volver. */
function marcaDudas() {
  try {
    const p = JSON.parse(localStorage.getItem("jumpernet-progreso-v31") || "{}") || {};
    p.dudas = true;
    localStorage.setItem("jumpernet-progreso-v31", JSON.stringify(p));
  } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event("jumpernet-dudas"));
}

function repetirVisita() {
  ir("/");
  setTimeout(() => window.dispatchEvent(new Event("jumpernet-tour")), 450);
}

/* Dudas: las preguntas de siempre, en su propia página, con el acordeón
   accesible y dos salidas claras (documentación o crear cuenta). */

export default function Dudas() {
  const [abierta, setAbierta] = useState(0);
  const [consulta, setConsulta] = useState("");

  useEffect(() => { marcaDudas(); }, []);
  useEffect(() => { setAbierta(0); }, [consulta]);

  const q = sinTildes(consulta.trim());
  const filtradas = q
    ? DUDAS.filter(([pregunta, respuesta]) => sinTildes(pregunta + " " + respuesta).includes(q))
    : DUDAS;

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
        <div className="sp-ayuda-buscador">
          <label htmlFor="jn-ayuda-q">buscar en las dudas</label>
          <div className="sp-ayuda-buscador__caja">
            <input id="jn-ayuda-q" type="search" value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="IP, latencia, datos, Tor…" autoComplete="off" />
            {consulta && <button type="button" onClick={() => setConsulta("")}>limpiar</button>}
          </div>
          <div className="sp-ayuda-buscador__pie">
            <span className="nota mono" aria-live="polite">
              {q ? `${filtradas.length} de ${DUDAS.length} preguntas` : `${DUDAS.length} preguntas reales · sin chatbot`}
            </span>
            <button type="button" className="sp-ayuda-reset" onClick={repetirVisita}>↻ Repetir la visita guiada</button>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="sp-ayuda-vacio" role="status">
            No hay una pregunta que coincida con «{consulta}». Prueba con «IP», «latencia», «datos» o «Tor»; la documentación entra en el resto de detalles.
          </div>
        ) : (
        <div className="pp-faq">
          {filtradas.map(([pregunta, r], i) => (
            <Revela key={`${pregunta}·${q}`} retardo={Math.min(3, i)}>
              <button
                className={`pp-faq-item ${abierta === i ? "abierta" : ""}`}
                onClick={() => setAbierta(abierta === i ? -1 : i)}
                aria-expanded={abierta === i}
              >
                <span className="pp-faq-q"><i>▸</i>{pregunta}</span>
                <span className="pp-faq-r">{r}</span>
              </button>
            </Revela>
          ))}
        </div>
        )}
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
