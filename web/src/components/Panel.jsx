import { useEffect, useMemo, useState } from "react";
import GlifosFondo from "./GlifosFondo.jsx";
import Nieve from "./Nieve.jsx";
import Logo from "./Logo.jsx";
import BotonModo from "./BotonModo.jsx";
import PlanBadge from "./PlanBadge.jsx";
import CarritoPanel from "./CarritoPanel.jsx";
import Red from "./Red.jsx";
import Nodos from "./Nodos.jsx";
import Diagnostico from "./Diagnostico.jsx";
import Cuenta from "./Cuenta.jsx";
import Ajustes from "./Ajustes.jsx";
import Admin from "./Admin.jsx";
import Tarifas from "./Tarifas.jsx";
import DemoSaltos from "./DemoSaltos.jsx";
import { useCarrito } from "../lib/carrito.js";
import { planDe, precioPro, SALTOS_MIN } from "../lib/planes.js";
import {
  navDe, itemDe, TITULOS_PANEL, ICONOS_PANEL, usePrefsPanel,
} from "../lib/panel.jsx";
import PanelDash, { Notificaciones, Novedades } from "./PanelDash.jsx";
import {
  ComprobacionIP, TerminalEducativa, SimuladorRed, InspectorPaquetes,
  ComparadorCircuitos, SimuladorFallos, ConfiguradorSocks, GuiasPanel,
  FAQPanel, DocsPanel, EstadoServicio, ContactoPanel, OrganizacionPanel,
  DescargasPanel,
} from "./PanelHerramientas.jsx";
import {
  NetworkExplorer, DisenadorCircuitos, MisCircuitos, MonitorRendimiento,
  CentroSeguridad, PersonalizarDashboard,
} from "./PanelPro.jsx";
import {
  SuscripcionPanel, PersonalizarSuscripcion, FacturasPanel, CarritoPagina,
} from "./PanelSuscripcion.jsx";

/* Marco del área privada. Free y Pro comparten el mismo lenguaje visual; Pro
   añade grupos, herramientas e iluminación turquesa. El contenido de cada
   pestaña es funcional: no hay botones decorativos ni páginas vacías. */

function Ico({ id, tam = 17 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONOS_PANEL[id] || ICONOS_PANEL.grid}
    </svg>
  );
}

const FICHAS_PRO = {
  explorer: {
    titulo: "Network Explorer",
    para: "Explora los nodos registrados, su estado y las conexiones que forman tu circuito.",
    ventajas: ["Vista de constelación, circuito y tabla", "Nodos de tu ruta resaltados", "Búsqueda y filtros en vivo", "Sin historial de navegación"],
  },
  disenador: {
    titulo: "Diseñador de circuitos",
    para: "Configura y previsualiza circuitos de 3 a tu máximo contratado antes de conectar.",
    ventajas: ["Selector visual de saltos", "Modo todos / solo externos", "Guardar configuraciones", "Aplicar sin coste dentro del plan"],
  },
  monitor: {
    titulo: "Monitor de rendimiento",
    para: "Consulta la latencia de la API y de tus saltos con medidas reales de esta sesión.",
    ventajas: ["Gráfico de respuesta de la API", "Latencia por salto", "Disponibilidad instantánea de nodos", "Sin métricas inventadas"],
  },
};

