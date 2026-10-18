import { useEffect, useMemo, useState } from "react";
import { nodos } from "../lib/api.js";
import { Stat } from "./Piezas.jsx";

/* Nodos: la foto completa de la red — todos los saltos registrados, su estado
   por heartbeat, la latencia medida de verdad (TCP connect) y cuántas
   conexiones está reenviando cada uno ahora mismo. Vista en TARJETAS o TABLA,
   se refresca solo y refleja en vivo el papel de cada nodo en tu circuito. */
export default function Nodos({ yo, aviso, compacta = false, segundos = 8 }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [auto, setAuto] = useState(true);
  const [visto, setVisto] = useState(null);
  const [vista, setVista] = useState("tarjetas");   // tarjetas | tabla
  const [orden, setOrden] = useState("nombre");     // nombre | latencia | conexiones

  /* Privacidad de la vista: un usuario NORMAL solo ve los nodos DE SU CIRCUITO
     (dónde pega el tráfico). Moderadores y administradores ven la red completa.
     Si la red está apagada, un usuario normal no ve lujo: solo un aviso limpio. */
  const esGestion = yo?.rol === "admin" || yo?.rol === "moderador";
  const filtroCircuito = yo?.circuito || [];

  async function trae(silencioso = true) {
    try {
      const d = await nodos();
      setLista(d);
      setVisto(new Date());
    } catch (e) { if (!silencioso) aviso(e.message, "error"); }
    finally { setCargando(false); }
  }

  useEffect(() => { trae(); }, []);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => trae(), segundos * 1000);
    return () => clearInterval(id);
  }, [auto, segundos]);

  const circuito = yo?.circuito || [];
  const papel = (nombre) => {
    const i = circuito.indexOf(nombre);
    if (i < 0) return null;
    if (circuito.length === 1) return "exit";
    return i === 0 ? "entrada" : i === circuito.length - 1 ? "exit" : "relé ciego";
  };

  const ordenada = useMemo(() => {
    let copia = [...lista];
    if (!esGestion) {
      if (!filtroCircuito.length) return [];
      copia = copia.filter((n) => filtroCircuito.includes(n.nombre));
    }
    if (orden === "latencia") copia.sort((a, b) => (a.ms ?? 9999) - (b.ms ?? 9999));
    else if (orden === "conexiones") copia.sort((a, b) => (b.conexiones || 0) - (a.conexiones || 0));
    else copia.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    // los de tu circuito SIEMPRE delante
    return copia.sort((a, b) => Number(papel(b.nombre) != null) - Number(papel(a.nombre) != null));
  }, [lista, orden, circuito.join(), esGestion, filtroCircuito.join()]);

  const resumen = useMemo(() => {
    const vivos = lista.filter((n) => n.estado === "vivo");
    return {
      total: lista.length,
      vivos: vivos.length,
      conexiones: lista.reduce((s, n) => s + (n.conexiones || 0), 0),
      enCircuito: circuito.length,
      msMedio: vivos.length
        ? Math.round(vivos.reduce((s, n) => s + (n.ms || 0), 0) / vivos.filter((n) => n.ms != null).length || 0)
        : null,
    };
  }, [lista, circuito.length]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!compacta && (
        <div className="tira-stats">
          {esGestion ? (
            <Stat etq="nodos vivos" val={`${resumen.vivos} / ${resumen.total}`} pie="según heartbeat" tono={resumen.vivos === resumen.total ? "ok" : "aviso"} />
          ) : (
            <Stat etq="nodos de tu circuito" val={resumen.enCircuito} pie="dónde viaja tu tráfico" tono={yo?.activo ? "ok" : "off"} />
          )}
          <Stat etq="en tu circuito" val={`${resumen.enCircuito} / ${yo?.saltos_max || 3}`} pie={yo?.activo ? "tráfico activo" : "red apagada"} tono={yo?.activo ? "ok" : "off"} />
          <Stat etq="conexiones reenviando" val={resumen.conexiones} pie={esGestion ? "suma de todos los nodos" : "de tus nodos"} tono="info" />
          <Stat etq="latencia media" val={resumen.msMedio != null ? `${resumen.msMedio} ms` : "—"} pie="TCP connect real" tono="aviso" />
        </div>
      )}

      <div className="tarjeta">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>{esGestion ? "Todos los nodos" : "Tus nodos"}</h2>
          <span className="nota mono" style={{ fontSize: 11 }}>
            {visto ? `actualizado ${visto.toLocaleTimeString()}` : "cargando…"}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!compacta && (
              <select className="campo" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Orden de nodos">
                <option value="nombre">↕ nombre</option>
                <option value="latencia">↕ latencia</option>
                <option value="conexiones">↕ conexiones</option>
              </select>
            )}
            {!compacta && (
              <span style={{ display: "inline-flex", borderRadius: 10, border: "1px solid var(--borde)", overflow: "hidden" }}>
                <button className={`btn ${vista === "tarjetas" ? "primario" : ""}`} style={{ border: 0, borderRadius: 0, padding: "6px 12px" }}
                  onClick={() => setVista("tarjetas")} title="Vista de tarjetas">▦</button>
                <button className={`btn ${vista === "tabla" ? "primario" : ""}`} style={{ border: 0, borderRadius: 0, padding: "6px 12px" }}
                  onClick={() => setVista("tabla")} title="Vista de tabla">☰</button>
              </span>
            )}
            <button className="btn" onClick={() => setAuto((a) => !a)} title="Refresco automático cada 8 s">
              {auto ? "⏸ auto" : "▶ auto"}
            </button>
            <button className="btn" onClick={() => trae(false)} disabled={cargando} aria-label="Refrescar nodos">
              {cargando ? <span className="spin" /> : "⟳"}
            </button>
          </span>
        </div>

        {vista !== "tabla" || compacta ? (
          <TarjetasNodos lista={ordenada} yo={yo} papel={papel} />
        ) : (
          <TablaNodos lista={ordenada} papel={papel} cargando={cargando} />
        )}

        <p className="nota" style={{ marginTop: 12, fontSize: 12 }}>
          {esGestion
            ? "Ves TODA la red: latencia TCP connect real medida por el servidor, conexiones reenviando y estado por latido."
            : "Ves solo los nodos de tu circuito — dónde pega el tráfico tu cuenta. Los moderadores y el admin ven la red completa."}
        </p>
      </div>
    </div>
  );
}

