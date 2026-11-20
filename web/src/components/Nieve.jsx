/* Nieve: copos suaves para la temporada. Es pura decoración, no captura
   clics y queda por debajo del contenido para no tapar nada. */

const COPOS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  tam: 2 + (i % 4) * 1.15,
  dur: 10 + (i % 7) * 1.7,
  ret: -((i * 1.37) % 15),
  drift: ((i % 5) - 2) * 24,
  op: .28 + (i % 4) * .13,
}));

const ESTRELLAS = [
  { x: 12, y: 18, d: 0, s: 7 },
  { x: 78, y: 12, d: -4, s: 5 },
  { x: 62, y: 42, d: -8, s: 4 },
  { x: 28, y: 68, d: -2, s: 5 },
];

export default function Nieve({ tenue = false }) {
  return (
    <div className={`jn-nieve${tenue ? " tenue" : ""}`} aria-hidden="true">
      {COPOS.map((c, i) => (
        <i
          key={i}
          style={{
            "--x": `${c.x}%`,
            "--s": `${c.tam}px`,
            "--d": `${c.dur}s`,
            "--r": `${c.ret}s`,
            "--drift": `${c.drift}px`,
            "--op": c.op,
          }}
        />
      ))}
      {ESTRELLAS.map((e, i) => (
        <b
          key={i}
          className="jn-copo-estrella"
          style={{
            "--x": `${e.x}%`,
            "--y": `${e.y}%`,
            "--d": `${e.d}s`,
            "--s": `${e.s}px`,
          }}
        >
          ✦
        </b>
      ))}
    </div>
  );
}
