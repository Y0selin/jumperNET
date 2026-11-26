import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/* Gráficos del panel. Recharts pinta SVG y hereda los colores del tema con
   variables CSS, así que todos los diseños claro/oscuro funcionan sin
   duplicar configuraciones. Los tooltips son propios para mantener la
   tipografía y el contraste del panel. */

const PALETA = [
  "var(--grafico-1, var(--acento-1))",
  "var(--grafico-2, var(--acento-2))",
  "var(--grafico-3, var(--acento-3))",
  "var(--grafico-4, var(--acento-1))",
  "var(--grafico-5, var(--texto-suave))",
];

export function sinAnimacion() {
  return document.documentElement.dataset.anim === "off"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function horaCorta(t) {
  if (!t) return "";
  return new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
export function horaSegundos(t) {
  if (!t) return "";
  return new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function TipTema({ active, payload, label, formato, titulo }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="jn-tip" role="status">
      <span className="jn-tip-cab mono">{titulo || horaSegundos(label)}</span>
      {payload.map((p) => (
        <span key={`${p.dataKey}-${p.name}`} className="jn-tip-fila">
          <i style={{ background: p.color || p.stroke || p.fill }} aria-hidden />
          <b>{p.name}</b>
          <span className="mono">{formato ? formato(p.value, p) : p.value}</span>
        </span>
      ))}
    </div>
  );
}

export function LeyendaGrafico({ items }) {
  return (
    <div className="jn-leyenda">
      {items.map((i) => (
        <span key={i.nombre}><i style={{ background: i.color }} aria-hidden />{i.nombre}</span>
      ))}
    </div>
  );
}

/* ── 1. Latencia en tiempo real ───────────────────────────────────────── */
export function GraficoLatencia({ datos = [], altura = 270, compacto = false, demo = false }) {
  const sin = sinAnimacion();
  const serie = useMemo(() => (datos || []).map((d) => {
    const saltos = (d.saltos || []).map((s) => s.ms).filter(Number.isFinite);
    return {
      t: d.t,
      api: Number.isFinite(d.ms) ? d.ms : null,
      ruta: saltos.length ? Math.round(saltos.reduce((a, b) => a + b, 0) / saltos.length) : null,
    };
  }), [datos]);
  const tieneRuta = serie.some((d) => d.ruta != null);

  if (!serie.length) {
    return <div className={`jn-grafico-vacio ${compacto ? "compacto" : ""}`}><span className="spin" />Recogiendo medidas reales…</div>;
  }

  return (
    <div className={`jn-grafico ${compacto ? "compacto" : ""} ${demo ? "con-demo" : ""}`} style={{ "--alto-grafico": `${altura}px` }}>
      <ResponsiveContainer width="100%" height={altura}>
        <LineChart data={serie} margin={{ top: 12, right: 14, bottom: 2, left: 0 }}>
          <CartesianGrid stroke="var(--linea)" strokeDasharray="2 7" vertical={false} />
          {compacto ? <XAxis hide /> : (
            <XAxis
              dataKey="t" tickFormatter={horaCorta} minTickGap={28} tickLine={false}
              axisLine={{ stroke: "var(--linea-2)" }}
              tick={{ fill: "var(--texto-suave)", fontSize: 10, fontFamily: "var(--fuente-mono)" }}
            />
          )}
          {compacto ? <YAxis hide /> : (
            <YAxis
              tickFormatter={(v) => `${v}\u00A0ms`} domain={["auto", "auto"]} width={46} tickLine={false} axisLine={false}
              tick={{ fill: "var(--texto-suave)", fontSize: 10, fontFamily: "var(--fuente-mono)" }}
            />
          )}
          <Tooltip
            content={<TipTema formato={(v) => `${v} ms`} />}
            cursor={{ stroke: "var(--linea-2)", strokeWidth: 1 }}
          />
          {!compacto && (
            <Legend
              verticalAlign="top"
              align="right"
              height={26}
              iconType="plainline"
              formatter={(v) => <span style={{ color: "var(--texto-suave)", fontSize: 10.5 }}>{v}</span>}
            />
          )}
          <Line
            type="monotone" dataKey="api" name="Respuesta de la API"
            stroke={PALETA[0]} strokeWidth={2.2} dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false}
            isAnimationActive={!sin} animationDuration={650}
          />
          {tieneRuta && (
            <Line
              type="monotone" dataKey="ruta" name="Media de tus saltos"
              stroke={PALETA[1]} strokeWidth={1.8} strokeDasharray="5 5" dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }} connectNulls
              isAnimationActive={!sin} animationDuration={650}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {serie.length === 1 && (
        <div className="jn-grafico-primera">
          <b className="mono">{serie[0].api != null ? `${serie[0].api} ms` : "—"}</b>
          <span>primera medida real · la línea aparece con la siguiente</span>
        </div>
      )}
      {demo && <span className="jn-demo-marca mono">demostración</span>}
    </div>
  );
}

/* ── 2. Tráfico de red (API) ──────────────────────────────────────────── */
export function GraficoTrafico({ datos = [], altura = 270, demo = false }) {
  const sin = sinAnimacion();
  const id = useRef(`trafico-${Math.random().toString(36).slice(2)}`).current;
  const serie = useMemo(() => (datos || []).map((d) => ({
    t: d.t,
    recibido: Math.round(((d.recibido || 0) / 1024) * 10) / 10,
    enviado: Math.round(((d.enviado || 0) / 1024) * 10) / 10,
  })), [datos]);

  if (!serie.length) {
    return <div className="jn-grafico-vacio"><span className="spin" />Esperando tráfico de la API…</div>;
  }

  return (
    <div className={`jn-grafico ${demo ? "con-demo" : ""}`} style={{ "--alto-grafico": `${altura}px` }}>
      <ResponsiveContainer width="100%" height={altura}>
        <AreaChart data={serie} margin={{ top: 12, right: 14, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETA[0]} stopOpacity=".38" />
              <stop offset="100%" stopColor={PALETA[0]} stopOpacity=".02" />
            </linearGradient>
            <linearGradient id={`${id}-e`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETA[1]} stopOpacity=".28" />
              <stop offset="100%" stopColor={PALETA[1]} stopOpacity=".01" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--linea)" strokeDasharray="2 7" vertical={false} />
          <XAxis
            dataKey="t" tickFormatter={horaCorta} minTickGap={28} tickLine={false}
            axisLine={{ stroke: "var(--linea-2)" }}
            tick={{ fill: "var(--texto-suave)", fontSize: 10, fontFamily: "var(--fuente-mono)" }}
          />
          <YAxis
            tickFormatter={(v) => `${v}\u00A0KB`} width={46} tickLine={false} axisLine={false}
            tick={{ fill: "var(--texto-suave)", fontSize: 10, fontFamily: "var(--fuente-mono)" }}
          />
          <Tooltip content={<TipTema formato={(v) => `${v} KB`} />} cursor={{ stroke: "var(--linea-2)", strokeWidth: 1 }} />
          <Legend
            verticalAlign="top" align="right" height={26} iconType="circle"
            formatter={(v) => <span style={{ color: "var(--texto-suave)", fontSize: 10.5 }}>{v}</span>}
          />
          <Area
            type="monotone" dataKey="recibido" name="Recibido"
            stroke={PALETA[0]} fill={`url(#${id}-r)`} strokeWidth={2}
            isAnimationActive={!sin} animationDuration={700}
          />
          <Area
            type="monotone" dataKey="enviado" name="Enviado"
            stroke={PALETA[1]} fill={`url(#${id}-e)`} strokeWidth={1.8}
            isAnimationActive={!sin} animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
      {demo && <span className="jn-demo-marca mono">demostración</span>}
    </div>
  );
}

/* ── 3. Rendimiento de los saltos ─────────────────────────────────────── */
export function GraficoBarrasSaltos({ saltos = [], altura, demo = false }) {
  const sin = sinAnimacion();
  const datos = useMemo(() => (saltos || [])
    .filter((s) => Number.isFinite(s.ms))
    .map((s) => ({ ...s, corto: s.nombre.length > 17 ? `${s.nombre.slice(0, 16)}…` : s.nombre })), [saltos]);

  if (!datos.length) {
    return <div className="jn-grafico-vacio"><b>Sin latencias de salto.</b><span>Activa el circuito o espera a la sonda del servidor.</span></div>;
  }

  const alto = altura || Math.max(190, datos.length * 46 + 42);
  return (
    <div className={`jn-grafico ${demo ? "con-demo" : ""}`} style={{ "--alto-grafico": `${alto}px` }}>
      <ResponsiveContainer width="100%" height={alto}>
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 46, bottom: 0, left: 4 }} barCategoryGap={12}>
          <CartesianGrid stroke="var(--linea)" strokeDasharray="2 7" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--texto-suave)", fontSize: 10 }} tickLine={false} axisLine={false} unit=" ms" />
          <YAxis
            type="category" dataKey="corto" width={118} tickLine={false} axisLine={false}
            tick={{ fill: "var(--texto)", fontSize: 10.5, fontFamily: "var(--fuente-mono)" }}
          />
          <Tooltip content={<TipTema formato={(v) => `${v} ms`} />} cursor={{ fill: "var(--linea)" }} />
          <Bar dataKey="ms" name="Latencia" radius={[0, 6, 6, 0]} isAnimationActive={!sin} animationDuration={700}>
            {datos.map((d, i) => (
              <Cell key={d.nombre} fill={PALETA[i % PALETA.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {demo && <span className="jn-demo-marca mono">demostración</span>}
    </div>
  );
}

/* ── 4. Estado de los nodos ───────────────────────────────────────────── */
export function GraficoNodos({ nodos = [], vivos = null, altura = 236, demo = false }) {
  const sin = sinAnimacion();
  const datos = useMemo(() => {
    const lista = nodos || [];
    if (lista.length) {
      const vivosN = lista.filter((n) => n.estado === "vivo").length;
      const caidos = lista.filter((n) => n.estado === "caido" || n.estado === "muerto").length;
      const otros = Math.max(0, lista.length - vivosN - caidos);
      return [
        { nombre: "vivos", valor: vivosN, color: PALETA[0] },
        { nombre: "caídos", valor: caidos, color: PALETA[1] },
        ...(otros ? [{ nombre: "sin estado", valor: otros, color: PALETA[4] }] : []),
      ].filter((d) => d.valor > 0);
    }
    if (vivos?.total) {
      return [{ nombre: "vivos", valor: vivos.total, color: PALETA[0] }];
    }
    return [];
  }, [nodos, vivos]);

  const total = datos.reduce((a, b) => a + b.valor, 0);
  if (!datos.length) {
    return <div className="jn-grafico-vacio"><b>Sin nodos que contar.</b><span>La API no ha devuelto el estado de la red.</span></div>;
  }

  return (
    <div className={`jn-grafico jn-grafico-dona ${demo ? "con-demo" : ""}`} style={{ "--alto-grafico": `${altura}px` }}>
      <div className="jn-dona-lienzo">
        <ResponsiveContainer width="100%" height={altura}>
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={datos} dataKey="valor" nameKey="nombre" cx="50%" cy="50%"
              innerRadius="62%" outerRadius="86%" paddingAngle={3} strokeWidth={0}
              isAnimationActive={!sin} animationDuration={750}
            >
              {datos.map((d) => <Cell key={d.nombre} fill={d.color} />)}
            </Pie>
            <Tooltip content={<TipTema formato={(v) => `${v} nodos`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="jn-dona-centro" aria-hidden>
          <b className="mono">{total}</b>
          <span>nodos</span>
        </div>
      </div>
      <div className="jn-dona-leyenda">
        {datos.map((d) => (
          <span key={d.nombre}><i style={{ background: d.color }} aria-hidden /><b>{d.valor}</b> {d.nombre}</span>
        ))}
        {vivos?.infra != null && (
          <span className="jn-dona-nota mono">{vivos.infra} infra · {vivos.equipos} equipos</span>
        )}
      </div>
      {demo && <span className="jn-demo-marca mono">demostración</span>}
    </div>
  );
}

/* ── 5. Actividad de conexiones ───────────────────────────────────────── */
export function GraficoActividad({ eventos = [], altura = 236, demo = false }) {
  const sin = sinAnimacion();
  const datos = useMemo(() => {
    if (!eventos.length) return [];
    const buckets = new Map();
    for (const e of eventos) {
      const d = new Date(e.t);
      d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
      const clave = d.getTime();
      const b = buckets.get(clave) || { t: clave, ok: 0, error: 0 };
      if (e.tipo === "error") b.error += 1; else b.ok += 1;
      buckets.set(clave, b);
    }
    return [...buckets.values()].sort((a, b) => a.t - b.t).slice(-8);
  }, [eventos]);

  if (!datos.length) {
    return <div className="jn-grafico-vacio"><b>Aún no hay actividad.</b><span>Enciende, gira o apaga la red y verás el registro por franjas de media hora.</span></div>;
  }

  return (
    <div className={`jn-grafico ${demo ? "con-demo" : ""}`} style={{ "--alto-grafico": `${altura}px` }}>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={datos} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barCategoryGap={18}>
          <CartesianGrid stroke="var(--linea)" strokeDasharray="2 7" vertical={false} />
          <XAxis
            dataKey="t" tickFormatter={horaCorta} tickLine={false}
            axisLine={{ stroke: "var(--linea-2)" }}
            tick={{ fill: "var(--texto-suave)", fontSize: 10, fontFamily: "var(--fuente-mono)" }}
          />
          <YAxis allowDecimals={false} tick={{ fill: "var(--texto-suave)", fontSize: 10 }} tickLine={false} axisLine={false} width={22} />
          <Tooltip content={<TipTema formato={(v) => `${v} acciones`} />} cursor={{ fill: "var(--linea)" }} />
          <Bar dataKey="ok" name="Acciones" stackId="a" fill={PALETA[0]} radius={[5, 5, 0, 0]} isAnimationActive={!sin} />
          <Bar dataKey="error" name="Errores" stackId="a" fill={PALETA[1]} radius={[5, 5, 0, 0]} isAnimationActive={!sin} />
        </BarChart>
      </ResponsiveContainer>
      {demo && <span className="jn-demo-marca mono">demostración</span>}
    </div>
  );
}

/* ── 6. Topología interactiva ─────────────────────────────────────────── */
export function Topologia({ circuito = [], saltos = [], activo = false, demo = false, altura = 250 }) {
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [angosto, setAngosto] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  const sin = sinAnimacion();
  const W = 900;
  const H = 300;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const cambia = () => setAngosto(mq.matches);
    cambia();
    mq.addEventListener?.("change", cambia);
    return () => mq.removeEventListener?.("change", cambia);
  }, []);

  /* La topología nunca inventa un circuito: si no hay ruta real y no se
     está en modo demostración, se dice y se espera a la sonda. */
  if (!demo && !circuito.length) {
    return (
      <div className="jn-topo-vacio">
        <b>Sin circuito activo</b>
        <span>Conecta la red para dibujar el recorrido real de tus saltos. No mostramos una ruta de ejemplo sin avisar.</span>
        <span className="chip muerto mono">EN ESPERA</span>
      </div>
    );
  }

  const nombres = circuito.length
    ? circuito
    : ["entrada-demo", "rele-centro-demo", "salida-demo"];
  const esDemo = demo;
  const xInicio = 178;
  const xFin = 724;
  const paso = (xFin - xInicio) / Math.max(1, nombres.length - 1);
  const nodos = nombres.map((nombre, i) => {
    const dato = saltos.find((s) => s.nombre === nombre);
    return {
      nombre,
      ms: Number.isFinite(dato?.ms) ? dato.ms : null,
      x: xInicio + paso * i,
      y: H / 2 + (nombres.length > 3 && i > 0 && i < nombres.length - 1 ? (i % 2 ? 16 : -16) : 0),
      rol: i === 0 ? "Entrada" : i === nombres.length - 1 ? "Salida" : "Intermedio",
    };
  });
  const puntos = [{ nombre: "Tú", x: 54, y: H / 2, rol: "Origen" }, ...nodos, { nombre: "Internet", x: 848, y: H / 2, rol: "Destino" }];
  const trayecto = puntos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const activoReal = activo && !esDemo;
  const seleccion = puntos.find((p) => p.nombre === (sel || hover));
  const pie = (
    <div className="jn-topo-pie">
      <span className={`chip ${activoReal ? "vivo" : "muerto"} mono`}>
        {esDemo ? "DEMOSTRACIÓN" : activoReal ? "RUTA ACTIVA" : "RUTA EN ESPERA"}
      </span>
      <span className="mono">{nombres.length} saltos · {activoReal ? "paquetes cifrados en tránsito" : "vista de la ruta"}</span>
      <button type="button" className="btn" onClick={() => setSel(null)} disabled={!sel}>Quitar selección</button>
    </div>
  );

  return (
    <div className={`jn-topo ${activoReal ? "on" : "off"} ${esDemo ? "demo" : ""} ${angosto ? "angosto" : ""}`} style={{ "--alto-topo": `${altura}px` }}>
      {angosto ? (
        <div className="jn-topo-movil">
          {puntos.map((p, i) => {
            const extremo = i === 0 || i === puntos.length - 1;
            const on = (sel || hover) === p.nombre;
            return (
              <div className="jn-topo-movil-par" key={`${p.nombre}-${i}`}>
                {i > 0 && <span className="jn-topo-movil-linea" aria-hidden><i /></span>}
                <button
                  type="button"
                  className={`jn-topo-movil-nodo ${extremo ? "extremo" : ""} ${on ? "sel" : ""}`}
                  aria-pressed={sel === p.nombre}
                  onClick={() => setSel(sel === p.nombre ? null : p.nombre)}
                >
                  <span className="jn-topo-movil-punto mono">
                    {extremo ? (i === 0 ? "TÚ" : "NET") : p.ms != null ? p.ms : "—"}
                  </span>
                  <span className="jn-topo-movil-txt">
                    <b>{p.nombre}</b>
                    <small>{p.rol}{p.ms != null && !extremo ? ` · ${p.ms} ms` : ""}</small>
                  </span>
                  <span className="jn-topo-movil-flecha" aria-hidden>›</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="jn-topo-lienzo">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Topología ${nombres.length} saltos: Tú, ${nombres.join(", ")}, Internet`}>
          <defs>
            <linearGradient id="jn-topo-linea" x1="0" x2="1">
              <stop offset="0%" stopColor="var(--grafico-1)" />
              <stop offset="55%" stopColor="var(--grafico-3, var(--grafico-1))" />
              <stop offset="100%" stopColor="var(--grafico-2)" />
            </linearGradient>
            <radialGradient id="jn-topo-halo">
              <stop offset="0%" stopColor="var(--grafico-1)" stopOpacity=".22" />
              <stop offset="100%" stopColor="var(--grafico-1)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx={W / 2} cy={H / 2} rx="390" ry="112" fill="url(#jn-topo-halo)" />
          <path d={trayecto} className="jn-topo-pista" />
          <path d={trayecto} className="jn-topo-flujo" />

          {!sin && [0, 1, 2].map((k) => (
            <circle key={k} r="3.2" className="jn-topo-paquete">
              <animateMotion dur={`${3.6 + k * .8}s`} begin={`${k * 1.2}s`} repeatCount="indefinite" path={trayecto} />
            </circle>
          ))}

          {puntos.map((p, i) => {
            const esExtremo = i === 0 || i === puntos.length - 1;
            const activoNodo = (sel || hover) === p.nombre;
            return (
              <g
                key={`${p.nombre}-${i}`}
                className={`jn-topo-nodo ${esExtremo ? "extremo" : ""} ${activoNodo ? "sel" : ""} ${p.nombre === "Internet" ? "internet" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`${p.rol}: ${p.nombre}${p.ms != null ? `, ${p.ms} milisegundos` : ", sin medida"}`}
                onMouseEnter={() => setHover(p.nombre)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(p.nombre)}
                onBlur={() => setHover(null)}
                onClick={() => setSel(sel === p.nombre ? null : p.nombre)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === p.nombre ? null : p.nombre); } }}
              >
                <circle cx={p.x} cy={p.y} r={esExtremo ? 36 : 28} className="jn-topo-halo" />
                <circle cx={p.x} cy={p.y} r={esExtremo ? 20 : 16} className="jn-topo-punto" />
                {esExtremo && <text x={p.x} y={p.y + 4.5} textAnchor="middle" className="jn-topo-extremo">{i === 0 ? "TÚ" : "NET"}</text>}
                <text x={p.x} y={p.y + (esExtremo ? 51 : 45)} textAnchor="middle" className="jn-topo-nombre mono">
                  {esExtremo ? p.nombre : (p.nombre.length > 16 ? `${p.nombre.slice(0, 15)}…` : p.nombre)}
                </text>
                <text x={p.x} y={p.y - (esExtremo ? 44 : 37)} textAnchor="middle" className="jn-topo-rol mono">
                  {p.rol}
                </text>
                {!esExtremo && (
                  <text x={p.x} y={p.y + 4} textAnchor="middle" className="jn-topo-ms mono">
                    {p.ms != null ? p.ms : "—"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hover && seleccion && (
          <div
            className="jn-topo-tip"
            style={{ left: `${(seleccion.x / W) * 100}%`, top: `${(seleccion.y / H) * 100}%` }}
          >
            <b>{seleccion.nombre}</b>
            <span>{seleccion.rol}{seleccion.ms != null ? ` · ${seleccion.ms} ms` : " · sin medida"}</span>
          </div>
        )}
      </div>
      )}

      {pie}

      {seleccion && (
        <div className="jn-topo-detalle">
          <span className="mono">{seleccion.rol}</span>
          <b className="mono">{seleccion.nombre}</b>
          <span>{seleccion.ms != null ? `${seleccion.ms} ms medidos por la sonda` : "sin latencia publicada para este nodo"}</span>
        </div>
      )}
    </div>
  );
}
