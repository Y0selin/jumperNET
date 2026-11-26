import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, getToken, nodos as nodosApi, nodosVivos } from "../lib/api.js";
import { DUDAS } from "../lib/contenido.js";
import { GITHUB_URL, DOCS_URL } from "../lib/enlaces.js";
import { formateaFecha } from "../lib/suscripcion.js";
import { creaNotif } from "../lib/notificaciones.js";

/* Contacto y soporte.
 *
 * Si el backend expone POST /soporte, la consulta se envía y se guarda con la
 * referencia que devuelve. Si no existe, la web NO finge el envío: guarda un
 * borrador, permite copiarlo y ofrece el canal real (GitHub / correo) para
 * hacerlo llegar. Las solicitudes viven en este navegador.
 */

const CLAVE = "jumpernet-solicitudes-v1";

const CATEGORIAS = [
  "Información general",
  "Problemas de conexión",
  "Problemas con nodos",
  "Pagos y facturación",
  "Suscripciones",
  "Sugerencias",
  "Errores de la plataforma",
  "Consultas técnicas",
  "Colaboraciones",
];

const PRIORIDADES = [
  { id: "baja", t: "Baja", d: "Puede esperar" },
  { id: "media", t: "Media", d: "Me afecta, pero puedo seguir" },
  { id: "alta", t: "Alta", d: "No puedo usar la plataforma" },
];

const GUIA = [
  { so: "Windows", pasos: ["Descarga JumperNET-Agent.exe desde Descargas.", "Ejecútalo con tu token de peer (lo verás en Nodos).", "En el navegador, carga la extensión en chrome://extensions con el modo de desarrollador.", "En el popup de la extensión, entra con tu correo y contraseña."] },
  { so: "Linux", pasos: ["Descarga agente_salida.py y ejecútalo con python3.", "O usa el AppImage del navegador JumperNET.", "Comprueba el proxy SOCKS5 en 127.0.0.1:1080 si usas el relé local.", "Verifica la IP de salida desde el panel de red."] },
  { so: "macOS", pasos: ["Descarga la extensión y cárgala como complemento temporal.", "Configura el proxy SOCKS5 con el host y tu cuenta.", "Comprueba la salida con «Comprobar de verdad».", "Si falla, revisa que el puerto 1080 no esté ocupado."] },
];

const EXTRA_FAQ = [
  ["¿Cómo funciona el descuento de bienvenida?", "El código BIENVENIDA10 aplica un 10 % a la primera suscripción de pago. Se puede usar una sola vez por cuenta y no se acumula con otras ofertas. Si no completas la compra, sigue disponible."],
  ["¿Puedo pagar con tarjeta?", "Todavía no hay pasarela de pago conectada. Cuando exista, el cobro se hará con Stripe Checkout en modo seguro: JumperNET no verá ni guardará tu tarjeta."],
  ["¿Qué pasa si cancelo la renovación?", "El plan sigue activo hasta el final del periodo acordado y no se vuelve a cobrar. Puedes reactivarlo desde «Mi suscripción»."],
  ["¿Guarda JumperNET mi historial de navegación?", "No. Se guarda el estado del circuito y los datos de la cuenta. No hay registro de webs ni de destinos, y puedes borrar la cuenta entera."],
];

function leeSolicitudes() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

function guardaSolicitudes(lista) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, 30))); } catch { /* privado */ }
}

