import { useState } from "react";

/* Circuito del hero: la pieza interactiva de la portada. Se enciende y se
   apaga, se giran los relés y cada parada cuenta qué ve y qué sabe. Es una
   simulación educativa: no habla con la API. */

const PARADAS = [
  {
    t: "TÚ", sub: "origen", papel: "Aquí empieza todo", ico: "tu",
    ve: "Tu IP real y la web que quieres abrir.",
    sabe: "Todo: es tu equipo.",
  },
  {
    t: "nodo₁", sub: "relé ciego", papel: "El primer salto", ico: "rele",
    ve: "Un sobre cifrado y de dónde viene.",
    sabe: "Solo a quién entregarlo.",
  },
  {
    t: "nodo₂", sub: "relé ciego", papel: "El tramo más ciego", ico: "rele",
    ve: "Otro sobre, con otra capa encima.",
    sabe: "Ni de dónde vienes ni a dónde vas.",
  },
  {
    t: "nodo₃", sub: "exit", papel: "La salida", ico: "exit",
    ve: "El destino y la respuesta que vuelve.",
    sabe: "Qué pides, pero no quién eres.",
  },
  {
    t: "internet", sub: "destino", papel: "El otro lado", ico: "web",
    ve: "La IP del nodo de salida.",
    sabe: "Solo lo que tú le cuentes.",
  },
];

const RUTA_INICIAL = ["nodo₁", "nodo₂", "nodo₃"];

const ICONOS = {
  tu: <><rect x="5" y="4" width="14" height="11" rx="2" /><path d="M9 18h6M12 15v3" /></>,
  rele: <><path d="M12 3 4.5 7v10L12 21l7.5-4V7Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>,
  exit: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8.6 12h6.8" /></>,
  web: <><circle cx="12" cy="12" r="8.2" /><path d="M3.8 12h16.4M12 3.8c2.4 2.4 3.6 5.2 3.6 8.2S14.4 17.8 12 20.2C9.6 17.8 8.4 15 8.4 12S9.6 6.2 12 3.8Z" /></>,
};

export default function CircuitoHero() {
  const [encendido, setEncendido] = useState(true);
  const [sel, setSel] = useState(1);
  const [ruta, setRuta] = useState(RUTA_INICIAL);
  const [giro, setGiro] = useState(0);

  const paradas = [
    PARADAS[0],
    { ...PARADAS[1], t: ruta[0] },
    { ...PARADAS[2], t: ruta[1] },
    { ...PARADAS[3], t: ruta[2] },
    PARADAS[4],
  ];
  const p = paradas[sel];

  function avisa() { window.dispatchEvent(new Event("jumpernet-simulador")); }

  function girar() {
    setRuta((r) => [r[1], r[2], r[0]]);
    setGiro((g) => g + 1);
    avisa();
  }

  return (
    <div className={`hn-panel ${encendido ? "on" : "off"}`}>
      <header className="hn-panel-cab">
        <div className="hn-panel-tit">
          <span className="migas">simulador en vivo</span>
          <h3>tu circuito de 3 saltos</h3>
        </div>
        <div className="hn-panel-acc">
          <span className="hn-estado mono"><i aria-hidden />{encendido ? "encendido" : "apagado"}</span>
          <button type="button" className="hn-girar" onClick={girar} disabled={!encendido}>
            ⟳ girar
          </button>
          <button type="button" className="hero-switch" role="switch" aria-checked={encendido}
            aria-label="Encender o apagar la red" onClick={() => { setEncendido((v) => !v); avisa(); }}>
            <span />
          </button>
        </div>
      </header>

      <div className="hn-ruta">
        <div className="hn-riel" aria-hidden>
          <span className="hn-paquete" />
          <span className="hn-paquete hn-paquete-2" />
          <span className="hn-paquete hn-paquete-3" />
        </div>
        <div className={`hn-paradas ${encendido ? "" : "apagado"}`} key={giro} role="group" aria-label="Paradas del circuito">
          {paradas.map((x, i) => (
            <button key={i} type="button"
              className={`hn-nodo ${sel === i ? "sel" : ""}`}
              aria-pressed={sel === i} onClick={() => { setSel(i); avisa(); }}>
              <span className="hn-nodo-ico" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round">{ICONOS[x.ico]}</svg>
              </span>
              <span className="hn-nodo-n mono">{String(i + 1).padStart(2, "0")}</span>
              <b>{x.t}</b>
              <span className="hn-nodo-sub">{x.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hn-ficha" aria-live="polite">
        <div className="hn-ficha-cab">
          <span className="mono">{encendido ? p.papel : "en espera"}</span>
          <span className="mono">{p.t} · {p.sub}</span>
        </div>
        <div className="hn-ficha-dos">
          <div><span>qué ve</span><p>{p.ve}</p></div>
          <div><span>qué sabe</span><p>{p.sabe}</p></div>
        </div>
        {!encendido && <p className="hn-off-nota">La red está apagada: no sale ni un paquete.</p>}
      </div>

      <footer className="hn-panel-pie mono">
        <span><b>JENC</b> · ChaCha20</span>
        <span>solo 80 / 443</span>
        <span>0 registros</span>
        <a className="hn-panel-lab" href="#/lab">abrir laboratorio →</a>
      </footer>
    </div>
  );
}
