import { useEffect, useState } from "react";
import Revela from "./Revela.jsx";
import { ENLACES } from "../lib/contenido.js";
import { DOCS_URL } from "../lib/enlaces.js";

/* Índice de la portada: dos columnas, una para las paradas de esta página
   (con seguimiento de scroll) y otra para las páginas del sitio. Los enlaces
   internos se resuelven con scrollIntoView para no tocar el hash del router. */

const PARADAS = [
  { id: "inicio", n: "00", t: "La portada" },
  { id: "diferencia", n: "01", t: "La diferencia" },
  { id: "esquema", n: "02", t: "El circuito" },
  { id: "tres-ideas", n: "03", t: "Tres ideas" },
  { id: "piezas", n: "04", t: "Las piezas" },
  { id: "video", n: "05", t: "El viaje en vídeo" },
  { id: "aprender", n: "06", t: "Aprender" },
  { id: "destinos", n: "07", t: "Todas las páginas" },
  { id: "notas", n: "08", t: "Novedades" },
  { id: "equipo", n: "09", t: "El equipo" },
];

export default function IndicePortada() {
  const [activa, setActiva] = useState("inicio");

  useEffect(() => {
    let raf = 0;
    const calcula = () => {
      const y = window.scrollY + 150;
      let actual = PARADAS[0].id;
      for (const p of PARADAS) {
        const el = document.getElementById(p.id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) actual = p.id;
      }
      setActiva(actual);
    };
    const alScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(calcula);
    };
    calcula();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", alScroll); };
  }, []);

  function salta(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiva(id);
  }

  return (
    <Revela className="pp-indice tarjeta" id="indice" aria-label="Índice de la portada">
      <div className="pp-indice-cab">
        <span className="migas">índice de la portada</span>
        <h2 className="pp-h2">¿Por dónde <span className="texto-gradiente">quieres empezar?</span></h2>
        <p className="nota">
          Esta página tiene diez paradas y ocho páginas propias. Salta a lo que te
          interese o abre la documentación completa para verlo con calma.
        </p>
      </div>

      <div className="pp-indice-columnas">
        <div className="pp-indice-bloque">
          <span className="pp-indice-t mono">
            en esta portada <i>{PARADAS.length} paradas</i>
          </span>
          <ol className="pp-indice-lista">
            {PARADAS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={activa === p.id ? "on" : ""}
                  aria-current={activa === p.id ? "true" : undefined}
                  onClick={(e) => salta(e, p.id)}
                >
                  <span className="mono">{p.n}</span>
                  <b>{p.t}</b>
                  <i aria-hidden="true">→</i>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="pp-indice-bloque">
          <span className="pp-indice-t mono">
            páginas del sitio <i>{ENLACES.length} destinos</i>
          </span>
          <div className="pp-indice-paginas">
            {ENLACES.map((e) => (
              <a key={e.ruta} href={`#${e.ruta}`}>
                <span className="pp-indice-pag-ico" aria-hidden="true">{e.ico}</span>
                <span>
                  <b>{e.corto}</b>
                  <em>{e.texto}</em>
                </span>
              </a>
            ))}
          </div>

          <a className="pp-indice-docs" href={DOCS_URL} target="_blank" rel="noreferrer">
            <span className="pp-indice-docs-ico" aria-hidden="true">▤</span>
            <span>
              <b>Documentación completa</b>
              <em>Arquitectura, cifrado JENC, API y las pruebas</em>
            </span>
            <span className="pp-indice-docs-flecha" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </Revela>
  );
}
