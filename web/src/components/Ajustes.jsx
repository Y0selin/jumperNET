import { useEffect, useRef, useState } from "react";
import {
  PRESETS, TEMA_DEFECTO, cargaTema, guardaTema, aplicaTema, temaPorId, variablesDeTema,
} from "../lib/temas.js";
import { aplicaModo, cargaModo, guardaModo } from "../lib/modo.js";

const COLOR_VARIABLES = [
  ["--bg-1", "Fondo"], ["--bg-2", "Fondo 2"], ["--sup-1", "Superficie"],
  ["--borde", "Bordes"], ["--acento-1", "Acento"], ["--acento-2", "Acento 2"],
  ["--acento-3", "Acento 3"], ["--texto", "Texto"], ["--texto-suave", "Texto suave"],
];

const FUENTES = [
  ['"Inter", "Segoe UI", system-ui, sans-serif', "Inter · moderna"],
  ['ui-monospace, "Cascadia Code", Consolas, monospace', "Monoespaciada · técnica"],
  ['Georgia, "Iowan Old Style", serif', "Georgia · editorial"],
  ['"Trebuchet MS", sans-serif', "Trebuchet · suave"],
  ['Verdana, sans-serif', "Verdana · amplia"],
];

function MiniDiseno({ preset, modo }) {
  const vars = variablesDeTema(preset, modo);
  return (
    <span
      className={`jn-mini-diseno ${modo}`}
      style={{ ...preset.forma, ...vars, "--fuente-titulo": preset.forma["--fuente-titulo"] || preset.forma["--fuente"] }}
      aria-hidden
    >
      <span className="jn-mini-lateral">
        <i className="jn-mini-logo" />
        <i className="jn-mini-nav on" />
        <i className="jn-mini-nav" />
        <i className="jn-mini-nav corto" />
      </span>
      <span className="jn-mini-principal">
        <span className="jn-mini-top"><i /><i className="punto" /></span>
        <span className="jn-mini-cuerpo">
          <span className="jn-mini-titulo" />
          <span className="jn-mini-sub" />
          <span className="jn-mini-fila">
            <span className="jn-mini-tarjeta">
              <i className="jn-mini-kpi" />
              <i className="jn-mini-kpi corto" />
              <span className="jn-mini-barras"><i /><i /><i /><i /></span>
            </span>
            <span className="jn-mini-tarjeta">
              <i className="jn-mini-kpi" />
              <span className="jn-mini-dona" />
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

export default function Ajustes({ aviso }) {
  const [tema, setTema] = useState(cargaTema);
  const [modo, setModo] = useState(cargaModo);
  const [cssExtra, setCssExtra] = useState(tema.cssExtra || "");
  const [avanzado, setAvanzado] = useState(false);
  const guardado = useRef(null);

  /* aplicación inmediata + autoguardado con un pequeño retardo para no
     escribir localStorage en cada píxel que se mueve un control */
  useEffect(() => {
    aplicaTema(tema);
    clearTimeout(guardado.current);
    guardado.current = setTimeout(() => guardaTema({ ...tema, cssExtra }), 240);
    return () => clearTimeout(guardado.current);
  }, [tema, cssExtra]);

  useEffect(() => {
    const id = "css-extra-jumpernat";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = cssExtra;
  }, [cssExtra]);

  const variante = variablesDeTema(tema, modo);
  const modificado = !!tema.personalizado;
  const activo = !modificado ? tema.id : null;

  function aplicaPreset(id) {
    const t = temaPorId(id);
    setTema(t);
    setCssExtra("");
    aplicaTema(t);
    guardaTema(t);
    aviso?.(`diseño «${t.nombre}» aplicado y guardado`, "ok");
  }

  function restaura() {
    const t = temaPorId(TEMA_DEFECTO);
    setTema(t);
    setCssExtra("");
    aplicaTema(t);
    guardaTema(t);
    aviso?.("diseño original restaurado", "ok");
  }

  function cambiaModo(m) {
    aplicaModo(m);
    guardaModo(m);
    setModo(m);
    aplicaTema(tema);
    aviso?.(`interfaz ${m === "claro" ? "clara" : "oscura"}`, "ok");
  }

  function cambiaVar(k, v) {
    setTema((t) => ({
      ...t,
      id: "personalizado",
      nombre: "Diseño personalizado",
      personalizado: true,
      variantes: { ...t.variantes, [modo]: { ...t.variantes[modo], [k]: v } },
    }));
  }
  function cambiaForma(k, v) {
    setTema((t) => ({
      ...t,
      id: t.personalizado ? t.id : "personalizado",
      personalizado: true,
      forma: {
        ...t.forma,
        [k]: v,
        ...(k === "--fuente" ? { "--fuente-titulo": v } : {}),
      },
    }));
  }
  function cambiaEfecto(k, v) {
    setTema((t) => ({ ...t, id: t.personalizado ? t.id : "personalizado", personalizado: true, efectos: { ...t.efectos, [k]: v } }));
  }

  function exportar() {
    const blob = new Blob([JSON.stringify({ ...tema, cssExtra }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diseno-jumpernet.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((txt) => {
      try {
        const t = JSON.parse(txt);
        if (!t.variantes && t.variables) {
          aviso?.("ese archivo usa el formato antiguo; aplica un diseño de la galería", "error");
          return;
        }
        setTema(t);
        setCssExtra(t.cssExtra || "");
        aviso?.("diseño importado y guardado", "ok");
      } catch { aviso?.("no parecía un diseño válido", "error"); }
    });
  }

  const pulso = tema.efectos?.["--vel-anim"] !== "0";

  return (
    <div className="jn-apariencia">
      <div className="jn-apariencia-barra">
        <div className="jn-modo-segmento" role="group" aria-label="Modo de la interfaz">
          <span className="mono">modo</span>
          <button type="button" className={modo === "claro" ? "on" : ""} onClick={() => cambiaModo("claro")}>☀ Claro</button>
          <button type="button" className={modo === "oscuro" ? "on" : ""} onClick={() => cambiaModo("oscuro")}>☾ Oscuro</button>
        </div>
        <span className="jn-autosave mono">● autoguardado activo</span>
        <button className="btn" type="button" onClick={restaura}>⟲ Restaurar diseño original</button>
      </div>

      <section className="tarjeta jn-galeria">
        <header className="jn-galeria-cab">
          <div>
            <span className="pu-kicker">diseños predeterminados</span>
            <h2>Elige una identidad. Cada una tiene su día y su noche.</h2>
            <p>La previsualización ya usa los colores, radios y tipografía reales. Al elegir un diseño se aplica al instante en todo el panel.</p>
          </div>
          <span className="chip mono">{Object.keys(PRESETS).length} diseños</span>
        </header>

        <div className="jn-galeria-grid">
          {Object.entries(PRESETS).map(([id, p]) => {
            const on = activo === id;
            return (
              <button
                key={id}
                type="button"
                className={`jn-tema-card ${on ? "activo" : ""}`}
                onClick={() => aplicaPreset(id)}
                aria-pressed={on}
              >
                <span className="jn-tema-previews">
                  <MiniDiseno preset={p} modo="claro" />
                  <MiniDiseno preset={p} modo="oscuro" />
                </span>
                <span className="jn-tema-info">
                  <span className="jn-tema-txt">
                    <b>{p.nombre}</b>
                    <span>{p.descripcion}</span>
                  </span>
                  <span className="jn-tema-etq mono">{on ? "ACTIVO ✓" : p.etiqueta}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="pu-nota">
          Los dos mini-paneles muestran el mismo diseño en claro y en oscuro. Tu elección se guarda
          solo en este navegador y se conserva al cambiar de modo.
        </p>
      </section>

      <div className="jn-apariencia-pie">
        <div>
          <b>{modificado ? "Diseño personalizado" : tema.nombre}</b>
          <span className="mono">
            {tema.forma?.["--radio"]} de radio · {parseFloat(tema.forma?.["--tam-fuente"])} px ·
            glow {tema.efectos?.["--glow"]}×
          </span>
        </div>
        <div className="jn-apariencia-acciones">
          <button className="btn" type="button" onClick={() => setAvanzado((v) => !v)}>
            {avanzado ? "Ocultar ajustes finos" : "Ajustes finos"}
          </button>
          <button className="btn" type="button" onClick={exportar}>Exportar</button>
          <label className="btn">Importar<input type="file" accept="application/json" hidden onChange={importar} /></label>
        </div>
      </div>

      {avanzado && (
        <div className="jn-avanzado">
          <section className="tarjeta">
            <h2 className="seccion">Colores de la variante {modo}</h2>
            <p className="pu-nota">Editar un color convierte el diseño en personalizado; el resto se conserva.</p>
            <div className="jn-colores">
              {COLOR_VARIABLES.map(([k, etq]) => (
                <label key={k}>
                  <input type="color" value={variante[k] || "#ffffff"} onChange={(e) => cambiaVar(k, e.target.value)} />
                  <span>{etq}<small className="mono">{variante[k]}</small></span>
                </label>
              ))}
            </div>
          </section>

          <section className="tarjeta">
            <h2 className="seccion">Forma, movimiento y letra</h2>
            <label className="jn-rango">
              <span>Radio de las tarjetas <b className="mono">{tema.forma["--radio"]}</b></span>
              <input
                type="range" min="0" max="28" value={parseInt(tema.forma["--radio"], 10) || 0}
                onChange={(e) => { cambiaForma("--radio", `${e.target.value}px`); cambiaForma("--radio-2", `${Math.round(e.target.value * .62)}px`); }}
              />
            </label>
            <label className="jn-rango">
              <span>Tamaño de letra <b className="mono">{tema.forma["--tam-fuente"]}</b></span>
              <input
                type="range" min="13" max="18" step="0.5" value={parseFloat(tema.forma["--tam-fuente"]) || 15}
                onChange={(e) => cambiaForma("--tam-fuente", `${e.target.value}px`)}
              />
            </label>
            <label className="jn-rango">
              <span>Brillo ambiental <b className="mono">{tema.efectos["--glow"]}×</b></span>
              <input type="range" min="0" max="1.5" step="0.05" value={parseFloat(tema.efectos["--glow"]) || 0} onChange={(e) => cambiaEfecto("--glow", e.target.value)} />
            </label>
            <label className="jn-rango">
              <span>Velocidad del fondo <b className="mono">{pulso ? `${tema.efectos["--vel-anim"]}×` : "off"}</b></span>
              <input type="range" min="0" max="2" step="0.1" value={parseFloat(tema.efectos["--vel-anim"]) || 0} onChange={(e) => cambiaEfecto("--vel-anim", e.target.value)} />
            </label>
            <label className="jn-select">Tipografía
              <select className="campo" value={tema.forma["--fuente"]} onChange={(e) => cambiaForma("--fuente", e.target.value)}>
                {FUENTES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
            </label>
            <label className="jn-select">CSS propio (avanzado)
              <textarea
                className="campo" rows={4} spellCheck="false"
                placeholder=".tarjeta:hover { transform: translateY(-2px); }"
                value={cssExtra} onChange={(e) => setCssExtra(e.target.value)}
              />
            </label>
          </section>
        </div>
      )}
    </div>
  );
}
