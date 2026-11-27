import { useEffect, useMemo, useState } from "react";
import {
  adminUsuarios, adminDashboard, adminEditar, adminBorrar, adminBorrarNodo, nodos,
} from "../lib/api.js";
import Revela from "./Revela.jsx";

/* Zona de administración y moderación.
 *
 * · admin      → sala de mando completa: resumen de la red, todas las cuentas
 *                (plan, rol, clave en claro, IP de salida), nodos de la
 *                infraestructura y estadísticas agregadas. Puede cambiarlo todo
 *                salvo lo que decide el backend.
 * · moderador  → misma sala, sin claves ni borrados ni cambios de plan/rol;
 *                solo consulta y desconexión de cuentas. La API es la que manda:
 *                la interfaz no esconde nada que el servidor vaya a permitir.
 *
 * Todo lo que se ve sale de /admin/dashboard, /admin/usuarios y /nodos. Nada
 * de métricas inventadas: cuando un dato no existe, se dice.
 */

const ROL_ICO = { admin: "🛡", moderador: "⚖", usuario: "☺" };
const PLAN_ICO = { free: "🌱", pro: "⚡", empresarial: "🏛" };
const COLOR_PLAN = {
  free: "var(--acento-2)",
  pro: "var(--acento-1)",
  empresarial: "var(--acento-3)",
};

const TABS = [
  { id: "resumen", txt: "Resumen", ico: "◎" },
  { id: "usuarios", txt: "Usuarios", ico: "☺" },
  { id: "nodos", txt: "Nodos", ico: "◈" },
  { id: "datos", txt: "Estadísticas", ico: "▤" },
];

const CLAVE_REGISTRO = "jumpernet-admin-registro-v1";

/* Registro local de lo que ha hecho este administrador en este navegador.
   No se envía al servidor y no guarda contraseñas. */
function leeRegistro() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_REGISTRO) || "[]");
    return Array.isArray(d) ? d.slice(0, 20) : [];
  } catch { return []; }
}
function guardaRegistro(lista) {
  try { localStorage.setItem(CLAVE_REGISTRO, JSON.stringify(lista.slice(0, 20))); } catch { /* modo privado */ }
}

