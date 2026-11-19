import { useState } from "react";
import Revela from "../components/Revela.jsx";

/* Para qué sirve: cinco situaciones reales. En cada una se ve, con el circuito
   apagado y encendido, qué enseña el destino y qué ve el operador. Es la
   página que responde «vale, pero ¿esto para qué me sirve?». */

const ESCENARIOS = [
  {
    id: "wifi", ico: "◍", nombre: "Wi-Fi público", sitio: "la web",
    titulo: "Una red que no es tuya",
    resumen: "En el bar, el hotel o el aeropuerto, el dueño de la red ve cada dominio que abres. Con JumperNET solo ve un flujo cifrado que sale hacia tu entrada.",
    sin: "cada dominio que visitas",
    con: "una conexión cifrada a la red",
    pasos: [
      "Tu equipo habla SOCKS5 con la entrada, no con la web.",
      "Los tres relés reenvían el sobre sin poder leerlo.",
      "El router del local solo ve tráfico hacia tu circuito.",
    ],
  },
  {
    id: "ip", ico: "◎", nombre: "Enseñar otra IP", sitio: "el destino",
    titulo: "Que el destino no sepa dónde estás",
    resumen: "Un foro, una tienda o una API que registra la IP de quien entra. Aquí lo que aparece es la IP del exit, no la de tu casa.",
    sin: "tu IP real y tu ciudad",
    con: "la IP del nodo de salida",
    pasos: [
      "La salida resuelve y valida el destino antes de conectar.",
      "Solo se permiten los puertos 80 y 443.",
      "La IP observada se puede comprobar desde el panel, no hay que fiarse.",
    ],
  },
  {
    id: "viaje", ico: "✈", nombre: "Redes que filtran", sitio: "el servicio",
    titulo: "Cuando la red bloquea el camino",
    resumen: "Una red de oficina o un país que corta ciertos servicios. El circuito te da una salida distinta, sin cambiar la configuración de tu equipo.",
    sin: "tu operador y su filtro",
    con: "la salida de la red",
    pasos: [
      "La entrada autentica con tu cuenta y abre el circuito.",
      "Los relés intermedios no conocen el destino final.",
      "Cambiar de salida es girar el circuito, sin cortar la sesión.",
    ],
  },
  {
    id: "comprobar", ico: "✓", nombre: "Comprobarlo tú", sitio: "la prueba",
    titulo: "Verlo con tus ojos, no con una promesa",
    resumen: "La mayoría de servicios piden confianza. Aquí el panel lanza una petición real por el circuito y te enseña la IP que ha visto el otro lado.",
    sin: "una promesa de privacidad",
    con: "una medición real y su latencia",
    pasos: [
      "La comprobación sale por tu circuito, no por tu conexión.",
      "El panel compara la IP observada con la esperada.",
      "Si coinciden con la tuya, te lo dice claro: algo va mal.",
    ],
  },
  {
    id: "aprender", ico: "⌁", nombre: "Aprender", sitio: "el circuito",
    titulo: "Un proxy de laboratorio para mirar dentro",
    resumen: "JumperNET nació para entender los circuitos por capas. Puedes encenderlo, girarlo, apagar el cifrado y ver qué sabe cada salto.",
    sin: "una caja negra",
    con: "tres saltos que puedes abrir",
    pasos: [
      "La demo del proyecto enseña las capas JENC una a una.",
      "Cada nodo es un contenedor con estado y latencia visibles.",
      "Los límites están escritos: no es anonimato de grado onion.",
    ],
  },
];

const NODOS = ["nodo₁", "nodo₂", "nodo₃"];

