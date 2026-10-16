import { useState } from "react";
import { login, registrar, setToken, getToken } from "../lib/api.js";

export default function Autenticacion({ alEntrar, aviso }) {
  const [pesta, setPesta] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [cargando, setCar] = useState(false);
  const [error, setErr] = useState("");

  async function mandar(e) {
    e.preventDefault();
    setCar(true); setErr("");
    try {
      if (pesta === "login") {
        const r = await login(email.trim(), pass);
        setToken(r.token); alEntrar();
        aviso("sesión iniciada — bienvenido de vuelta", "ok");
      } else {
        await registrar(email.trim(), pass);
        setPesta("login");
        aviso("cuenta creada: ahora ENTRA con tus credenciales", "ok");
        setEmail(""); setPass("");
      }
    } catch (err) { setErr(err.message); }
    finally { setCar(false); }
  }

  return (
    <div className="grid2 aparecer">
      <div className="tarjeta destacada grande t-led">
        <h2 className="seccion">{pesta === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>

        <div className="fila-btn" style={{ marginBottom: 16 }}>
          <button onClick={() => setPesta("login")} className={`btn ${pesta === "login" ? "primario" : ""}`}>Entrar</button>
          <button onClick={() => setPesta("registro")} className={`btn ${pesta === "registro" ? "primario" : ""}`}>Crear cuenta</button>
        </div>

        <form onSubmit={mandar}>
          <input className="campo" type="email" required autoComplete="username"
            placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="campo" type="password" required autoComplete="current-password"
            placeholder={pesta === "login" ? "contraseña" : "contraseña (min. 8 caracteres)"}
            value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn primario grande" disabled={cargando}>
            {cargando ? <span className="spin" /> : (pesta === "login" ? "Entrar a la torre de control" : "Crear mi cuenta")}
          </button>
        </form>
        {error && <div className="error-msg">⚠ {error}</div>}
        <p className="nota" style={{ marginTop: 12 }}>
          Tu contraseña se guarda con <b>argon2</b> y la sesión es un <b>JWT</b> que caduca en 2 h.
          Al conectar generas un circuito de 3 saltos y tu usuario de SOCKS5 seran tus credenciales.
        </p>
      </div>

      <div className="tarjeta t-led">
        <h2 className="seccion">¿En qué estás entrando?</h2>
        <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
          <li className="dato"><span className="etq"><b>1.</b> Creas/entras a tu cuenta</span><span className="val">JWT 2h</span></li>
          <li className="dato"><span className="etq"><b>2.</b> Pulsa «Conectar»</span><span className="val">circuito 3 saltos</span></li>
          <li className="dato"><span className="etq"><b>3.</b> Copia el comando SOCKS5</span><span className="val">puerto 1080</span></li>
          <li className="dato"><span className="etq"><b>4.</b> Mira tu viaje en el panel</span><span className="val">mapa + nodos</span></li>
        </ul>
        <div className="ok-msg" style={{ marginTop: 12, fontSize: 13 }}>
          🔒 Nadie ve tu contenido de un salto al otro: el tramo va con <b>ChaCha20-Poly1305</b>
          (Fase 8) y los nodos son reenvíos ciegos — ni registro ni histórico de tus destinos.
        </div>
        <div className="nota" style={{ marginTop: 10 }}>
          Proyecto educativo de anonimato por saltos. La web habla SOLO con
          la API https://jumpernet.duckdns.org (CORS de GitHub Pages).
        </div>
      </div>
    </div>
  );
}
