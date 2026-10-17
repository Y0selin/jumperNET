import { useEffect, useState } from "react";
import { decodificaJwt, getToken } from "../lib/api.js";

/* Piezas compartidas del rediseño: las usa la landing, el panel y la
   ficha de cuenta para que todo hable el mismo idioma visual. */

/* --------- Tira de métricas --------- */
export function Stat({ etq, val, pie, tono = "" }) {
  return (
    <div className={`stat ${tono}`}>
      <span className="etq">{etq}</span>
      <span className="val">{val}</span>
      {pie && <span className="pie">{pie}</span>}
    </div>
  );
}

/* --------- Flujo animado: TÚ → saltos → INTERNET --------- */
export function Tuberia({ activo = true, saltos = ["nodo₁", "nodo₂", "nodo₃"], origen = "TÚ", destino = "INTERNET", compacta = false, paquetes = 4 }) {
  return (
    <div className={`tuberia ${activo ? "on" : "off"} ${compacta ? "compacta" : ""}`}
      role="img" aria-label={`flujo ${origen} → ${saltos.join(" → ")} → ${destino}${activo ? " (activo)" : " (detenido)"}`}>
      <div className="carril">
        <div className="riel" />
        {Array.from({ length: paquetes }).map((_, i) => (
          <span key={i} className="paquete" style={{ animationDelay: `${(i * 2.6) / paquetes}s` }} />
        ))}
      </div>
      <div className="tuberia-paradas">
        <span className="tp origen">{origen}</span>
        {saltos.map((s, i) => (
          <span key={s + i} className={"tp nodo" + (i === saltos.length - 1 ? " exit" : "")}>{s}</span>
        ))}
        <span className="tp destino">{destino}</span>
      </div>
    </div>
  );
}

/* --------- Escalón numerado (pasos de una guía) --------- */
export function Escalon({ n, titulo, children }) {
  return (
    <div className="escalon">
      <span className="num">{n}</span>
      <div>
        <b>{titulo}</b>
        {children && <div className="nota">{children}</div>}
      </div>
    </div>
  );
}

/* --------- Hecho con marca (listas de "esto es así") --------- */
export function Hecho({ children }) {
  return (
    <div className="hecho">
      <span className="marca">✓</span>
      <span>{children}</span>
    </div>
  );
}

/* --------- Anillo de la sesión (JWT que se agota) --------- */
export function AnilloJwt() {
  const info = decodificaJwt(getToken() || "");
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    if (!info?.cuerpo?.exp) return;
    const calc = () => setSeg(Math.max(0, info.cuerpo.exp - Math.floor(Date.now() / 1000)));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [info]);
  if (!info) return null;
  const frac = Math.min(1, seg / 7200), R = 24, C = 2 * Math.PI * R;
  return (
    <div className="tarjeta" style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <svg width="62" height="62" viewBox="0 0 62 62" style={{ flex: "none" }}>
        <circle cx="31" cy="31" r={R} fill="none" stroke="rgb(255 255 255 / .09)" strokeWidth="4.5" />
        <circle cx="31" cy="31" r={R} fill="none" stroke={frac > .25 ? "var(--acento-2)" : "var(--acento-1)"}
          strokeWidth="4.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 31 31)" style={{ transition: "stroke-dashoffset .6s" }} />
        <text x="31" y="36" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--texto)">{Math.floor(seg / 60)}</text>
      </svg>
      <div style={{ flex: 1 }}>
        <h2 className="seccion" style={{ marginBottom: 6 }}>Sesión · {Math.floor(seg / 60)} min restantes</h2>
        <div className="dato"><span className="etq">algoritmo</span><span className="val">{info.cab.alg} · HS256 firmado</span></div>
        <div className="dato"><span className="etq">sujeto (id)</span><span className="val">{info.cuerpo.sub}</span></div>
        <div className="dato"><span className="etq">expira</span><span className="val">{new Date(info.cuerpo.exp * 1000).toLocaleTimeString()}</span></div>
      </div>
    </div>
  );
}
