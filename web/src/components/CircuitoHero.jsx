import { useState } from "react";

/* Circuito del hero: la pieza interactiva de la portada. Se enciende y se
   apaga, se giran los relés y cada parada cuenta qué ve y qué sabe. Es una
   simulación educativa: no habla con la API. */

const PARADAS = [
  {
    t: "TÚ", sub: "origen", papel: "Aquí empieza todo",
    ve: "Tu IP real y la web que quieres abrir.",
    sabe: "Todo: es tu equipo.",
  },
  {
    t: "nodo₁", sub: "relé ciego", papel: "El primer salto",
    ve: "Un sobre cifrado y de dónde viene.",
    sabe: "Solo a quién entregarlo.",
  },
  {
    t: "nodo₂", sub: "relé ciego", papel: "El tramo más ciego",
    ve: "Otro sobre, con otra capa encima.",
    sabe: "Ni de dónde vienes ni a dónde vas.",
  },
  {
    t: "nodo₃", sub: "exit", papel: "La salida",
    ve: "El destino y la respuesta que vuelve.",
    sabe: "Qué pides, pero no quién eres.",
  },
  {
    t: "internet", sub: "destino", papel: "El otro lado",
    ve: "La IP del nodo de salida.",
    sabe: "Solo lo que tú le cuentes.",
  },
];

const RUTA_INICIAL = ["nodo₁", "nodo₂", "nodo₃"];

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
        <span className="hn-estado mono"><i aria-hidden />{encendido ? "circuito encendido" : "red apagada"}</span>
        <div className="hn-panel-acc">
          <button type="button" className="hn-girar" onClick={girar} disabled={!encendido}>
            ⟳ girar relés
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
        </div>
        <div className={`hn-paradas ${encendido ? "" : "apagado"}`} key={giro} role="group" aria-label="Paradas del circuito">
          {paradas.map((x, i) => (
            <button key={i} type="button"
              className={`hn-nodo ${sel === i ? "sel" : ""}`}
              aria-pressed={sel === i} onClick={() => { setSel(i); avisa(); }}>
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
      </footer>
    </div>
  );
}
