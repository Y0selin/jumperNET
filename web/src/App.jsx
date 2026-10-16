import { useEffect, useState } from "react";
import Aurora from "./components/Aurora.jsx";
import Autenticacion from "./components/Autenticacion.jsx";
import Panel from "./components/Panel.jsx";
import Ajustes from "./components/Ajustes.jsx";
import Informacion from "./components/Informacion.jsx";
import { api, me, setToken, getToken, decodificaJwt } from "./lib/api.js";
import { aplicaTema, cargaTema } from "./lib/temas.js";

let _idToast = 0;

export default function App() {
  const [tab, setTab] = useState(getToken() ? "panel" : "entrar");
  const [yo, setYo] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => { aplicaTema(cargaTema()); }, []);
  useEffect(() => {
    if (getToken()) {
      me().then(setYo).catch(() => {});
    }
  }, []);

  function aviso(texto, tipo = "ok") {
    const id = ++_idToast;
    setToasts((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3800);
  }

  async function salir() {
    setToken(null); setYo(null); setTab("entrar"); aviso("sesión cerrada", "ok");
  }
  async function eliminarCuenta() {
    if (!confirm("¿ELIMINAR tu cuenta para siempre? Se borra tu circuito y tu registro.")) return;
    try { await api("DELETE", "/me"); salir(); aviso("cuenta eliminada", "ok"); }
    catch (e) { aviso(e.message, "error"); }
  }

  function alEntrar() { me().then((d) => { setYo(d); setTab("panel"); }); }

  const enSesion = !!yo && !!getToken();

  return (
    <>
      <Aurora />
      <div style={{ position: "relative", zIndex: 1 }}>

        <header className="barra">
          <div className="barra-inner">
            <div className="logo-marca">
              <div className="logo-cubo flota">JN</div>
              <div>
                <div className="nombre">JumperNAT</div>
                <div className="lema">torre de control · 3 saltos · cifrado en capas</div>
              </div>
            </div>
            <nav className="tabs">
              {[
                ["panel", "Panel", enSesion],
                ["ajustes", "Ajustes", true],
                ["info", "Info", true],
                ["cuenta", "Cuenta", enSesion],
                ["entrar", "Entrar", !enSesion],
              ].filter(([, , visible]) => visible).map(([id, texto]) => (
                <button key={id} className={tab === id ? "activa" : ""} onClick={() => setTab(id)}>{texto}</button>
              ))}
            </nav>
          </div>
        </header>

        <div className="contenedor">
          {/* ======== ENTRAR ======== */}
          {tab === "entrar" && (!enSesion) && (
            <Autenticacion alEntrar={alEntrar} aviso={aviso} />
          )}

          {/* ======== PANEL ======== */}
          {tab === "panel" && enSesion && (
            <>
              <div className="aparecer" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="titular-maquina" style={{ fontSize: 24 }}>
                  Hola de nuevo, {yo.email.split("@")[0]}
                </h1>
                <span className="chip nuevo">⚡ red en vivo</span>
              </div>
              <Panel yo={yo} aviso={aviso} />
            </>
          )}

          {/* ======== AJUSTES ======== */}
          {tab === "ajustes" && (
            <>
              <div className="aparecer" style={{ marginBottom: 14 }}>
                <h1 style={{ fontSize: 24 }}>🎨 Diseñador visual</h1>
                <p className="nota">Diseña la página a tu gusto: colores, esquinas, letra, efectos y CSS libre. Todo en vivo y solo en tu navegador.</p>
              </div>
              <Ajustes aviso={aviso} />
            </>
          )}

          {/* ======== INFO ======== */}
          {tab === "info" && (
            <>
              <div className="aparecer" style={{ marginBottom: 14 }}>
                <h1 style={{ fontSize: 24 }}>📚 ¿Cómo funciona esto?</h1>
                <p className="nota">Desde la explicación de cero conocimientos hasta los formatos exactos de protocolo.</p>
              </div>
              <Informacion />
            </>
          )}

          {/* ======== CUENTA ======== */}
          {tab === "cuenta" && enSesion && (
            <div className="tarjeta grande t-led" style={{ maxWidth: 520 }}>
              <h2 className="seccion">Tu cuenta</h2>
              <div className="dato"><span className="etq">email</span><span className="val">{yo.email}</span></div>
              <div className="dato"><span className="etq">id</span><span className="val">{yo.id}</span></div>
              <div className="dato"><span className="etq">sesión JWT</span><span className="val">{decodificaJwt(getToken()) ? `expira ${new Date(decodificaJwt(getToken()).cuerpo.exp * 1000).toLocaleTimeString()}` : "—"}</span></div>
              <div className="fila-btn" style={{ marginTop: 16 }}>
                <button className="btn" onClick={() => setTab("panel")}>← Volver al panel</button>
                <button className="btn" onClick={salir}>Cerrar sesión</button>
                <button className="btn peligro" onClick={eliminarCuenta}>Eliminar cuenta</button>
              </div>
              <p className="nota" style={{ marginTop: 10 }}>
                Eliminar cuenta borra al instante tu registro y tu circuito. Por diseño solo se guarda
                tu estado actual: nunca hay histórico de tráfico ni de destinos.
              </p>
            </div>
          )}

          <footer className="nota" style={{ textAlign: "center", marginTop: 34, fontSize: 12 }}>
            JumperNAT · proyecto educativo de anonimato por circuito de saltos ·
            React + Vite · API: jumpernet.duckdns.org
          </footer>
        </div>
      </div>

      {/* toasts */}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "grid", gap: 8, zIndex: 99 }}>
        {toasts.map((t) => (
          <div key={t.id} className={t.tipo === "error" ? "error-msg" : "ok-msg"} style={{
            minWidth: 240, boxShadow: "0 10px 30px rgb(0 0 0 /.5)",
            animation: "llega-tarjeta .4s cubic-bezier(.2,.9,.3,1.15) both",
          }}>{t.tipo === "error" ? "⚠ " : "✓ "}{t.texto}</div>
        ))}
      </div>
    </>
  );
}
