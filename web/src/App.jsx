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
import { useRuta, baseRuta, ir } from "./lib/router.js";
import { me, setToken, getToken, getUsuarioGuardado, guardaUsuario } from "./lib/api.js";
import { aplicaTema, cargaTema } from "./lib/temas.js";
import { aplicaModo, cargaModo } from "./lib/modo.js";
import { datosHoy } from "./lib/fecha.js";
import { VERSION } from "./lib/version.js";

const NAV_SESION = [
  { grupo: "red", items: [
    { id: "red", texto: "Panel de red", ico: "◉" },
    { id: "nodos", texto: "Nodos", ico: "⛓" },
  ] },
  { grupo: "tu cuenta", items: [
    { id: "descargas", texto: "Descargas", ico: "⬇" },
    { id: "cuenta", texto: "Cuenta", ico: "☻" },
    { id: "ajustes", texto: "Diseñador", ico: "✦" },
  ] },
];

const PROMPT = {
  red: "status --red",
  nodos: "ls -la nodos/",
  descargas: "ls -la descargas/",
  cuenta: "whoami --editar",
  ajustes: "theme --editar",
  admin: "sudo panel-admin --rol admin",
};
const DOCS_URL = "https://jumpernet.duckdns.org/docs/";

export default function App() {
  const ruta = useRuta();
  const activa = baseRuta(ruta);
  const esPanel = activa === "/panel";

  const [yo, setYo] = useState(() => (getToken() ? getUsuarioGuardado() : null));
  const [cargandoCuenta, setCargandoCuenta] = useState(() => !!getToken());
  const [tab, setTab] = useState("red");
  const [toasts, setToasts] = useState([]);
  const [lateral, setLateral] = useState(false);   // menú móvil del panel
  const [pegada, setPegada] = useState(false);     // topbar con scroll

  /* la ficha guardada pinta el panel al instante; /me la refresca después.
     Si la API falla, no borramos el número de cuenta ni la sesión. */
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

  /* primero el tema guardado y después el modo: el modo manda en la paleta */
  useEffect(() => { aplicaTema(cargaTema()); aplicaModo(cargaModo()); }, []);
  useEffect(() => {
    if (!getToken()) { setCargandoCuenta(false); return; }
    cargaCuenta();
  }, []);
  useEffect(() => {
    const alScroll = () => setPegada(window.scrollY > 12);
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);
  /* spotlight en tarjetas: cada tarjeta ilumina alrededor del cursor */
  useEffect(() => {
    const alMover = (e) => {
      const t = e.target && e.target.closest ? e.target.closest(".tarjeta") : null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", alMover, { passive: true });
    return () => window.removeEventListener("pointermove", alMover);
  }, []);

  /* el panel es solo para sesiones: sin token se va a la página de acceso */
  useEffect(() => {
    if (esPanel && !getToken()) ir("/acceso/login");
    if (esPanel) document.title = "Panel de red · JumperNET";
  }, [esPanel]);

  function aviso(texto, tipo = "ok") {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
  }
  function salir() { setToken(null); setYo(null); setCargandoCuenta(false); setLateral(false); ir("/"); }
  function alEntrar() {
    setCargandoCuenta(true);
    me().then((d) => {
      const nombre = d?.alias || (d?.email || "").split("@")[0] || "tú";
      setYo(d); guardaUsuario(d); setTab("red"); ir("/panel");
      aviso(`¡Hola, ${nombre}! 👋 · cuenta #${d.id}`);
    })
      .catch(() => {
        aviso("la cuenta está creada, pero no se pudo cargar el panel — reintenta", "error");
      })
      .finally(() => setCargandoCuenta(false));
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
    else if (activa === "/acceso") {
      pagina = <Acceso modo={ruta.includes("registro") ? "registro" : "login"} alEntrar={alEntrar} aviso={aviso} />;
    }

    return (
      <Sitio ruta={ruta} enSesion={enSesion}>
        {pagina}
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

  const navega = (id) => (
    <button key={id} className={`lateral-btn ${tab === id ? "activa" : ""}`} onClick={() => { setTab(id); setLateral(false); }}>
      <span className="ico">{NAV_SESION.flatMap((g) => g.items).find((i) => i.id === id)?.ico}</span>
      <span>{NAV_SESION.flatMap((g) => g.items).find((i) => i.id === id)?.texto}</span>
      {id === "red" && (
        <span className="punto" style={{
          width: 7, height: 7, borderRadius: "50%", marginLeft: "auto",
          background: activo ? "var(--acento-1)" : "#7b8781",
          boxShadow: activo ? "0 0 8px rgb(from var(--acento-1) r g b / .8)" : "none",
        }} />
      )}
    </button>
  );

  /* ───────── panel (solo con sesión) ───────── */
  return (
    <>
      <GlifosFondo />
      <Nieve tenue />
      <div className="pn-aurora" aria-hidden><i /><i /><i /></div>
      <div className="cascara">

        {/* ───────── barra lateral ───────── */}
        <aside className={`lateral ${lateral ? "abierto" : ""}`}>
          <a className="lateral-marca" href="#/">
            <Logo tam={36} />
            <span className="nombre">Jumper<span>NET</span><span className="cursor">_</span></span>
          </a>

          <div className="lateral-perfil">
            <span className="lateral-avatar" aria-hidden>{inicialCuenta}</span>              <span className="lateral-perfil-txt">
              <b>{nombreCuenta}</b>
              <span className="mono">#{yo?.id ?? "—"} · {yo?.plan || "free"} · {activo ? "en línea" : "red off"}</span>
            </span>
            <span className={`punto-vivo ${activo ? "" : "apagado"}`} aria-hidden />
          </div>

          <div className="lateral-cuerpo">
            <div className="lateral-grupo">
              <div className="lateral-titulo">// público</div>
              <a className="lateral-btn" href="#/"><span className="ico">⌂</span><span>Inicio</span></a>
              <a className="lateral-btn" href="#/equipo"><span className="ico">✦</span><span>El equipo</span></a>
              <a className="lateral-btn" href="#/funciona"><span className="ico">⌁</span><span>Cómo funciona</span></a>
              <a className="lateral-btn" href="#/dudas"><span className="ico">?</span><span>Dudas</span></a>
              <button className={`lateral-btn ${tab === "descargas" ? "activa" : ""}`} onClick={() => { setTab("descargas"); setLateral(false); }}>
                <span className="ico">⬇</span><span>Descargas</span>
              </button>
              <a className="lateral-btn" href="#/tarifas"><span className="ico">◈</span><span>Tarifas</span></a>
              <a className="lateral-btn link-externa" href={DOCS_URL} target="_blank" rel="noreferrer">
                <span className="ico">▤</span><span>Documentación</span><span style={{ marginLeft: "auto", opacity: .6, fontSize: 10 }}>↗</span>
              </a>
            </div>

            {(yo?.rol === "admin" || yo?.rol === "moderador") && (
              <div className="lateral-grupo">
                <div className="lateral-titulo">// gestión</div>
                <button className={`lateral-btn ${tab === "admin" ? "activa" : ""}`} onClick={() => { setTab("admin"); setLateral(false); }}>
                  <span className="ico">🛡</span><span>{yo?.rol === "admin" ? "Administración" : "Moderación"}</span>
                  <span className="punto-vivo" style={{ marginLeft: "auto" }} />
                </button>
              </div>
            )}

            {NAV_SESION.map((g) => (
              <div className="lateral-grupo" key={g.grupo}>
                <div className="lateral-titulo">// {g.grupo}</div>
                {g.items.map((i) => navega(i.id))}
              </div>
            ))}

            <div className="lateral-grupo">
              <div className="lateral-titulo">// sesión</div>
              <button className="lateral-btn" onClick={salir}><span className="ico">⏻</span><span>Salir</span></button>
            </div>
          </div>

          <div className="lateral-promo lateral-hoy" role="note" aria-label={`Hoy es ${hoy.completa}`}>
            <span className="lateral-hoy-dia mono" aria-hidden>{hoy.numero}</span>
            <span>
              <b>{hoy.dia}</b>
              <small>{hoy.mes} {hoy.anio} · semana {hoy.semana}</small>
            </span>
          </div>

          <div className="lateral-pie">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`punto-vivo ${activo ? "" : "apagado"}`} />
              {activo ? "red activa · 3 saltos" : "red apagada"}
            </span>
            <span className="lateral-pie-url">jumpernet.duckdns.org</span>
          </div>
        </aside>

        {lateral && <div className="velo" onClick={() => setLateral(false)} />}

        {/* ───────── topbar + contenido ───────── */}
        <div className="principal">
          <header className={`barra-sup ${pegada ? "pegada" : ""}`}>
            <button className="hamburguesa" onClick={() => setLateral(true)} aria-label="Abrir menú">☰</button>
            <span className="prompt">
              <b>{nombreCuenta}</b>@jumpernet:<i>~/{tab}</i>$ {PROMPT[tab]}
            </span>
            <span className="pn-fecha mono" title={hoy.completa}>
              {hoy.diaCorto} {hoy.numero} {hoy.mesCorto} · S{hoy.semana}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <BotonModo compacto />
              <span className={`chip ${activo ? "vivo" : "muerto"}`}>{activo ? "RED ACTIVA" : "RED OFF"}</span>
              <button className="btn" onClick={() => { setTab("nodos"); setLateral(false); }} title="Ver todos los nodos">
                ⛓ {yo?.circuito?.length ? `${yo.circuito.length}/3` : "0/3"}
              </button>
              <a className="btn" href="#/" style={{ textDecoration: "none" }}>Web pública</a>
              <button className="btn" onClick={salir}>Salir</button>
            </span>
          </header>

          <main className="contenido">
            <div className="vista" key={tab}>
              {tab === "admin" && (yo?.rol === "admin" || yo?.rol === "moderador") && (
                <Admin yo={yo} aviso={aviso} />
              )}

              {tab === "descargas" && (
                <div className="apa">
                  <div className="cab-seccion">
                    <div className="cubo-ico">⬇</div>
                    <div>
                      <span className="migas">público / descargas</span>
                      <h1>Descarga y navega por el circuito</h1>
                      <p className="sub">Tres maneras de usar tu red: la extensión para el navegador que ya tienes, o el navegador completo para Windows y Linux (ya viene conectado).</p>
                    </div>
                  </div>
                  <Descargas />
                </div>
              )}

              {tab === "red" && <Red yo={yo} alRecargar={(d) => { setYo(d); guardaUsuario(d); }} aviso={aviso} />}

              {tab === "nodos" && (
                <div className="apa">
                  <div className="cab-seccion">
                    <div className="cubo-ico">⛓</div>
                    <div>
                      <span className="migas">panel / nodos</span>
                      <h1>Los nodos de la red</h1>
                      <p className="sub">Todos los saltos registrados, con estado, latencia medida y conexiones que están reenviando ahora mismo.</p>
                    </div>
                  </div>
                  <Nodos yo={yo} aviso={aviso} />
                </div>
              )}

              {tab === "cuenta" && (
                <Cuenta yo={yo} aviso={aviso} alSalir={salir} irRed={() => setTab("red")} alRecargar={(d) => { setYo(d); guardaUsuario(d); }} />
              )}

              {tab === "ajustes" && (
                <div className="apa">
                  <div className="cab-seccion">
                    <div className="cubo-ico">✦</div>
                    <div>
                      <span className="migas">panel / diseñador</span>
                      <h1>Diseñador del tema</h1>
                      <p className="sub">Colores, forma, tipografía, efectos y CSS libre — en vivo y solo en tu navegador.</p>
                    </div>
                  </div>
                  <Ajustes aviso={aviso} />
                </div>
              )}

              <footer className="nota mono" style={{ textAlign: "center", marginTop: 44, fontSize: 10.5 }}>
                JumperNET v{VERSION} · 3 saltos · ChaCha20-Poly1305 · api: jumpernet.duckdns.org
                <br />
                <span style={{ opacity: .7 }}>proyecto educativo · la red solo se activa cuando tú lo decides</span>
                <br />
                <span style={{ opacity: .55 }}>equipo 2026 · Adrián, Rolando, Fernando, Alex y Yoselin</span>
              </footer>
            </div>
          </main>
        </div>
      </div>

      {/* avisos */}
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
