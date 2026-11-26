import { useEffect, useState } from "react";
import { API_URL, getToken } from "../lib/api.js";
import {
  aplicarCodigo, marcaPromoUsada, quitaCodigo, resumenCarrito,
  useCarrito, vaciaCarrito, anadePlan, CODIGO_BIENVENIDA,
} from "../lib/carrito.js";
import { creaPedido, formateaEuros } from "../lib/suscripcion.js";
import { PLANES } from "../lib/planes.js";
import { creaNotif } from "../lib/notificaciones.js";
import { ir } from "../lib/router.js";

/* Pago por etapas: plan → carrito → facturación → método → confirmación.
 *
 * Lo que se cobra lo decide el proveedor de pagos, nunca esta pantalla. Si el
 * backend no tiene Stripe configurado, el último paso NO finge un cobro:
 * registra una solicitud de activación con referencia y lo explica tal cual.
 * En ningún momento se piden ni se guardan datos de tarjeta.
 */

const PASOS = [
  { id: "plan", t: "Plan" },
  { id: "carrito", t: "Carrito" },
  { id: "facturacion", t: "Facturación" },
  { id: "pago", t: "Pago" },
  { id: "confirmar", t: "Confirmación" },
];

const PAISES = ["España", "México", "Argentina", "Colombia", "Chile", "Perú", "Ecuador", "Uruguay", "Otro"];

function valida(fact) {
  const e = {};
  if (!fact.nombre || fact.nombre.trim().length < 3) e.nombre = "Escribe tu nombre completo (mínimo 3 letras).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((fact.email || "").trim())) e.email = "Ese correo no parece válido.";
  if (!fact.pais) e.pais = "Indica el país de facturación.";
  if (!fact.direccion || fact.direccion.trim().length < 5) e.direccion = "Falta la dirección (calle y número).";
  if (!fact.ciudad || fact.ciudad.trim().length < 2) e.ciudad = "Falta la ciudad.";
  if (!/^[0-9A-Za-z -]{3,10}$/.test((fact.cp || "").trim())) e.cp = "Código postal no válido.";
  if (fact.nif && !/^[0-9A-Za-z-]{5,15}$/.test(fact.nif.trim())) e.nif = "El NIF/CIF no tiene un formato válido.";
  return e;
}

const facturaVacia = (yo) => ({
  nombre: yo?.alias || "",
  email: yo?.email || "",
  pais: "España",
  nif: "",
  direccion: "",
  ciudad: "",
  cp: "",
});

