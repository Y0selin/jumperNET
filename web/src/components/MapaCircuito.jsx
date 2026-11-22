import { useEffect, useRef, useState } from "react";

/* Esquema interactivo para la portada: cinco casillas, un paquete que las
   cruza y una ficha que cuenta qué ve y qué sabe cada parada. Sirve para que
   alguien que entra por primera vez entienda el proyecto sin leer párrafos. */

const PARADAS = [
  {
    t: "TÚ", sub: "origen", papel: "Aquí empieza todo",
    ve: "Tu IP real y la web que quieres abrir.",
    sabe: "Todo: es tu equipo.",
    nota: "Nada sale de aquí hasta que enciendes el circuito.",
  },
  {
    t: "nodo₁", sub: "relé ciego", papel: "El primer salto",
    ve: "Un sobre cifrado y de dónde viene.",
    sabe: "Solo a quién tiene que entregarlo.",
    nota: "No puede leer el contenido ni el destino final.",
  },
  {
    t: "nodo₂", sub: "relé ciego", papel: "El tramo más ciego",
    ve: "Otro sobre, con otra capa encima.",
    sabe: "Ni de dónde vienes ni a dónde vas.",
    nota: "Solo conoce al nodo anterior y al siguiente.",
  },
  {
    t: "nodo₃", sub: "exit", papel: "La salida",
    ve: "El destino y la respuesta que vuelve.",
    sabe: "Qué pides, pero no quién eres.",
    nota: "Valida el destino, descarta IP privadas y solo deja salir por 80/443.",
  },
  {
    t: "internet", sub: "destino", papel: "El otro lado",
    ve: "La IP del nodo de salida.",
    sabe: "Solo lo que tú le cuentes.",
    nota: "Tu IP y tu operador se quedan fuera de la conversación.",
  },
];

export default function MapaCircuito() {
  const [sel, setSel] = useState(0);
  const [paso, setPaso] = useState(-1);
  const [corriendo, setCorriendo] = useState(false);
  const [capas, setCapas] = useState(false);
  const caja = useRef(null);
  const auto = useRef(false);
  const timer = useRef(null);

  const p = PARADAS[sel];
  const ultimo = PARADAS.length - 1;

  function lanzar() {
    clearInterval(timer.current);
    setPaso(0);
    setCorriendo(true);
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      if (n >= PARADAS.length) {
        clearInterval(timer.current);
        setCorriendo(false);
        setPaso(ultimo);
        return;
      }
      setPaso(n);
    }, 620);
  }

  useEffect(() => () => clearInterval(timer.current), []);

  /* se lanza una vez al asomarse, para que la sección se mueva sola sin
     distraer a quien prefiere no ver animaciones */
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting) || auto.current) return;
      auto.current = true;
      lanzar();
      obs.disconnect();
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="sp-mapa tarjeta" ref={caja} data-tour="mapa">
      <div className="sp-mapa-cab">
        <span className="etiqueta-viva">esquema interactivo</span>
        <span className="nota mono sp-mapa-pista">toca una casilla o lanza el paquete</span>
        <div className="sp-mapa-acciones">
          <button type="button" className="btn" onClick={() => setCapas((v) => !v)}
            aria-pressed={capas} title="Ver las capas de cifrado sobre el paquete">
            ◈ {capas ? "Ocultar capas" : "Ver capas"}
          </button>
          <button type="button" className="btn primario" onClick={() => { window.dispatchEvent(new Event("jumpernet-mapa")); lanzar(); }}>
            {corriendo ? "en tránsito…" : "▶ Lanzar paquete"}
          </button>
        </div>
      </div>

      <div className="sp-mapa-ruta">
        <div className="sp-mapa-riel" aria-hidden>
          <span
            className={`sp-mapa-paquete ${capas ? "con-capas" : ""}`}
            style={{
              opacity: paso < 0 ? 0 : 1,
              left: `${paso < 0 ? 0 : (paso / ultimo) * 100}%`,
            }}
          />
        </div>
        <div className="sp-mapa-paradas" role="group" aria-label="Paradas del circuito">
          {PARADAS.map((x, i) => (
            <button key={x.t} type="button"
              className={`sp-mapa-nodo ${sel === i ? "sel" : ""} ${paso === i ? "activo" : ""}`}
              aria-pressed={sel === i} onClick={() => { setSel(i); window.dispatchEvent(new Event("jumpernet-mapa")); }}>
              <span className="sp-mapa-ix mono">0{i + 1}</span>
              <b>{x.t}</b>
              <span>{x.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sp-mapa-det" aria-live="polite">
        <div className="sp-mapa-det-cab">
          <span className="migas">{p.papel}</span>
          <span className="mono sp-mapa-det-n">{p.t} · {p.sub}</span>
        </div>
        <div className="sp-mapa-dos">
          <div><span className="mono">qué ve</span><p>{p.ve}</p></div>
          <div><span className="mono">qué sabe</span><p>{p.sabe}</p></div>
        </div>
        <p className="nota sp-mapa-nota">{p.nota}</p>
      </div>
    </div>
  );
}
