import { useEffect, useState } from "react";
import GlifosFondo from "./components/GlifosFondo.jsx";
import Ajustes from "./components/Ajustes.jsx";
import Info from "./components/Informacion.jsx";
import Landing from "./components/Landing.jsx";
import Descargas from "./components/Descargas.jsx";
import Autenticacion from "./components/Autenticacion.jsx";
import Red from "./components/Red.jsx";
import Nodos from "./components/Nodos.jsx";
import Cuenta from "./components/Cuenta.jsx";
import Tarifas from "./components/Tarifas.jsx";
import Admin from "./components/Admin.jsx";
import { me, setToken, getToken } from "./lib/api.js";
import { aplicaTema, cargaTema } from "./lib/temas.js";

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
  planes: "plan --ver-tarifas",
  admin: "sudo panel-admin --rol admin",
  inicio: "cat bienvenida.md",
  auth: "./acceder",
};
const DOCS_URL = "https://jumpernet.duckdns.org/docs/";

export default function App() {
  const [tab, setTab] = useState(getToken() ? "red" : "inicio");
  const [yo, setYo] = useState(null);
  const [authModo, setAuthModo] = useState("login");
  const [toasts, setToasts] = useState([]);
  const [lateral, setLateral] = useState(false);   // menú móvil
  const [pegada, setPegada] = useState(false);     // topbar con scroll

  useEffect(() => { aplicaTema(cargaTema()); }, []);
  useEffect(() => {
    if (getToken()) me().then(setYo).catch(() => {});
  }, []);
  useEffect(() => {
    const alScroll = () => setPegada(window.scrollY > 12);
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);
  // spotlight en tarjetas: cada tarjeta ilumina alrededor del cursor
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

  function aviso(texto, tipo = "ok") {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
  }
  function salir() { setToken(null); setYo(null); setTab("inicio"); aviso("sesión cerrada", "ok"); }
  function alEntrar() { me().then((d) => { setYo(d); setTab("red"); }).catch(() => aviso("no se pudo cargar tu cuenta", "error")); }
  function irAuth(m = "login") { setAuthModo(m); setTab("auth"); }
  function ir(id) { setTab(id); setLateral(false); }

  const enSesion = !!yo && !!getToken();
  const activo = !!yo?.activo;

  const navega = (id) => (
    <button key={id} className={`lateral-btn ${tab === id ? "activa" : ""}`} onClick={() => ir(id)}>
      <span className="ico">{NAV_SESION.flatMap((g) => g.items).find((i) => i.id === id)?.ico}</span>
      <span>{NAV_SESION.flatMap((g) => g.items).find((i) => i.id === id)?.texto}</span>
      {id === "red" && (
        <span className={`punto ${activo ? "" : ""}`} style={{
          width: 7, height: 7, borderRadius: "50%", marginLeft: "auto",
          background: activo ? "var(--acento-1)" : "#7b8781",
          boxShadow: activo ? "0 0 8px rgb(from var(--acento-1) r g b / .8)" : "none",
        }} />
      )}
    </button>
  );

  return (
    <>
      <GlifosFondo />
      <div className="cascara">

        {/* ───────── barra lateral ───────── */}
        <aside className={`lateral ${lateral ? "abierto" : ""}`}>
          <button className="lateral-marca" onClick={() => ir(enSesion ? "red" : "inicio")}>
            <span className="logo-cubo flota">{">_"}</span>
            <span className="nombre">Jumper<span>NAT</span><span className="cursor">_</span></span>
          </button>

          <div className="lateral-cuerpo">
            <div className="lateral-grupo">
              <div className="lateral-titulo">// público</div>
              <button className={`lateral-btn ${tab === "inicio" ? "activa" : ""}`} onClick={() => ir("inicio")}>
                <span className="ico">⌂</span><span>Inicio</span>
              </button>
              {!enSesion && (
                <button className={`lateral-btn ${tab === "auth" ? "activa" : ""}`} onClick={() => irAuth(authModo)}>
                  <span className="ico">⇥</span><span>Acceder</span>
                </button>
              )}
              <button className={`lateral-btn ${tab === "descargas" ? "activa" : ""}`} onClick={() => ir("descargas")}>
                <span className="ico">⬇</span><span>Descargas</span>
              </button>
              <button className={`lateral-btn ${tab === "planes" ? "activa" : ""}`} onClick={() => ir("planes")}>
                <span className="ico">◈</span><span>Tarifas</span>
              </button>
              <a className="lateral-btn link-externa" href={DOCS_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <span className="ico">▤</span><span>Documentación</span><span style={{ marginLeft: "auto", opacity: .6, fontSize: 10 }}>↗</span>
              </a>
            </div>

            {enSesion && (yo?.rol === "admin" || yo?.rol === "moderador") && (
              <div className="lateral-grupo">
                <div className="lateral-titulo">// gestión</div>
                <button className={`lateral-btn ${tab === "admin" ? "activa" : ""}`} onClick={() => ir("admin")}>
                  <span className="ico">🛡</span><span>{yo?.rol === "admin" ? "Administración" : "Moderación"}</span>
                  <span className="punto-vivo" style={{ marginLeft: "auto" }} />
                </button>
              </div>
            )}

            {enSesion && NAV_SESION.map((g) => (
              <div className="lateral-grupo" key={g.grupo}>
                <div className="lateral-titulo">// {g.grupo}</div>
                {g.items.map((i) => navega(i.id))}
              </div>
            ))}

            {enSesion && (
              <div className="lateral-grupo">
                <div className="lateral-titulo">// sesión</div>
                <button className="lateral-btn" onClick={salir}><span className="ico">⏻</span><span>Salir</span></button>
              </div>
            )}
          </div>

          <div className="lateral-pie">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="punto-vivo" />
              {enSesion ? (activo ? "red activa · 3 saltos" : "red apagada") : "sin sesión"}
            </span>
            <span style={{ color: "rgb(255 255 255 / .35)" }}>jumpernet.duckdns.org</span>
          </div>
        </aside>

        {lateral && <div className="velo" onClick={() => setLateral(false)} />}

        {/* ───────── topbar + contenido ───────── */}
        <div className="principal">
          <header className={`barra-sup ${pegada ? "pegada" : ""}`}>
            <button className="hamburguesa" onClick={() => setLateral(true)} aria-label="Abrir menú">☰</button>
            <span className="prompt">
              <b>{(yo?.alias || yo?.email?.split("@")[0] || "invitado")}</b>@jumpernat:<i>~/{tab}</i>$ {PROMPT[tab]}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {enSesion && (
                <span className={`chip ${activo ? "vivo" : "muerto"}`}>{activo ? "RED ACTIVA" : "RED OFF"}</span>
              )}
              {enSesion && (
                <button className="btn" onClick={() => ir("nodos")} title="Ver todos los nodos">
                  ⛓ {yo?.circuito?.length ? `${yo.circuito.length}/3` : "0/3"}
                </button>
              )}
              {enSesion
                ? <button className="btn" onClick={salir}>Salir</button>
                : <button className="btn primario" onClick={() => irAuth("login")}>Acceder</button>}
            </span>
          </header>          <main className="contenido">
            <div className="vista" key={tab}>
            {tab === "inicio" && <Landing irAuth={irAuth} enSesion={enSesion} />}

            {tab === "planes" && <Tarifas irAuth={irAuth} />}

            {tab === "admin" && enSesion && (yo?.rol === "admin" || yo?.rol === "moderador") && (
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

            {tab === "auth" && !enSesion && (
              <Autenticacion alEntrar={alEntrar} aviso={aviso} modoInicial={authModo} volver={() => ir("inicio")} />
            )}

            {tab === "red" && enSesion && <Red yo={yo} alRecargar={setYo} aviso={aviso} />}

            {tab === "nodos" && enSesion && (
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

            {tab === "cuenta" && enSesion && (
              <Cuenta yo={yo} aviso={aviso} alSalir={salir} irRed={() => ir("red")} alRecargar={setYo} />
            )}

            {tab === "ajustes" && enSesion && (
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

            {tab === "info" && enSesion && (
              <div className="apa">
                <div className="cab-seccion">
                  <div className="cubo-ico">▤</div>
                  <div>
                    <span className="migas">panel / documentación</span>
                    <h1>Documentación</h1>
                    <p className="sub">Qué es, cómo funciona el circuito por dentro y los detalles técnicos.</p>
                  </div>
                </div>
                <Info />
              </div>
            )}

            <footer className="nota mono" style={{ textAlign: "center", marginTop: 44, fontSize: 10.5 }}>
              JumperNET · 3 saltos · ChaCha20-Poly1305 · api: jumpernet.duckdns.org
              <br />
              <span style={{ opacity: .7 }}>proyecto educativo · la red solo se activa cuando tú lo decides</span>
            </footer>
            </div>
          </main>
        </div>
      </div>

      {/* avisos */}
      <div style={{ position: "fixed", bottom: 18, right: 18, display: "grid", gap: 8, zIndex: 90, maxWidth: "min(340px, 88vw)" }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast-viva ${t.tipo === "error" ? "error" : "ok"}`}>
            <span aria-hidden>{t.tipo === "error" ? "⚠" : "✓"}</span>{t.texto}
          </div>
        ))}
      </div>
    </>
  );
}