function ProGate({ ficha, cerrar }) {
  useEffect(() => {
    if (!ficha) return;
    const alPulsar = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", alPulsar);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", alPulsar); document.body.style.overflow = ""; };
  }, [ficha, cerrar]);

  if (!ficha) return null;
  const f = FICHAS_PRO[ficha.id] || FICHAS_PRO.explorer;
  return (
    <div className="pu-gate-capa" role="dialog" aria-modal="true" aria-labelledby="pu-gate-titulo">
      <button type="button" className="pu-gate-fondo" onClick={cerrar} aria-label="Cerrar" />
      <div className="pu-gate">
        <button type="button" className="pu-gate-cerrar" onClick={cerrar} aria-label="Cerrar">✕</button>
        <span className="pu-kicker">herramienta Pro</span>
        <h2 id="pu-gate-titulo">{f.titulo}</h2>
        <p>{f.para}</p>
        <div className="pu-gate-demo">
          <span className="pu-gate-demo-etq mono">demostración visual</span>
          <div className="pu-gate-orbe" aria-hidden><i /><i /><i /><b>PRO</b></div>
          <div className="pu-gate-lista">
            {f.ventajas.map((v) => <span key={v}>✓ {v}</span>)}
          </div>
        </div>
        <div className="pu-gate-precio">
          <span>Pro desde</span>
          <b className="mono">{precioPro(SALTOS_MIN)} €/mes</b>
          <small>3 saltos · puedes ampliar de 4 a 7</small>
        </div>
        <div className="pu-gate-acciones">
          <a className="btn primario" href="#/tarifas">Configurar mi suscripción <span aria-hidden>→</span></a>
          <button className="btn" type="button" onClick={cerrar}>Seguir en Free</button>
        </div>
        <p className="pu-nota">El plan Free sigue teniendo panel completo, comprobación real y 3 saltos fijos. Esto solo desbloquea las herramientas avanzadas.</p>
      </div>
    </div>
  );
}

function CargandoPanel() {
  return <div className="pu-cargando"><span className="spin" /><b>Cargando tu panel…</b></div>;
}

