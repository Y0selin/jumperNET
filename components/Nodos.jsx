import { useEffect, useMemo, useState } from "react";
import { nodos } from "../lib/api.js";
import { Stat } from "./Piezas.jsx";

/* Nodos: la foto completa de la red — todos los saltos registrados, su estado
   por heartbeat, la latencia medida de verdad (TCP connect) y cuántas
   conexiones está reenviando cada uno ahora mismo. Se refresca solo. */
export default function Nodos({ yo, aviso, compacta = false, segundos = 8 }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [auto, setAuto] = useState(true);
  const [visto, setVisto] = useState(null);

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
          <Stat etq="nodos vivos" val={`${resumen.vivos} / ${resumen.total}`} pie="según heartbeat" tono={resumen.vivos === resumen.total ? "ok" : "aviso"} />
          <Stat etq="en tu circuito" val={`${resumen.enCircuito} / 3`} pie={yo?.activo ? "tráfico activo" : "red apagada"} tono={yo?.activo ? "ok" : "off"} />
          <Stat etq="conexiones reenviando" val={resumen.conexiones} pie="suma de todos los nodos" tono="info" />
          <Stat etq="latencia media" val={resumen.msMedio != null ? `${resumen.msMedio} ms` : "—"} pie="TCP connect real" tono="aviso" />
        </div>
      )}

      <div className="tarjeta">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>Todos los nodos</h2>
          <span className="nota mono" style={{ fontSize: 11 }}>
            {visto ? `actualizado ${visto.toLocaleTimeString()}` : "cargando…"}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" onClick={() => setAuto((a) => !a)} title="Refresco automático cada 8 s">
              {auto ? "⏸ auto" : "▶ auto"}
            </button>
            <button className="btn" onClick={() => trae(false)} disabled={cargando} aria-label="Refrescar nodos">
              {cargando ? <span className="spin" /> : "⟳"}
            </button>
          </span>
        </div>

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

        <p className="nota" style={{ marginTop: 12, fontSize: 12 }}>
          La latencia es un <b>TCP connect real</b> desde la API al puerto interno de cada nodo (medida por el servidor, no estimada).
          «Conexiones» son los circuitos que cada nodo está reenviando en este instante según su último latido.
        </p>
      </div>
    </div>
  );
}
