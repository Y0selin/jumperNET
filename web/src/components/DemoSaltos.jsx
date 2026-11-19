import { useEffect, useState } from "react";

/* Demo interactiva del circuito: el usuario lanza un paquete y lo ve pasar
   por los tres relés hasta el destino. Sirve para explicar el proyecto sin
   pedir que nadie se registre: se toca y se entiende. */

const CANDIDATOS = ["nodo₁", "nodo₂", "nodo₃", "nodo₄", "nodo₅", "nodo₆", "nodo₇"];

const MENSAJES = [
  "Listo. Pulsa «Enviar un paquete» para recorrer el circuito paso a paso.",
  "Tu equipo entrega el paquete a la entrada SOCKS5, autenticada con tu cuenta.",
  "Primer relé: reenvía el sobre sin poder leer lo que lleva dentro.",
  "Segundo relé: mismo trabajo. Cada salto solo conoce al anterior y al siguiente.",
  "Tercer relé: es la salida. Valida el destino y entrega el paquete.",
  "El destino ve la IP del exit, no la tuya. La respuesta vuelve por el mismo camino.",
];

function eligeTres() {
  const copia = [...CANDIDATOS];
  const salida = [];
  while (salida.length < 3 && copia.length) {
    salida.push(copia.splice(Math.floor(Math.random() * copia.length), 1)[0]);
  }
  return salida;
}

export default function DemoSaltos() {
  const [saltos, setSaltos] = useState(["nodo₂", "nodo₁", "nodo₆"]);
  const [paso, setPaso] = useState(0);          // 0 listo · 1..3 relés · 4 destino · 5 respuesta
  const [corriendo, setCorriendo] = useState(false);
  const [capas, setCapas] = useState(true);

  useEffect(() => {
    if (!corriendo) return;
    if (paso >= 5) { setCorriendo(false); return; }
    const t = setTimeout(() => setPaso((p) => p + 1), paso === 0 ? 550 : 900);
    return () => clearTimeout(t);
  }, [corriendo, paso]);

  function enviar() {
    if (corriendo) return;
    setPaso(0);
    setCorriendo(true);
  }
  function girar() {
    setSaltos(eligeTres());
    setPaso(0);
    setCorriendo(false);
  }

  const estaciones = [
    { nombre: "TÚ", pie: "origen", tono: "origen" },
    ...saltos.map((s, i) => ({ nombre: s, pie: i === 2 ? "salida · exit" : "relé ciego", tono: i === 2 ? "exit" : "nodo" })),
    { nombre: "destino", pie: "ve el exit", tono: "destino" },
  ];

  /* posición del paquete: en paso 1 el paquete está en TU equipo y el relé
     1 se resalta; en paso 5 ha llegado al destino. */
  const progreso = Math.min(4, Math.max(0, paso - 1));

  return (
    <div className="ds" data-paso={paso}>
      <div className="ds-cab">
        <div>
          <span className="etiqueta-viva">demo interactiva</span>
          <h3 className="ds-tit">Mira el paquete viajar</h3>
        </div>
        <div className="ds-controles">
          <button type="button" className="btn primario" onClick={enviar} disabled={corriendo}>
            {corriendo ? "viajando…" : paso >= 5 ? "↺ Otra vez" : "▶ Enviar un paquete"}
          </button>
          <button type="button" className="btn" onClick={girar} disabled={corriendo}>◈ Girar circuito</button>
          <button type="button" className={`btn ds-capas-btn ${capas ? "activo" : ""}`}
            onClick={() => setCapas((v) => !v)} aria-pressed={capas}>
            {capas ? "◉" : "○"} Ver capas
          </button>
        </div>
      </div>

      <div className="ds-pista" aria-hidden>
        <div className="ds-riel" />
        <div className={`ds-paquete ${corriendo ? "moviendo" : ""}`}
          style={{ left: `${10 + progreso * 20}%` }}>
          <span className="ds-paquete-punto" />
          {capas && paso > 0 && paso < 4 && (
            <span className="ds-paquete-capas">
              {[0, 1, 2].map((i) => <i key={i} style={{ opacity: 1 - i * 0.22 }} />)}
            </span>
          )}
        </div>

        <div className="ds-estaciones">
          {estaciones.map((e, i) => (
            <div key={`${e.nombre}-${i}`}
              className={`ds-nodo ${e.tono} ${paso === i + 1 ? "activo" : ""} ${paso > i + 1 ? "pasado" : ""}`}>
              <span className="ds-nodo-n mono">{String(i).padStart(2, "0")}</span>
              <b>{e.nombre}</b>
              <span className="mono ds-nodo-pie">{e.pie}</span>
              {i === 3 && <span className="ds-sello mono">solo 80/443</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="ds-leyenda" aria-live="polite">
        <span className={`ds-estado ${corriendo ? "vivo" : ""}`}>
          <i /> {corriendo ? "en tránsito" : paso >= 5 ? "completado" : "en espera"}
        </span>
        <p className="ds-mensaje">{MENSAJES[paso]}</p>
      </div>

      <div className="ds-nota nota">
        {capas
          ? "Con «ver capas» activo, el sobre lleva tres capas JENC. Cada relé quita una; solo el exit puede leer el contenido."
          : "Sin capas: así verían el paquete los relés si el cifrado no existiera. Por eso el tráfico sale cifrado salto a salto."}
        {" "}La demo es una simulación del flujo; los datos reales los enseña tu panel cuando enciendes la red.
      </div>
    </div>
  );
}
