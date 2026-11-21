import Revela from "../components/Revela.jsx";

const BASE = import.meta.env.BASE_URL || "./";

const PASOS = [
  ["01", "El problema", "Sin circuito, la web ve tu IP real, tu operador y una ubicación aproximada. La conexión sale tal cual."],
  ["02", "Tres relés ciegos", "Tu paquete entra en un sobre cifrado y pasa por tres nodos. Cada uno solo sabe a quién entregarlo."],
  ["03", "La salida", "El tercer nodo lo entrega y devuelve la respuesta. Internet ve la IP del exit, no la tuya."],
  ["04", "Tu interruptor", "La red llega apagada. Tú decides cuándo encenderla, girarla o apagarla, y puedes comprobar la IP real."],
];

const DATOS = [
  ["formato", "vídeo completo", "sin atajos"],
  ["capas", "ChaCha20", "Poly1305 · JENC"],
  ["salida", "80 / 443", "nada más"],
];

export default function VideoPagina() {
  return (
    <div className="vp">
      <Revela className="sp-cabeza vp-cabeza">
        <span className="migas">el viaje completo</span>
        <h1 className="sp-h1">
          JumperNET, <span className="texto-gradiente">de principio a fin</span>
        </h1>
        <p className="sp-lead">
          El vídeo largo del proyecto, con el contexto que no cabe en treinta
          segundos: qué problema resuelve, cómo viaja el tráfico y qué puedes
          comprobar tú mismo antes de encender nada.
        </p>
      </Revela>

      <div className="vp-layout">
        <Revela className="vp-video tarjeta">
          <video
            controls
            playsInline
            preload="metadata"
            poster={`${BASE}video/portada.jpg`}
            aria-label="Vídeo completo del proyecto JumperNET"
          >
            <source src={`${BASE}video/JumperNET_El_Viaje.mp4`} type="video/mp4" />
            Tu navegador no puede reproducir este vídeo.
          </video>
          <div className="vp-video-pie">
            <span className="mono">el viaje · JumperNET</span>
            <span className="nota">si quieres, ábrelo a pantalla completa</span>
          </div>
        </Revela>

        <Revela retardo={1} className="vp-texto tarjeta">
          <span className="migas">qué estás viendo</span>
          <h2 className="vp-h2">Cuatro paradas, una idea</h2>
          <ol className="vp-pasos">
            {PASOS.map(([n, t, d]) => (
              <li key={n}>
                <span className="vp-n mono">{n}</span>
                <div><b>{t}</b><p>{d}</p></div>
              </li>
            ))}
          </ol>
          <a className="btn primario" href="#/acceso/registro">
            Crear mi cuenta <span aria-hidden>→</span>
          </a>
        </Revela>
      </div>

      <Revela retardo={2} className="vp-ficha tarjeta">
        {DATOS.map(([etq, val, pie]) => (
          <div className="vp-dato" key={etq}>
            <span className="mono">{etq}</span>
            <b>{val}</b>
            <small>{pie}</small>
          </div>
        ))}
      </Revela>

      <Revela className="vp-siguiente">
        <div>
          <span className="migas">el siguiente paso</span>
          <h2 className="pp-h2">Míralo. Luego <span className="texto-gradiente">pruébalo</span>.</h2>
          <p className="nota">
            El panel te deja girar el circuito, ver la latencia de cada salto y
            comprobar con una petición real qué IP ve el destino.
          </p>
        </div>
        <div className="vp-siguiente-acciones">
          <a className="btn primario grande" href="#/acceso/registro">Crear cuenta gratis</a>
          <a className="btn grande" href="#/panel">Abrir el panel</a>
        </div>
      </Revela>
    </div>
  );
}