function nuevaRef() {
  return `JN-S-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export default function Soporte({ yo, aviso, publico = false }) {
  const [nombre, setNombre] = useState(yo?.alias || "");
  const [email, setEmail] = useState(yo?.email || "");
  const [asunto, setAsunto] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [prioridad, setPrioridad] = useState("media");
  const [mensaje, setMensaje] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [solicitudes, setSolicitudes] = useState(leeSolicitudes);
  const [buscaFaq, setBuscaFaq] = useState("");
  const [consulta, setConsulta] = useState("");
  const [consultaRes, setConsultaRes] = useState(undefined);
  const [estadoApi, setEstadoApi] = useState({ cargando: true, ms: null, vivos: null });
  const [copiado, setCopiado] = useState(false);
  const trampa = useRef("");
  const montado = useRef(Date.now());

  useEffect(() => {
    if (yo?.alias) setNombre((n) => n || yo.alias);
    if (yo?.email) setEmail((e) => e || yo.email);
  }, [yo?.alias, yo?.email]);

  useEffect(() => {
    let vivo = true;
    async function mide() {
      const t0 = performance.now();
      const [ns, v] = await Promise.allSettled([nodosApi(), nodosVivos()]);
      if (!vivo) return;
      setEstadoApi({
        cargando: false,
        ms: Math.round(performance.now() - t0),
        vivos: v.status === "fulfilled" ? v.value?.total ?? null : null,
        nodosOk: ns.status === "fulfilled",
      });
    }
    mide();
    return () => { vivo = false; };
  }, []);

  const faq = useMemo(() => {
    const todas = [...DUDAS, ...EXTRA_FAQ];
    const q = buscaFaq.trim().toLowerCase();
    if (!q) return todas;
    return todas.filter(([t, d]) => `${t} ${d}`.toLowerCase().includes(q));
  }, [buscaFaq]);

  function valida() {
    const e = {};
    if (nombre.trim().length < 2) e.nombre = "Escribe tu nombre.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = "Ese correo no parece válido.";
    if (asunto.trim().length < 4) e.asunto = "Resume el tema en al menos 4 caracteres.";
    if (mensaje.trim().length < 20) e.mensaje = "Cuéntanos un poco más (mínimo 20 caracteres).";
    if (!acepta) e.acepta = "Necesitamos tu aceptación para tratar la consulta.";
    return e;
  }

  function textoConsulta() {
    return [
      `Asunto: ${asunto}`,
      `Categoría: ${categoria}`,
      `Prioridad: ${prioridad}`,
      `Nombre: ${nombre}`,
      `Correo: ${email}`,
      "",
      mensaje,
      "",
      "— Enviado desde el formulario de JumperNET",
    ].join("\n");
  }

  async function envia(ev) {
    ev.preventDefault();
    /* Anti-spam sin molestar a nadie: campo trampa oculto + tiempo mínimo. */
    if (trampa.current) return;
    if (Date.now() - montado.current < 2500) {
      setResultado({ tipo: "error", texto: "Espera un par de segundos antes de enviar: es una protección antispam." });
      return;
    }
    const e = valida();
    if (Object.keys(e).length) {
      setErrores(e);
      setResultado({ tipo: "error", texto: "Revisa los campos marcados." });
      return;
    }
    setErrores({});
    setEnviando(true);
    setResultado(null);

    const payload = {
      nombre: nombre.trim(),
      email: email.trim(),
      asunto: asunto.trim(),
      categoria,
      prioridad,
      mensaje: mensaje.trim(),
      acepta_privacidad: true,
      origen: publico ? "web-publica" : "panel",
    };

    try {
      const r = await fetch(`${API_URL}/soporte`, {
        method: "POST",
        headers: cabeceras(),
        body: JSON.stringify(payload),
      });
      if (r.status === 404 || r.status === 501) throw new Error("sin-servicio");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`);

      const ref = d.ref || nuevaRef();
      const ticket = {
        ref,
        fecha: Date.now(),
        asunto: payload.asunto,
        categoria,
        prioridad,
        estado: d.estado || "pendiente",
        enviado: true,
        mensaje: payload.mensaje,
      };
      const lista = [ticket, ...solicitudes];
      setSolicitudes(lista);
      guardaSolicitudes(lista);
      creaNotif({
        cat: "soporte",
        titulo: "Solicitud enviada",
        texto: `${ref} · ${payload.asunto}`,
        href: "#/panel/soporte",
      });
      setResultado({ tipo: "ok", texto: `Solicitud enviada. Referencia ${ref}.`, ticket });
      setAsunto("");
      setMensaje("");
      setAcepta(false);
      aviso?.("consulta enviada", "ok");
    } catch (err) {
      if (err.message === "sin-servicio") {
        /* Se guarda como borrador y se dice la verdad: no se ha enviado. */
        const ref = nuevaRef();
        const ticket = {
          ref,
          fecha: Date.now(),
          asunto: payload.asunto,
          categoria,
          prioridad,
          estado: "borrador",
          enviado: false,
          mensaje: payload.mensaje,
        };
        const lista = [ticket, ...solicitudes];
        setSolicitudes(lista);
        guardaSolicitudes(lista);
        setResultado({
          tipo: "sin-servicio",
          texto: "El servicio de envío aún no está configurado: tu consulta NO se ha enviado a JumperNET.",
          ticket,
        });
      } else {
        setResultado({ tipo: "error", texto: `No se pudo enviar (${err.message}). Inténtalo de nuevo o usa el canal alternativo.` });
      }
    } finally {
      setEnviando(false);
    }
  }

  async function copia() {
    const texto = textoConsulta();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setResultado({ tipo: "error", texto: "No se pudo copiar. Selecciona el texto y cópialo a mano." });
    }
  }

  function buscaSolicitud(ev) {
    ev.preventDefault();
    const ref = consulta.trim().toUpperCase();
    const t = solicitudes.find((s) => s.ref.toUpperCase() === ref);
    setConsultaRes(t || null);
  }

  const asuntoIssue = encodeURIComponent(`[Soporte] ${asunto || categoria}`);
  const cuerpoIssue = encodeURIComponent(
    `${mensaje}\n\n—\nCategoría: ${categoria}\nPrioridad: ${prioridad}\nContacto: ${email}\n(Enviado desde el formulario web de JumperNET)`
  );

  return (
    <div className={`jns-soporte${publico ? " publico" : ""}`}>
      <header className="jns-cab">
        <div>
          <span className="jns-kicker">ayuda</span>
          <h1>Contacto y soporte</h1>
          <p className="jns-mini">
            Cuéntanos qué pasa. Si la consulta necesita datos de tu cuenta, la revisamos contigo:
            nunca te pediremos la contraseña ni datos de tarjeta.
          </p>
        </div>
        {!publico && (
          <button type="button" className="jns-btn" onClick={() => document.getElementById("jns-form-soporte")?.scrollIntoView({ behavior: "smooth" })}>
            Escribir consulta
          </button>
        )}
      </header>

      <section className="jns-panel" id="jns-estado">
        <div className="jns-panel-cab">
          <div><span className="jns-kicker">en vivo</span><h2>Estado del servicio</h2></div>
          <span className={`jns-chip ${estadoApi.ms != null && estadoApi.nodosOk ? "vivo" : "aviso"} mono`}>
            {estadoApi.cargando ? "midiendo" : estadoApi.nodosOk ? "operativo" : "sin datos"}
          </span>
        </div>
        <div className="jns-estado-tres">
          <div><span className="jns-mini">API</span><b className="mono">{estadoApi.ms != null ? `${estadoApi.ms} ms` : "…"}</b></div>
          <div><span className="jns-mini">Nodos vivos</span><b className="mono">{estadoApi.vivos ?? "—"}</b></div>
          <div><span className="jns-mini">Pagos en línea</span><b>No conectados</b></div>
        </div>
        <p className="jns-mini">Medido ahora desde tu navegador contra la API pública. No es una estimación.</p>
      </section>

      <div className="jns-soporte-rejilla">
        <section className="jns-panel" id="jns-form-soporte">
          <div className="jns-panel-cab">
            <div><span className="jns-kicker">formulario</span><h2>Escríbenos</h2></div>
          </div>

          <form className="jns-form" onSubmit={envia} noValidate>
            <div className="jns-campo-fila">
              <label className="jns-campo">
                <span>Nombre *</span>
                <input className={`jns-input${errores.nombre ? " mal" : ""}`} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
                {errores.nombre && <small className="jns-error">{errores.nombre}</small>}
              </label>
              <label className="jns-campo">
                <span>Correo *</span>
                <input className={`jns-input${errores.email ? " mal" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                {errores.email && <small className="jns-error">{errores.email}</small>}
              </label>
            </div>

            <label className="jns-campo">
              <span>Asunto *</span>
              <input className={`jns-input${errores.asunto ? " mal" : ""}`} value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={90} />
              {errores.asunto && <small className="jns-error">{errores.asunto}</small>}
            </label>

            <div className="jns-campo-fila">
              <label className="jns-campo">
                <span>Categoría</span>
                <select className="jns-input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="jns-campo">
                <span>Prioridad</span>
                <select className="jns-input" value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                  {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.t} — {p.d}</option>)}
                </select>
              </label>
            </div>

            <label className="jns-campo">
              <span>Mensaje *</span>
              <textarea className={`jns-input jns-textarea${errores.mensaje ? " mal" : ""}`} rows={6} value={mensaje}
                onChange={(e) => setMensaje(e.target.value)} maxLength={2000}
                placeholder="Qué estabas haciendo, qué esperabas y qué ocurrió. Sin contraseñas ni datos de tarjeta." />
              <small className="jns-mini">{mensaje.length}/2000</small>
              {errores.mensaje && <small className="jns-error">{errores.mensaje}</small>}
            </label>

            <label className="jns-trampa" aria-hidden="true">
              <span>No rellenar</span>
              <input tabIndex={-1} autoComplete="off" onChange={(e) => { trampa.current = e.target.value; }} />
            </label>

            <label className="jns-check">
              <input type="checkbox" checked={acepta} onChange={(e) => { setAcepta(e.target.checked); setErrores((x) => ({ ...x, acepta: undefined })); }} />
              <span>He leído la política de privacidad y acepto que se trate mi consulta para responderla. *</span>
            </label>
            {errores.acepta && <p className="jns-error">{errores.acepta}</p>}

            <div className="jns-aviso-info compacto">
              <span aria-hidden>i</span>
              <span>Adjuntar archivos requiere un almacenamiento seguro que aún no está configurado. Si necesitas enviar un archivo, indícalo y te decimos cómo.</span>
            </div>

            <button type="submit" className="jns-btn primario grande" disabled={enviando}>
              {enviando ? <><span className="spin" /> Enviando…</> : "Enviar consulta"}
            </button>
          </form>

          {resultado && (
            <div className={`jns-resultado ${resultado.tipo}`} role="status">
              <b>{resultado.tipo === "ok" ? "✓ Consulta enviada" : resultado.tipo === "sin-servicio" ? "! Sin servicio de envío" : "⚠ No se pudo enviar"}</b>
              <p>{resultado.texto}</p>
              {resultado.tipo === "sin-servicio" && (
                <>
                  <p className="jns-mini">
                    Tu texto está guardado como borrador con la referencia <b className="mono">{resultado.ticket.ref}</b>.
                    Para hacerlo llegar al equipo, copia la consulta y envíala por el canal real; no mostramos
                    una confirmación que no ha ocurrido.
                  </p>
                  <div className="jns-resultado-acciones">
                    <button type="button" className="jns-btn" onClick={copia}>{copiado ? "✓ Copiado" : "Copiar consulta"}</button>
                    <a className="jns-btn" href={`${GITHUB_URL}/issues/new?title=${asuntoIssue}&body=${cuerpoIssue}`} target="_blank" rel="noreferrer">
                      Abrir incidencia ↗
                    </a>
                  </div>
                  <p className="jns-mini">
                    El issue es público: no incluyas datos personales. Para temas privados, espera a que
                    el correo de soporte esté habilitado.
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="jns-soporte-lado">
          <section className="jns-panel">
            <div className="jns-panel-cab"><div><span className="jns-kicker">solicitudes</span><h2>Mis solicitudes</h2></div></div>
            <form onSubmit={buscaSolicitud} className="jns-promo-fila">
              <input className="jns-input" value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="JN-S-XXXXXX" aria-label="Buscar solicitud por referencia" />
              <button type="submit" className="jns-btn">Buscar</button>
            </form>
            {consultaRes === null && <p className="jns-mini">No hay ninguna solicitud con esa referencia en este navegador.</p>}
            {consultaRes && (
              <div className="jns-ticket">
                <b className="mono">{consultaRes.ref}</b>
                <span>{consultaRes.asunto}</span>
                <span className={`jns-chip mono ${consultaRes.enviado ? "vivo" : "aviso"}`}>{consultaRes.estado}</span>
                <small className="jns-mini">{formateaFecha(consultaRes.fecha)} · {consultaRes.categoria}</small>
              </div>
            )}
            <ul className="jns-solicitudes">
              {solicitudes.length === 0 && <li className="jns-mini">Aún no has creado ninguna solicitud.</li>}
              {solicitudes.slice(0, 5).map((s) => (
                <li key={s.ref}>
                  <span className="mono">{s.ref}</span>
                  <span>{s.asunto}</span>
                  <span className={`jns-chip mono ${s.enviado ? "vivo" : "aviso"}`}>{s.estado}</span>
                </li>
              ))}
            </ul>
            <p className="jns-mini">Las solicitudes se guardan en este navegador; no hay un sistema de tickets en el servidor todavía.</p>
          </section>

          <section className="jns-panel">
            <div className="jns-panel-cab"><div><span className="jns-kicker">guías</span><h2>Configuración por sistema</h2></div></div>
            <div className="jns-guias">
              {GUIA.map((g) => (
                <details key={g.so}>
                  <summary>{g.so}</summary>
                  <ol>{g.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
                </details>
              ))}
            </div>
            <a className="jns-link" href={DOCS_URL} target="_blank" rel="noreferrer">Documentación completa ↗</a>
          </section>
        </aside>
      </div>

      <section className="jns-panel jns-ancho" id="jns-faq">
        <div className="jns-panel-cab">
          <div><span className="jns-kicker">respuestas</span><h2>Preguntas frecuentes</h2></div>
          <input className="jns-input jns-busca-faq" value={buscaFaq} onChange={(e) => setBuscaFaq(e.target.value)} placeholder="Buscar una solución…" aria-label="Buscar en las preguntas frecuentes" />
        </div>
        <div className="jns-faq-lista">
          {faq.length === 0 && <p className="jns-mini">No hay respuestas para esa búsqueda. Escríbenos arriba.</p>}
          {faq.map(([t, d]) => (
            <details key={t} className="jns-faq-item">
              <summary>{t}</summary>
              <p>{d}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function cabeceras() {
  const cab = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) cab.Authorization = "Bearer " + token;
  return cab;
}
