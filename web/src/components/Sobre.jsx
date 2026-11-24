import { useEffect, useRef, useState } from "react";

/* "El sobre cifrado": el viaje de una petición capa a capa.
   Cinco paradas; en cada una se abre una capa JENC y se ve exactamente
   qué puede leer ese salto y qué sigue oculto. Sin datos inventados:
   reproduce el comportamiento descrito en la documentación. */

const PARADAS = [
  {
    id: "tú",
    etq: "origen",
    titulo: "Tú preparas el sobre",
    texto: "Tu equipo envuelve la petición en tres capas JENC y la entrega al proxy de entrada. Nadie ha visto el destino todavía.",
    sabe: ["el destino real", "tu identidad"],
    no: ["aún no ha salido nada"],
    capa: 0,
  },
  {
    id: "entrada",
    etq: "entrada · 1080",
    titulo: "La entrada te autentica",
    texto: "Comprueba tu cuenta y elige el circuito. Reenvía el sobre sin abrirlo: solo conoce el primer relé al que debe entregarlo.",
    sabe: ["tu cuenta", "el primer relé"],
    no: ["el destino", "el contenido"],
    capa: 1,
  },
  {
    id: "nodo 1",
    etq: "relé ciego",
    titulo: "El primer relé descifra su capa",
    texto: "Abre únicamente la capa que lleva su nombre. Dentro encuentra el siguiente salto y el sobre intacto.",
    sabe: ["de dónde viene", "a quién entregar"],
    no: ["el destino", "el contenido"],
    capa: 2,
  },
  {
    id: "nodo 2",
    etq: "relé ciego",
    titulo: "El segundo relé hace lo mismo",
    texto: "Quita otra capa, pasa el sobre y no guarda registro. Aunque quisiera, no puede leer lo que llevas dentro.",
    sabe: ["el relé anterior", "el siguiente salto"],
    no: ["quién eres", "el destino"],
    capa: 3,
  },
  {
    id: "exit",
    etq: "nodo 3 · salida",
    titulo: "La salida abre el último sobre",
    texto: "Valida el destino (solo 80 y 443, nunca rangos privados), lo entrega y devuelve la respuesta. Internet ve su IP, no la tuya.",
    sabe: ["el destino", "la respuesta"],
    no: ["quién eres", "tu IP"],
    capa: 4,
  },
];

export default function Sobre() {
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!auto) return;
    timer.current = setInterval(() => {
      setPaso((p) => (p + 1) % PARADAS.length);
    }, 2600);
    return () => clearInterval(timer.current);
  }, [auto]);

  const p = PARADAS[paso];
  const ir = (n) => { setAuto(false); setPaso(Math.max(0, Math.min(PARADAS.length - 1, n))); };

  return (
    <section className="sb" aria-label="El sobre cifrado, paso a paso">
      <div className="sb-cab">
        <div>
          <span className="sb-eyebrow mono">// dentro del paquete</span>
          <h3 className="sb-titulo">El sobre cifrado</h3>
        </div>
        <button
          type="button"
          className={"sb-auto" + (auto ? " on" : "")}
          onClick={() => setAuto((v) => !v)}
          aria-pressed={auto}
        >
          <i aria-hidden>{auto ? "❚❚" : "▶"}</i>
          {auto ? "pausar" : "reproducir"}
        </button>
      </div>

      <div className="sb-escena">
        <div className="sb-pila" aria-hidden="true">
          <div className={"sb-capa sb-c3" + (paso >= 3 ? " abierta" : "")}>
            <span className="mono">JENC · capa 3</span>
          </div>
          <div className={"sb-capa sb-c2" + (paso >= 2 ? " abierta" : "")}>
            <span className="mono">JENC · capa 2</span>
          </div>
          <div className={"sb-capa sb-c1" + (paso >= 1 ? " abierta" : "")}>
            <span className="mono">JENC · capa 1</span>
          </div>
          <div className={"sb-nucleo" + (paso >= 4 ? " fuera" : "")}>
            <span className="mono">{paso >= 4 ? "respuesta" : "tu petición"}</span>
            <b>{paso >= 4 ? "200 OK" : "GET /"}</b>
          </div>
        </div>

        <div className="sb-lectura" key={p.id}>
          <span className="sb-etq mono">{p.etq}</span>
          <b className="sb-paso-tit">{p.titulo}</b>
          <p>{p.texto}</p>
          <div className="sb-sabe">
            <span className="mono sb-sabe-t">puede leer</span>
            <ul>
              {p.sabe.map((s) => <li key={s} className="si"><i aria-hidden>✓</i>{s}</li>)}
              {p.no.map((s) => <li key={s} className="no"><i aria-hidden>×</i>{s}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="sb-log" aria-hidden="true">
        <span><i>00.0</i><b>sobre listo</b> 3 capas JENC</span>
        <span><i>00.4</i><b>entrada</b> auth ok · destino oculto</span>
        <span><i>00.9</i><b>salida</b> 200 OK · IP del exit</span>
      </div>

      <div className="sb-pie">
        <button type="button" className="sb-nav" onClick={() => ir(paso - 1)} disabled={paso === 0}>
          ← anterior
        </button>
        <div className="sb-puntos" role="tablist" aria-label="Paradas del sobre">
          {PARADAS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={i === paso}
              aria-label={x.titulo}
              className={i === paso ? "on" : ""}
              onClick={() => ir(i)}
            />
          ))}
        </div>
        <button type="button" className="sb-nav sb-sig" onClick={() => ir(paso + 1)} disabled={paso === PARADAS.length - 1}>
          {paso === PARADAS.length - 1 ? "fin del viaje" : "siguiente salto →"}
        </button>
      </div>
    </section>
  );
}
