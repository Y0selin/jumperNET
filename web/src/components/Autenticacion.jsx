import { useEffect, useState } from "react";
import { login, registrar, setToken } from "../lib/api.js";

/* Acceso minimalista: un marco que gira, dos campos y un botón.
   Nada de párrafos: la explicación vive en la landing. */
export default function Autenticacion({ alEntrar, aviso, modoInicial = "login", volver }) {
  const [modo, setModo] = useState(modoInicial);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [ver, setVer] = useState(false);
  const [cargando, setCar] = useState(false);
  const [error, setError] = useState("");
  const [temblando, setTemblando] = useState(false);

  useEffect(() => { setModo(modoInicial); setError(""); }, [modoInicial]);

  function fallo(msg) {
    setError(msg);
    setTemblando(true);
    setTimeout(() => setTemblando(false), 460);
  }

  async function enviar(e) {
    e.preventDefault();
    const correo = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return fallo("eso no parece un correo válido");
    if (modo === "registro" && pass.length < 8) return fallo("la contraseña necesita 8 caracteres o más");
    if (!pass) return fallo("escribe tu contraseña");

    setCar(true); setError("");
    try {
      if (modo === "login") {
        const r = await login(correo, pass);
        setToken(r.token);
        alEntrar();
      } else {
        await registrar(correo, pass);
        setModo("login");
        setPass("");
        aviso("cuenta creada — ya puedes entrar", "ok");
      }
    } catch (err) { fallo(err.message); }
    finally { setCar(false); }
  }

  return (
    <div className="apa" style={{ minHeight: "74vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(940px, 94vw)", display: "grid", gap: 26 }}>

        {/* ── tarjeta de acceso ── */}
        <div className="marco-grad" style={{ width: "min(430px, 92vw)", margin: "0 auto" }}>
          <div className="girador" aria-hidden />
          <form
            className={`tarjeta panel-auth apa${temblando ? " sacude" : ""}`}
            onSubmit={enviar}
            noValidate
            style={{ padding: 26 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div className="logo-cubo" style={{ width: 30, height: 30, fontSize: 11 }}>JN</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {modo === "login" ? "Entrar en tu panel" : "Crear tu cuenta"}
                </div>
                <div className="nota mono" style={{ fontSize: 11 }}>
                  {modo === "login" ? "tu sesión dura 2 h" : "sin datos personales, solo email"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                <button type="button" className={`pestAuth ${modo === "login" ? "on" : ""}`} style={{ padding: "6px 12px", flex: "none" }} onClick={() => setModo("login")}>Entrar</button>
                <button type="button" className={`pestAuth ${modo === "registro" ? "on" : ""}`} style={{ padding: "6px 12px", flex: "none" }} onClick={() => setModo("registro")}>Crear</button>
              </div>
            </div>

            <label className="nota mono" style={{ display: "block", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 5 }}>correo</label>
            <input className="campo" type="email" required autoComplete="username" autoFocus
              placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="nota mono" style={{ display: "block", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 5 }}>contraseña</label>
            <div className="campo-caja">
              <input className="campo" type={ver ? "text" : "password"} required
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                placeholder={modo === "login" ? "••••••••" : "mínimo 8 caracteres"}
                value={pass} onChange={(e) => setPass(e.target.value)} style={{ paddingRight: 58 }} />
              <button type="button" className="ojo" onClick={() => setVer((v) => !v)}
                aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"}>{ver ? "OCULTAR" : "VER"}</button>
            </div>

            <button className="btn primario grande" disabled={cargando} style={{ marginTop: 6 }}>
              {cargando ? <span className="spin" /> : (modo === "login" ? "Entrar →" : "Crear cuenta →")}
            </button>

            {error && <div className="mensaje-error">⚠ {error}</div>}

            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
              <span className="chip mono" style={{ fontSize: 10.5 }}>3 saltos</span>
              <span className="chip mono" style={{ fontSize: 10.5 }}>ChaCha20</span>
              <span className="chip mono" style={{ fontSize: 10.5 }}>80/443</span>
            </div>

            {volver && (
              <button type="button" className="nota" style={{ width: "100%", background: "none", border: "none", color: "var(--acento-1)", cursor: "pointer", marginTop: 10, fontFamily: "inherit" }}
                onClick={volver}>← volver al inicio</button>
            )}
          </form>
        </div>

        {/* ── tres pasos, sin murallas de texto ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
          {[
            ["①", "Entras con tu email", "argon2 en el servidor; nada más que pedirte."],
            ["②", "Activas la red tú", "el interruptor empieza apagado: sin sorpresas."],
            ["③", "Copias y navegas", "comando SOCKS5 por el puerto 1080, listo."],
          ].map(([n, t, d]) => (
            <div key={t} className="tarjeta apa" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="num" style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid rgb(from var(--acento-1) r g b / .5)", color: "var(--acento-1)", fontSize: 11, fontFamily: "ui-monospace, monospace", flex: "none" }}>{n}</span>
                <div>
                  <b style={{ fontSize: 13.5 }}>{t}</b>
                  <div className="nota" style={{ fontSize: 12 }}>{d}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
