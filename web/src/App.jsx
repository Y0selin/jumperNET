import { useEffect, useState } from "react";
import GlifosFondo from "./components/GlifosFondo.jsx";
import Ajustes from "./components/Ajustes.jsx";
import Info from "./components/Informacion.jsx";
import Landing from "./components/Landing.jsx";
import Autenticacion from "./components/Autenticacion.jsx";
import Red from "./components/Red.jsx";
import Cuenta from "./components/Cuenta.jsx";
import { me, setToken, getToken } from "./lib/api.js";
import { aplicaTema, cargaTema } from "./lib/temas.js";

const TABS = [
  { id: "red", texto: "Red", ico: "◉" },
  { id: "cuenta", texto: "Cuenta", ico: "☰" },
  { id: "info", texto: "Info", ico: "▤" },
  { id: "ajustes", texto: "Ajustes", ico: "✦" },
];

export default function App() {
  const [tab, setTab] = useState(getToken() ? "red" : "inicio");
  const [yo, setYo] = useState(null);
  const [authModo, setAuthModo] = useState("login");
  const [toasts, setToasts] = useState([]);

  useEffect(() => { aplicaTema(cargaTema()); }, []);
  useEffect(() => {
    if (getToken()) me().then(setYo).catch(() => {});
  }, []);

  function aviso(texto, tipo = "ok") {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
  }
  function salir() { setToken(null); setYo(null); setTab("inicio"); aviso("sesión cerrada", "ok"); }
  function alEntrar() { me().then((d) => { setYo(d); setTab("red"); }).catch(() => aviso("no se pudo cargar tu cuenta", "error")); }
  function irAuth(m = "login") { setAuthModo(m); setTab("auth"); }

  const enSesion = !!yo && !!getToken();

  return (
    <>
      <GlifosFondo />
      <div style={{ position: "relative", zIndex: 1 }}>

        <header className="barra">
          <div className="barra-inner">
            <div className="logo-marca" onClick={() => setTab(enSesion ? "red" : "inicio")}
              style={{ cursor: "pointer" }} role="button" tabIndex={0}>
              <div className="logo-cubo flota">JN</div>
              <div>
                <div className="nombre">JumperNAT</div>
                <div className="lema mono">▚ red por saltos · bajo tu control</div>
              </div>
            </div>

            <nav className="tabs">
              {enSesion && TABS.map((t) => (
                <button key={t.id} className={tab === t.id ? "activa" : ""} onClick={() => setTab(t.id)}>
                  <span className="mono" style={{ opacity: .7, marginRight: 6 }}>{t.ico}</span>{t.texto}
                </button>
              ))}
              {!enSesion && <button className={tab === "inicio" ? "activa" : ""} onClick={() => setTab("inicio")}>Inicio</button>}
              {!enSesion && <button className={tab === "auth" ? "activa" : ""} onClick={() => irAuth(authModo)}>Acceder</button>}
              {enSesion && <button onClick={salir}>Salir</button>}
            </nav>
          </div>
        </header>

        <div className="contenedor">

          {tab === "inicio" && !enSesion && <Landing irAuth={irAuth} />}

          {tab === "auth" && !enSesion && (
            <Autenticacion alEntrar={alEntrar} aviso={aviso} modoInicial={authModo} volver={() => setTab("inicio")} />
          )}

          {tab === "red" && enSesion && <Red yo={yo} aviso={aviso} alSalir={salir} />}

          {tab === "cuenta" && enSesion && (
            <Cuenta yo={yo} aviso={aviso} alSalir={salir} irRed={() => setTab("red")} />
          )}

          {tab === "ajustes" && enSesion && (
            <div className="apa" style={{ display: "grid", gap: 16 }}>
              <div className="seccion-titulo">
                <span className="migas mono">panel / ajustes</span>
                <h1>Diseñador del tema</h1>
                <span className="nota">colores, radios, letra, efectos y CSS libre — en vivo y solo en tu navegador.</span>
              </div>
              <Ajustes aviso={aviso} />
            </div>
          )}

          {tab === "info" && enSesion && (
            <div className="apa" style={{ display: "grid", gap: 16 }}>
              <div className="seccion-titulo">
                <span className="migas mono">panel / info</span>
                <h1>Documentación</h1>
                <span className="nota">qué es, cómo funciona y los detalles técnicos del circuito.</span>
              </div>
              <Info />
            </div>
          )}

          <footer className="nota mono" style={{ textAlign: "center", marginTop: 44, fontSize: 11 }}>
            JumperNAT · 3 saltos · ChaCha20-Poly1305 · api: jumpernet.duckdns.org
            <br />
            <span style={{ opacity: .7 }}>proyecto educativo · la red solo se activa cuando tú lo decides</span>
          </footer>
        </div>
      </div>

      {/* avisos flotantes */}
      <div style={{ position: "fixed", bottom: 18, right: 18, display: "grid", gap: 8, zIndex: 90, maxWidth: "min(340px, 88vw)" }}>
        {toasts.map((t) => (
          <div key={t.id} className={`apa ${t.tipo === "error" ? "mensaje-error" : "mensaje-ok"}`}
            style={{ minWidth: 220, marginTop: 0, boxShadow: "0 14px 34px rgb(0 0 0 / .55)", backdropFilter: "blur(8px)" }}>
            {t.tipo === "error" ? "⚠ " : "✓ "}{t.texto}
          </div>
        ))}
      </div>
    </>
  );
}