function fecha(t) {
  if (!t) return "—";
  return new Date(t * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fechaHora(t) {
  if (!t) return "—";
  return new Date(t * 1000).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function hora(t) {
  return new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function hace(t) {
  if (!t) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/* ── barras horizontales reutilizables ─────────────────────────────────── */
function Barras({ datos, sufijo = "" }) {
  const max = Math.max(1, ...datos.map((d) => d.valor || 0));
  return (
    <div className="jn-adm-barras">
      {datos.map((d) => (
        <div className="jn-adm-barra" key={d.clave}>
          <span className="jn-adm-barra-etq">{d.clave}</span>
          <i><b style={{ width: `${((d.valor || 0) / max) * 100}%`, background: d.color }} /></i>
          <span className="mono">{d.valor}{sufijo}</span>
        </div>
      ))}
    </div>
  );
}

/* ── fila editable de la tabla de cuentas ──────────────────────────────── */
function FilaUsuario({ u, esAdmin, aviso, onBorrado, onCambio, anota }) {
  const [oculta, setOculta] = useState(true);
  const [ocupado, setOcu] = useState(false);
  const [confBorra, setConf] = useState(false);
  const [plan, setPlan] = useState(u.plan || "free");
  const [saltosPlan, setSaltosPlan] = useState(u.saltos_plan || 7);
  const [rol, setRol] = useState(u.rol || "usuario");

  async function despacha(cambios, msg) {
    setOcu(true);
    try {
      await adminEditar(u.id, cambios);
      onCambio?.(u.id, cambios);
      anota?.(msg);
      aviso(msg, "ok");
    } catch (e) { aviso(e.message, "error"); }
    finally { setOcu(false); }
  }

  async function borra() {
    setOcu(true);
    try {
      await adminBorrar(u.id);
      anota?.(`cuenta #${u.id} borrada (${u.email})`);
      aviso(`cuenta #${u.id} borrada`, "ok");
      onBorrado?.(u.id);
    } catch (e) { aviso(e.message, "error"); setConf(false); }
    finally { setOcu(false); }
  }

  const abierta = !!u.activo;

  return (
    <tr className="jn-adm-fila">
      <td>
        <div className="jn-adm-cuenta">
          <span className="jn-adm-avatar" aria-hidden>{(u.alias || u.email || "?").trim().charAt(0).toUpperCase()}</span>
          <span>
            <b>{u.alias || (u.email || "").split("@")[0] || "sin nombre"}</b>
            <small className="mono">{u.email}</small>
            <small className="mono">#{u.id} · alta {fecha(u.alta)}</small>
          </span>
        </div>
      </td>

      <td>
        <span className={`chip mono ${u.rol === "admin" ? "info" : u.rol === "moderador" ? "acento" : ""}`}>
          {ROL_ICO[u.rol] || "☺"} {u.rol || "usuario"}
        </span>
      </td>

      <td>
        {esAdmin ? (
          <div className="jn-adm-controles">
            <select className="campo mono" value={plan} disabled={ocupado} aria-label={`Plan de ${u.email}`}
              onChange={(e) => {
                const nuevo = e.target.value;
                setPlan(nuevo);
                despacha(
                  { plan: nuevo, saltos_plan: nuevo === "pro" ? saltosPlan : undefined },
                  `plan de #${u.id} → ${nuevo}`,
                );
              }}>
              {Object.keys(PLAN_ICO).map((p) => <option key={p} value={p}>{PLAN_ICO[p]} {p}</option>)}
            </select>
            {plan === "pro" && (
              <select className="campo mono" value={saltosPlan} disabled={ocupado} aria-label={`Saltos de ${u.email}`}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSaltosPlan(n);
                  despacha({ saltos_plan: n }, `#${u.id} → ${n} saltos`);
                }}>
                {[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} saltos · {n + 2} €/mes</option>)}
              </select>
            )}
          </div>
        ) : (
          <span className={`chip mono ${u.plan === "pro" ? "acento" : ""}`}>
            {PLAN_ICO[u.plan] || ""} {u.plan || "free"}{u.plan === "pro" && u.saltos_plan ? ` · ${u.saltos_plan} saltos` : ""}
          </span>
        )}
      </td>

      {esAdmin && (
        <td>
          {oculta ? (
            <button className="btn" type="button" onClick={() => setOculta(false)} title="Ver la contraseña guardada">👁 ver</button>
          ) : (
            <span className="jn-adm-clave">
              <code className="mono">{u.p_clara || "no disponible"}</code>
              <button className="btn" type="button" onClick={() => setOculta(true)} title="Ocultar">🙈</button>
            </span>
          )}
        </td>
      )}

      <td>
        <div className="jn-adm-red">
          <span className={`chip ${abierta ? "vivo" : "muerto"} mono`}>{abierta ? "● RED ACTIVA" : "○ OFF"}</span>
          {abierta && u.circuito?.length > 0 && (
            <small className="mono">{u.circuito.join(" → ")}</small>
          )}
          {abierta && u.ip_salida && <small className="mono">salida {u.ip_salida}</small>}
          {!abierta && <small className="mono nota">sin circuito</small>}
        </div>
      </td>

      <td>
        <div className="jn-adm-acciones">
          {esAdmin && (
            <select className="campo mono" value={rol} disabled={ocupado} aria-label={`Rol de ${u.email}`}
              title="Cambiar el rol"
              onChange={(e) => {
                const nuevo = e.target.value;
                setRol(nuevo);
                despacha({ rol: nuevo }, `rol de #${u.id} → ${nuevo}`);
              }}>
              <option value="usuario">☺ usuario</option>
              <option value="moderador">⚖ moderador</option>
              <option value="admin">🛡 admin</option>
            </select>
          )}
          {abierta ? (
            <button className="btn" type="button" disabled={ocupado}
              onClick={() => despacha({ desactivar: true }, `#${u.id} desconectada`)} title="Desconectar su red">
              ⏻
            </button>
          ) : esAdmin && (
            <button className="btn" type="button" disabled={ocupado}
              onClick={() => despacha({ activar: true }, `#${u.id} reconectada`)} title="Reactivar la cuenta">
              ▶
            </button>
          )}
          {esAdmin && !confBorra && (
            <button className="btn peligro" type="button" disabled={ocupado} onClick={() => setConf(true)} title="Borrar la cuenta">🗑</button>
          )}
          {esAdmin && confBorra && (
            <>
              <button className="btn peligro" type="button" disabled={ocupado} onClick={borra}>¿Seguro?</button>
              <button className="btn" type="button" disabled={ocupado} onClick={() => setConf(false)}>No</button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Admin({ yo, aviso }) {
  const esAdmin = yo?.rol === "admin";
  const [tab, setTab] = useState("resumen");
  const [dash, setDash] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [listaNodos, setListaNodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ultima, setUltima] = useState(null);
  const [registro, setRegistro] = useState(leeRegistro);

  const [busca, setBusca] = useState("");
  const [fRol, setFRol] = useState("todos");
  const [fPlan, setFPlan] = useState("todos");
  const [fRed, setFRed] = useState("todos");
  const [orden, setOrden] = useState("alta");

  function anota(texto, tipo = "ok") {
    const lista = [{ t: Date.now(), texto, tipo }, ...leeRegistro()].slice(0, 20);
    guardaRegistro(lista);
    setRegistro(lista);
  }

  async function trae(conAviso = false) {
    try {
      const [d, us, ns] = await Promise.all([
        adminDashboard().catch(() => null),
        adminUsuarios(),
        esAdmin ? nodos().catch(() => []) : Promise.resolve([]),
      ]);
      setDash(d);
      setUsuarios(Array.isArray(us) ? us : []);
      setListaNodos((Array.isArray(ns) ? ns : []).filter((n) => n?.estado));
      setUltima(Date.now());
      setError("");
      return true;
    } catch (e) {
      setError(e.message || "no se pudo cargar la administración");
      if (conAviso) aviso(e.message || "no se pudo cargar", "error");
      return false;
    } finally { setCargando(false); }
  }

  useEffect(() => {
    let vivo = true;
    const pide = () => { if (vivo) trae(); };
    pide();
    const t = setInterval(pide, 12000);
    return () => { vivo = false; clearInterval(t); };
  }, [esAdmin]);

  /* ── métricas derivadas de la lista real de cuentas ── */
  const m = useMemo(() => {
    const plan = { free: 0, pro: 0, empresarial: 0 };
    const rol = { usuario: 0, moderador: 0, admin: 0 };
    let activos = 0, redAbierta = 0, saltosTotal = 0, hoy = 0, semana = 0, mes = 0;
    const ahora = Date.now();
    usuarios.forEach((u) => {
      const p = u.plan || "free";
      plan[p] = (plan[p] || 0) + 1;
      const r = u.rol || "usuario";
      rol[r] = (rol[r] || 0) + 1;
      if (u.activo) activos++;
      const c = Array.isArray(u.circuito) ? u.circuito.length : 0;
      if (u.activo && c > 0) { redAbierta++; saltosTotal += c; }
      const t = (u.alta || 0) * 1000;
      if (t) {
        const dias = (ahora - t) / 86400000;
        if (dias < 1) hoy++;
        if (dias < 7) semana++;
        if (dias < 30) mes++;
      }
    });
    return {
      total: usuarios.length,
      plan, rol, activos, redAbierta,
      saltosMedio: redAbierta ? Math.round((saltosTotal / redAbierta) * 10) / 10 : null,
      hoy, semana, mes,
    };
  }, [usuarios]);

  const semanas = useMemo(() => {
    const ahora = Date.now();
    const salida = [];
    for (let i = 7; i >= 0; i--) {
      const ini = ahora - (i + 1) * 7 * 86400000;
      const fin = ahora - i * 7 * 86400000;
      const n = usuarios.filter((u) => {
        const t = (u.alta || 0) * 1000;
        return t > ini && t <= fin;
      }).length;
      salida.push({
        etq: new Date(ini).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
        n,
      });
    }
    return salida;
  }, [usuarios]);
  const picoSemana = Math.max(1, ...semanas.map((s) => s.n));

  const recientes = useMemo(() => usuarios
    .map((u) => {
      const alta = (u.alta || 0) * 1000;
      const cambio = (u.ultimo_cambio || 0) * 1000;
      return { id: u.id, email: u.email, alias: u.alias, alta, cambio, activo: u.activo, plan: u.plan };
    })
    .filter((u) => u.alta)
    .sort((a, b) => Math.max(b.alta, b.cambio) - Math.max(a.alta, a.cambio))
    .slice(0, 6), [usuarios]);

  /* ── filtros de la tabla ── */
  const fichas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = usuarios.filter((u) => {
      if (q && !(`${u.email || ""} ${u.alias || ""} ${u.id}`).toLowerCase().includes(q)) return false;
      if (fRol !== "todos" && (u.rol || "usuario") !== fRol) return false;
      if (fPlan !== "todos" && (u.plan || "free") !== fPlan) return false;
      if (fRed === "activas" && !u.activo) return false;
      if (fRed === "off" && u.activo) return false;
      if (fRed === "circuito" && !(u.activo && u.circuito?.length)) return false;
      return true;
    });
    const ordena = {
      alta: (a, b) => (b.alta || 0) - (a.alta || 0),
      id: (a, b) => (a.id || 0) - (b.id || 0),
      email: (a, b) => String(a.email).localeCompare(String(b.email)),
      plan: (a, b) => String(a.plan).localeCompare(String(b.plan)) || (b.alta || 0) - (a.alta || 0),
    };
    return lista.sort(ordena[orden] || ordena.alta);
  }, [usuarios, busca, fRol, fPlan, fRed, orden]);

  function cambiaUsuario(id, cambios) {
    setUsuarios((us) => us.map((u) => (u.id === id ? { ...u, ...cambios, saltos_plan: cambios.saltos_plan ?? u.saltos_plan } : u)));
  }

  function exporta() {
    const cab = ["id", "email", "alias", "rol", "plan", "saltos_plan", "activo", "alta", "saltos_circuito", "ip_salida"];
    const filas = fichas.map((u) => [
      u.id, u.email, u.alias || "", u.rol || "usuario", u.plan || "free", u.saltos_plan ?? "",
      u.activo ? "si" : "no",
      u.alta ? new Date(u.alta * 1000).toISOString() : "",
      u.circuito?.length || 0, u.ip_salida || "",
    ]);
    const csv = [cab, ...filas]
      .map((f) => f.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jumpernet-cuentas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    anota(`exportadas ${filas.length} cuentas a CSV`);
    aviso(`${filas.length} cuentas exportadas ✓`, "ok");
  }

  async function borraNodo(nombre) {
    try {
      await adminBorrarNodo(nombre);
      anota(`nodo ${nombre} retirado de la tabla`);
      aviso(`nodo ${nombre} retirado`, "ok");
      trae();
    } catch (e) { aviso(e.message, "error"); }
  }

  const planes = [
    { clave: "free", valor: m.plan.free || 0, color: COLOR_PLAN.free },
    { clave: "pro", valor: m.plan.pro || 0, color: COLOR_PLAN.pro },
    { clave: "empresarial", valor: m.plan.empresarial || 0, color: COLOR_PLAN.empresarial },
  ];
  const totalPlanes = Math.max(1, m.total);

  return (
    <div className="jn-adm">
      <header className="jn-adm-cab">
        <div className="jn-adm-cab-txt">
          <span className="migas mono">panel / gestión / {esAdmin ? "administración" : "moderación"}</span>
          <h1>{esAdmin ? "Sala de mando" : "Moderación"}</h1>
          <p>
            {esAdmin
              ? "Todas las cuentas, la infraestructura y el pulso de la red en un solo sitio. Los cambios se aplican al instante en el servidor."
              : "Vista de consulta de las cuentas y la red. Puedes desconectar sesiones; los planes, roles y claves son cosa de administración."}
          </p>
        </div>
        <div className="jn-adm-cab-acciones">
          <span className={`chip ${error ? "muerto" : "vivo"} mono`} title={ultima ? `actualizado ${hora(ultima)}` : "cargando"}>
            {error ? "◌ SIN DATOS" : `● EN VIVO${ultima ? ` · ${hora(ultima)}` : ""}`}
          </span>
          <button className="btn" type="button" onClick={() => trae(true)} disabled={cargando} aria-label="Actualizar ahora">
            {cargando ? <span className="spin" /> : "⟳"} Actualizar
          </button>
          {esAdmin && (
            <button className="btn" type="button" onClick={exporta} disabled={!usuarios.length} title="Descargar las cuentas filtradas en CSV">
              ⬇ CSV
            </button>
          )}
        </div>
      </header>

      <div className="jn-adm-tabs" role="tablist" aria-label="Secciones de administración">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            <span aria-hidden>{t.ico}</span> {t.txt}
          </button>
        ))}
      </div>

      {error && (
        <div className="jn-adm-error" role="alert">
          <b>No se pudo leer la administración.</b>
          <span>{error}. Tu sesión sigue abierta: reintenta o revisa que el rol siga activo en el servidor.</span>
          <button className="btn" type="button" onClick={() => trae(true)}>Reintentar</button>
        </div>
      )}

      {/* ── RESUMEN ───────────────────────────────────────────────────── */}
      {tab === "resumen" && (
        <div className="jn-adm-panel" role="tabpanel">
          <div className="jn-adm-kpis">
            <div className="jn-adm-kpi" data-tono="info">
              <span className="mono">cuentas totales</span>
              <b className="mono">{m.total || "—"}</b>
              <small>{m.rol.admin} admin · {m.rol.moderador} mod · {m.rol.usuario} usuarios</small>
            </div>
            <div className="jn-adm-kpi" data-tono="ok">
              <span className="mono">conectados ahora</span>
              <b className="mono">{dash?.usuarios?.activos ?? m.activos ?? "—"}</b>
              <small>{m.redAbierta} con circuito abierto</small>
            </div>
            <div className="jn-adm-kpi" data-tono="aviso">
              <span className="mono">nodos vivos</span>
              <b className="mono">{dash?.nodos?.vivos ?? (listaNodos.length || "—")}</b>
              <small>{dash ? `${dash.nodos_ahora ?? "—"} en total · ${dash.equipos_conectados ?? 0} equipos` : `${listaNodos.length} registrados`}</small>
            </div>
            <div className="jn-adm-kpi" data-tono="acento">
              <span className="mono">altas esta semana</span>
              <b className="mono">{m.semana}</b>
              <small>{m.hoy} hoy · {m.mes} en 30 días</small>
            </div>
          </div>

          <div className="jn-adm-doble">
            <Revela className="tarjeta jn-adm-tarjeta">
              <div className="jn-adm-tarjeta-cab">
                <h2>Reparto de planes</h2>
                <span className="mono nota">{m.total} cuentas</span>
              </div>
              <div className="jn-adm-reparto">
                <div className="jn-adm-dona" aria-hidden style={{
                  background: `conic-gradient(${COLOR_PLAN.free} 0 ${(m.plan.free / totalPlanes) * 100}%, ${COLOR_PLAN.pro} ${(m.plan.free / totalPlanes) * 100}% ${((m.plan.free + m.plan.pro) / totalPlanes) * 100}%, ${COLOR_PLAN.empresarial} ${((m.plan.free + m.plan.pro) / totalPlanes) * 100}% 100%)`,
                }} />
                <div className="jn-adm-leyenda">
                  {planes.map((p) => (
                    <span key={p.clave}>
                      <i style={{ background: p.color }} aria-hidden />
                      <b>{PLAN_ICO[p.clave]} {p.clave}</b>
                      <span className="mono">{p.valor} · {Math.round((p.valor / totalPlanes) * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="jn-adm-nota">
                {m.saltosMedio != null
                  ? `Los circuitos abiertos usan ${m.saltosMedio} saltos de media.`
                  : "Ahora mismo no hay circuitos abiertos."}
              </div>
            </Revela>

            <Revela className="tarjeta jn-adm-tarjeta">
              <div className="jn-adm-tarjeta-cab">
                <h2>Altas por semana</h2>
                <span className="mono nota">últimas 8 semanas</span>
              </div>
              <div className="jn-adm-semanas" role="img" aria-label="Altas por semana en las últimas 8 semanas">
                {semanas.map((s) => (
                  <div className="jn-adm-semana" key={s.etq} title={`${s.etq}: ${s.n} alta${s.n === 1 ? "" : "s"}`}>
                    <i style={{ height: `${Math.max(3, (s.n / picoSemana) * 100)}%` }} />
                    <span className="mono">{s.etq}</span>
                  </div>
                ))}
              </div>
              <div className="jn-adm-nota">
                {semanas.reduce((a, s) => a + s.n, 0)} altas en dos meses. Las cuentas de prueba no se distinguen: el servidor no las marca.
              </div>
            </Revela>
          </div>

          <div className="jn-adm-doble">
            <Revela className="tarjeta jn-adm-tarjeta">
              <div className="jn-adm-tarjeta-cab">
                <h2>Últimas cuentas</h2>
                <button className="btn" type="button" onClick={() => setTab("usuarios")}>Ver todas →</button>
              </div>
              <div className="jn-adm-lista">
                {recientes.map((u) => (
                  <div className="jn-adm-lista-fila" key={u.id}>
                    <span className={`jn-adm-punto ${u.activo ? "on" : ""}`} aria-hidden />
                    <b>{u.alias || (u.email || "").split("@")[0]}</b>
                    <span className="nota mono">{u.email}</span>
                    <span className="chip mono">{PLAN_ICO[u.plan] || ""} {u.plan || "free"}</span>
                    <span className="mono nota" style={{ marginLeft: "auto" }}>
                      {u.cambio > u.alta ? `cambio ${fechaHora(u.cambio / 1000)}` : fecha(u.alta / 1000)}
                    </span>
                  </div>
                ))}
                {!recientes.length && <p className="nota">Todavía no hay cuentas registradas.</p>}
              </div>
            </Revela>

            <Revela className="tarjeta jn-adm-tarjeta">
              <div className="jn-adm-tarjeta-cab">
                <h2>Acciones de administración</h2>
                <button className="btn" type="button" onClick={() => {
                  guardaRegistro([]); setRegistro([]); aviso("registro local limpiado", "ok");
                }} disabled={!registro.length}>Limpiar</button>
              </div>
              <div className="jn-adm-lista jn-adm-registro">
                {registro.map((r, i) => (
                  <div className="jn-adm-lista-fila" key={`${r.t}-${i}`}>
                    <span className={`jn-adm-punto ${r.tipo === "error" ? "mal" : "on"}`} aria-hidden />
                    <b>{r.texto}</b>
                    <span className="mono nota" style={{ marginLeft: "auto" }}>{hace(r.t)}</span>
                  </div>
                ))}
                {!registro.length && <p className="nota">Sin acciones en este navegador. Este registro es local y no se envía al servidor.</p>}
              </div>
            </Revela>
          </div>
        </div>
      )}

      {/* ── USUARIOS ──────────────────────────────────────────────────── */}
      {tab === "usuarios" && (
        <div className="jn-adm-panel" role="tabpanel">
          <div className="jn-adm-filtros">
            <input className="campo" type="search" placeholder="⌕ buscar por email, alias o id…"
              value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cuentas" />
            <select className="campo mono" value={fRol} onChange={(e) => setFRol(e.target.value)} aria-label="Filtrar por rol">
              <option value="todos">todos los roles</option>
              <option value="usuario">☺ usuarios</option>
              <option value="moderador">⚖ moderadores</option>
              <option value="admin">🛡 admins</option>
            </select>
            <select className="campo mono" value={fPlan} onChange={(e) => setFPlan(e.target.value)} aria-label="Filtrar por plan">
              <option value="todos">todos los planes</option>
              <option value="free">🌱 free</option>
              <option value="pro">⚡ pro</option>
              <option value="empresarial">🏛 empresarial</option>
            </select>
            <select className="campo mono" value={fRed} onChange={(e) => setFRed(e.target.value)} aria-label="Filtrar por estado de red">
              <option value="todos">cualquier estado</option>
              <option value="activas">solo conectadas</option>
              <option value="circuito">con circuito abierto</option>
              <option value="off">desconectadas</option>
            </select>
            <select className="campo mono" value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar cuentas">
              <option value="alta">↕ más recientes</option>
              <option value="id">↕ id</option>
              <option value="email">↕ email</option>
              <option value="plan">↕ plan</option>
            </select>
          </div>

          <Revela className="tarjeta jn-adm-tarjeta">
            <div className="jn-adm-tarjeta-cab">
              <h2>Cuentas <span className="mono nota">{fichas.length} de {m.total}</span></h2>
              <span className="chip mono">{m.activos} con red activa</span>
            </div>
            {cargando && !usuarios.length ? (
              <div className="jn-adm-vacio"><span className="spin" /> cargando cuentas…</div>
            ) : (
              <div className="envuelve-tabla">
                <table className="jn-adm-tabla">
                  <thead>
                    <tr>
                      <th>usuario</th>
                      <th>rol</th>
                      <th>plan</th>
                      {esAdmin && <th>contraseña</th>}
                      <th>red</th>
                      <th>acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichas.map((u) => (
                      <FilaUsuario key={u.id} u={u} esAdmin={esAdmin} aviso={aviso} anota={anota}
                        onCambio={cambiaUsuario}
                        onBorrado={(id) => setUsuarios((us) => us.filter((x) => x.id !== id))} />
                    ))}
                    {!fichas.length && (
                      <tr><td colSpan={esAdmin ? 6 : 5} className="nota">ninguna cuenta coincide con los filtros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <p className="jn-adm-desliza mono" aria-hidden>desliza la tabla para ver el resto de columnas →</p>
            {!esAdmin && (
              <p className="jn-adm-nota">
                Cómo moderación no ves claves, IPs de salida, planes ni roles, y no puedes borrar cuentas.
                La API rechaza esas operaciones aunque se pidan a mano.
              </p>
            )}
            {esAdmin && (
              <p className="jn-adm-nota">
                Las claves en claro vienen de la API para administración. Cada cambio queda en tu registro local
                y, si el backend lo audita, en el suyo.
              </p>
            )}
          </Revela>
        </div>
      )}

      {/* ── NODOS ─────────────────────────────────────────────────────── */}
      {tab === "nodos" && (
        <div className="jn-adm-panel" role="tabpanel">
          <div className="jn-adm-kpis">
            <div className="jn-adm-kpi" data-tono="ok">
              <span className="mono">vivos</span>
              <b className="mono">{listaNodos.filter((n) => n.estado === "vivo").length}</b>
              <small>responden al latido</small>
            </div>
            <div className="jn-adm-kpi" data-tono="aviso">
              <span className="mono">conexiones reenviando</span>
              <b className="mono">{listaNodos.reduce((a, n) => a + (n.conexiones || 0), 0)}</b>
              <small>suma de toda la red</small>
            </div>
            <div className="jn-adm-kpi" data-tono="info">
              <span className="mono">equipos de usuarios</span>
              <b className="mono">{listaNodos.filter((n) => (n.tipo || "infra") === "usuario").length}</b>
              <small>{listaNodos.filter((n) => n.saltable).length} saltables</small>
            </div>
            <div className="jn-adm-kpi" data-tono="acento">
              <span className="mono">latencia media</span>
              <b className="mono">
                {(() => {
                  const ms = listaNodos.filter((n) => Number.isFinite(n.ms)).map((n) => n.ms);
                  return ms.length ? `${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms` : "—";
                })()}
              </b>
              <small>TCP connect real</small>
            </div>
          </div>

          <Revela className="tarjeta jn-adm-tarjeta">
            <div className="jn-adm-tarjeta-cab">
              <h2>Infraestructura y equipos</h2>
              <span className="mono nota">{listaNodos.length} nodos registrados</span>
            </div>
            {!esAdmin ? (
              <p className="nota">Solo administración puede consultar la infraestructura completa desde aquí.</p>
            ) : listaNodos.length ? (
              <div className="jn-adm-nodos">
                {listaNodos.map((n) => {
                  const vivo = n.estado === "vivo";
                  return (
                    <article className={`jn-adm-nodo ${vivo ? "vivo" : ""}`} key={n.nombre}>
                      <div className="jn-adm-nodo-cab">
                        <span className={`jn-adm-punto ${vivo ? "on" : "mal"}`} aria-hidden />
                        <b className="mono">{n.nombre}</b>
                        <span className={`chip mono ${(n.tipo || "infra") === "usuario" ? "acento" : ""}`}>
                          {n.tipo || "infra"}
                        </span>
                        {n.saltable && <span className="chip mono vivo">⚡ saltable</span>}
                        <span className={`chip mono ${vivo ? "vivo" : "muerto"}`} style={{ marginLeft: "auto" }}>{n.estado}</span>
                      </div>
                      <div className="jn-adm-nodo-datos">
                        <span><small className="mono">latencia</small><b className="mono">{Number.isFinite(n.ms) ? `${n.ms} ms` : "—"}</b></span>
                        <span><small className="mono">conexiones</small><b className="mono">{n.conexiones ?? 0}</b></span>
                        <span><small className="mono">último latido</small><b className="mono">{n.ultimo_hb != null ? `hace ${n.ultimo_hb} s` : "—"}</b></span>
                        <span><small className="mono">dirección</small><b className="mono">{n.direccion || "—"}</b></span>
                      </div>
                      <div className="jn-adm-nodo-pie">
                        {n.alias && <span className="nota">«{n.alias}»</span>}
                        <button className="btn peligro" type="button" style={{ marginLeft: "auto" }}
                          onClick={() => borraNodo(n.nombre)} title="Retirar este nodo de la tabla">
                          🗑 retirar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="jn-adm-vacio"><span className="spin" /> cargando nodos…</div>
            )}
            <p className="jn-adm-nota">
              Un nodo retirado se vuelve a registrar solo si sigue emitiendo latidos. Útil para limpiar nodos de prueba huérfanos.
            </p>
          </Revela>
        </div>
      )}

      {/* ── ESTADÍSTICAS ──────────────────────────────────────────────── */}
      {tab === "datos" && (
        <div className="jn-adm-panel" role="tabpanel">
          <div className="jn-adm-doble">
            <Revela className="tarjeta jn-adm-tarjeta">
              <div className="jn-adm-tarjeta-cab">
                <h2>Cuentas por plan</h2>
                <span className="mono nota">{m.total} en total</span>
              </div>
              <Barras datos={planes.map((p) => ({ clave: `${PLAN_ICO[p.clave]} ${p.clave}`, valor: p.valor, color: p.color }))} />
              <div className="jn-adm-nota">El plan efectivo lo calcula el backend; aquí solo se cuenta lo que devuelve la API.</div>
            </Revela>

            <Revela className="tarjeta jn-adm-tarjeta">
              <div className="jn-adm-tarjeta-cab">
                <h2>Reparto de roles</h2>
                <span className="mono nota">quién puede entrar aquí</span>
              </div>
              <Barras datos={[
                { clave: "☺ usuario", valor: m.rol.usuario, color: "var(--acento-2)" },
                { clave: "⚖ moderador", valor: m.rol.moderador, color: "var(--acento-3)" },
                { clave: "🛡 admin", valor: m.rol.admin, color: "var(--acento-1)" },
              ]} />
              <div className="jn-adm-nota">
                El rol se cambia desde la tabla de usuarios. Un moderador no puede ascenderse solo: el servidor lo rechaza.
              </div>
            </Revela>
          </div>

          <Revela className="tarjeta jn-adm-tarjeta">
            <div className="jn-adm-tarjeta-cab">
              <h2>Resumen por plan</h2>
              <span className="mono nota">cuentas, red y saltos</span>
            </div>
            <div className="envuelve-tabla">
              <table className="jn-adm-tabla jn-adm-tabla-datos">
                <thead>
                  <tr>
                    <th>plan</th>
                    <th className="der">cuentas</th>
                    <th className="der">con red activa</th>
                    <th className="der">con circuito</th>
                    <th className="der">saltos medios</th>
                    <th className="der">peso</th>
                  </tr>
                </thead>
                <tbody>
                  {["free", "pro", "empresarial"].map((p) => {
                    const grupo = usuarios.filter((u) => (u.plan || "free") === p);
                    const activos = grupo.filter((u) => u.activo);
                    const conCircuito = grupo.filter((u) => u.activo && u.circuito?.length);
                    const media = conCircuito.length
                      ? Math.round((conCircuito.reduce((a, u) => a + u.circuito.length, 0) / conCircuito.length) * 10) / 10
                      : null;
                    return (
                      <tr key={p}>
                        <td><b>{PLAN_ICO[p]} {p}</b></td>
                        <td className="der mono">{grupo.length}</td>
                        <td className="der mono">{activos.length}</td>
                        <td className="der mono">{conCircuito.length}</td>
                        <td className="der mono">{media != null ? media : "—"}</td>
                        <td className="der mono">{Math.round((grupo.length / Math.max(1, m.total)) * 100)} %</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Revela>

          <Revela className="tarjeta jn-adm-tarjeta">
            <div className="jn-adm-tarjeta-cab">
              <h2>Altas por semana</h2>
              <span className="mono nota">ventana de 8 semanas</span>
            </div>
            <div className="jn-adm-semanas" role="img" aria-label="Altas semanales">
              {semanas.map((s) => (
                <div className="jn-adm-semana" key={s.etq} title={`${s.etq}: ${s.n}`}>
                  <i style={{ height: `${Math.max(3, (s.n / picoSemana) * 100)}%` }} />
                  <span className="mono">{s.etq}</span>
                </div>
              ))}
            </div>
            <div className="jn-adm-nota">
              Calculado sobre la fecha de alta de cada cuenta. No hay histórico de inicios de sesión: el servidor no lo guarda.
            </div>
          </Revela>
        </div>
      )}
    </div>
  );
}
