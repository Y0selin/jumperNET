import { useEffect, useState } from "react";
import GlifosFondo from "./components/GlifosFondo.jsx";
import Nieve from "./components/Nieve.jsx";
import Logo from "./components/Logo.jsx";
import BotonModo from "./components/BotonModo.jsx";
import Ajustes from "./components/Ajustes.jsx";
import Descargas from "./components/Descargas.jsx";
import Red from "./components/Red.jsx";
import Nodos from "./components/Nodos.jsx";
import Cuenta from "./components/Cuenta.jsx";
import Admin from "./components/Admin.jsx";
import Sitio from "./components/Sitio.jsx";
import Inicio from "./pages/Inicio.jsx";
import Proyecto from "./pages/Proyecto.jsx";
import EquipoPagina from "./pages/EquipoPagina.jsx";
import Usos from "./pages/Usos.jsx";
import Recursos from "./pages/Recursos.jsx";
import Funciona from "./pages/Funciona.jsx";
import TarifasPagina from "./pages/TarifasPagina.jsx";
import Dudas from "./pages/Dudas.jsx";
import DescargasPagina from "./pages/DescargasPagina.jsx";
import VideoPagina from "./pages/VideoPagina.jsx";
import Laboratorio from "./pages/Laboratorio.jsx";
import Acceso from "./pages/Acceso.jsx";
import MenuPanel from "./components/MenuPanel.jsx";
import Dashboard from "./components/Dashboard.jsx";
import MiSuscripcion from "./components/MiSuscripcion.jsx";
import Pasarela from "./components/Pasarela.jsx";
import Soporte from "./components/Soporte.jsx";
import Tarifas from "./components/Tarifas.jsx";
import { BotonCarrito, PanelCarrito } from "./components/Carrito.jsx";
import { BotonCampana, PanelNotificaciones } from "./components/Notificaciones.jsx";
import { useRuta, baseRuta, ir } from "./lib/router.js";
import { me, setToken, getToken, getUsuarioGuardado, guardaUsuario } from "./lib/api.js";
import { aplicaTema, cargaTema } from "./lib/temas.js";
import { aplicaModo, cargaModo } from "./lib/modo.js";
import { useNotificaciones } from "./lib/notificaciones.js";
import { planDe, puede } from "./lib/planes.js";
import { estadoSuscripcion } from "./lib/suscripcion.js";
import { datosHoy } from "./lib/fecha.js";
import { VERSION } from "./lib/version.js";

const TABS = {
  inicio: { t: "Inicio", prompt: "status --inicio" },
  red: { t: "Panel de red", prompt: "status --red" },
  nodos: { t: "Gestor de nodos", prompt: "ls -la nodos/" },
  descargas: { t: "Descargas", prompt: "ls -la descargas/" },
  cuenta: { t: "Mi cuenta", prompt: "whoami --editar" },
  ajustes: { t: "Apariencia", prompt: "theme --editar" },
  admin: { t: "Administración", prompt: "sudo panel-admin --rol admin" },
  suscripcion: { t: "Mi suscripción", prompt: "billing --estado" },
  soporte: { t: "Contacto y soporte", prompt: "soporte --nueva" },
  pago: { t: "Contratar Pro", prompt: "checkout --plan pro" },
};