/* ── color de salud por latencia: <40ms estupendo, <80 bien, más aviso ── */
function saludLat(m) {
  if (m == null) return { etiqueta: "sin medida", color: "var(--texto-suave)", ancho: 0 };
  if (m < 40) return { etiqueta: `${m} ms · rapidísimo`, color: "var(--acento-1)", ancho: Math.max(8, 100 - m) };
  if (m < 80) return { etiqueta: `${m} ms · bien`, color: "var(--acento-3)", ancho: Math.max(8, 100 - m) };
  return { etiqueta: `${m} ms · lento`, color: "#ffb454", ancho: Math.max(8, 100 - m) };
}

function TarjetasNodos({ lista, yo, papel }) {
  const activo = !!yo?.activo;
  const esGestion = yo?.rol === "admin" || yo?.rol === "moderador";
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {lista.map((n) => {
        const p = papel(n.nombre);
        const vivo = n.estado === "vivo";
        const sal = saludLat(n.ms);
        const hbd = n.ultimo_hb != null ? Math.min(100, Math.max(0, 100 - (n.ultimo_hb / 40) * 100)) : 0;
        return (
          <div key={n.nombre} className="tarjeta" style={{
            margin: 0, padding: "14px 16px",
            borderColor: p ? "rgb(from var(--acento-1) r g b / .55)" : undefined,
            boxShadow: p ? "0 0 24px rgb(from var(--acento-1) r g b / .12)" : undefined,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="punto" style={{
                width: 10, height: 10, borderRadius: "50%",
                background: vivo ? "var(--acento-1)" : "#e2524a",
                boxShadow: vivo ? "0 0 10px rgb(from var(--acento-1) r g b / .8)" : "none",
                animation: vivo && p ? "jn-pulso 1.6s ease-in-out infinite" : undefined,
              }} />
              <b className="mono" style={{ fontSize: 14.5 }}>{n.nombre}</b>
              {n.nombre?.startsWith("peer_") && <span className="chip acento" style={{ fontSize: 10 }}>personal</span>}
              {p && <span className={`chip ${p === "exit" ? "vivo" : "acento"}`}>{activo ? `${p} · tu circuito #${circuitoPos(yo, n.nombre) + 1}` : p}</span>}
              <span className={`chip mono ${vivo ? "vivo" : "muerto"}`} style={{ marginLeft: "auto", fontSize: 10.5 }}>{n.estado.toUpperCase()}</span>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }} className="mono">
                  <span className="nota">latencia TCP connect</span>
                  <span style={{ color: sal.color }}>{sal.etiqueta}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgb(255 255 255 / .07)", overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${vivo ? sal.ancho : 0}%`, borderRadius: 99, background: sal.color, transition: "width .5s ease" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }} className="mono">
                  <span className="nota">último latido</span>
                  <span className="nota">{n.ultimo_hb != null ? `hace ${n.ultimo_hb} s` : "—"}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgb(255 255 255 / .07)", overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${hbd}%`, borderRadius: 99, background: "var(--acento-2)", transition: "width .5s ease" }} />
                </div>
              </div>
              <div className="mono nota" style={{ fontSize: 11.5, display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span>⛓ {n.conexiones ?? 0} conexiones</span>
                <span>↔ {n.direccion}</span>
              </div>
            </div>
          </div>
        );
      })}
      {!lista.length && (
        <div className="tarjeta nota" style={{ margin: 0 }}>
          {!esGestion && !yo?.activo
            ? "activa la red para ver los nodos de tu circuito"
            : !lista.length ? "no hay nodos registrados todavía" : ""}
        </div>
      )}
    </div>
  );
}

function circuitoPos(yo, nombre) {
  return (yo?.circuito || []).indexOf(nombre);
}

function TablaNodos({ lista, papel, cargando }) {
  return (
    <div className="envuelve-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th>nodo</th>
            <th>papel</th>
            <th>estado</th>
            <th className="der">latencia</th>
            <th className="der">conexiones</th>
            <th className="der">último latido</th>
            <th>dirección interna</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((n) => {
            const p = papel(n.nombre);
            const vivo = n.estado === "vivo";
            return (
              <tr key={n.nombre} className={p ? "en-circuito" : ""}>
                <td><b>{n.nombre}</b>{n.nombre?.startsWith("peer_") && <span className="chip acento" style={{ marginLeft: 6, fontSize: 10 }}>personal</span>}</td>
                <td>{p ? <span className={`chip ${p === "exit" ? "vivo" : "acento"}`}>{p}</span> : <span className="nota">—</span>}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: vivo ? "var(--acento-1)" : "#ff9088" }}>
                    <span className="punto" style={{ background: vivo ? "var(--acento-1)" : "#e2524a", boxShadow: vivo ? "0 0 8px rgb(from var(--acento-1) r g b / .8)" : "none" }} />
                    {n.estado}
                  </span>
                </td>
                <td className="der">{n.ms != null ? `${n.ms} ms` : "—"}</td>
                <td className="der">{n.conexiones ?? 0}</td>
                <td className="der nota" style={{ textAlign: "right" }}>{n.ultimo_hb != null ? `hace ${n.ultimo_hb}s` : "—"}</td>
                <td className="nota">{n.direccion}</td>
              </tr>
            );
          })}
          {!lista.length && !cargando && (
            <tr><td colSpan={7} className="nota">no hay nodos registrados todavía</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
