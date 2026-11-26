import Tarifas from "../components/Tarifas.jsx";
import { ir } from "../lib/router.js";

/* Tarifas: la sección nueva vive en components/Tarifas.jsx. Esta página
   solo aporta el encabezado de contexto y deja respirar a las tarjetas. */

export default function TarifasPagina() {
  return (
    <>
      <section className="pp-seccion jn-tarifas-pagina">
        <Tarifas irAuth={(modo) => ir(`/acceso/${modo === "ventas" ? "login" : modo}`)} />
      </section>
      <p className="jn-planes-pie">
        ¿Dudas antes de elegir? <a href="#/dudas">Las preguntas frecuentes</a> explican qué cambia
        entre planes y qué no.
      </p>
    </>
  );
}
