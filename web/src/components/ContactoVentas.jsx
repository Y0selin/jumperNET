import { useEffect, useState } from "react";

/* Formulario comercial. No hay servicio de envío conectado en el proyecto,
   así que preparamos un correo real en el cliente del usuario y lo decimos
   sin fingir una confirmación que no hemos recibido. */

const DESTINO = "diseo-jumpernat-admin@jumpernet.local";

const NECESIDADES = [
  "Circuito y saltos",
  "Salidas dedicadas",
  "Capacidad y consumos",
  "Integración con nuestro equipo",
  "Otra cosa",
];

export default function ContactoVentas({ abierto, cerrar }) {
  const [datos, setDatos] = useState({ nombre: "", email: "", empresa: "", necesidad: NECESIDADES[0], mensaje: "", privacidad: false });
  const [error, setError] = useState("");
  const [preparado, setPreparado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", alPulsar);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alPulsar); document.body.style.overflow = ""; };
  }, [abierto, cerrar]);

  useEffect(() => {
    if (!abierto) { setPreparado(false); setCopiado(false); setError(""); }
  }, [abierto]);

  const cambia = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function envia(e) {
    e.preventDefault();
    setError("");
    if (datos.nombre.trim().length < 2) return setError("escribe tu nombre");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.email.trim())) return setError("revisa el correo electrónico");
    if (datos.mensaje.trim().length < 15) return setError("cuéntanos un poco más (mínimo 15 caracteres)");
    if (!datos.privacidad) return setError("necesitamos que aceptes la política de privacidad");

    const cuerpo = [
      `Nombre: ${datos.nombre.trim()}`,
      `Correo: ${datos.email.trim()}`,
      `Empresa: ${datos.empresa.trim() || "—"}`,
      `Necesidad: ${datos.necesidad}`,
      "",
      datos.mensaje.trim(),
      "",
      "Enviado desde el formulario de Plan Empresarial de JumperNET.",
    ].join("\n");

    const url = `mailto:${DESTINO}?subject=${encodeURIComponent("Plan Empresarial JumperNET · " + datos.nombre.trim())}&body=${encodeURIComponent(cuerpo)}`;
    setPreparado(true);
    window.location.href = url;
  }

  async function copiar() {
    const texto = `Nombre: ${datos.nombre}\nCorreo: ${datos.email}\nEmpresa: ${datos.empresa || "—"}\nNecesidad: ${datos.necesidad}\n\n${datos.mensaje}`;
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }
    catch { setError("no se pudo copiar; selecciona el texto a mano"); }
  }

  return (
    <div className={`jn-capa jn-capa-centro ${abierto ? "abierta" : ""}`} aria-hidden={!abierto}>
      <button type="button" className="jn-capa-fondo" onClick={cerrar} tabIndex={abierto ? 0 : -1} aria-label="Cerrar el formulario" />
      <section className="jn-modal jn-ventas" role="dialog" aria-modal="true" aria-labelledby="jn-ventas-titulo">
        <header className="jn-modal-cab">
          <div>
            <span className="jn-eyebrow"><i aria-hidden /> plan empresarial</span>
            <h2 id="jn-ventas-titulo">Hablemos de tu red</h2>
            <p>Cuéntanos qué necesitas y el equipo responde con una propuesta concreta. Sin alta automática.</p>
          </div>
          <button type="button" className="jn-cerrar" onClick={cerrar} aria-label="Cerrar el formulario">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>

        {preparado ? (
          <div className="jn-ventas-preparado">
            <span className="jn-ventas-check" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
            </span>
            <h3>Mensaje preparado en tu correo</h3>
            <p>
              Hemos abierto tu cliente de correo con los datos. <b>No hay ningún servicio de envío
              conectado en esta web</b>, así que no podemos confirmar que se haya enviado: dale a
              enviar desde tu aplicación.
            </p>
            <div className="jn-ventas-acciones">
              <button type="button" className="jn-btn jn-btn-suave" onClick={copiar}>{copiado ? "Copiado ✓" : "Copiar el mensaje"}</button>
              <a className="jn-btn jn-btn-pro" href={`mailto:${DESTINO}`}>Abrir el correo otra vez</a>
            </div>
            <p className="jn-ventas-dir mono">{DESTINO}</p>
          </div>
        ) : (
          <form className="jn-form" onSubmit={envia} noValidate>
            <div className="jn-form-dos">
              <label>
                <span>Nombre *</span>
                <input value={datos.nombre} onChange={cambia("nombre")} autoComplete="name" placeholder="Cómo te llamas" maxLength={60} />
              </label>
              <label>
                <span>Correo electrónico *</span>
                <input type="email" value={datos.email} onChange={cambia("email")} autoComplete="email" placeholder="tu@empresa.com" maxLength={120} />
              </label>
            </div>
            <div className="jn-form-dos">
              <label>
                <span>Empresa <em>opcional</em></span>
                <input value={datos.empresa} onChange={cambia("empresa")} autoComplete="organization" placeholder="Nombre de la empresa" maxLength={80} />
              </label>
              <label>
                <span>Necesidad principal</span>
                <select value={datos.necesidad} onChange={cambia("necesidad")}>
                  {NECESIDADES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>Mensaje *</span>
              <textarea rows="4" value={datos.mensaje} onChange={cambia("mensaje")} placeholder="Número de personas, uso previsto, plazos…" maxLength={1200} />
            </label>
            <label className="jn-check">
              <input type="checkbox" checked={datos.privacidad} onChange={cambia("privacidad")} />
              <span>Acepto la política de privacidad y el uso de estos datos solo para responder a mi consulta.</span>
            </label>
            {error && <p className="jn-form-error" role="alert">{error}</p>}
            <div className="jn-form-pie">
              <span className="jn-form-nota mono">respuesta del equipo · sin cobro automático</span>
              <button type="submit" className="jn-btn jn-btn-pro">Preparar el mensaje <span aria-hidden>→</span></button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
