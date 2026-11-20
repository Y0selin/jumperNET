import { useState } from "react";
import { me, nodosVivos, salida, geoApi, getToken, decodificaJwt } from "../lib/api.js";

const CLAVE = "jumpernet-diagnostico-v1";

function leerUltimo() {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function guardaUltimo(d) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* solo en memoria */ }
}

function estadoTexto(filas) {
  if (!filas?.length) return { texto: "sin ejecutar", clase: "" };
  if (filas.some((f) => f.estado === "mal")) return { texto: "revisar", clase: "muerto" };
  if (filas.some((f) => f.estado === "aviso")) return { texto: "con avisos", clase: "aviso" };
  return { texto: "todo listo", clase: "vivo" };
}

function fechaCorta(iso) {
  try { return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }); }
  catch { return "—"; }
}

export default function Diagnostico({ yo, aviso }) {
  const [ultimo, setUltimo] = useState(leerUltimo);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState("");
  const estado = estadoTexto(ultimo?.filas);

  async function ejecutar() {
    setEjecutando(true);
    setError("");
    try {
      const t0 = performance.now();
      const cuenta = await me();
      const ms = Math.round(performance.now() - t0);
      const [vivos, sal] = await Promise.all([
        nodosVivos().catch((e) => ({ error: e.message })),
        salida().catch((e) => ({ error: e.message })),
      ]);

      const jwt = decodificaJwt(getToken());
      const jwtMin = jwt?.cuerpo?.exp
        ? Math.max(0, Math.round((jwt.cuerpo.exp * 1000 - Date.now()) / 60000))
        : null;
      const activo = !!cuenta?.activo;
      const circuito = cuenta?.circuito || [];
      const ip = sal?.ip_salida || cuenta?.ip_salida || null;
      const geo = ip ? await geoApi(ip) : { ok: false, error: "sin IP de salida" };

      const filas = [
        {
          k: "API", v: `${ms} ms`,
          d: ms < 1200 ? "respuesta correcta" : "respuesta lenta",
          estado: ms < 1600 ? "ok" : "aviso",
        },
        {
          k: "sesión", v: jwtMin != null ? `${jwtMin} min` : "sin datos",
          d: jwtMin != null && jwtMin > 0 ? "JWT válido" : "vuelve a iniciar sesión",
          estado: jwtMin != null && jwtMin > 0 ? "ok" : "mal",
        },
        {
          k: "circuito", v: activo ? `${circuito.length || 0} saltos` : "apagado",
          d: activo ? (circuito.join(" → ") || "activo") : "sin tráfico",
          estado: activo ? "ok" : "aviso",
        },
        {
          k: "salida", v: ip || "sin IP",
          d: activo ? (ip ? "IP que ve internet" : "sin respuesta de salida") : "sin circuito",
          estado: activo ? (ip ? "ok" : "mal") : "aviso",
        },
        {
          k: "nodos", v: vivos?.error ? "sin datos" : `${vivos?.total ?? "—"} vivos`,
          d: vivos?.error ? vivos.error : `${vivos?.infra ?? "—"} infra · ${vivos?.equipos ?? "—"} equipos · ${vivos?.validados ?? "—"} validados`,
          estado: vivos?.error ? "mal" : (vivos?.total ? "ok" : "mal"),
        },
        {
          k: "geolocalización",
          v: geo?.ok ? [geo.ciudad, geo.pais].filter(Boolean).join(", ") : "sin datos",
          d: activo
            ? (geo?.ok ? "resuelta por el servidor" : geo?.error || "no disponible")
            : "sin circuito",
          estado: activo ? (geo?.ok ? "ok" : "aviso") : "aviso",
        },
      ];

      const nuevo = {
        fecha: new Date().toISOString(),
        ms,
        cuenta: { email: cuenta?.email || yo?.email || "—", plan: cuenta?.plan || yo?.plan || "free", activo },
        filas,
      };
      setUltimo(nuevo);
      guardaUltimo(nuevo);
      aviso("diagnóstico completado · revisa las 6 comprobaciones", "ok");
    } catch (e) {
      setError(e.message || "no se pudo completar el diagnóstico");
      aviso("el diagnóstico no pudo completarse", "error");
    } finally {
      setEjecutando(false);
    }
  }

  async function copiar() {
    if (!ultimo) return;
    const texto = [
      "JumperNET · diagnóstico de red",
      `Fecha: ${new Date(ultimo.fecha).toLocaleString("es-ES")}`,
      `Cuenta: ${ultimo.cuenta?.email || "—"} · plan ${ultimo.cuenta?.plan || "free"}`,
      `API: ${ultimo.ms} ms`,
      ...(ultimo.filas || []).map((f) => `${f.k}: ${f.v}${f.d ? ` · ${f.d}` : ""}`),
    ].join("\n");
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(texto); ok = true; } catch { /* respaldo */ }
    }
    if (!ok) {
      try {
        const area = document.createElement("textarea");
        area.value = texto;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch { ok = false; }
    }
    aviso(ok ? "informe de diagnóstico copiado" : "no se pudo copiar el informe", ok ? "ok" : "error");
  }

  return (
    <section className="tarjeta pn-diag" aria-labelledby="pn-diag-titulo">
      <div className="pn-diag-cab">
        <div>
          <span className="pn-kicker">salud de la red</span>
          <h2 id="pn-diag-titulo" className="seccion">Diagnóstico de la sesión</h2>
        </div>
        <span className={`chip ${estado.clase}`}>{estado.texto}</span>
      </div>

      <p className="nota pn-diag-intro">
        Comprueba API, sesión, circuito, salida, nodos y geolocalización con datos reales.
        El último informe se guarda solo en este navegador.
      </p>

      <div className="pn-diag-acciones">
        <button type="button" className="btn primario" onClick={ejecutar} disabled={ejecutando}>
          {ejecutando ? <span className="spin" /> : "▶"} {ultimo ? "Volver a diagnosticar" : "Ejecutar diagnóstico"}
        </button>
        {ultimo && (
          <button type="button" className="btn" onClick={copiar}>
            ⧉ Copiar informe
          </button>
        )}
      </div>

      {error && <p className="pn-diag-error">{error}</p>}

      {ultimo ? (
        <>
          <div className="pn-diag-malla" aria-live="polite">
            {ultimo.filas?.map((f) => (
              <div key={f.k} className={`pn-diag-fila ${f.estado}`}>
                <span className={`pn-diag-punto ${f.estado}`} aria-hidden />
                <span className="pn-diag-fila-txt">
                  <b>{f.k}</b>
                  <span className="mono">{f.v}</span>
                  <small>{f.d}</small>
                </span>
              </div>
            ))}
          </div>
          <p className="pn-diag-pie mono">
            último diagnóstico · {fechaCorta(ultimo.fecha)} · {ultimo.ms} ms
          </p>
        </>
      ) : (
        <p className="pn-diag-vacio nota">Aún no hay ningún diagnóstico. Lánzalo para tener una foto completa de tu sesión.</p>
      )}
    </section>
  );
}
