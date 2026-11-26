import { useId, useState } from "react";

/* Representación educativa de un circuito. No conecta nada: solo dibuja los
   saltos que ofrece un plan y anima paquetes entre ellos. En Pro el número
   de nodos es interactivo (3…7) y la ruta se recalcula al instante. */

const W = 320;
const H = 116;

function posiciones(n) {
  const margen = 16;
  const ancho = W - margen * 2;
  const paso = n > 1 ? ancho / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => {
    const x = margen + paso * i;
    const y = H / 2 + (n > 3 && i > 0 && i < n - 1 ? (i % 2 === 0 ? -20 : 20) : 0);
    return { x, y };
  });
}

export default function CircuitoPlan({
  saltos = 3,
  tono = "free",
  interactivo = false,
  onCambio,
  compacto = false,
  etiqueta = true,
  max = 7,
}) {
  const id = useId().replace(/:/g, "");
  const [activo, setActivo] = useState(null);
  const limite = Math.max(3, Math.min(7, Number(max) || 7));
  const total = Math.max(3, Math.min(limite, Number(saltos) || 3));
  const pts = posiciones(total);
  const ruta = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div className={`jn-circ jn-circ-${tono} ${compacto ? "jn-circ-compacto" : ""}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="jn-circ-svg"
        role="img"
        aria-label={`Circuito de ${total} saltos: tú, ${total} nodos y la salida a internet`}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--jn-circ-a)" />
            <stop offset="55%" stopColor="var(--jn-circ-b)" />
            <stop offset="100%" stopColor="var(--jn-circ-c)" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path d={ruta} className="jn-circ-pista" />
        <path d={ruta} id={`ruta-${id}`} className="jn-circ-pista-viva" stroke={`url(#grad-${id})`} />

        {[0, 1, 2].map((k) => (
          <circle key={k} r="2.7" className="jn-circ-paquete" fill={`url(#grad-${id})`}>
            <animateMotion dur={`${3.4 + k * 0.7}s`} begin={`${k * 1.15}s`} repeatCount="indefinite" path={ruta} />
          </circle>
        ))}

        <g key={total} className="jn-circ-nodos">
        {pts.map((p, i) => {
          const esEntrada = i === 0;
          const esSalida = i === total - 1;
          const titulo = esEntrada ? "Entrada" : esSalida ? "Salida" : `Relé ${i}`;
          return (
            <g
              key={i}
              className="jn-circ-nodo"
              style={{ "--i": i }}
              tabIndex={0}
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              aria-label={`${titulo}: ${esEntrada ? "primer nodo del circuito" : esSalida ? "nodo de salida a internet" : "reenvío ciego"}`}
            >
              <circle cx={p.x} cy={p.y} r="12" className="jn-circ-halo" />
              <circle cx={p.x} cy={p.y} r="5.4" className="jn-circ-punto" filter={`url(#glow-${id})`} />
              <text x={p.x} y={p.y - 15} textAnchor="middle" className="jn-circ-num">
                {esEntrada ? "in" : esSalida ? "exit" : i}
              </text>
              {activo === i && (
                <g className="jn-circ-tip" aria-hidden>
                  <rect x={Math.min(W - 104, Math.max(4, p.x - 50))} y={p.y + 13} width="100" height="28" rx="8" />
                  <text x={Math.min(W - 54, Math.max(54, p.x))} y={p.y + 31} textAnchor="middle">
                    {esEntrada ? "tu entrada" : esSalida ? "salida a internet" : "reenvío ciego"}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        </g>

        <text x={pts[0].x} y={H - 4} textAnchor="middle" className="jn-circ-extremo">TÚ</text>
        <text x={pts[pts.length - 1].x} y={H - 4} textAnchor="middle" className="jn-circ-extremo">INTERNET</text>
      </svg>

      {interactivo && (
        <div className="jn-circ-control">
          <div className="jn-circ-control-cab">
            <span className="mono">saltos del circuito</span>
            <span className="jn-circ-paso">
              <button type="button" onClick={() => onCambio?.(total - 1)} disabled={total <= 3} aria-label="Quitar un salto">−</button>
              <b className="mono">{total}</b>
              <button type="button" onClick={() => onCambio?.(total + 1)} disabled={total >= limite} aria-label="Añadir un salto">+</button>
            </span>
          </div>
          <input
            type="range"
            min="3"
            max={limite}
            step="1"
            value={total}
            onChange={(e) => onCambio?.(Number(e.target.value))}
            aria-label={`Elegir el número de saltos del circuito, de 3 a ${limite}`}
          />
          <div className="jn-circ-ticks" aria-hidden>
            {[3, 4, 5, 6, 7].map((n) => (
              <span key={n} className={`${n === total ? "on" : ""} ${n > limite ? "bloqueado" : ""}`}>{n}</span>
            ))}
          </div>
        </div>
      )}

      {etiqueta && (
        <p className="jn-circ-pie mono">
          {tono === "emp"
            ? "infraestructura a medida · representación"
            : `${total} relés · previsualización educativa · no conecta nada`}
        </p>
      )}
    </div>
  );
}