export default function Pasarela({ yo, aviso, alTerminar }) {
  const carrito = useCarrito();
  const resumen = resumenCarrito();
  const [paso, setPaso] = useState(resumen.item ? "carrito" : "plan");
  const [fact, setFact] = useState(() => facturaVacia(yo));
  const [errores, setErrores] = useState({});
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [avisoCodigo, setAvisoCodigo] = useState(null);
  const [billing, setBilling] = useState({ comprobando: true, disponible: false, motivo: "" });

  /* ¿Hay un backend de facturación delante? Si no, se dice y se ofrece la
     solicitud de activación en vez de un botón de tarjeta que no cobra. */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/billing/config`, { headers: cabeceras() });
        if (!r.ok) throw new Error("sin-servicio");
        const d = await r.json();
        if (!vivo) return;
        setBilling({
          comprobando: false,
          disponible: !!d.activo && !!d.proveedor,
          motivo: d.motivo || "",
          modo: d.modo || null,
          proveedor: d.proveedor || null,
        });
      } catch {
        if (vivo) setBilling({
          comprobando: false,
          disponible: false,
          motivo: "No hay servicio de pagos conectado todavía. Puedes registrar tu solicitud y el equipo la activa contigo.",
        });
      }
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [paso]);

  const idx = PASOS.findIndex((p) => p.id === paso);
  const porcentaje = paso === "listo" ? 100 : ((idx + 1) / PASOS.length) * 100;

  function cambia(campo, valor) {
    setFact((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function sigue() {
    setError("");
    if (paso === "plan") {
      if (!resumen.item) { setError("Elige un plan para continuar."); return; }
      setPaso("carrito");
      return;
    }
    if (paso === "carrito") {
      if (!resumen.item) { setError("El carrito está vacío."); return; }
      setPaso("facturacion");
      return;
    }
    if (paso === "facturacion") {
      const e = valida(fact);
      if (Object.keys(e).length) { setErrores(e); setError("Revisa los campos marcados."); return; }
      setPaso("pago");
      return;
    }
    if (paso === "pago") { setPaso("confirmar"); return; }
  }

  function atras() {
    setError("");
    if (paso === "carrito") setPaso("plan");
    else if (paso === "facturacion") setPaso("carrito");
    else if (paso === "pago") setPaso("facturacion");
    else if (paso === "confirmar") setPaso("pago");
  }

  function aplicaCodigo(e) {
    e.preventDefault();
    const r = aplicarCodigo(codigo);
    setAvisoCodigo({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
    if (r.ok) setCodigo("");
  }

  async function confirma() {
    if (!acepta) { setError("Acepta las condiciones para continuar."); return; }
    if (!resumen.item) { setError("El carrito está vacío."); return; }
    setCargando(true);
    setError("");

    const promo = resumen.hayPromo ? CODIGO_BIENVENIDA : null;

    try {
      if (billing.disponible) {
        /* Stripe Checkout en el backend: la sesión se crea allí y aquí solo
           se redirige. Ningún dato de tarjeta pasa por esta aplicación. */
        const r = await fetch(`${API_URL}/billing/checkout`, {
          method: "POST",
          headers: cabeceras(),
          body: JSON.stringify({
            plan: "pro",
            ciclo: "mensual",
            promo,
            facturacion: {
              nombre: fact.nombre.trim(),
              email: fact.email.trim(),
              pais: fact.pais,
              nif: fact.nif.trim() || null,
              direccion: fact.direccion.trim(),
              ciudad: fact.ciudad.trim(),
              cp: fact.cp.trim(),
            },
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.url) throw new Error(d.detail || "El proveedor no devolvió una sesión de pago.");
        window.location.href = d.url;
        return;
      }

      /* Sin proveedor: se registra una solicitud REAL y se dice exactamente eso. */
      const p = creaPedido({
        planId: "pro",
        ciclo: "mensual",
        subtotal: resumen.subtotal,
        descuento: resumen.descuento,
        total: resumen.total,
        promo,
        estado: "pendiente",
        fuente: "local",
        facturacion: { ...fact },
      });
      if (promo) marcaPromoUsada();
      vaciaCarrito();
      creaNotif({
        cat: "suscripcion",
        titulo: "Solicitud de Pro registrada",
        texto: `Referencia ${p.ref}. Queda pendiente de activación por el equipo: no se ha realizado ningún cobro.`,
        href: "#/panel",
      });
      setPedido(p);
      setPaso("listo");
      aviso?.(`solicitud ${p.ref} registrada`, "ok");
    } catch (e) {
      setError(e.message || "No se pudo completar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  if (paso === "listo" && pedido) {
    return (
      <div className="jns-pago">
        <div className="jns-gracias">
          <div className="jns-gracias-ico" aria-hidden>✓</div>
          <span className="jns-kicker">solicitud registrada</span>
          <h1>Gracias, {fact.nombre.split(" ")[0] || "crack"}.</h1>
          <p>
            Hemos guardado tu solicitud del plan <b>{pedido.planNombre}</b> con la referencia
            <b className="mono"> {pedido.ref}</b>. <b>No se ha realizado ningún cobro</b>: el servicio de
            pagos todavía no está conectado, así que el equipo revisará la solicitud y te escribirá
            a <b>{fact.email}</b> para activarla.
          </p>
          <dl className="jns-gracias-datos">
            <div><dt>Plan</dt><dd>{pedido.planNombre} · {pedido.ciclo}</dd></div>
            <div><dt>Importe acordado</dt><dd>{formateaEuros(pedido.total)}/mes</dd></div>
            <div><dt>Descuento</dt><dd>{pedido.descuento ? `−${formateaEuros(pedido.descuento)} (${CODIGO_BIENVENIDA})` : "Ninguno"}</dd></div>
            <div><dt>Estado</dt><dd>Pendiente de activación</dd></div>
          </dl>
          <div className="jns-gracias-acciones">
            <button type="button" className="jns-btn primario grande" onClick={() => { alTerminar?.(pedido); ir("/panel"); }}>
              Ir a mi panel <span aria-hidden>→</span>
            </button>
            <button type="button" className="jns-btn" onClick={() => ir("/panel/soporte")}>
              Escribir al equipo
            </button>
          </div>
          <p className="jns-mini">
            Guarda la referencia <b className="mono">{pedido.ref}</b>: la verás también en «Mi suscripción».
            Esta solicitud se guarda en tu navegador; si cambias de dispositivo, menciónala al escribirnos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="jns-pago">
      <header className="jns-pago-cab">
        <div>
          <span className="jns-kicker">contratar JumperNET</span>
          <h1>Tu suscripción, paso a paso</h1>
          <p className="jns-mini">Sin permanencia. Sin datos de tarjeta en esta web. Puedes revisar todo antes de confirmar.</p>
        </div>
        <ol className="jns-progreso" aria-label="Progreso de la contratación">
          {PASOS.map((p, i) => (
            <li key={p.id} className={i < idx ? "hecho" : i === idx ? "actual" : ""} aria-current={i === idx ? "step" : undefined}>
              <span className="mono">{i < idx ? "✓" : String(i + 1).padStart(2, "0")}</span>
              <b>{p.t}</b>
            </li>
          ))}
        </ol>
        <div className="jns-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(porcentaje)}>
          <i style={{ width: `${porcentaje}%` }} />
        </div>
      </header>

      <div className="jns-pago-rejilla">
        <section className="jns-pago-panel">
          {paso === "plan" && (
            <>
              <h2 className="jns-h2">Elige tu plan</h2>
              <p className="jns-mini">Solo el plan Pro se contrata en línea. Free se activa al crear la cuenta y Empresarial se acuerda con el equipo.</p>
              <div className="jns-pago-planes">
                {PLANES.map((p) => {
                  const elegido = resumen.item?.planId === p.id;
                  const comprable = p.id === "pro";
                  return (
                    <div key={p.id} className={`jns-pago-plan tono-${p.tono}${elegido ? " on" : ""}`}>
                      <div className="jns-pago-plan-cab">
                        <span aria-hidden>{p.ico}</span>
                        <b>{p.nombre}</b>
                        <span className="mono">{p.precioTexto}</span>
                      </div>
                      <p className="jns-mini">{p.resumen}</p>
                      {comprable ? (
                        <button
                          type="button"
                          className={`jns-btn${elegido ? "" : " primario"}`}
                          onClick={() => { anadePlan(p.id); setError(""); }}
                        >
                          {elegido ? "✓ En tu carrito" : "Elegir Pro"}
                        </button>
                      ) : (
                        <span className="jns-mini mono">{p.id === "free" ? "se activa al registrarte" : "se acuerda con el equipo"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {paso === "carrito" && (
            <>
              <h2 className="jns-h2">Revisa tu carrito</h2>
              {!resumen.item ? (
                <div className="jns-vacio">
                  <b>No hay ningún plan seleccionado</b>
                  <p>Vuelve al paso anterior y elige Pro.</p>
                  <button type="button" className="jns-btn" onClick={() => setPaso("plan")}>Elegir plan</button>
                </div>
              ) : (
                <>
                  <div className="jns-resumen-linea">
                    <span className="jns-resumen-ico" aria-hidden>{resumen.plan.ico}</span>
                    <div>
                      <b>{resumen.plan.nombre}</b>
                      <small className="mono">suscripción mensual · renovación automática</small>
                    </div>
                    <b className="mono">{formateaEuros(resumen.subtotal)}/mes</b>
                  </div>

                  <div className="jns-promo">
                    {resumen.hayPromo ? (
                      <div className="jns-promo-on">
                        <span className="jns-promo-sello mono">{CODIGO_BIENVENIDA}</span>
                        <span><b>−{resumen.pct} % aplicado</b><small>primera compra</small></span>
                        <button type="button" className="jns-link" onClick={quitaCodigo}>Quitar</button>
                      </div>
                    ) : (
                      <form onSubmit={aplicaCodigo} className="jns-promo-form">
                        <label htmlFor="jns-pago-codigo" className="jns-kicker">código promocional</label>
                        <div className="jns-promo-fila">
                          <input
                            id="jns-pago-codigo"
                            className="jns-input"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            placeholder={CODIGO_BIENVENIDA}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button type="submit" className="jns-btn" disabled={!codigo.trim()}>Aplicar</button>
                        </div>
                      </form>
                    )}
                    {avisoCodigo && <p className={`jns-mini ${avisoCodigo.tipo}`}>{avisoCodigo.texto}</p>}
                  </div>
                </>
              )}
            </>
          )}

          {paso === "facturacion" && (
            <>
              <h2 className="jns-h2">Datos de facturación</h2>
              <p className="jns-mini">Se usan para la factura. No guardamos datos de tarjeta.</p>
              <div className="jns-form">
                <label className="jns-campo">
                  <span>Nombre completo *</span>
                  <input className={`jns-input${errores.nombre ? " mal" : ""}`} value={fact.nombre}
                    onChange={(e) => cambia("nombre", e.target.value)} autoComplete="name" />
                  {errores.nombre && <small className="jns-error">{errores.nombre}</small>}
                </label>
                <label className="jns-campo">
                  <span>Correo electrónico *</span>
                  <input className={`jns-input${errores.email ? " mal" : ""}`} type="email" value={fact.email}
                    onChange={(e) => cambia("email", e.target.value)} autoComplete="email" />
                  {errores.email && <small className="jns-error">{errores.email}</small>}
                </label>
                <label className="jns-campo">
                  <span>País *</span>
                  <select className={`jns-input${errores.pais ? " mal" : ""}`} value={fact.pais}
                    onChange={(e) => cambia("pais", e.target.value)} autoComplete="country-name">
                    {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errores.pais && <small className="jns-error">{errores.pais}</small>}
                </label>
                <label className="jns-campo">
                  <span>NIF / CIF <em className="mono">opcional</em></span>
                  <input className={`jns-input${errores.nif ? " mal" : ""}`} value={fact.nif}
                    onChange={(e) => cambia("nif", e.target.value)} autoComplete="off" />
                  {errores.nif && <small className="jns-error">{errores.nif}</small>}
                </label>
                <label className="jns-campo jns-campo-ancho">
                  <span>Dirección *</span>
                  <input className={`jns-input${errores.direccion ? " mal" : ""}`} value={fact.direccion}
                    onChange={(e) => cambia("direccion", e.target.value)} autoComplete="street-address" />
                  {errores.direccion && <small className="jns-error">{errores.direccion}</small>}
                </label>
                <label className="jns-campo">
                  <span>Ciudad *</span>
                  <input className={`jns-input${errores.ciudad ? " mal" : ""}`} value={fact.ciudad}
                    onChange={(e) => cambia("ciudad", e.target.value)} autoComplete="address-level2" />
                  {errores.ciudad && <small className="jns-error">{errores.ciudad}</small>}
                </label>
                <label className="jns-campo">
                  <span>Código postal *</span>
                  <input className={`jns-input${errores.cp ? " mal" : ""}`} value={fact.cp}
                    onChange={(e) => cambia("cp", e.target.value)} autoComplete="postal-code" />
                  {errores.cp && <small className="jns-error">{errores.cp}</small>}
                </label>
              </div>
            </>
          )}

          {paso === "pago" && (
            <>
              <h2 className="jns-h2">Método de pago</h2>
              {billing.comprobando ? (
                <p className="jns-mini"><span className="spin" /> Comprobando el servicio de pagos…</p>
              ) : billing.disponible ? (
                <div className="jns-metodo on">
                  <span className="jns-metodo-ico" aria-hidden>▣</span>
                  <span>
                    <b>Tarjeta · {billing.proveedor}</b>
                    <small className="mono">
                      Pago seguro en modo {billing.modo === "test" ? "pruebas" : "real"} · te redirigimos al proveedor
                    </small>
                  </span>
                  <span className="jns-chip vivo mono">disponible</span>
                </div>
              ) : (
                <>
                  <div className="jns-metodo on">
                    <span className="jns-metodo-ico" aria-hidden>✉</span>
                    <span>
                      <b>Solicitud de activación</b>
                      <small>El equipo revisa tu solicitud y te escribe para completar el pago</small>
                    </span>
                    <span className="jns-chip mono">sin cobro</span>
                  </div>
                  <div className="jns-metodo">
                    <span className="jns-metodo-ico" aria-hidden>▤</span>
                    <span>
                      <b>Tarjeta con Stripe Checkout</b>
                      <small>{billing.motivo || "Pendiente de configurar en el backend."}</small>
                    </span>
                    <span className="jns-chip muerto mono">no disponible</span>
                  </div>
                </>
              )}
              <p className="jns-mini">
                JumperNET nunca pide el número completo de tu tarjeta, el CVV ni claves bancarias.
                Si algún día ves un formulario así en nuestro nombre, cierra la página y avísanos.
              </p>
            </>
          )}

          {paso === "confirmar" && (
            <>
              <h2 className="jns-h2">Confirma tu solicitud</h2>
              <div className="jns-confirma">
                <div className="jns-confirma-fila"><span>Plan</span><b>{resumen.plan?.nombre}</b></div>
                <div className="jns-confirma-fila"><span>Periodo</span><b>Mensual · renovación automática</b></div>
                <div className="jns-confirma-fila"><span>Titular</span><b>{fact.nombre}</b></div>
                <div className="jns-confirma-fila"><span>Correo</span><b>{fact.email}</b></div>
                <div className="jns-confirma-fila"><span>Dirección</span><b>{fact.direccion}, {fact.cp} {fact.ciudad} ({fact.pais})</b></div>
                <div className="jns-confirma-fila"><span>Método</span><b>{billing.disponible ? "Stripe Checkout" : "Solicitud de activación (sin cobro ahora)"}</b></div>
                <div className="jns-confirma-fila total"><span>Importe</span><b>{formateaEuros(resumen.total)}/mes</b></div>
              </div>

              <label className="jns-check">
                <input type="checkbox" checked={acepta} onChange={(e) => { setAcepta(e.target.checked); setError(""); }} />
                <span>
                  He leído las condiciones y acepto la política de privacidad. Entiendo que
                  {billing.disponible
                    ? " el cobro lo gestiona el proveedor de pagos y puedo cancelar la renovación cuando quiera."
                    : " esta solicitud no realiza ningún cobro y queda pendiente de que el equipo la active."}
                </span>
              </label>

              <div className="jns-aviso-info">
                <span aria-hidden>i</span>
                <span>
                  La renovación es mensual. Puedes cancelarla en «Mi suscripción» sin penalización.
                  {resumen.hayPromo && ` El descuento de bienvenida (−${formateaEuros(resumen.descuento)}) se aplica solo a este primer mes.`}
                </span>
              </div>
            </>
          )}

          {error && <p className="jns-error-caja" role="alert">⚠ {error}</p>}

          {paso !== "plan" && paso !== "listo" && paso !== "confirmar" && (
            <div className="jns-pago-nav">
              <button type="button" className="jns-btn" onClick={atras}>← Atrás</button>
              <button type="button" className="jns-btn primario" onClick={sigue}>
                {paso === "pago" ? "Revisar y confirmar" : "Continuar"} <span aria-hidden>→</span>
              </button>
            </div>
          )}

          {paso === "plan" && (
            <div className="jns-pago-nav">
              <button type="button" className="jns-btn" onClick={() => ir("/tarifas")}>Volver a tarifas</button>
              <button type="button" className="jns-btn primario" onClick={sigue} disabled={!resumen.item}>
                Continuar <span aria-hidden>→</span>
              </button>
            </div>
          )}

          {paso === "confirmar" && (
            <div className="jns-pago-nav">
              <button type="button" className="jns-btn" onClick={atras} disabled={cargando}>← Atrás</button>
              <button type="button" className="jns-btn primario grande" onClick={confirma} disabled={cargando}>
                {cargando ? <><span className="spin" /> Procesando…</> : billing.disponible ? "Ir al pago seguro →" : "Registrar mi solicitud →"}
              </button>
            </div>
          )}
        </section>

        <aside className="jns-pago-resumen" aria-label="Resumen del pedido">
          <span className="jns-kicker">resumen del pedido</span>
          {resumen.item ? (
            <>
              <div className="jns-pago-resumen-plan">
                <span aria-hidden>{resumen.plan.ico}</span>
                <div><b>{resumen.plan.nombre}</b><small className="mono">mensual</small></div>
              </div>
              <dl className="jns-totales">
                <div><dt>Subtotal</dt><dd className="mono">{formateaEuros(resumen.subtotal)}</dd></div>
                {resumen.hayPromo && (
                  <div className="descuento"><dt>Bienvenida {resumen.pct} %</dt><dd className="mono">−{formateaEuros(resumen.descuento)}</dd></div>
                )}
                <div className="total"><dt>Importe final</dt><dd className="mono">{formateaEuros(resumen.total)}<small>/mes</small></dd></div>
              </dl>
              <ul className="jns-pago-incluye">
                {resumen.plan.exclusivo.map((x) => <li key={x}><span aria-hidden>✓</span>{x}</li>)}
              </ul>
            </>
          ) : (
            <p className="jns-mini">Todavía no has elegido plan.</p>
          )}
          <p className="jns-mini jns-pago-nota">
            <span aria-hidden>🔒</span> Sin datos bancarios en JumperNET. El cobro, cuando exista,
            ocurre en la pasarela del proveedor.
          </p>
        </aside>
      </div>
    </div>
  );
}

function cabeceras() {
  const cab = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) cab.Authorization = "Bearer " + token;
  return cab;
}
