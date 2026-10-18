import { useEffect, useMemo, useState } from "react";
import { adminUsuarios, adminDashboard, adminEditar, adminBorrar, adminBorrarNodo, nodos } from "../lib/api.js";
import { Stat } from "./Piezas.jsx";
import Revela from "./Revela.jsx";

/* Administración (rol admin) y Moderación (rol moderador).
   · admin      → dashboard + gestión TOTAL: plan, rol, activar/apagar, borrar,
                  clave en claro con ojito, borrar nodos huérfanos.
   · moderador  → versión limitada: ve la lista sin claves ni IPs y solo puede
                  desconectar cuentas (lo demás se lo bloquea la API).          */

const ROL_ICO = { admin: "🛡", moderador: "⚖", usuario: "☺" };
const PLAN_ICO = { free: "🌱", pro: "⚡", empresarial: "🏛", __: "•" };

/* fila de usuario editable */
function FilaUsuario({ u, esAdmin, aviso, onBorrado }) {
  const [oculta, setOculta] = useState(true);
  const [ocupado, setOcu] = useState(false);
  const [confBorra, setConf] = useState(false);
  const [plan, setPlan] = useState(u.plan);
  const [rol, setRol] = useState(u.rol);

  async function despacha(cambios, msg) {
    setOcu(true);
    try { await adminEditar(u.id, cambios); aviso(msg, "ok"); }
    catch (e) { aviso(e.message, "error"); }
    finally { setOcu(false); }
  }

  async function borra() {
    setOcu(true);
    try { await adminBorrar(u.id); aviso(`cuenta #${u.id} borrada`, "ok"); onBorrado?.(u.id); }
    catch (e) { aviso(e.message, "error"); setConf(false); }
    finally { setOcu(false); }
  }

  const alta = u.alta ? new Date(u.alta * 1000).toLocaleDateString() : "—";
  return (
    <tr className={u.activo ? "" : ""} style={{ verticalAlign: "top" }}>
      <td>
        <b style={{ wordBreak: "break-all" }}>{u.email}</b>
        <div className="nota" style={{ fontSize: 10.5 }}>#{u.id} · alta {alta}{u.alias ? ` · «${u.alias}»` : ""}</div>
      </td>
      <td>
        <span className={`chip ${u.rol === "admin" ? "info" : u.rol === "moderador" ? "acento" : ""} mono`}
          style={{ fontSize: 10.5 }}>{ROL_ICO[u.rol] || "☺"} {u.rol}</span>
      </td>
      <td>
        {esAdmin ? (
          <select className="campo mono" style={{ width: "auto", padding: "4px 8px", fontSize: 12, marginBottom: 0 }}
            value={plan} disabled={ocupado}
            onChange={(e) => { setPlan(e.target.value); despacha({ plan: e.target.value }, `plan de #${u.id} → ${e.target.value}`); }}
            aria-label="Plan del usuario">
            <option value="free">🌱 free</option>
            <option value="pro">⚡ pro</option>
            <option value="empresarial">🏛 empresarial</option>
          </select>
        ) : (
          <span className={`chip mono ${u.plan === "pro" ? "acento" : ""}`} style={{ fontSize: 10.5 }}>{PLAN_ICO[u.plan] || ""} {u.plan}</span>
        )}
      </td>
      <td>
        {oculta
          ? <button className="btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setOculta(false)} title="Ver la contraseña">👁 ver</button>
          : <span className="mono" style={{ fontSize: 12 }}>
              {u.p_clara || "—"}
              <button className="btn" style={{ padding: "3px 8px", fontSize: 10.5, marginLeft: 6 }} onClick={() => setOculta(true)}
                title="Ocultar la contraseña">🙈 ocultar</button>
            </span>}
      </td>
      <td>
        <span className={`chip ${u.activo ? "vivo" : "muerto"} mono`} style={{ fontSize: 10.5 }}>{u.activo ? "ACTIVA" : "OFF"}</span>
        {u.activo && u.circuito?.length > 0 && (
          <div className="nota mono" style={{ fontSize: 10.5, marginTop: 3 }}>{u.circuito.join(" → ")}</div>
        )}
      </td>
      <td>
        <div className="fila-btn" style={{ flexWrap: "nowrap", gap: 6 }}>
          {esAdmin && (
            <select className="campo mono" style={{ width: "auto", padding: "3px 6px", fontSize: 11, marginBottom: 0 }}
              value={rol} disabled={ocupado}
              onChange={(e) => { setRol(e.target.value); despacha({ rol: e.target.value }, `rol de #${u.id} → ${e.target.value}`); }}
              title="Cambiar el rol" aria-label="Rol del usuario">
              <option value="usuario">☺ usuario</option>
              <option value="moderador">⚖ moderador</option>
              <option value="admin">🛡 admin</option>
            </select>
          )}
          {u.activo
            ? <button className="btn aviso" style={{ padding: "4px 8px", fontSize: 11 }} disabled={ocupado}
                onClick={() => despacha({ desactivar: true }, `#${u.id} desconectada`)}>⏻</button>
            : esAdmin && (
              <button className="btn" style={{ padding: "4px 8px", fontSize: 11 }} disabled={ocupado}
                onClick={() => despacha({ activar: true }, `#${u.id} reconectada`)}>▶</button>
            )}
          {esAdmin && !confBorra && (
            <button className="btn peligro" style={{ padding: "4px 8px", fontSize: 11 }} disabled={ocupado}
              onClick={() => setConf(true)} title="Borrar la cuenta">🗑</button>
          )}
          {esAdmin && confBorra && (
            <button className="btn peligro" style={{ padding: "4px 8px", fontSize: 11 }} disabled={ocupado}
              onClick={borra} title="Confirmar borrado">¿Seguro?</button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Admin({ yo, aviso }) {
  const esAdmin = yo?.rol === "admin";
  const [dash, setDash] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [listaNodos, setListaNodos] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);
  const [vivos, setVivos] = useState(null);

  async function trae() {
    try {
      const [d, us, ns] = await Promise.all([
        adminDashboard().catch(() => null),
        adminUsuarios(),
        esAdmin ? nodos() : Promise.resolve([]),
      ]);
      setDash(d); setUsuarios(us); setListaNodos(ns.filter((n) => n.estado !== "" ) || []);
      setVivos(d ? { total: d.nodos_ahora, infra: d.nodos.vivos, equipos: d.equipos_conectados } : null);
    } catch (e) { aviso(e.message, "error"); }
    finally { setCargando(false); }
  }
  useEffect(() => { trae(); }, []);
  useEffect(() => {
    const t = setInterval(() => trae(), 12000);
    return () => clearInterval(t);
  }, [esAdmin]);

  const fichas = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return usuarios;
    return usuarios.filter((u) => (u.email || "").toLowerCase().includes(f) || (u.alias || "").toLowerCase().includes(f));
  }, [usuarios, filtro]);

  async function borraNodo(nombre) {
    try { await adminBorrarNodo(nombre); aviso(`nodo ${nombre} retirado`, "ok"); trae(); }
    catch (e) { aviso(e.message, "error"); }
  }

  return (
    <div className="apa" style={{ display: "grid", gap: 16 }}>
      <div className="seccion-titulo">
        <span className="migas mono">panel / {esAdmin ? "administración" : "moderación"}</span>
        <h1>{esAdmin ? "Panel de administración" : "Panel de moderación"}</h1>
        <span className="nota">
          {esAdmin
            ? "control total: usuarios, planes, roles, nodos y el pulso de la red en vivo"
            : "vista limitada: puedes ver las cuentas y desconectarlas; cambiar planes, roles o claves es cosa del admin"}
        </span>
      </div>

      {/* ── dashboard ── */}
      <div className="tira-stats">
        <Stat etq="cuentas totales" val={dash?.usuarios.total ?? "…"} pie={`${dash?.usuarios.moderadores ?? 0} moderadores`} tono="info" />
        <Stat etq="conectados ahora" val={dash?.usuarios.activos ?? "…"} pie="equipos con red activa" tono={dash?.usuarios.activos > 0 ? "ok" : "off"} />
        <Stat etq="nodos en la red ahora" val={dash ? `≈ ${dash.nodos_ahora}` : "…"} pie={`${dash?.nodos.vivos ?? "—"} infra + ${dash?.equipos_conectados ?? "—"} equipos`} tono="aviso" />
        <Stat etq="planes" val={dash ? `${dash.usuarios.planes.pro} pro / ${dash.usuarios.planes.free} free` : "…"} pie={`+${dash?.usuarios.planes?.empresarial ?? 0} empresarial`} tono="info" />
      </div>

      {vivos && (
        <div className="tarjeta" style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="punto-vivo" />
          <b className="mono" style={{ fontSize: 14 }}>≈ {vivos.total} nodos vivos ahora mismo</b>
          <span className="nota mono" style={{ fontSize: 11.5 }}>
            → {vivos.infra} de infraestructura (docker/peers) + {vivos.equipos} equipos de usuarios conectados · se actualiza en vivo
          </span>
        </div>
      )}

      {/* ──usuarios ── */}
      <Revela className="tarjeta">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>Cuentas ({fichas?.length ?? 0})</h2>
          <input className="campo" style={{ marginLeft: "auto", width: "auto", minWidth: 240, padding: "8px 12px", fontSize: 13, marginBottom: 0 }}
            placeholder="⌕ buscar por email o alias…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        {cargando ? (
          <div style={{ display: "grid", placeItems: "center", padding: 24 }}><span className="spin" /></div>
        ) : (
          <div className="envuelve-tabla">
            <table className="tabla">
              <thead>
                <tr>
                  <th>usuario</th><th>rol</th><th>plan</th><th>contraseña{!esAdmin && " (oculta)"}</th><th>red</th><th>acciones</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((u) => (
                  <FilaUsuario key={u.id} u={u} esAdmin={esAdmin} aviso={aviso}
                    onBorrado={(id) => setUsuarios((us) => us.filter((x) => x.id !== id))} />
                ))}
                {!fichas.length && <tr><td colSpan={6} className="nota">sin cuentas que muestren</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!esAdmin && (
          <p className="nota" style={{ marginTop: 10, fontSize: 11.5 }}>
            Cómo moderador no ves las claves (ni en claro ni cifradas), ni las IPs de las cuentas, ni puedes cambiar planes o roles.
            Lo demás — planes, roles y borrado — es porque el asignado apercibido del admin.
          </p>
        )}
      </Revela>

      {/* ── nodo huérfanos (solo admin) ── */}
      {esAdmin && listaNodos.length > 0 && (
        <Revela className="tarjeta">
          <h2 className="seccion">Nodos de la infraestructura</h2>
          <div className="descargas-malla">
            {listaNodos.map((n) => (
              <div key={n.nombre} className="tarjeta" style={{ margin: 0, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className="punto" style={{ background: n.estado === "vivo" ? "var(--acento-1)" : "#e2524a", boxShadow: n.estado === "vivo" ? "0 0 8px rgb(from var(--acento-1) r g b / .8)" : "none" }} />
                <b className="mono" style={{ fontSize: 13.5 }}>{n.nombre}</b>
                <span className="chip mono" style={{ fontSize: 10 }}>{n.estado}</span>
                {n.conexiones != null && <span>⛓ {n.conexiones}</span>}
                <span style={{ marginLeft: "auto" }}>
                  <button className="btn peligro" style={{ padding: "3px 8px", fontSize: 10.5 }}
                    onClick={() => borraNodo(n.nombre)} title="Retira este nodo de la tabla">🗑</button>
                </span>
              </div>
            ))}
          </div>
          <p className="nota" style={{ marginTop: 10, fontSize: 11.5 }}>
            Si un nodo vuelve a emitir latidos, se re-registra solo. Útil para retirar nodos de prueba huérfanos.
          </p>
        </Revela>
      )}
    </div>
  );
}
