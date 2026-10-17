import { useEffect, useState } from "react";
import { PRESETS, cargaTema, guardaTema, aplicaTema, temaPorId } from "../lib/temas.js";

const COLOR_VARIABLES = [
  ["--bg-1", "Fondo 1"], ["--bg-2", "Fondo 2"], ["--borde", "Bordes"],
  ["--acento-1", "Acento principal"], ["--acento-2", "Acento verde/ok"],
  ["--acento-3", "Acento terciario"], ["--texto", "Texto"], ["--texto-suave", "Texto suave"],
];

const FUENTES = [
  ['"Inter", system-ui', "Inter (moderna)"],
  ['ui-monospace, Consolas, monospace', "Monoespaciada (hackera)"],
  ['Georgia, serif', "Georgia (elegante)"],
  ['"Trebuchet MS", sans-serif', "Trebuchet (suave)"],
  ['Verdana, sans-serif', "Verdana (amplia)"],
  ['"Courier New", monospace', "Courier (retro)"],
];

export default function Ajustes({aviso}) {
  const [tema, setTema] = useState(cargaTema);
  const [cssExtra, setCssExtra] = useState(tema.cssExtra || "");

  useEffect(() => { aplicaTema(tema); }, [tema]);

  function setVar(k, v) { setTema((t) => ({ ...t, variables: { ...t.variables, [k]: v } })); }
  function setForma(k, v) { setTema((t) => ({ ...t, forma: { ...t.forma, [k]: v } })); }
  function setEfecto(k, v) { setTema((t) => ({ ...t, efectos: { ...t.efectos, [k]: v } })); }

  function guarda() { guardaTema({ ...tema, cssExtra }); aviso("tema guardado: se aplica en todo el sitio", "ok"); }
  function preset(id) { const t = temaPorId(id); setTema(t); setCssExtra(""); aplicaTema(t); guardaTema(t); aviso(`preestablecido «${PRESETS[id]?.nombre}» aplicado`, "ok"); }
  function reset() { const t = temaPorId("grafito-profesional"); setTema(t); setCssExtra(""); aplicaTema(t); guardaTema(t); }

  function exportar() {
    const blob = new Blob([JSON.stringify({ ...tema, cssExtra }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "tema-jumpernat.json"; a.click();
  }
  function importar(e) {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then((txt) => {
      try {
        const t = JSON.parse(txt);
        setTema(t); setCssExtra(t.cssExtra || ""); guardaTema(t); aviso("tema importado", "ok");
      } catch { aviso("no parecía un tema válido", "error"); }
    });
  }

  function aplicaCssExtra() {
    const id = "css-extra-jumpernat";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = cssExtra;
  }
  useEffect(aplicaCssExtra, [cssExtra]);

  const pulso = tema.efectos["--vel-anim"] !== "0";

  return (
    <div style={{ display: "grid", gap: 16 }}>

      <div className="tarjeta grande t-led aparecer">
        <h2 className="seccion">Preestablecidos (un clic)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} className="btn" onClick={() => preset(id)} style={{
              padding: 0, height: 74, display: "grid", gridTemplateRows: "1fr auto", overflow: "hidden",
            }}>
              <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                {[p.variables["--acento-1"], p.variables["--acento-2"], p.variables["--acento-3"]].map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </span>
              <span style={{ fontSize: 11.5, padding: "5px 4px" }}>{p.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid2">
        <div className="tarjeta t-led aparecer aparecer-1">
          <h2 className="seccion">Colores</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {COLOR_VARIABLES.map(([k, etq]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                <input type="color" value={tema.variables[k]} onChange={(e) => setVar(k, e.target.value)}
                  style={{ width: 42, height: 34, border: "none", background: "none", cursor: "pointer" }} />
                <span>{etq}</span>
              </label>
            ))}
          </div>

          <h3 className="mini" style={{ marginTop: 16 }}>Efectos</h3>
          <label className="nota" style={{ display: "block", marginTop: 6 }}>
            Intensidad de halos y brillo (glow) {tema.efectos["--glow"]}×
            <input type="range" min="0" max="2" step="0.05" value={tema.efectos["--glow"]}
              onChange={(e) => setEfecto("--glow", e.target.value)} style={{ width: "100%" }} />
          </label>
          <label className="nota" style={{ display: "block" }}>
            Transparencia del glass {tema.efectos["--glass"]}×
            <input type="range" min="0.15" max="1" step="0.05" value={tema.efectos["--glass"]}
              onChange={(e) => setEfecto("--glass", e.target.value)} style={{ width: "100%" }} />
          </label>
          <label className="nota" style={{ display: "block" }}>
            Velocidad de todas las animaciones {pulso ? `${tema.efectos["--vel-anim"]}×` : "(OFF)"}
            <input type="range" min="0" max="2" step="0.1" value={parseFloat(tema.efectos["--vel-anim"]) ?? 1}
              onChange={(e) => setEfecto("--vel-anim", e.target.value)} style={{ width: "100%" }} />
          </label>
        </div>

        <div className="tarjeta t-led aparecer aparecer-2">
          <h2 className="seccion">Forma y tipografía</h2>
          <label className="nota" style={{ display: "block", marginTop: 6 }}>
            Radio de esquinas: {tema.forma["--radio"]}
            <input type="range" min="0" max="30" value={parseInt(tema.forma["--radio"])} style={{ width: "100%" }}
              onChange={(e) => { setForma("--radio", e.target.value + "px"); setForma("--radio-2", Math.round(e.target.value * .6) + "px"); }} />
          </label>
          <label className="nota" style={{ display: "block" }}>
            Tamaño de letra: {tema.forma["--tam-fuente"]}
            <input type="range" min="13" max="19" step="0.5" value={parseFloat(tema.forma["--tam-fuente"])} style={{ width: "100%" }}
              onChange={(e) => setForma("--tam-fuente", e.target.value + "px")} />
          </label>
          <label className="nota" style={{ display: "block" }}>Fuente:
            <select className="campo" value={tema.forma["--fuente"]} style={{ color: "var(--texto)" }}
              onChange={(e) => setForma("--fuente", e.target.value)}>
              {FUENTES.map(([v, n]) => <option key={v} value={v} style={{ color: "#101828" }}>{n}</option>)}
            </select>
          </label>

          <h3 className="mini">tu CSS personalizado (avanzado)</h3>
          <textarea className="campo" rows={5} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}
            placeholder={".tarjeta:hover{transform:scale(1.02)}\n.logo-cubo{border-radius:50%}"}
            value={cssExtra} onChange={(e) => setCssExtra(e.target.value)} />
        </div>
      </div>

      <div className="tarjeta t-led aparecer-2 aparecer">
        <div className="fila-btn">
          <button className="btn primario" onClick={guarda}>💾 Guardar y aplicar en vivo</button>
          <button className="btn" onClick={exportar}>⬆ Exportar tema</button>
          <label className="btn" style={{ textAlign: "center" }}>⬇ Importar tema<input type="file" accept="application/json" style={{ display: "none" }} onChange={importar} /></label>
          <button className="btn peligro" onClick={reset}>⟲ Volver al tema por defecto</button>
        </div>
        <p className="nota" style={{ marginTop: 10 }}>
          El tema se guarda en <b>localStorage</b> (solo en tu navegador) y se aplica
          instantáneamente en todas las páginas: colores, esquinas, letra, glow,
          transparencia y velocidad de animación. El CSS extra se añade al final, tiene
          la última palabra.
        </p>
      </div>
    </div>
  );
}
