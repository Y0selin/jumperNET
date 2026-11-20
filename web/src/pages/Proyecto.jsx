import Revela from "../components/Revela.jsx";
import DemoSaltos from "../components/DemoSaltos.jsx";
import { PIEZAS } from "../lib/contenido.js";

/* El proyecto: qué es JumperNET, de dónde sale la idea, cómo se ve el circuito
   por dentro y cuáles son sus límites. La demo es el centro de la página. */

const PARADAS = [
  { n: "TÚ", d: "tu equipo", t: "origen" },
  { n: "entrada", d: "SOCKS5 :1080", t: "auth" },
  { n: "nodo₁", d: "relé ciego", t: "jenc" },
  { n: "nodo₂", d: "relé ciego", t: "jenc" },
  { n: "nodo₃", d: "salida · exit", t: "exit" },
  { n: "internet", d: "solo 80/443", t: "destino" },
];

const LIMITES = [
  ["No es una VPN comercial", "No hay app de escritorio que lo haga todo por ti ni servidores en 50 países: hay un circuito de laboratorio que puedes mirar y entender."],
  ["No es anonimato de grado onion", "Los nodos son pocos y del proyecto. Frente a un sitio normal cambias de IP y sales cifrado; frente a un adversario con recursos, no es Tor."],
  ["No guarda tu historial", "No se registran webs ni destinos. Solo email, estado del circuito y cuándo cambió, para que el panel pueda enseñártelo."],
  ["No se enciende sola", "Ninguna conexión sale por el circuito hasta que pulsas el interruptor. Es una decisión tuya, no un valor por defecto."],
];

