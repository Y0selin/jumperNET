import { useEffect, useRef, useState } from "react";
import CircuitoPlan from "./CircuitoPlan.jsx";
import ContactoVentas from "./ContactoVentas.jsx";
import {
  PLANES, PROMO, COMPARATIVA, planDe,
  PRECIO_BASE_PRO, precioPro, extrasPro, normalizaSaltos, caracteristicasPro,
} from "../lib/planes.js";
import { agregaPro, promoUsada, useCarrito } from "../lib/carrito.js";
import { getToken, getUsuarioGuardado } from "../lib/api.js";

/* Sección de tarifas: tres planes reales, circuito interactivo, comparación
   y promoción de bienvenida. Nada de esta sección abre una conexión: las
   previsualizaciones son educativas. */

const ICONOS = {
  free: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21V9" />
      <path d="M12 9C8 9 5 6.5 5 3c4 0 7 2.5 7 6Z" />
      <path d="M12 13c4 0 7-2.5 7-6-4 0-7 2.5-7 6Z" />
      <path d="M7 21h10" />
    </svg>
  ),
  pro: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
    </svg>
  ),
  empresarial: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V5.5A2.5 2.5 0 0 1 6.5 3H14v18" />
      <path d="M14 9h4.5A1.5 1.5 0 0 1 20 10.5V21" />
      <path d="M2 21h20M7 7h3M7 11h3M7 15h3M16.5 13h1M16.5 17h1" />
    </svg>
  ),
};

const Check = ({ off = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {off ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="m5 12.5 4.5 4.5L19 7" />}
  </svg>
);

const euros = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/* Anima el número del precio cada vez que cambia el circuito. */
function usePrecioAnimado(destino) {
  const [valor, setValor] = useState(destino);
  const anterior = useRef(destino);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    const desde = anterior.current;
    anterior.current = destino;
    if (desde === destino) return;
    let raf;
    const t0 = performance.now();
    const duracion = 380;
    setCambiando(true);
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / duracion);
      const suave = 1 - Math.pow(1 - p, 3);
      setValor(desde + (destino - desde) * suave);
      if (p < 1) raf = requestAnimationFrame(paso);
      else { setValor(destino); setCambiando(false); }
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [destino]);

  return { valor, cambiando };
}

