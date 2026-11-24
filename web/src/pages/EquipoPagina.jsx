import { useState } from "react";
import Revela from "../components/Revela.jsx";
import Logo from "../components/Logo.jsx";
import { EQUIPO, NOMBRES } from "../lib/equipo.js";

/* El equipo: quiénes están detrás, qué significa la marca y por qué el logo
   tiene la forma que tiene. Es la página «humana» del proyecto, la que no
   habla de puertos ni de cifrado. */

const PIEZAS_LOGO = [
  { n: "01", t: "Tres relés", d: "Los tres nodos —oro, crema y coral— marcan las paradas del circuito. No es un rayo: es una ruta." },
  { n: "02", t: "El salto", d: "El trazo que baja y gira es la J de JumperNET: el paquete viajando de un relé al siguiente." },
  { n: "03", t: "La salida", d: "La punta dorada es el exit: lo último que ve internet antes de devolverte la respuesta." },
];

function inclina(e) {
  if (e.pointerType === "touch") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function endereza(e) {
  const el = e.currentTarget;
  el.style.setProperty("--rx", "0deg");
  el.style.setProperty("--ry", "0deg");
}

export default function EquipoPagina() {
  const [foco, setFoco] = useState("");

  return (
    <>
      <header className="sp-cabeza eq-cabeza">
        <span className="migas">el equipo · 2026</span>
        <h1 className="sp-h1">
          Cinco personas,<br /><span className="texto-gradiente">una red</span>
        </h1>
        <p className="sp-lead">
          JumperNET no salió de una plantilla: lo montamos entre <b>Adrián, Rolando,
          Fernando, Alex y Yoselin</b>. Una idea sencilla —tres saltos, cifrado en capas,
          un interruptor que solo se enciende si tú quieres— y muchas horas de probar,
          romper y volver a montar.
        </p>
        <div className="sp-acciones">
          <a className="btn primario" href="#/proyecto">Ver el proyecto <span aria-hidden>→</span></a>
          <a className="btn" href="#/acceso/registro">Probar la red</a>
          <a className="btn" href="#/funciona">Cómo funciona</a>
        </div>
      </header>

      <Revela className="eq-marca tarjeta">
        <div className="eq-marca-logo">
          <Logo tam={132} />
        </div>
        <div className="eq-marca-txt-bloque">
          <span className="migas">nuestra marca</span>
          <div className="eq-marca-txt">Jumper<span>NET</span><i className="cursor">_</i></div>
          <p className="nota">
            Red de anonimato por tres saltos · proyecto educativo · <b>equipo 2026</b>
          </p>
          <div className="eq-marca-nombres">
            {EQUIPO.map((p) => (
              <span key={p.nombre} className="chip mono" data-tono={p.tono}>{p.nombre}</span>
            ))}
          </div>
        </div>
        <span className="eq-marca-sello mono" aria-hidden>EST. 2026</span>
      </Revela>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">quiénes están detrás</span>
          <h2 className="pp-h2">La red también <span className="texto-gradiente">tiene nombres</span></h2>
          <p className="pp-sub2 nota">
            Cinco perfiles, una misma obsesión: que se entienda cómo viaja una conexión.
            Pasa el ratón por cada ficha.
          </p>
        </Revela>
        <div className="eq-gente">
          {EQUIPO.map((p, i) => (
            <Revela key={p.nombre} retardo={Math.min(4, i)} className="eq-persona tarjeta"
              onPointerMove={inclina} onPointerLeave={endereza}>
              <span className="eq-code mono">{p.codigo}</span>
              <span className="eq-avatar" data-tono={p.tono} aria-hidden>{p.nombre.slice(0, 1)}</span>
              <h3>{p.nombre}</h3>
              <span className="eq-rol mono">equipo fundador</span>
              <span className="eq-linea" aria-hidden />
              <span className="eq-pie mono">JumperNET · 2026</span>
            </Revela>
          ))}
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">la marca, por dentro</span>
          <h2 className="pp-h2">Tres relés y <span className="texto-gradiente">un salto</span></h2>
          <p className="pp-sub2 nota">
            El logo cuenta el producto en un solo trazo. Toca cada pieza para ver qué
            representa.
          </p>
        </Revela>
        <div className="eq-logo-sec">
          <div className={`eq-logo-foco ${foco ? "es-" + foco : ""}`}>
            <Logo tam={188} />
            <span className="eq-logo-anillo" aria-hidden />
            <span className="eq-logo-pie mono">tres paradas · una salida</span>
          </div>
          <div className="eq-marca-puntos">
            {PIEZAS_LOGO.map((x) => (
              <button key={x.n} type="button"
                className="eq-punto" data-on={foco === x.n}
                onMouseEnter={() => setFoco(x.n)}
                onMouseLeave={() => setFoco("")}
                onFocus={() => setFoco(x.n)}
                onBlur={() => setFoco("")}>
                <span className="eq-punto-n mono">{x.n}</span>
                <span>
                  <b>{x.t}</b>
                  <span className="nota">{x.d}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Revela className="eq-credo tarjeta">
        <span className="migas">lo que nos mueve</span>
        <p className="eq-credo-txt">
          «Que cualquiera pueda abrir la web, entender qué pasa con su conexión y decidir
          cuándo encenderla. Sin humo y sin letra pequeña.»
        </p>
        <span className="eq-credo-firma mono">{NOMBRES} · equipo JumperNET</span>
      </Revela>

      <Revela className="sp-banda">
        <div>
          <span className="migas">el siguiente capítulo</span>
          <h2 className="pp-h2">Esto lo hacemos <span className="texto-gradiente">entre todos</span></h2>
          <p className="nota">Prueba el circuito, mira la IP que ve el destino y cuéntanos qué mejorarías.</p>
        </div>
        <div className="sp-banda-acciones">
          <a className="btn primario grande" href="#/acceso/registro">Crear mi cuenta <span aria-hidden>→</span></a>
          <a className="btn grande" href="#/proyecto">Leer el proyecto</a>
        </div>
      </Revela>
    </>
  );
}