export default function Proyecto() {
  return (
    <>
      <header className="sp-cabeza">
        <span className="migas">el proyecto</span>
        <h1 className="sp-h1">Qué es <span className="texto-gradiente">JumperNET</span></h1>
        <p className="sp-lead">
          Una red de tres saltos, montada en un servidor pequeño, para ver con tus propios ojos
          cómo una conexión puede salir a internet sin enseñar tu IP. Nació como proyecto para
          aprender cómo funcionan los circuitos por capas —y acabó siendo un proxy que se usa de verdad.
        </p>
        <div className="sp-acciones">
          <a className="btn primario" href="#/acceso/registro">▸ Probar con una cuenta</a>
          <a className="btn" href="#/funciona">Cómo funciona</a>
          <a className="btn" href="#/equipo">El equipo</a>
          <a className="btn" href="#/dudas">Dudas y límites</a>
        </div>
      </header>

      <section className="sp-dos">
        <Revela>
          <span className="migas">la idea</span>
          <h2 className="pp-h2">Tres intermediarios que <span className="texto-gradiente">no saben qué llevan</span></h2>
          <div className="sp-prosa nota">
            <p>
              Cuando entras en una web, el destino ve tu IP y tu proveedor ve el destino. Un proxy
              normal rompe una de las dos cosas, pero el proxy lo ve todo. La idea de JumperNET es
              repartir ese trabajo: <b>tres relés en fila</b>, cada uno con una capa de cifrado que
              solo puede abrir el siguiente.
            </p>
            <p>
              El primero sabe de dónde vienes, pero no qué pides. El último sabe qué pides, pero no
              de dónde vienes. El del medio no sabe ni una cosa ni la otra. Ninguno guarda el
              contenido: reenvían y olvidan.
            </p>
            <p>
              Y todo eso lo puedes comprobar: el panel lanza una petición real por el circuito y te
              enseña la IP que ha visto el destino. Si coincide con la tuya, algo va mal.
            </p>
          </div>
        </Revela>
        <Revela retardo={1} className="sp-ficha tarjeta">
          <span className="etiqueta-viva">ficha rápida</span>
          <dl className="sp-datos">
            <div><dt className="mono">qué es</dt><dd>proxy SOCKS5 con cuentas + circuito de 3 saltos</dd></div>
            <div><dt className="mono">cifrado</dt><dd>ChaCha20-Poly1305 por capas (JENC)</dd></div>
            <div><dt className="mono">salida</dt><dd>solo puertos 80 y 443 · anti-IP-privada</dd></div>
            <div><dt className="mono">sesión</dt><dd>JWT de 2 h · la red se enciende aparte</dd></div>
            <div><dt className="mono">dónde vive</dt><dd>nodos en Docker en un servidor del proyecto</dd></div>
            <div><dt className="mono">para qué</dt><dd>aprender, experimentar y navegar con otra IP</dd></div>
          </dl>
        </Revela>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">tócalo</span>
          <h2 className="pp-h2">El circuito, <span className="texto-gradiente">en tus manos</span></h2>
          <p className="pp-sub2 nota">
            Lanza un paquete y míralo pasar. Puedes girar el circuito para cambiar los nodos y
            encender o apagar las capas de cifrado para ver qué enseña cada salto.
          </p>
        </Revela>
        <Revela><DemoSaltos /></Revela>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">por dentro</span>
          <h2 className="pp-h2">Un circuito de tres saltos,<br /><span className="texto-gradiente">sin cajas negras</span></h2>
          <p className="pp-sub2 nota">
            Entrada SOCKS5 autenticada con tu misma cuenta, tres relés que solo reenvían y una
            salida que valida el destino antes de tocar internet.
          </p>
        </Revela>
        <div className="pp-flujo">
          <div className="pp-flujo-linea" />
          {PARADAS.map((p, i) => (
            <Revela key={p.n} retardo={Math.min(4, i + 1)} className={`pp-parada pp-parada-${p.t}`}>
              <span className="pp-parada-n mono">{String(i + 1).padStart(2, "0")}</span>
              <b>{p.n}</b>
              <span className="mono">{p.d}</span>
            </Revela>
          ))}
        </div>
        <div className="pp-cascada">
          <div className="pp-cascada-item"><span className="mono">01</span><div><b>Autenticación real</b><p className="nota">Usuario y contraseña de tu cuenta, verificados contra la API con argon2id.</p></div></div>
          <div className="pp-cascada-item"><span className="mono">02</span><div><b>Cifrado por capas</b><p className="nota">Cada salto añade su capa JENC; solo el exit puede descifrar el contenido.</p></div></div>
          <div className="pp-cascada-item"><span className="mono">03</span><div><b>Salida validada</b><p className="nota">Se resuelve y revalida el destino: nada de IP privadas, loopback ni metadata.</p></div></div>
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">con honestidad</span>
          <h2 className="pp-h2">Lo que JumperNET <span className="texto-gradiente">no es</span></h2>
          <p className="pp-sub2 nota">Un proyecto educativo gana más diciendo sus límites que prometiendo de más.</p>
        </Revela>
        <div className="sp-cuatro">
          {LIMITES.map(([t, d], i) => (
            <Revela key={t} retardo={Math.min(4, i)} className="sp-limite tarjeta">
              <span className="sp-limite-x mono">✕</span>
              <b>{t}</b>
              <p className="nota">{d}</p>
            </Revela>
          ))}
        </div>
      </section>

      <section className="pp-seccion">
        <Revela className="pp-cab">
          <span className="migas">qué te llevas</span>
          <h2 className="pp-h2">Cuatro piezas, <span className="texto-gradiente">una red</span></h2>
        </Revela>
        <div className="pp-grid">
          {PIEZAS.map((p, i) => (
            <Revela key={p.tit} retardo={Math.min(4, i + 1)} className="pp-pieza tarjeta brillo">
              <div className="pp-pieza-top">
                <span className="pp-pieza-ico flota" style={{ animationDelay: `${i * 0.35}s` }}>{p.ico}</span>
                <span className="pp-pieza-tag mono">{p.tag}</span>
                <span className="pp-pieza-num mono">0{i + 1}</span>
              </div>
              <h3>{p.tit}</h3>
              <p className="nota">{p.txt}</p>
              <div className="pp-pieza-pies">
                {p.pies.map((x) => <span key={x} className="chip mono">{x}</span>)}
              </div>
            </Revela>
          ))}
        </div>
      </section>

      <Revela className="sp-banda">
        <div>
          <span className="migas">siguiente</span>
          <h2 className="pp-h2">De la teoría a <span className="texto-gradiente">tu primer salto</span></h2>
          <p className="nota">Creas la cuenta, enciendes la red y copias un comando. No hay nada más que instalar para probarlo.</p>
        </div>
        <div className="sp-banda-acciones">
          <a className="btn primario grande" href="#/funciona">Ver los 4 pasos →</a>
          <a className="btn grande" href="#/tarifas">Comparar planes</a>
        </div>
      </Revela>
    </>
  );
}
