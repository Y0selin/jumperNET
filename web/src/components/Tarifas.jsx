import { useMemo, useState } from "react";
import { CICLOS, FILAS_COMPARATIVA, PLANES, normalizaPlan, planDe } from "../lib/planes.js";
import { anadePlan, abreCarrito, resumenCarrito, useCarrito } from "../lib/carrito.js";
import { getUsuarioGuardado } from "../lib/api.js";
import { ir } from "../lib/router.js";
import { formateaEuros } from "../lib/suscripcion.js";

/* Tarifas: parrilla SaaS con selector de ciclo, comparador interactivo y
 * carrito. Los precios y los límites salen del catálogo (lib/planes.js); si
 * un dato no está implementado (la facturación anual), se enseña desactivado
 * y explicado en vez de inventarlo. */

export default function Tarifas({ yo, aviso, dentroPanel = false }) {
  const [ciclo, setCiclo] = useState("mensual");
  const [comparando, setComparando] = useState([]);
  const [modal, setModal] = useState(false);
  const [soloDiferencias, setSoloDiferencias] = useState(false);
  const carrito = useCarrito();
  const resumen = resumenCarrito();
  const guardado = getUsuarioGuardado();
  const planCuenta = normalizaPlan(yo?.plan ?? guardado?.plan);
  const cicloActivo = CICLOS.find((c) => c.id === ciclo) || CICLOS[0];

  function alternaComparar(id) {
    setComparando((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= 3) {
        aviso?.("puedes comparar hasta 3 planes a la vez", "error");
        return c;
      }
      return [...c, id];
    });
  }

  function alCarrito(plan) {
    const r = anadePlan(plan.id);
    if (r.ok) {
      abreCarrito();
      aviso?.(r.mensaje, "ok");
    } else {
      aviso?.(r.mensaje, "error");
    }
  }

  function cta(plan) {
    if (plan.cta.tipo === "carrito") { alCarrito(plan); return; }
    if (plan.cta.tipo === "registro") { ir("/acceso/registro"); return; }
    ir("/contacto");
  }

  const filas = useMemo(() => {
    if (!soloDiferencias) return FILAS_COMPARATIVA;
    return FILAS_COMPARATIVA.filter((f) => {
      const vals = PLANES.map((p) => JSON.stringify(f.valores[p.id]));
      return new Set(vals).size > 1;
    });
  }, [soloDiferencias]);

  const comparadas = comparando.length ? PLANES.filter((p) => comparando.includes(p.id)) : PLANES;

  return (
    <div className="jns-tarifas">
      {/* ── selector de ciclo ── */}
      <div className="jns-tarifas-top">
        <div className="jns-ciclo" role="group" aria-label="Periodicidad de facturación">
          {CICLOS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={ciclo === c.id ? "on" : ""}
              aria-pressed={ciclo === c.id}
              disabled={!c.disponible}
              title={c.nota}
              onClick={() => c.disponible && setCiclo(c.id)}
            >
              {c.nombre}
              {!c.disponible && <small className="mono">pronto</small>}
            </button>
          ))}
        </div>
        <p className="jns-mini jns-ciclo-nota">{cicloActivo.nota}</p>
      </div>

      {/* ── tarjetas ── */}
      <div className="jns-planes">
        {PLANES.map((p) => {
          const actual = planCuenta === p.id;
          const enCarrito = carrito.items.some((i) => i.planId === p.id);
          const marcado = comparando.includes(p.id);
          return (
            <article key={p.id} style={{ "--i": PLANES.indexOf(p) }} className={`jns-plan tono-${p.tono}${p.recomendado ? " destacado" : ""}${actual ? " actual" : ""}`}>
              {p.recomendado && <span className="jns-plan-badge">★ recomendado</span>}
              {actual && <span className="jns-plan-actual mono">tu plan</span>}

              <header className="jns-plan-cab">
                <span className="jns-plan-ico" aria-hidden>{p.ico}</span>
                <div>
                  <h3>{p.nombre}</h3>
                  <span className="jns-mini">{p.resumen}</span>
                </div>
              </header>

              <div className="jns-plan-precio">
                <b>{p.precioTexto}</b>
                <span className="mono">/ {p.periodo}</span>
              </div>
              <p className="jns-mini jns-plan-renueva">{p.renovacion}</p>

              <div className="jns-plan-bloque">
                <span className="jns-kicker">qué incluye</span>
                <ul className="jns-lista-ok compacta">
                  {p.incluido.map((x) => <li key={x}><span aria-hidden>✓</span>{x}</li>)}
                </ul>
              </div>

              {p.exclusivo.length > 0 && (
                <div className="jns-plan-bloque">
                  <span className="jns-kicker">exclusivo de {p.nombre}</span>
                  <ul className="jns-lista-exclusiva">
                    {p.exclusivo.map((x) => <li key={x}><span aria-hidden>✦</span>{x}</li>)}
                  </ul>
                </div>
              )}

              <div className="jns-plan-bloque">
                <span className="jns-kicker">límites</span>
                <ul className="jns-lista-no compacta">
                  {p.limitaciones.map((x) => <li key={x}><span aria-hidden>–</span>{x}</li>)}
                </ul>
              </div>

              <div className="jns-plan-acciones">
                <button
                  type="button"
                  className={`jns-btn grande ${p.cta.tipo === "carrito" ? "primario" : ""}`}
                  onClick={() => cta(p)}
                  disabled={enCarrito || (p.id === "pro" && resumen.item?.planId === "pro")}
                >
                  {enCarrito ? "✓ En el carrito" : p.cta.texto}
                </button>
                <div className="jns-plan-secundarias">
                  <button
                    type="button"
                    className={`jns-link ${marcado ? "on" : ""}`}
                    onClick={() => alternaComparar(p.id)}
                    aria-pressed={marcado}
                  >
                    {marcado ? "✓ comparando" : "+ comparar"}
                  </button>
                  {p.id === "pro" && resumen.item && !enCarrito && (
                    <button type="button" className="jns-link" onClick={() => alCarrito(p)}>cambiar a Pro</button>
                  )}
                  {p.id === "free" && (
                    <a className="jns-link" href="#/acceso/registro">crear cuenta</a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {comparando.length > 0 && (
        <div className="jns-comp-barra" role="status">
          <span><b>{comparando.length}</b> plan{comparando.length === 1 ? "" : "es"} seleccionado{comparando.length === 1 ? "" : "s"}</span>
          <div>
            <button type="button" className="jns-btn primario" onClick={() => setModal(true)}>Comparar ahora</button>
            <button type="button" className="jns-link" onClick={() => setComparando([])}>Limpiar</button>
          </div>
        </div>
      )}

      {/* ── tabla comparativa ── */}
      <section className="jns-comparativa" id="comparativa">
        <div className="jns-comparativa-cab">
          <div>
            <span className="jns-kicker">comparativa completa</span>
            <h2>Las diferencias, sin letra pequeña</h2>
            <p className="jns-mini">Pulsa una fila para destacarla. Puedes ocultar lo que todos los planes comparten.</p>
          </div>
          <button
            type="button"
            className={`jns-toggle ${soloDiferencias ? "on" : ""}`}
            onClick={() => setSoloDiferencias((v) => !v)}
            aria-pressed={soloDiferencias}
          >
            {soloDiferencias ? "◉ Solo diferencias" : "○ Solo diferencias"}
          </button>
        </div>

        <div className="jns-tabla-caja">
          <table className="jns-tabla jns-tabla-comp">
            <caption className="jns-sr">Comparación de los planes Free, Pro y Empresarial</caption>
            <thead>
              <tr>
                <th scope="col">Característica</th>
                {PLANES.map((p) => (
                  <th key={p.id} scope="col" className={planCuenta === p.id ? "actual" : ""}>
                    <span aria-hidden>{p.ico}</span> {p.nombre}
                    {planCuenta === p.id && <small className="mono"> tu plan</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <th scope="row">
                    <span className="jns-mini mono">{f.grupo}</span>
                    {f.etq}
                  </th>
                  {PLANES.map((p) => {
                    const v = f.valores[p.id];
                    return (
                      <td key={p.id} className={planCuenta === p.id ? "actual" : ""}>
                        {v === true ? <span className="jns-si" aria-label="incluido">✓</span>
                          : v === false ? <span className="jns-no" aria-label="no incluido">✕</span>
                          : <span>{v}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="jns-mini">
          Los límites de saltos, refresco y herramientas son los que aplica el backend hoy.
          La facturación anual todavía no existe: no mostramos un descuento que no podamos cobrar.
        </p>
      </section>

      {modal && (
        <div className="jns-modal-velo" role="presentation" onClick={() => setModal(false)}>
          <div className="jns-modal ancho" role="dialog" aria-modal="true" aria-labelledby="jns-comp-t" onClick={(e) => e.stopPropagation()}>
            <div className="jns-modal-cab">
              <div><span className="jns-kicker">comparador</span><h2 id="jns-comp-t">Plan a plan</h2></div>
              <button type="button" className="jns-cerrar" onClick={() => setModal(false)} aria-label="Cerrar el comparador">✕</button>
            </div>
            <div className="jns-tabla-caja">
              <table className="jns-tabla jns-tabla-comp">
                <thead>
                  <tr>
                    <th scope="col">Característica</th>
                    {comparadas.map((p) => (
                      <th key={p.id} scope="col" className={planCuenta === p.id ? "actual" : ""}>
                        {p.ico} {p.nombre}<br /><small className="mono">{p.precioTexto}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FILAS_COMPARATIVA.map((f) => (
                    <tr key={f.id}>
                      <th scope="row">{f.etq}</th>
                      {comparadas.map((p) => {
                        const v = f.valores[p.id];
                        return (
                          <td key={p.id} className={planCuenta === p.id ? "actual" : ""}>
                            {v === true ? <span className="jns-si">✓</span> : v === false ? <span className="jns-no">✕</span> : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="jns-modal-acciones">
              <button type="button" className="jns-btn" onClick={() => setModal(false)}>Cerrar</button>
              <button type="button" className="jns-btn primario" onClick={() => { setModal(false); if (planDe("pro")) abreCarrito(); }}>
                Ir al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {!dentroPanel && (
        <p className="jns-mini jns-tarifas-pie">
          Los planes se activan en tu cuenta; si eliges Pro, el carrito guarda tu selección y el proceso
          de pago te dice exactamente qué ocurre antes de confirmar. Nunca se cobra sin tu confirmación.
        </p>
      )}
      {dentroPanel && (
        <p className="jns-mini">
          Precios en euros, IVA no incluido cuando corresponda. El importe final se muestra siempre antes de confirmar.
        </p>
      )}
      {resumen.item && (
        <span className="jns-sr" aria-live="polite">
          {resumen.cantidad} plan en el carrito, importe {formateaEuros(resumen.total)} al mes.
        </span>
      )}
    </div>
  );
}
