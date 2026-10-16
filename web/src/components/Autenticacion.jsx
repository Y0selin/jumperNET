import { useEffect, useRef, useState } from "react";
import { login, registrar, setToken } from "../lib/api.js";

/* Acceso: una tarjeta limpia, validación en vivo y mensajes que de verdad
   ayudan. La explicación larga vive en la landing; aquí nada de adorno. */
export default function Autenticacion({ alEntrar, aviso, modoInicial = "login", volver }) {
  const [modo, setModo] = useState(modoInicial); // «login» | «registro»
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [ver, setVer] = useState(false);
  const [cargando, setCar] = useState(false);
  const [error, setError] = useState("");
  const [temblando, setTemblando] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const refClave = useRef(null);

  useEffect(() => { setModo(modoInicial); setError(""); }, [modoInicial]);

  const correo = email.trim();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);

  /* fuerza de contraseña (solo en registro): 0 vacía · -1 corta · 1 aceptable · 2 buena */
  const fuerza =
    modo !== "registro" ? 0
    : !pass ? 0
    : pass.length < 8 ? -1
    : (pass.length >= 12 || (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass))) ? 2
    : 1;

  function fallo(msg) {
    setError(msg);
    setTemblando(true);
    setTimeout(() => setTemblando(false), 460);
  }

  /* traduce los fallos de la API a algo que se entienda: qué pasó y qué hacer */
  function entiende(e0) {
    const msg = (e0?.message || "").toLowerCase();
    if (msg.includes("ya esta registrado") || msg.includes("ya está registrado"))
      return { texto: "ese correo ya tiene cuenta — cámbiate a «Entrar»", cambio: "login" };
    if (msg.includes("demasiados")) return { texto: "demasiados intentos seguidos: espera un par de minutos y reintenta" };
    if (msg.includes("credenciales") || msg.includes("no válidas") || msg.includes("no validas"))
      return { texto: "correo o contraseña incorrectos (o la cuenta no existe: créala primero)" };
    if (msg.includes("sin conexión")) return { texto: "el servidor no responde ahora mismo — reintenta en unos segundos" };
    return { texto: e0?.message || "algo ha fallado — reintenta" };
  }

  async function enviar(e) {
    e.preventDefault();
    if (cargando) return;
    if (!correo) return fallo("escribe tu correo");
    if (!emailValido) return fallo("eso no parece un correo válido (falta @ o el dominio)");
    if (!pass) return fallo("escribe tu contraseña");
    if (modo === "registro" && pass.length < 8) return fallo("la contraseña necesita 8 caracteres o más");

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
        setError("");
        aviso("cuenta creada — te llevo a entrar", "ok");
        /* el correo ya está: el foco va directo a la contraseña */
        requestAnimationFrame(() => refClave.current?.focus());
      }
    } catch (err0) {
      const e1 = entiende(err0);
      fallo(e1.texto || e1);
      if (e1.cambio === "login") requestAnimationFrame(() => setModo("login"));
    } finally { setCar(false); }
  }

  return (
    <div className="apa" style={{ minHeight: "74vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(940px, 94vw)", display: "grid", gap: 26 }}>

        {/* ── tarjeta de acceso: marco estático limpio ── */}
        <div className="marco-grad" style={{ width: "min(430px, 92vw)", margin: "0 auto" }}>
          <form
            className={`tarjeta panel-auth apa${temblando ? " sacude" : ""}`}
            onSubmit={enviar}
            noValidate
            style={{ padding: 26 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div className="logo-cubo" style={{ width: 30, height: 30, fontSize: 11 }}>JN</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                  {modo === "login" ? "Entrar en tu panel" : "Crear tu cuenta"}
                </div>
                <div className="nota mono" style={{ fontSize: 11 }}>
                  {modo === "login" ? "tu sesión dura 2 h" : "solo pide email y contraseña"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                <button type="button" className={`pestAuth ${modo === "login" ? "on" : ""}`} style={{ padding: "6px 12px", flex: "none" }} onClick={() => { setModo("login"); setError(""); }}>Entrar</button>
                <button type="button" className={`pestAuth ${modo === "registro" ? "on" : ""}`} style={{ padding: "6px 12px", flex: "none" }} onClick={() => { setModo("registro"); setError(""); }}>Crear</button>
              </div>
            </div>

            <label className="nota mono" htmlFor="jn-email" style={{ display: "block", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 5 }}>
              correo
            </label>
            <input id="jn-email" className="campo" type="email" required autoComplete="username" autoFocus
              aria-invalid={!!email && !emailValido}
              placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {!!email && !emailValido && modo === "registro" && (
              <div className="pista" style={{ marginTop: -6, marginBottom: 10 }}>te faltan «@» o el dominio</div>
            )}

            <label className="nota mono" htmlFor="jn-pass" style={{ display: "block", fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 5 }}>
              contraseña
            </label>
            <div className="campo-caja">
              <input id="jn-pass" ref={refClave} className="campo" type={ver ? "text" : "password"} required
                aria-invalid={modo === "registro" && pass.length >= 1 && pass.length < 8}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                onKeyUp={(e0) => setCapsLock(e0.getModifierState?.("CapsLock") || false)}
                onKeyDown={(e0) => setCapsLock(e0.getModifierState?.("CapsLock") || false)}
                placeholder={modo === "login" ? "••••••••" : "mínimo 8 caracteres"}
                value={pass} onChange={(e0) => setPass(e0.target.value)} style={{ paddingRight: 58 }} />
              <button type="button" className="ojo" onClick={() => setVer((v) => !v)}
                aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"}>{ver ? "OCULTAR" : "VER"}</button>
            </div>
            {capsLock && <div className="aviso-caps mono">BLOQ MAYÚS activado</div>}

            {modo === "registro" && (pass.length > 0) && (
              <div className="fuerza" role="status" aria-label="Fuerza de la contraseña">
                <i data-estado={fuerza >= 1 ? "ok" : fuerza === -1 ? "mal" : ""} />
                <i data-estado={fuerza >= 2 ? "ok" : fuerza === -1 ? "mal" : ""} />
                <i data-estado={fuerza >= 2 ? "ok" : ""} />
                <span className="nota mono" style={{ fontSize: 10.5 }}>
                  {fuerza === -1 ? `${8 - pass.length} más para el mínimo`
                    : fuerza === 1 ? "aceptable — mejor más larga o con números"
                    : fuerza === 2 ? "buena clave"
                    : ""}
                </span>
              </div>
            )}

            <button className="btn primario grande" disabled={cargando} style={{ marginTop: modo === "registro" && pass.length > 0 ? 2 : 6 }}>
              {cargando
                ? <> <span className="spin" /> en marcha…</>
                : (modo === "login" ? "Entrar →" : "Crear cuenta →")}
            </button>

            {error && <div className="mensaje-error" role="alert">⚠ {error}</div>}

            {volver && (
              <button type="button" className="nota" style={{ width: "100%", background: "none", border: "none", color: "var(--acento-1)", cursor: "pointer", marginTop: 12, fontFamily: "inherit" }}
                onClick={volver}>← volver al inicio</button>
            )}
          </form>
        </div>

        {/* ── tres pasos, sin murallas de texto ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
          {[
            ["①", "Entras con tu email", "argon2 en el servidor; nada más que pedirte."],
            ["②", "Activas la red tú", "el interruptor empieza apagado: sin sorpresas."],
            ["③", "Navegas por el circuito", "con la extensión o el comando SOCKS5; el mundo ve la IP del exit."],
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