export default function Panel({
  yo, aviso, salir, toasts = [], cargandoCuenta, cargaCuenta, alRecargar,
}) {
  const plan = planDe(yo);
  const esPro = plan.id === "pro" || plan.id === "empresarial";
  const carrito = useCarrito();
  const [prefs, actualizaPrefs] = usePrefsPanel();
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem("jumpernet-panel-tab") || "inicio"; } catch { return "inicio"; }
  });
  const [lateral, setLateral] = useState(false);
  const [plegado, setPlegado] = useState(() => {
    try { return localStorage.getItem("jumpernet-panel-plegado") === "1"; } catch { return false; }
  });
  const [abiertos, setAbiertos] = useState(() => ({ general: true, red: true }));
  const [gate, setGate] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [pegada, setPegada] = useState(false);
  const [, setTickPlan] = useState(0);

  const grupos = useMemo(() => {
    const g = [...navDe(yo)];
    if (yo?.rol === "admin" || yo?.rol === "moderador") {
      g.push({ id: "gestion", titulo: "Gestión", items: [{ id: "admin", txt: yo.rol === "admin" ? "Administración" : "Moderación", ico: "shield" }] });
    }
    return g;
  }, [yo?.plan, yo?.rol, plan.id, plan.demo, plan.saltosMax]);

  const item = itemDe(yo, tab) || (tab === "admin" ? { id: "admin", txt: "Administración", ico: "shield" } : null);
  const [titulo, subtitulo] = TITULOS_PANEL[tab] || ["Panel", ""];
  const nombreCuenta = yo?.alias || (yo?.email || "invitado").split("@")[0];
  const inicial = nombreCuenta.trim().charAt(0).toUpperCase();

  useEffect(() => {
    const itemActual = itemDe(yo, tab) || (tab === "admin" && (yo?.rol === "admin" || yo?.rol === "moderador") ? { id: "admin" } : null);
    if (!itemActual) setTab("inicio");
  }, [tab, yo?.plan, yo?.rol]);

  useEffect(() => {
    try { sessionStorage.setItem("jumpernet-panel-tab", tab); } catch { /* sin sesión */ }
    const grupo = grupos.find((g) => g.items.some((i) => i.id === tab));
    if (grupo) setAbiertos((a) => ({ ...a, [grupo.id]: true }));
    if (tab !== "red") window.scrollTo({ top: 0, behavior: "smooth" });
    document.title = `${titulo} · Panel JumperNET`;
  }, [tab]);

  useEffect(() => {
    const alScroll = () => setPegada(window.scrollY > 10);
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  useEffect(() => {
    const abre = () => setCarritoAbierto(true);
    window.addEventListener("jumpernet-carrito-abrir", abre);
    return () => window.removeEventListener("jumpernet-carrito-abrir", abre);
  }, []);

  /* la demo de Pro se activa o desactiva desde la ficha del plan o la página
     de suscripción: hay que repintar la navegación y los permisos visuales */
  useEffect(() => {
    const refresca = () => setTickPlan((t) => t + 1);
    window.addEventListener("jumpernet-plan", refresca);
    window.addEventListener("storage", refresca);
    return () => {
      window.removeEventListener("jumpernet-plan", refresca);
      window.removeEventListener("storage", refresca);
    };
  }, []);

  function navega(id) {
    const it = itemDe(yo, id);
    if (it?.bloqueado) { setGate(it); setLateral(false); return; }
    if (id === "admin" && !["admin", "moderador"].includes(yo?.rol)) return;
    setTab(id);
    setLateral(false);
  }

  function alternaPlegado() {
    const v = !plegado;
    setPlegado(v);
    try { localStorage.setItem("jumpernet-panel-plegado", v ? "1" : "0"); } catch { /* sin persistencia */ }
  }

  function actualizaYo(d) {
    alRecargar?.(d);
  }

  function contenido() {
    switch (tab) {
      case "inicio": return <PanelDash yo={yo} plan={plan} variante="inicio" prefs={prefs} navega={navega} aviso={aviso} />;
      case "control": return <PanelDash yo={yo} plan={plan} variante="control" prefs={prefs} navega={navega} aviso={aviso} />;
      case "centro": return <PanelDash yo={yo} plan={plan} variante="centro" prefs={prefs} navega={navega} aviso={aviso} />;
      case "notificaciones": return <Notificaciones yo={yo} plan={plan} navega={navega} />;
      case "novedades": return <Novedades navega={navega} plan={plan} />;
      case "red": return <Red yo={yo} aviso={aviso} alRecargar={actualizaYo} />;
      case "nodos": return (
        <div className="pu-pagina">
          <header className="pu-cab">
            <div>
              <span className="pu-kicker">panel / nodos</span>
              <h1>{esPro ? "Gestor de nodos" : "Nodos disponibles"}</h1>
              <p>Estado, latencia medida, validación por sonda y papel de cada nodo en tu circuito.</p>
            </div>
          </header>
          <Nodos yo={yo} aviso={aviso} />
        </div>
      );
      case "circuito": return <MisCircuitos yo={yo} plan={plan} aviso={aviso} navega={navega} />;
      case "circuitos": return <MisCircuitos yo={yo} plan={plan} aviso={aviso} navega={navega} />;
      case "explorer": return <NetworkExplorer yo={yo} plan={plan} aviso={aviso} />;
      case "disenador": return <DisenadorCircuitos yo={yo} plan={plan} aviso={aviso} navega={navega} />;
      case "monitor": return <MonitorRendimiento yo={yo} plan={plan} aviso={aviso} />;
      case "seguridad": return <CentroSeguridad yo={yo} plan={plan} />;
      case "ip": return <ComprobacionIP yo={yo} aviso={aviso} navega={navega} />;
      case "inspector": return <InspectorPaquetes yo={yo} plan={plan} />;
      case "diagnostico": return (
        <div className="pu-pagina">
          <header className="pu-cab">
            <div>
              <span className="pu-kicker">panel / diagnóstico</span>
              <h1>{esPro ? "Diagnóstico avanzado" : "Diagnóstico básico"}</h1>
              <p>Comprueba API, sesión, circuito, salida, nodos y geolocalización. Si algo no se puede medir, se dice.</p>
            </div>
          </header>
          <Diagnostico yo={yo} aviso={aviso} />
        </div>
      );
      case "terminal": return <TerminalEducativa yo={yo} plan={plan} aviso={aviso} />;
      case "lab": return (
        <div className="pu-pagina">
          <header className="pu-cab">
            <div>
              <span className="pu-kicker">panel / laboratorio</span>
              <h1>JumperNET Lab</h1>
              <p>Experimentos seguros sobre el recorrido de un paquete. Todo es una simulación educativa: no toca tu conexión.</p>
            </div>
            <a className="btn" href="#/lab">Abrir laboratorio público ↗</a>
          </header>
          <DemoSaltos />
        </div>
      );
      case "simulador": return <SimuladorRed yo={yo} plan={plan} aviso={aviso} />;
      case "comparador": return <ComparadorCircuitos yo={yo} plan={plan} aviso={aviso} navega={navega} />;
      case "fallos": return <SimuladorFallos yo={yo} plan={plan} aviso={aviso} />;
      case "socks": return <ConfiguradorSocks yo={yo} aviso={aviso} />;
      case "descargas": return <DescargasPanel />;
      case "guias": return <GuiasPanel navega={navega} />;
      case "plan": return <SuscripcionPanel yo={yo} plan={plan} navega={navega} aviso={aviso} />;
      case "suscripcion": return <SuscripcionPanel yo={yo} plan={plan} navega={navega} aviso={aviso} />;
      case "personalizar": return <PersonalizarSuscripcion yo={yo} plan={plan} navega={navega} aviso={aviso} />;
      case "mejorar": return (
        <div className="pu-pagina pu-pagina-tarifas">
          <header className="pu-cab">
            <div>
              <span className="pu-kicker">panel / mejorar plan</span>
              <h1>Más herramientas, más control</h1>
              <p>Configura el tamaño del circuito y revisa el precio antes de añadir Pro al carrito. Nada se cobra en esta web.</p>
            </div>
          </header>
          <Tarifas dentroPanel />
        </div>
      );
      case "facturas": return <FacturasPanel yo={yo} navega={navega} />;
      case "carrito": return <CarritoPagina navega={navega} aviso={aviso} />;
      case "perfil": return (
        <Cuenta yo={yo} aviso={aviso} alSalir={salir} irRed={() => setTab("red")} alRecargar={actualizaYo} />
      );
      case "preferencias": return (
        <div className="pu-pagina">
          <header className="pu-cab">
            <div>
              <span className="pu-kicker">panel / preferencias</span>
              <h1>Preferencias del panel</h1>
              <p>Decisiones locales que no cambian permisos ni precios.</p>
            </div>
          </header>
          <div className="pu-dos">
            <section className="tarjeta">
              <h2 className="seccion">Comportamiento</h2>
              <label className="pu-switch-fila"><span><b>Notificaciones del panel</b><small>Avisos de red y cuenta</small></span><input type="checkbox" checked={prefs.notificaciones} onChange={(e) => actualizaPrefs({ notificaciones: e.target.checked })} /></label>
              <label className="pu-switch-fila"><span><b>Animaciones</b><small>Paquetes y transiciones</small></span><input type="checkbox" checked={prefs.animaciones} onChange={(e) => actualizaPrefs({ animaciones: e.target.checked })} /></label>
              <label className="pu-switch-fila"><span><b>Densidad compacta</b><small>Más contenido por pantalla</small></span><input type="checkbox" checked={prefs.compacto} onChange={(e) => actualizaPrefs({ compacto: e.target.checked })} /></label>
              <p className="pu-nota">Estas preferencias se guardan en este navegador. El plan y los saltos los decide siempre el backend.</p>
            </section>
            <section className="tarjeta">
              <h2 className="seccion">Accesos</h2>
              <div className="pu-bento-acciones">
                <button className="btn" type="button" onClick={() => navega("dashboard")}>Personalizar dashboard</button>
                <button className="btn" type="button" onClick={() => navega("apariencia")}>Apariencia</button>
                <button className="btn" type="button" onClick={() => navega("perfil")}>Mi perfil</button>
              </div>
              <p className="pu-nota">Free también puede cambiar el tema. La personalización del dashboard es una herramienta Pro.</p>
            </section>
          </div>
        </div>
      );
      case "dashboard": return <PersonalizarDashboard aviso={aviso} />;
      case "apariencia": return (
        <div className="pu-pagina">
          <header className="pu-cab">
            <div>
              <span className="pu-kicker">panel / apariencia</span>
              <h1>Tu panel, tu estilo</h1>
              <p>Colores, forma y tipografía. Los cambios se aplican en vivo y se guardan solo en este navegador.</p>
            </div>
          </header>
          <Ajustes aviso={aviso} />
        </div>
      );
      case "faq": return <FAQPanel navega={navega} />;
      case "docs": return <DocsPanel />;
      case "contacto": return <ContactoPanel plan={plan} />;
      case "estado": return <EstadoServicio aviso={aviso} />;
      case "organizacion": return <OrganizacionPanel yo={yo} plan={plan} navega={navega} />;
      case "admin": return (yo?.rol === "admin" || yo?.rol === "moderador")
        ? <Admin yo={yo} aviso={aviso} />
        : <div className="pu-vacio grande"><b>Sin permiso.</b><p>Esta sección solo está disponible para administración o moderación.</p></div>;
      default: return <CargandoPanel />;
    }
  }

  if (cargandoCuenta && !yo) {
    return (
      <>
        <GlifosFondo /><Nieve tenue />
        <div className="cascara pu-solo-cargando"><CargandoPanel /></div>
      </>
    );
  }

  return (
    <>
      <GlifosFondo />
      <Nieve tenue />
      <div className="pn-aurora" aria-hidden><i /><i /><i /></div>
      <div className={`cascara pu-cascara ${plegado ? "plegado" : ""} ${esPro ? "es-pro" : "es-free"} ${prefs.compacto ? "compacto" : ""} ${!prefs.animaciones ? "sin-anim" : ""}`}>

        <aside className={`lateral ${lateral ? "abierto" : ""}`} aria-label="Menú del panel">
          <a className="lateral-marca" href="#/" title="Volver a la web pública">
            <Logo tam={36} />
            <span className="nombre">Jumper<span>NET</span><span className="cursor">_</span></span>
          </a>

          <div className="lateral-perfil">
            <span className="lateral-avatar" aria-hidden>{inicial}</span>
            <span className="lateral-perfil-txt">
              <b>{nombreCuenta}</b>
              <span className="mono">#{yo?.id ?? "—"} · {yo?.activo ? "en línea" : "red off"}</span>
              <PlanBadge yo={yo} compacto />
            </span>
            <span className={`punto-vivo ${yo?.activo ? "" : "apagado"}`} aria-hidden />
          </div>

          <div className="lateral-cuerpo">
            {grupos.map((g) => {
              const abierto = !!abiertos[g.id];
              return (
                <div className={`lateral-grupo pu-grupo ${abierto ? "abierto" : ""}`} key={g.id}>
                  <button type="button" className="lateral-titulo pu-grupo-boton" onClick={() => setAbiertos((a) => ({ ...a, [g.id]: !a[g.id] }))} aria-expanded={abierto}>
                    <span>// {g.titulo}</span>
                    <i aria-hidden>{abierto ? "⌄" : "›"}</i>
                  </button>
                  {abierto && g.items.map((i) => (
                    <button key={i.id} type="button"
                      className={`lateral-btn ${tab === i.id ? "activa" : ""} ${i.bloqueado ? "bloqueada" : ""}`}
                      onClick={() => navega(i.id)}
                      title={i.bloqueado ? `${i.txt} · disponible en Pro` : i.txt}>
                      <span className="ico"><Ico id={i.ico} /></span>
                      <span className="pu-nav-txt">{i.txt}</span>
                      {i.bloqueado && <span className="pu-nav-lock mono">PRO</span>}
                      {i.pro && !i.bloqueado && <span className="pu-nav-pro mono">PRO</span>}
                      {i.id === "red" && <span className={`punto-vivo ${yo?.activo ? "" : "apagado"}`} style={{ marginLeft: "auto" }} aria-hidden />}
                      {i.id === "carrito" && carrito.cantidad > 0 && <span className="pu-nav-count mono">{carrito.saltos}</span>}
                    </button>
                  ))}
                </div>
              );
            })}

            <div className="lateral-grupo">
              <div className="lateral-titulo">// sitio</div>
              <a className="lateral-btn" href="#/"><span className="ico"><Ico id="globe" /></span><span className="pu-nav-txt">Web pública</span></a>
              <a className="lateral-btn" href="#/tarifas"><span className="ico"><Ico id="bolt" /></span><span className="pu-nav-txt">Tarifas</span></a>
              <button className="lateral-btn" type="button" onClick={salir}><span className="ico">⏻</span><span className="pu-nav-txt">Salir</span></button>
            </div>
          </div>

          <div className="lateral-pie">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`punto-vivo ${yo?.activo ? "" : "apagado"}`} />
              {yo?.activo ? `red activa · ${yo?.circuito?.length || 0} saltos` : "red apagada"}
            </span>
            <span className="lateral-pie-url">jumpernet.duckdns.org</span>
            <button type="button" className="pu-plegar" onClick={alternaPlegado}>{plegado ? "Expandir menú »" : "« Contraer menú"}</button>
          </div>
        </aside>

        {lateral && <div className="velo" onClick={() => setLateral(false)} />}

        <div className="principal">
          <header className={`barra-sup ${pegada ? "pegada" : ""}`}>
            <button className="hamburguesa" onClick={() => setLateral(true)} aria-label="Abrir menú">☰</button>
            <button type="button" className="pu-plegar-top" onClick={alternaPlegado} aria-label={plegado ? "Expandir menú" : "Contraer menú"}>{plegado ? "»" : "«"}</button>
            <span className="prompt">
              <b>{nombreCuenta}</b>@jumpernet:<i>~/{tab}</i>$ <span className="pu-prompt-cmd">{subtitulo || "panel"}</span>
            </span>
            <span className="pn-fecha mono">{new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} · {titulo}</span>
            <span className="pu-top-acciones">
              <PlanBadge yo={yo} compacto />
              <BotonModo compacto />
              <span className={`chip ${yo?.activo ? "vivo" : "muerto"}`}>{yo?.activo ? "RED ACTIVA" : "RED OFF"}</span>
              <button type="button" className={`jn-cartbtn ${carrito.cantidad ? "con-plan" : ""}`} onClick={() => setCarritoAbierto(true)} aria-label="Abrir el carrito">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 4h2l2.4 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6" />
                  <circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" />
                </svg>
                {carrito.cantidad > 0 && <span className="jn-cartbtn-badge">{carrito.cantidad}</span>}
              </button>
              <a className="btn" href="#/">Web</a>
              <button className="btn" type="button" onClick={salir}>Salir</button>
            </span>
          </header>

          <main className="contenido">
            <div className="pu-migas-cab">
              <span className="migas mono">panel / {tab}</span>
              <span className="pu-migas-estado mono">{esPro ? `PRO · ${plan.saltosMax || yo?.saltos_max} saltos` : `FREE · ${yo?.saltos_max || 3} saltos`}{plan.demo ? " · DEMO" : ""}</span>
            </div>
            <div className="vista pu-vista" key={tab}>
              {contenido()}
            </div>
            <footer className="nota mono pu-pie">
              JumperNET · red de {plan.saltosMax || yo?.saltos_max || 3} saltos · JENC ChaCha20-Poly1305 · API jumpernet.duckdns.org
              <br /><span>proyecto educativo · sin historial de navegación · las simulaciones están etiquetadas</span>
            </footer>
          </main>
        </div>
      </div>

      <ProGate ficha={gate} cerrar={() => setGate(null)} />
      <CarritoPanel abierto={carritoAbierto} cerrar={() => setCarritoAbierto(false)} />

      <div className="sp-toasts fijos">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-viva ${t.tipo === "error" ? "error" : "ok"}`}>
            <span aria-hidden>{t.tipo === "error" ? "⚠" : "✓"}</span>{t.texto}
          </div>
        ))}
      </div>
    </>
  );
}
