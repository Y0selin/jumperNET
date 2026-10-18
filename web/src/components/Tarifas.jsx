import Revela from "./Revela.jsx";

/* Tarifas · los tres planes de la red.
   free        → 3 saltos, cifrado base, refresco 1 vez al día
   pro         → hasta 7 saltos, cifrado bueno, refresco cada 10 h
   empresarial → todo lo anterior + ventas, plan dedicado a medida                */

const PLANES = [
  {
    id: "free",
    nombre: "Free",
    precio: "0 €",
    periodo: "siempre",
    tono: "tono-c",
    ico: "🌱",
    desc: "Para empezar a trastear con la red y comprobar que tu IP cambia de verdad.",
    puntos: [
      { t: "3 saltos en nodos", bueno: true },
      { t: "cifrado mínimo entre saltos", lista: true },
      { t: "refresco del circuito 1 vez al día", lista: true },
      { t: "elección de nº de saltos", malo: true },
    ],
    cta: { texto: "▶ Crear mi cuenta gratis", modo: "registro" },
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: "5 €",
    periodo: "al mes",
    estrella: true,
    tono: "tono-a",
    ico: "⚡",
    desc: "La experiencia completa: tú decides cuán largo quieres el circuito.",
    puntos: [
      { t: "todo lo del plan Free", bueno: true },
      { t: "hasta 7 saltos en nodos", bueno: true },
      { t: "cifrado bueno entre saltos", bueno: true },
      { t: "refresco del circuito cada 10 h", bueno: true },
      { t: "elige cuántos saltos quieres (3…7)", bueno: true },
    ],
    cta: { texto: "▶ Empezar con Pro", modo: "registro" },
  },
  {
    id: "empresarial",
    nombre: "Empresarial",
    precio: "a medida",
    periodo: "habla con ventas",
    tono: "tono-b",
    ico: "🏛",
    desc: "Consumos dedicados, SLA salidas específicas y soporte directo con el equipo.",
    puntos: [
      { t: "todo lo del plan Pro", bueno: true },
      { t: "consumos y salidas dedicadas", lista: true },
      { t: "trato directo con ventas", lista: true },
      { t: "plan personalizado (se concreta contigo)", lista: true },
    ],
    cta: { texto: "✉ Hablar con ventas", modo: "ventas", href: "mailto:diseo-jumpernat-admin@jumpernet.local?subject=Plan%20Empresarial%20JumperNET" },
  },
];

export default function Tarifas({ irAuth, dentroPanel = false }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {!dentroPanel && (
        <div className="cab-seccion">
          <div className="cubo-ico">◈</div>
          <div>
            <span className="migas">público · planes</span>
            <h1>Tarifas de la red</h1>
            <p className="sub">Una barra de supersaltos con tres velocidades: elige cuántos nodos hay entre tú y la salida.</p>
          </div>
        </div>
      )}

      <div className="descargas-malla" style={{ gap: 16 }}>
        {PLANES.map((p, i) => (
          <Revela key={p.id} className="tarjeta-descarga apa" retardo={i + 1} style={{ position: "relative" }}>
            <div className="tarjeta" style={{ margin: 0, border: 0, background: "transparent", padding: 0, position: "relative" }}>
              {p.estrella && (
                <span className="chip vivo" style={{ position: "absolute", top: -12, right: 10, zIndex: 2, fontSize: 10.5 }}>
                  ★ la favorita
                </span>
              )}
              <div className="cabeza-descarga">
                <div className="ico-descarga">{p.ico}</div>
                <div>
                  <div className="titulo-descarga">{p.nombre}</div>
                  <div className="meta-descarga mono">
                    <b style={{ color: "var(--texto)", fontSize: 15 }}>{p.precio}</b> · {p.periodo}
                  </div>
                </div>
              </div>
              <p className="nota" style={{ fontSize: 12.5, marginTop: 10 }}>{p.desc}</p>
              <div style={{ display: "grid", gap: 7, marginTop: 12, minHeight: 150, alignContent: "start" }}>
                {p.puntos.map((pt) => (
                  <div key={pt.t} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                    <span style={{ color: pt.malo ? "#8a8a92" : "var(--acento-1)", fontWeight: 700 }}>
                      {pt.malo ? "✕" : pt.bueno ? "✓" : "·"}
                    </span>
                    <span style={{ color: pt.malo ? "var(--texto-suave)" : undefined }}>{pt.t}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                {p.cta.href ? (
                  <a className="btn-descarga" href={p.cta.href}>
                    {p.cta.texto} <span>↗</span>
                  </a>
                ) : (
                  <button className="btn-descarga" style={{ cursor: "pointer", width: "100%" }} onClick={() => irAuth?.(p.cta.modo)}>
                    {p.cta.texto} <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </Revela>
        ))}
      </div>

      <p className="nota mono" style={{ textAlign: "center", fontSize: 11 }}>
        el plan lo cambia el administrador — si compras Pro te llega activado en tu cuenta sin tocar nada más
      </p>
    </div>
  );
}