export default function App() {
  const ruta = useRuta();
  const activa = baseRuta(ruta);
  const esPanel = activa === "/panel";

  const [yo, setYo] = useState(() => (getToken() ? getUsuarioGuardado() : null));
  const [cargandoCuenta, setCargandoCuenta] = useState(() => !!getToken());
  const [tab, setTab] = useState("inicio");
  const [enfoque, setEnfoque] = useState(() => {
    try { return localStorage.getItem("jumpernet-enfoque") === "1"; } catch { return false; }
  });
  const [toasts, setToasts] = useState([]);
  const [lateral, setLateral] = useState(false);
  const [pegada, setPegada] = useState(false);
  const [modalPlan, setModalPlan] = useState(false);
  const { noLeidas } = useNotificaciones();

  function cargaCuenta() {
    if (!getToken()) { setYo(null); setCargandoCuenta(false); return Promise.resolve(null); }
    setCargandoCuenta(true);
    return me()
      .then((d) => { setYo(d); guardaUsuario(d); return d; })
      .catch(() => {
        const guardado = getUsuarioGuardado();
        if (guardado) setYo(guardado);
        return null;
      })
      .finally(() => setCargandoCuenta(false));
  }

  useEffect(() => { aplicaTema(cargaTema()); aplicaModo(cargaModo()); }, []);
  useEffect(() => {
    if (!getToken()) { setCargandoCuenta(false); return; }
    cargaCuenta();
  }, []);
  useEffect(() => {
    try { localStorage.setItem("jumpernet-enfoque", enfoque ? "1" : "0"); } catch { /* privado */ }
  }, [enfoque]);
  useEffect(() => {
    const alScroll = () => setPegada(window.scrollY > 12);
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);
  useEffect(() => {
    const alMover = (e) => {
      const t = e.target && e.target.closest ? e.target.closest(".tarjeta, .jns-card") : null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", alMover, { passive: true });
    return () => window.removeEventListener("pointermove", alMover);
  }, []);

  useEffect(() => {
    if (esPanel && !getToken()) ir("/acceso/login");
    if (esPanel) document.title = `${TABS[tab]?.t || "Panel"} · JumperNET`;
  }, [esPanel, tab]);

  /* «Notificaciones» del menú abre el panel lateral sin sacarte de la página. */
  useEffect(() => {
    if (tab === "notificaciones") {
      window.dispatchEvent(new Event("jumpernet-abrir-notificaciones"));
      setTab("inicio");
    }
  }, [tab]);

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  function aviso(texto, tipo = "ok") {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3800);
  }
  function salir() { setToken(null); setYo(null); setCargandoCuenta(false); setLateral(false); ir("/"); }
  function alEntrar() {
    setCargandoCuenta(true);
    me().then((d) => {
      const nombre = d?.alias || (d?.email || "").split("@")[0] || "tú";
      setYo(d); guardaUsuario(d); setTab("inicio"); ir("/panel");
      aviso(`¡Hola, ${nombre}! 👋 · cuenta #${d.id}`);
    })
      .catch(() => {
        aviso("la cuenta está creada, pero no se pudo cargar el panel — reintenta", "error");
      })
      .finally(() => setCargandoCuenta(false));
  }

  function irSeccion(destino, seccion) {
    setTab(destino);
    window.setTimeout(() => {
      const el = document.getElementById(seccion);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  const enSesion = !!yo && !!getToken();

  /* ───────── páginas públicas ───────── */
  if (!esPanel) {
    let pagina = <Inicio />;
    if (activa === "/usos") pagina = <Usos />;
    else if (activa === "/recursos") pagina = <Recursos />;
    else if (activa === "/proyecto") pagina = <Proyecto />;
    else if (activa === "/equipo") pagina = <EquipoPagina />;
    else if (activa === "/funciona") pagina = <Funciona />;
    else if (activa === "/tarifas") pagina = <TarifasPagina />;
    else if (activa === "/dudas") pagina = <Dudas />;
    else if (activa === "/descargas") pagina = <DescargasPagina />;
    else if (activa === "/video") pagina = <VideoPagina />;
    else if (activa === "/lab") pagina = <Laboratorio />;
    else if (activa === "/contacto") pagina = <Soporte yo={yo} aviso={aviso} publico />;
    else if (activa === "/pago") pagina = <Pasarela yo={yo} aviso={aviso} />;
    else if (activa === "/acceso") {
      pagina = <Acceso modo={ruta.includes("registro") ? "registro" : "login"} alEntrar={alEntrar} aviso={aviso} />;
    }

    return (
      <Sitio ruta={ruta} enSesion={enSesion}>
        {pagina}
        <PanelCarrito onPago={() => ir("/pago")} />
        <PanelNotificaciones />
        <div className="sp-toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-viva ${t.tipo === "error" ? "error" : "ok"}`}>
              <span aria-hidden>{t.tipo === "error" ? "⚠" : "✓"}</span>{t.texto}
            </div>
          ))}
        </div>
      </Sitio>
    );
  }

  if (!getToken()) return null;
  if (!yo) {
    if (cargandoCuenta) return (
      <Sitio ruta="/panel" enSesion={false}>
        <div className="sp-cargando">Cargando tu panel…</div>
      </Sitio>
    );
    return (
      <Sitio ruta="/panel" enSesion={false}>
        <div className="sp-cargando sp-cargando-error">
          <b>No se pudo cargar tu cuenta</b>
          <p>Tu sesión sigue guardada. La API puede haber tardado o no estar disponible ahora mismo.</p>
          <div className="fila-btn">
            <button className="btn primario" onClick={cargaCuenta}>Reintentar</button>
            <button className="btn" onClick={salir}>Salir</button>
          </div>
        </div>
      </Sitio>
    );
  }

  const activo = !!yo?.activo;
  const hoy = datosHoy();
  const nombreCuenta = yo?.alias || (yo?.email || "invitado").split("@")[0];
  const inicialCuenta = nombreCuenta.trim().charAt(0).toUpperCase();
  const plan = planDe(yo?.plan);
  const susc = estadoSuscripcion(yo);
  const tabActual = TABS[tab] || TABS.inicio;

  return (
    <>
      <GlifosFondo />
      <Nieve tenue />
      <div className="pn-aurora" aria-hidden><i /><i /><i /></div>

      <div className={`jns-shell ${enfoque ? "con-enfoque" : ""}`}>
        <MenuPanel
          tab={tab}
          setTab={setTab}
          yo={yo}
          abierto={lateral}
          onCerrar={() => setLateral(false)}
          noLeidas={noLeidas}
          onSalir={salir}
        />

        <div className="jns-principal">
          <header className={`jns-topbar ${pegada ? "pegada" : ""}`}>
            <button className="jns-hamburguesa" onClick={() => setLateral(true)} aria-label="Abrir el menú">☰</button>

            <div className="jns-miga">
              <span className="mono">panel</span>
              <span aria-hidden>/</span>
              <b>{tabActual.t}</b>
            </div>

            <span className="jns-top-fecha mono" title={hoy.completa}>{hoy.diaCorto} {hoy.numero} {hoy.mesCorto} · S{hoy.semana}</span>

            <div className="jns-top-acciones">
              <button
                type="button"
                className={`jns-chip plan tono-${plan.tono}`}
                onClick={() => setModalPlan(true)}
                title="Ver mi plan y las opciones de mejora"
              >
                {plan.ico} {plan.nombre}
                <span className={`jns-top-plan-estado ${susc.estado}`} aria-hidden />
              </button>

              <span className={`jns-chip ${activo ? "vivo" : "muerto"} mono top-red`}>{activo ? "RED ACTIVA" : "RED OFF"}</span>

              <BotonCampana />
              <BotonCarrito compacto />
              <BotonModo compacto />

              <button
                type="button"
                className={`jns-top-ico ${enfoque ? "activo" : ""}`}
                onClick={() => setEnfoque((v) => !v)}
                aria-pressed={enfoque}
                title={enfoque ? "Mostrar la barra lateral" : "Ocultar la barra lateral"}
                aria-label={enfoque ? "Mostrar la barra lateral" : "Ocultar la barra lateral"}
              >⛶</button>
            </div>
          </header>

          <main className="jns-contenido">
            <div className="jns-vista" key={tab}>
              {tab === "inicio" && (
                <Dashboard
                  yo={yo}
                  setTab={setTab}
                  irSeccion={irSeccion}
                  aviso={aviso}
                  alRecargar={(d) => { setYo(d); guardaUsuario(d); }}
                />
              )}

              {tab === "suscripcion" && (
                <MiSuscripcion yo={yo} aviso={aviso} alCambiarPlan={() => setTab("pago")} />
              )}

              {tab === "pago" && (
                <div className="jns-pago-envoltura">
                  <button type="button" className="jns-link" onClick={() => setTab("suscripcion")}>← Volver a mi suscripción</button>
                  <Pasarela yo={yo} aviso={aviso} alTerminar={() => setTab("suscripcion")} />
                </div>
              )}

              {tab === "soporte" && (
                <Soporte yo={yo} aviso={aviso} />
              )}

              {tab === "ajustes" && !puede(yo, "personalizacion") ? (
                <div className="jns-panel bloqueado">
                  <div className="jns-bloqueo">
                    <span className="jns-bloqueo-ico" aria-hidden>🔒</span>
                    <span className="jns-kicker">plan {plan.nombre}</span>
                    <h2>La personalización del panel es del plan Pro</h2>
                    <p className="jns-mini">
                      Con Pro puedes cambiar colores, tipografía, forma y efectos del panel, y guardarlos
                      en tu cuenta. La seguridad, la comprobación de IP y el botón de apagado siguen
                      disponibles en todos los planes.
                    </p>
                    <div className="jns-plan-mini-acciones">
                      <button type="button" className="jns-btn primario" onClick={() => setTab("pago")}>Ver el plan Pro</button>
                      <button type="button" className="jns-btn" onClick={() => setTab("red")}>Seguir usando la red</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {tab === "descargas" && (
                    <div className="jns-apa">
                      <div className="jns-cab">
                        <div>
                          <span className="jns-kicker">público / descargas</span>
                          <h1>Descarga y navega por el circuito</h1>
                          <p className="jns-mini">La extensión para el navegador que ya tienes, o el navegador completo para Windows y Linux (ya viene conectado).</p>
                        </div>
                      </div>
                      <Descargas />
                    </div>
                  )}

                  {tab === "red" && <Red yo={yo} alRecargar={(d) => { setYo(d); guardaUsuario(d); }} aviso={aviso} />}

                  {tab === "nodos" && (
                    <div className="jns-apa">
                      <div className="jns-cab">
                        <div>
                          <span className="jns-kicker">panel / nodos</span>
                          <h1>Los nodos de la red</h1>
                          <p className="jns-mini">Todos los saltos registrados, con estado, latencia medida y conexiones que están reenviando ahora mismo.</p>
                        </div>
                      </div>
                      <Nodos yo={yo} aviso={aviso} />
                    </div>
                  )}

                  {tab === "cuenta" && (
                    <Cuenta yo={yo} aviso={aviso} alSalir={salir} irRed={() => setTab("red")} alRecargar={(d) => { setYo(d); guardaUsuario(d); }} />
                  )}

                  {tab === "ajustes" && (
                    <div className="jns-apa">
                      <div className="jns-cab">
                        <div>
                          <span className="jns-kicker">panel / apariencia</span>
                          <h1>Diseñador del tema</h1>
                          <p className="jns-mini">Colores, forma, tipografía, efectos y CSS libre — en vivo y solo en tu navegador.</p>
                        </div>
                      </div>
                      <Ajustes aviso={aviso} />
                    </div>
                  )}

                  {tab === "admin" && (yo?.rol === "admin" || yo?.rol === "moderador") && (
                    <Admin yo={yo} aviso={aviso} />
                  )}
                </>
              )}

              <footer className="jns-pie-panel mono">
                JumperNET v{VERSION} · 3 saltos · ChaCha20-Poly1305 · api: jumpernet.duckdns.org
                <br />
                <span>proyecto educativo · la red solo se activa cuando tú lo decides</span>
                <br />
                <span>equipo 2026 · Adrián, Rolando, Fernando, Alex y Yoselin</span>
              </footer>
            </div>
          </main>
        </div>
      </div>

      <PanelCarrito onPago={() => setTab("pago")} />
      <PanelNotificaciones />

      {modalPlan && (
        <div className="jns-modal-velo" role="presentation" onClick={() => setModalPlan(false)}>
          <div className={`jns-modal plan tono-${plan.tono}`} role="dialog" aria-modal="true" aria-labelledby="jns-plan-t" onClick={(e) => e.stopPropagation()}>
            <div className="jns-modal-cab">
              <div>
                <span className="jns-kicker">tu suscripción</span>
                <h2 id="jns-plan-t">{plan.ico} Plan {plan.nombre}</h2>
              </div>
              <button type="button" className="jns-cerrar" onClick={() => setModalPlan(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="jns-plan-modal-estado">
              <span className={`jns-chip ${susc.estado === "activo" ? "vivo" : susc.estado === "pendiente" ? "aviso" : ""}`}>{susc.etiqueta}</span>
              <span className="jns-mini mono">{plan.precioTexto} · {plan.periodo}</span>
            </div>
            <span className="jns-kicker">incluido</span>
            <ul className="jns-lista-ok compacta">
              {plan.incluido.map((x) => <li key={x}><span aria-hidden>✓</span>{x}</li>)}
            </ul>
            {plan.limitaciones.length > 0 && (
              <>
                <span className="jns-kicker">límites</span>
                <ul className="jns-lista-no compacta">
                  {plan.limitaciones.map((x) => <li key={x}><span aria-hidden>–</span>{x}</li>)}
                </ul>
              </>
            )}
            <div className="jns-modal-acciones">
              <button type="button" className="jns-btn" onClick={() => { setModalPlan(false); setTab("suscripcion"); }}>Gestionar suscripción</button>
              {plan.id !== "pro" ? (
                <button type="button" className="jns-btn primario" onClick={() => { setModalPlan(false); setTab("pago"); }}>
                  Mejorar a Pro <span aria-hidden>→</span>
                </button>
              ) : (
                <a className="jns-btn" href="#/tarifas">Comparar planes</a>
              )}
            </div>
            <p className="jns-mini">El plan lo confirma el servidor. Esta ventana solo enseña lo que tu cuenta tiene activo.</p>
          </div>
        </div>
      )}

      <div className="sp-toasts fijos">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-viva ${t.tipo === "error" ? "error" : "ok"}`}>
            <span aria-hidden>{t.tipo === "error" ? "⚠" : "✓"}</span>{t.texto}
          </div>
        ))}
      </div>

      <span className="jns-sr" aria-live="polite">
        {nombreCuenta} · plan {plan.nombre} · {activo ? "red activa" : "red apagada"} · {inicialCuenta}
      </span>
    </>
  );
}