export default function Usos() {
  const [i, setI] = useState(0);
  const [encendido, setEncendido] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  const [relés, setRelés] = useState(NODOS);
  const e = ESCENARIOS[i];

  function girar() {
    setRelés((ns) => [ns[1], ns[2], ns[0]]);
    setVuelta((v) => v + 1);
  }

  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">para qué sirve</span>
        <h1 className="sp-h1">Qué puedes hacer <span className="texto-gradiente">con JumperNET</span></h1>
        <p className="sp-lead">
          No es una promesa abstracta: son situaciones concretas. Elige una, enciende el
          circuito y mira qué cambia a cada lado de la conexión.
        </p>
        <div className="sp-acciones">
          <a className="btn primario" href="#/acceso/registro">▸ Probar con una cuenta</a>
          <a className="btn" href="#/proyecto">Cómo es por dentro</a>
        </div>
      </header>

      <section className="us-taller" aria-label="Situaciones de uso">
        <div className="us-tabs" role="tablist" aria-label="Elige una situación">
          {ESCENARIOS.map((x, k) => (
            <button key={x.id} type="button" role="tab" id={`us-tab-${x.id}`}
              aria-selected={k === i} aria-controls="us-panel"
              className="us-tab" onClick={() => setI(k)}>
              <i aria-hidden>{x.ico}</i><span>{x.nombre}</span>
            </button>
          ))}
        </div>

        <div className="us-panel tarjeta" id="us-panel" role="tabpanel" aria-labelledby={`us-tab-${e.id}`} key={e.id}>
          <div className="us-panel-cab">
            <span className="etiqueta-viva">{e.nombre}</span>
            <div className="us-controles">
              <button type="button" className="us-girar" onClick={girar} disabled={!encendido}>
                ⟳ girar nodos
              </button>
              <span className="us-estado mono">{encendido ? "circuito encendido" : "circuito apagado"}</span>
              <button type="button" className="us-switch" role="switch" aria-checked={encendido}
                aria-label="Encender el circuito" onClick={() => setEncendido((v) => !v)}>
                <span />
              </button>
            </div>
          </div>

          <h2 className="us-h2">{e.titulo}</h2>
          <p className="us-resumen nota">{e.resumen}</p>

          <div className={`us-ruta ${encendido ? "on" : ""}`} key={vuelta}>
            <div className="us-nodo">
              <b>TÚ</b><span>origen</span>
            </div>
            {relés.map((n, k) => (
              <div className="us-paso" key={n}>
                <div className="us-tramo"><span className="us-punto" style={{ animationDelay: `${k * 0.3}s` }} /></div>
                <div className={`us-nodo ${encendido ? "vivo" : ""}`}>
                  <b>{n}</b><span>{k === 2 ? "exit" : "relé ciego"}</span>
                </div>
              </div>
            ))}
            <div className="us-paso">
              <div className="us-tramo"><span className="us-punto" style={{ animationDelay: "1.2s" }} /></div>
              <div className={`us-nodo sitio ${encendido ? "vivo" : ""}`}>
                <b>{e.sitio}</b><span>destino</span>
              </div>
            </div>
          </div>

          <p className="us-pie-ruta nota mono">
            {encendido
              ? "tres saltos · tu IP no llega al destino"
              : "conexión directa · el destino ve tu IP"}
          </p>

          <div className="us-ve">
            <div className={`us-ve-caja ${encendido ? "bien" : "mal"}`}>
              <span className="mono">el destino ve</span>
              <b>{encendido ? "la IP del exit" : "tu IP real"}</b>
              <span className="nota">{encendido ? e.con : e.sin}</span>
            </div>
            <div className={`us-ve-caja ${encendido ? "bien" : "mal"}`}>
              <span className="mono">tu operador ve</span>
              <b>{encendido ? "solo tráfico cifrado" : "cada destino"}</b>
              <span className="nota">{encendido ? "el contenido no, el camino tampoco" : "a dónde te conectas, uno por uno"}</span>
            </div>
          </div>

          <ol className="us-lista">
            {e.pasos.map((p, k) => (
              <li key={p}><span className="mono">0{k + 1}</span>{p}</li>
            ))}
          </ol>

          <div className="us-acciones">
            <a className="btn primario" href="#/acceso/registro">Crear mi cuenta</a>
            <a className="btn" href="#/funciona">Ver el comando SOCKS5</a>
          </div>
        </div>

        <p className="us-nota nota mono">
          el interruptor de esta página es una simulación visual; el de verdad está en tu panel
        </p>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">con honestidad</span>
          <h2 className="pp-h2">Cuándo <span className="texto-gradiente">no</span> es la herramienta</h2>
          <p className="pp-sub2 nota">Tres saltos no arreglan todo. Mejor saberlo antes de confiarle algo importante.</p>
        </Revela>
        <div className="sp-cuatro">
          {[
            ["Juegos competitivos", "La latencia de tres saltos se nota. Para partidas en tiempo real, mejor sin circuito."],
            ["Anonimato fuerte", "Los nodos son pocos y del proyecto. Si necesitas resistencia a un adversario con recursos, esto no es Tor."],
            ["Descargas enormes", "Todo pasa por un servidor pequeño. Para archivos muy grandes, la red se queda corta."],
            ["Cuentas que ya te conocen", "Si entras en tu banco con tu sesión, cambiar la IP no te hace irreconocible."],
          ].map(([t, d], k) => (
            <Revela key={t} retardo={Math.min(4, k)} className="sp-limite tarjeta">
              <span className="sp-limite-x mono">✕</span>
              <b>{t}</b>
              <p className="nota">{d}</p>
            </Revela>
          ))}
        </div>
      </section>

      <Revela className="sp-banda">
        <div>
          <span className="migas">siguiente</span>
          <h2 className="pp-h2">Y ahora, <span className="texto-gradiente">¿cómo se enciende?</span></h2>
          <p className="nota">Cuatro pasos, un comando y el interruptor en tu mano. Sin instalar nada para probarlo.</p>
        </div>
        <div className="sp-banda-acciones">
          <a className="btn primario grande" href="#/funciona">Ver cómo funciona →</a>
          <a className="btn grande" href="#/tarifas">Comparar planes</a>
        </div>
      </Revela>
    </>
  );
}