export default function Tarifas({ irAuth, dentroPanel = false }) {
  const carrito = useCarrito();
  const planInicial = planDe(getUsuarioGuardado());
  const [saltosPro, setSaltosPro] = useState(() => normalizaSaltos(
    carrito.items[0]?.saltos || (planInicial.id === "pro" ? planInicial.saltosMax : 3)
  ));
  const [verTodas, setVerTodas] = useState(true);
  const [contacto, setContacto] = useState(false);
  const [anadido, setAnadido] = useState(false);
  const [promoVisible, setPromoVisible] = useState(true);
  const [usuario, setUsuario] = useState(() => getUsuarioGuardado());
  const precioAnimado = usePrecioAnimado(precioPro(saltosPro));
  const extraPro = extrasPro(saltosPro);
  const descuentoPro = Math.round(precioPro(saltosPro) * PROMO.porcentaje) / 100;

  useEffect(() => {
    let vivo = true;
    const refresca = () => vivo && setUsuario(getUsuarioGuardado());
    window.addEventListener("jumpernet-plan", refresca);
    window.addEventListener("storage", refresca);
    return () => {
      vivo = false;
      window.removeEventListener("jumpernet-plan", refresca);
      window.removeEventListener("storage", refresca);
    };
  }, []);

  const actual = usuario && getToken() ? planDe(usuario) : null;
  const esProReal = actual?.id === "pro" && !actual.demo;
  const demo = !!actual?.demo;
  const descuentoDisponible = !promoUsada();

  function configurarPro() {
    if (esProReal) { window.location.hash = "#/panel"; return; }
    agregaPro(saltosPro);
    setAnadido(true);
    setTimeout(() => setAnadido(false), 2200);
    window.dispatchEvent(new CustomEvent("jumpernet-carrito-abrir"));
  }

  function eligeSaltos(n) {
    setSaltosPro(normalizaSaltos(n));
    setAnadido(false);
    if (carrito.cantidad) agregaPro(n);
  }

  const filas = COMPARATIVA.flatMap((g) => g.filas.map((f) => ({ ...f, grupo: g.grupo }))).filter(
    (f) => verTodas || f.free !== f.pro || f.pro !== f.emp
  );

  return (
    <div className="jn-planes">
      {!dentroPanel && (
        <header className="jn-planes-cab">
          <span className="jn-eyebrow"><i aria-hidden /> planes · red jumpernet</span>
          <h1 className="jn-planes-h1">
            Elige cuánto <span className="jn-grad">recorre tu conexión</span>
          </h1>
          <p className="jn-planes-lead">
            Tres planes, un mismo cifrado y ningún cobro escondido. Free para probarlo todo,
            Pro para decidir el tamaño del circuito y Empresarial para infraestructura a medida.
          </p>
          <div className="jn-planes-meta">
            <span><Check /> Sin tarjeta para empezar</span>
            <span><Check /> Cancela cuando quieras</span>
            <span><Check /> Previsualizaciones educativas</span>
          </div>
        </header>
      )}

      {promoVisible && descuentoDisponible && (
        <aside className="jn-promo" role="note">
          <span className="jn-promo-ico" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7C9 7 7 5.7 7 4a2.5 2.5 0 0 1 5 0c0 1.3 0 3 0 3Zm0 0c3 0 5-1.3 5-3a2.5 2.5 0 0 0-5 0" />
            </svg>
          </span>
          <div className="jn-promo-txt">
            <b>{PROMO.titulo}.</b>
            <span>{PROMO.texto}</span>
          </div>
          <code className="jn-promo-codigo">{PROMO.codigo}</code>
          <button type="button" className="jn-promo-cerrar" onClick={() => setPromoVisible(false)} aria-label="Cerrar la promoción">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </aside>
      )}

      <div className="jn-planes-rejilla">
        {PLANES.map((p) => {
          const esPro = p.id === "pro";
          const esActual = actual?.id === p.id;
          return (
            <article key={p.id} className={`jn-plan jn-plan-${p.id} ${p.destacado ? "destacado" : ""} ${esActual ? "actual" : ""}`}>
              <span className="jn-plan-halo" aria-hidden />

              {p.destacado && !esActual && <span className="jn-plan-flag">Más elegido</span>}
              {esActual && <span className="jn-plan-actual-tag">{demo ? "tu plan · demo" : "tu plan actual"}</span>}

              <header className="jn-plan-cab">
                <span className="jn-plan-ico">{ICONOS[p.id]}</span>
                <div>
                  <h2>{p.nombre}</h2>
                  <span className="jn-plan-etq mono">{p.etiqueta}</span>
                </div>
              </header>

              <p className="jn-plan-desc">{p.resumen}</p>

              <div className={`jn-plan-precio ${p.precio == null ? "a-medida" : ""} ${esPro && precioAnimado.cambiando ? "cambiando" : ""}`} aria-live="polite">
                {p.precio == null ? (
                  <b>A medida</b>
                ) : esPro ? (
                  <>
                    <b>{Math.round(precioAnimado.valor)}</b>
                    <span className="jn-plan-moneda">€</span>
                    <i>al mes</i>
                  </>
                ) : (
                  <>
                    <b>{p.precio}</b>
                    <span className="jn-plan-moneda">€</span>
                    <i>{p.periodo}</i>
                  </>
                )}
                {p.precio == null && <i>precio personalizado</i>}
              </div>

              {esPro && (
                <div className="jn-plan-desglose mono" aria-live="polite">
                  <span>{PRECIO_BASE_PRO} € base · 3 saltos</span>
                  <span className={extraPro ? "extra" : ""}>
                    {extraPro ? `+${extraPro} € · ${saltosPro - 3} salto${saltosPro - 3 === 1 ? "" : "s"} extra` : "sin extras"}
                  </span>
                  <span className="total">renovación {euros(precioPro(saltosPro))}/mes</span>
                </div>
              )}
              {esPro && descuentoDisponible && (
                <p className="jn-plan-estreno mono">
                  primer pago {euros(precioPro(saltosPro) - descuentoPro)} con {PROMO.codigo} · luego {euros(precioPro(saltosPro))}/mes
                </p>
              )}
              {esPro && !descuentoDisponible && (
                <p className="jn-plan-estreno mono">renovación {euros(precioPro(saltosPro))}/mes · promoción ya utilizada</p>
              )}
              {p.precio === 0 && <p className="jn-plan-estreno mono">sin tarjeta · sin fecha de caducidad</p>}
              {p.precio == null && <p className="jn-plan-estreno mono">según capacidad y configuración</p>}

              <CircuitoPlan
                saltos={esPro ? saltosPro : p.id === "empresarial" ? 7 : 3}
                tono={p.id}
                interactivo={esPro}
                onCambio={eligeSaltos}
                compacto
              />

              <ul className="jn-plan-lista">
                {(esPro ? caracteristicasPro(saltosPro) : p.caracteristicas).map((c) => (
                  <li key={c.titulo}>
                    <span className="jn-plan-check"><Check /></span>
                    <details>
                      <summary>{c.titulo}</summary>
                      <p>{c.detalle}</p>
                    </details>
                  </li>
                ))}
              </ul>

              <div className="jn-plan-pie">
                {p.id === "free" && (
                  <button
                    type="button"
                    className="jn-btn jn-btn-suave"
                    onClick={() => (actual ? (window.location.hash = "#/panel") : irAuth?.("registro"))}
                  >
                    {actual ? "Abrir mi panel" : p.cta}
                    <span aria-hidden>→</span>
                  </button>
                )}
                {p.id === "pro" && (
                  <button type="button" className="jn-btn jn-btn-pro" onClick={configurarPro}>
                    <span className="jn-btn-ico" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 4h2l2.4 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6" />
                        <circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" />
                      </svg>
                    </span>
                    {esProReal ? "Abrir mi plan" : anadido ? "Añadido al carrito" : carrito.cantidad ? (carrito.saltos === saltosPro ? "Ver en el carrito" : "Actualizar carrito") : p.cta}
                    <span aria-hidden>{anadido ? "✓" : "→"}</span>
                  </button>
                )}
                {p.id === "empresarial" && (
                  <button type="button" className="jn-btn jn-btn-oscuro" onClick={() => setContacto(true)}>
                    {p.cta}
                    <span aria-hidden>→</span>
                  </button>
                )}
                <p className="jn-plan-nota">
                  {p.id === "free" && "Cuenta en 20 segundos · sin pasar por el carrito"}
                  {p.id === "pro" && `${saltosPro} saltos · ${euros(precioPro(saltosPro))}/mes · revisas antes de continuar`}
                  {p.id === "empresarial" && "Sin alta automática: primero hablamos"}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="jn-planes-aviso">
        Más saltos significan más intermediarios y algo más de latencia; no vendemos un plan como
        «más seguro» solo por tener más nodos. El cifrado es el mismo en todos los planes.
      </p>

      <section className="jn-comparar" aria-label="Comparación de planes">
        <div className="jn-comparar-cab">
          <div>
            <span className="jn-eyebrow"><i aria-hidden /> comparación</span>
            <h2>Lo importante, lado a lado</h2>
          </div>
          <label className="jn-switch">
            <input type="checkbox" checked={!verTodas} onChange={(e) => setVerTodas(!e.target.checked)} />
            <span aria-hidden />
            Ver solo diferencias
          </label>
        </div>

        <div className="jn-tabla-envoltura">
          <table className="jn-tabla">
            <thead>
              <tr>
                <th scope="col">Característica</th>
                <th scope="col">Free</th>
                <th scope="col" className="pro">Pro</th>
                <th scope="col">Empresarial</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={`${f.grupo}-${f.etiqueta}`}>
                  <th scope="row">
                    <span className="jn-tabla-grupo mono">{f.grupo}</span>
                    {f.etiqueta}
                  </th>
                  {["free", "pro", "emp"].map((k) => (
                    <td key={k} className={k === "pro" ? "pro" : ""}>
                      {typeof f[k] === "boolean" ? (
                        <span className={`jn-tabla-si ${f[k] ? "si" : "no"}`} aria-label={f[k] ? "Incluido" : "No incluido"}>
                          <Check off={!f[k]} />
                        </span>
                      ) : (
                        f[k]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="jn-comparar-pie">
          Los límites de saltos y refresco los aplica el backend. El plan se activa desde el panel
          de administración: no hay pasarela de pago conectada todavía.
        </p>
      </section>

      <ContactoVentas abierto={contacto} cerrar={() => setContacto(false)} />
    </div>
  );
}
