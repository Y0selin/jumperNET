import { useEffect, useRef, useState } from "react";

/* Comparador de la portada: la misma visita en dos caminos. No habla con la
   API; es una simulación para que se entienda qué cambia al encender el
   circuito. Los dos modos se pueden alternar y el paquete se relanza. */

const ESCENARIOS = [
  {
    id: "wifi",
    t: "Wi-Fi público",
    d: "El aeropuerto, un hotel o la cafetería.",
    sin: "La red del sitio y la web ven tu IP real, tu operador y una ubicación aproximada. Todo el mundo sabe de dónde vienes.",
    con: "La web ve la IP del nodo de salida. Tu operador solo ve el primer tramo y el destino no recibe tu IP real.",
  },
  {
    id: "ip",
    t: "Quiero otra IP",
    d: "Una web que limita por ubicación o te reconoce.",
    sin: "La web te identifica por tu IP y puede limitarte o bloquearte según tu ubicación. Cambiar de red no siempre cambia la IP.",
    con: "Sales con otra IP y puedes comprobarla desde el panel antes de navegar. Si no te convence, giras el circuito.",
  },
  {
    id: "filtro",
    t: "Red que filtra",
    d: "Una red que bloquea dominios o puertos.",
    sin: "El filtro ve el destino al que quieres ir y puede cortarte el paso. La petición viaja entera y a la vista.",
    con: "Solo viajan 80 y 443 y cada salto recibe un sobre cifrado. El filtro no ve el destino final ni el contenido.",
  },
];

const RUTAS = {
  sin: ["Tú", "router", "web"],
  con: ["Tú", "nodo₁", "nodo₂", "nodo₃", "web"],
};

const SUB = {
  sin: ["origen", "tu red", "destino"],
  con: ["origen", "relé ciego", "relé ciego", "exit", "destino"],
};

export default function Comparador() {
  const [con, setCon] = useState(true);
  const [esc, setEsc] = useState(0);
  const [viaje, setViaje] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const ruta = RUTAS[con ? "con" : "sin"];
  const subs = SUB[con ? "con" : "sin"];
  const e = ESCENARIOS[esc];

  function probar() {
    clearTimeout(timer.current);
    setViaje((v) => v + 1);
    setCorriendo(true);
    timer.current = setTimeout(() => setCorriendo(false), 2200);
  }

  return (
    <div className={`cmp tarjeta ${con ? "con" : "sin"}`}>
      <div className="cmp-cab">
        <div>
          <span className="etiqueta-viva">comparador interactivo</span>
          <h3>La misma visita, dos caminos</h3>
          <p className="nota">
            Elige un escenario y cambia entre ir directo o pasar por el circuito.
            Mira lo que ve la web en cada caso.
          </p>
        </div>
        <div className="cmp-modos" role="group" aria-label="Comparar con o sin JumperNET">
          <button type="button" className={!con ? "on" : ""} aria-pressed={!con}
            onClick={() => setCon(false)}>Sin JumperNET</button>
          <button type="button" className={con ? "on" : ""} aria-pressed={con}
            onClick={() => setCon(true)}>Con JumperNET</button>
        </div>
      </div>

      <div className="cmp-escenarios" role="group" aria-label="Elige un escenario">
        {ESCENARIOS.map((x, i) => (
          <button key={x.id} type="button" className={esc === i ? "on" : ""}
            aria-pressed={esc === i} onClick={() => setEsc(i)}>
            <span className="mono">0{i + 1}</span>{x.t}
          </button>
        ))}
      </div>

      <div className={`cmp-escena ${con ? "con" : "sin"}`} key={`${con}-${viaje}`}>
        <div className="cmp-ruta">
          <span className="cmp-ruta-tag mono">
            {con ? "circuito de 3 saltos" : "conexión directa"}
          </span>
          <div className="cmp-riel" aria-hidden="true"><i className="cmp-paquete" /></div>
          <div className="cmp-paradas">
            {ruta.map((t, i) => (
              <div className="cmp-parada" style={{ "--i": i }} key={`${t}-${i}`}>
                <span className="cmp-n mono">{String(i + 1).padStart(2, "0")}</span>
                <b>{t}</b>
                <small>{subs[i]}</small>
              </div>
            ))}
          </div>
          <div className="cmp-ruta-pie mono" aria-hidden="true">
            <span>0 registros</span><span>solo 80 / 443</span><span>JENC · ChaCha20</span>
          </div>
        </div>

        <aside className="cmp-destino" aria-live="polite">
          <span className="cmp-ojo mono">◎ lo que ve la web</span>
          <b className="cmp-ip">{con ? "203.0.113.42" : "81.61.231.152"}</b>
          <span className="cmp-ip-nota">{con ? "IP del nodo de salida" : "tu IP real"}</span>
          <div className="cmp-datos">
            <div><span>conexión</span><b>{con ? "sobre cifrado" : "petición directa"}</b></div>
            <div><span>tu operador</span><b>{con ? "fuera del destino" : "ve dónde vas"}</b></div>
            <div><span>tu ubicación</span><b>{con ? "no se comparte" : "aproximada"}</b></div>
          </div>
        </aside>
      </div>

      <div className="cmp-pie">
        <p className="nota" aria-live="polite">{con ? e.con : e.sin}</p>
        <button type="button" className="btn primario" onClick={probar}>
          {corriendo ? "● en tránsito…" : "▶ Probar el cambio"}
        </button>
      </div>
    </div>
  );
}
