import { useEffect, useState } from "react";

/* TerminalVivo: como la LiveTerminal de la referencia — escribe líneas
   una a una con typewriter, pausa, borra y pasa a la siguiente. */
const LINEAS = [
  { t: "./jumpernat --circuito --saltos 3", tipo: "cmd" },
  { t: "[+] eligiendo 3 nodos aleatorios: nodo2 → nodo1 → nodo6", tipo: "out" },
  { t: "[✓] circuito listo · cifrado ChaCha20-Poly1305", tipo: "ok" },
  { t: "curl --socks5-hostname tu@correo:***@jumpernet.duckdns.org:1080 …", tipo: "cmd" },
  { t: "[*] conectando por el túnel de 3 saltos…", tipo: "out" },
  { t: "[✓] HTTP/2 200 · la web de destino ve el exit, no tu IP", tipo: "ok" },
  { t: "jumpernat> rotate   # nuevos saltos aleatorios al instante", tipo: "warn" },
];

const COLOR = { cmd: "var(--acento-1)", out: "var(--texto)", ok: "var(--acento-2)", warn: "var(--acento-3)" };

export default function TerminalVivo() {
  const [nlinea, setNlinea] = useState(0);          // nº de líneas completas visibles
  const [chars, setChars] = useState(0);            // caracteres de la línea en curso
  let timer;

  useEffect(() => {
    const efectiva = Math.min(nlinea, LINEAS.length);
    const actual = LINEAS[efectiva % LINEAS.length];
    const vel = actual.tipo === "cmd" ? 34 : 14;
    let pausa = false;
    if (chars < actual.t.length) {
      timer = setTimeout(() => setChars((c) => c + 1), vel);
    } else {
      if (efectiva === LINEAS.length - 1) {
        // mostró todo: pausa larga y reiniciar
        timer = setTimeout(() => { setNlinea(0); setChars(0); }, 4200);
        pausa = true;
      } else {
        timer = setTimeout(() => { setNlinea((l) => l + 1); setChars(0); }, 620);
      }
    }
    return () => clearTimeout(timer);
  }, [chars, nlinea]);

  const enProceso = Math.min(nlinea, LINEAS.length);
  return (
    <div className="terminal">
      <div className="terminal-cabecera mono">
        <span className="punto" style={{ background: "#ff5f57" }} />
        <span className="punto" style={{ background: "#febc2e" }} />
        <span className="punto" style={{ background: "#28c840" }} />
        <span style={{ marginLeft: 10, color: "var(--texto-suave)", fontSize: 11 }}>jumpernat · vivo</span>
      </div>
      <pre className="mono" style={{ margin: 0, padding: "14px 16px", fontSize: 12.5, lineHeight: 1.85, overflowX: "auto" }}>
        {LINEAS.slice(0, enProceso).map((l, i) => (
          <div key={i} style={{ color: COLOR[l.tipo] }}>{l.t}</div>
        ))}
        <div style={{ color: COLOR[LINEAS[enProceso]?.tipo] }}>
          {(LINEAS[enProceso]?.t || "").slice(0, chars)}
          <span className="cursor">▊</span>
        </div>
      </pre>
    </div>
  );
}
