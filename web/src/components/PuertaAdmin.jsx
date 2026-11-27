import { useEffect, useRef, useState } from "react";
import Logo from "./Logo.jsx";
import {
  ACCESOS, MAX_INTENTOS, pruebaLlave, abreSesion, esperaBloqueo,
} from "../lib/llave.js";

/* Puerta de la sala de mando.
 *
 * No es un login: la sesión ya existe y el rol ya lo comprobó el servidor.
 * Es una segunda cerradura para que el panel no quede abierto en un equipo
 * compartido ni con solo pegar #/panel/admin en la barra de direcciones.
 * La llave vive en el navegador: se dice claramente que no es seguridad
 * de servidor, y cada petición sigue pasando por el rol real de la API.
 */

export default function PuertaAdmin({ yo, aviso, onEntra }) {
  const [nombre, setNombre] = useState("");
  const [llave, setLlave] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const [espera, setEspera] = useState(() => esperaBloqueo());
  const [mayus, setMayus] = useState(false);
  const nombreRef = useRef(null);
  const temporizador = useRef(0);
  const bloqueado = espera > 0;

  useEffect(() => {
    nombreRef.current?.focus();
    return () => clearTimeout(temporizador.current);
  }, []);

  useEffect(() => {
    if (!bloqueado) return undefined;
    const t = setInterval(() => setEspera(esperaBloqueo()), 500);
    return () => clearInterval(t);
  }, [bloqueado]);

  function golpea(texto) {
    setError(texto);
    setSacudir(true);
    setTimeout(() => setSacudir(false), 460);
  }

  function entra(e) {
    e?.preventDefault();
    if (abriendo || bloqueado) return;

    const r = pruebaLlave(nombre, llave);
    if (!r.ok) {
      setLlave("");
      setEspera(esperaBloqueo());
      golpea(
        r.motivo === "espera"
          ? `Demasiados intentos seguidos. Vuelve a probar en ${Math.ceil(r.espera / 1000)} s.`
          : !nombre.trim()
            ? "Escribe tu nombre y la llave del equipo."
            : "Ese nombre y esa llave no abren la sala. Revisa mayúsculas y espacios.",
      );
      return;
    }

    setError("");
    setAbriendo(true);
    temporizador.current = setTimeout(() => {
      const sesion = abreSesion(r.acceso);
      onEntra(sesion);
      aviso?.(`sala abierta · ${r.acceso.nombre}`, "ok");
    }, 620);
  }

  function alTeclear(e) {
    /* Caps Lock es la causa número uno de llaves “incorrectas” */
    if (typeof e.getModifierState === "function") {
      setMayus(e.getModifierState("CapsLock"));
    }
  }

  const estado = bloqueado
    ? `bloqueada · ${Math.ceil(espera / 1000)} s`
    : abriendo
      ? "comprobando…"
      : "cerrada";

  return (
    <section className="jn-adm-puerta" aria-labelledby="jn-puerta-titulo">
      <div className="jn-adm-puerta-atmos" aria-hidden>
        <i /><i /><i /><span />
      </div>

      <div className={`jn-adm-puerta-caja ${sacudir ? "sacude" : ""}`}>
        <div className="jn-adm-puerta-barra">
          <span className="jn-adm-puerta-marca">
            <span className="jn-adm-puerta-logo"><Logo tam={22} /></span>
            <span className="mono">jumpernet<b>_</b></span>
          </span>
          <span className={`jn-adm-puerta-estado mono ${abriendo ? "abriendo" : bloqueado ? "bloqueada" : ""}`}>
            <i aria-hidden /> {estado}
          </span>
        </div>

        <div className="jn-adm-puerta-cuerpo">
          <div className="jn-adm-puerta-sello" aria-hidden>
            <i className="jn-adm-puerta-aro a" />
            <i className="jn-adm-puerta-aro b" />
            <span className="jn-adm-puerta-escudo">🛡</span>
            <b className="mono">JN</b>
          </div>

          <div className="jn-adm-puerta-cab">
            <span className="jn-adm-puerta-kicker mono">acceso restringido · segunda cerradura</span>
            <h1 id="jn-puerta-titulo">Sala de mando</h1>
            <p>
              El menú no abre esta puerta: la abre tu nombre y la llave del equipo.
              El servidor sigue comprobando tu rol en cada petición, esto solo evita
              que la sala quede a la vista en un navegador ajeno.
            </p>
          </div>

          <div className="jn-adm-puerta-sesion mono">
            <span className="ok">✓ sesión verificada</span>
            <span>#{yo?.id ?? "—"}</span>
            <span className="ok">✓ rol {yo?.rol || "—"}</span>
            <span className={abriendo ? "ok" : ""}>{abriendo ? "✓" : "○"} llave {abriendo ? "aceptada" : "pendiente"}</span>
          </div>

          <form className="jn-adm-puerta-form" onSubmit={entra} noValidate>
            <label className="jn-adm-puerta-campo">
              <span className="mono">tu nombre</span>
              <span className="jn-adm-puerta-input">
                <b aria-hidden>@</b>
                <input
                  ref={nombreRef}
                  className="campo"
                  type="text"
                  name="nombre"
                  autoComplete="username"
                  spellCheck="false"
                  placeholder="fernando"
                  value={nombre}
                  disabled={abriendo || bloqueado}
                  onChange={(e) => { setNombre(e.target.value); setError(""); }}
                  onKeyUp={alTeclear}
                  aria-invalid={!!error}
                />
              </span>
            </label>

            <label className="jn-adm-puerta-campo">
              <span className="mono">llave de la sala</span>
              <span className="jn-adm-puerta-input">
                <b aria-hidden>⌘</b>
                <input
                  className="campo"
                  type={ver ? "text" : "password"}
                  name="llave"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={llave}
                  disabled={abriendo || bloqueado}
                  onChange={(e) => { setLlave(e.target.value); setError(""); }}
                  onKeyUp={alTeclear}
                  aria-invalid={!!error}
                />
                <button
                  className="jn-adm-puerta-ojo"
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? "Ocultar la llave" : "Mostrar la llave"}
                  title={ver ? "Ocultar" : "Mostrar"}
                >
                  {ver ? "🙈" : "👁"}
                </button>
              </span>
            </label>

            {mayus && !bloqueado && (
              <p className="jn-adm-puerta-aviso mono" role="status">⇪ Bloq Mayús está activado</p>
            )}

            <p className="jn-adm-puerta-error" role="alert" aria-live="polite">
              {bloqueado
                ? `La puerta está bloqueada ${Math.ceil(espera / 1000)} s por ${MAX_INTENTOS} intentos fallidos.`
                : error}
            </p>

            <button className="btn primario jn-adm-puerta-entrar" type="submit" disabled={abriendo || bloqueado}>
              {abriendo ? <><span className="spin" /> comprobando llave…</> : <>Abrir la sala <span aria-hidden>→</span></>}
            </button>
          </form>

          <div className="jn-adm-puerta-pie">
            <span className="mono">con llave</span>
            <div className="jn-adm-puerta-gente">
              {ACCESOS.map((a) => (
                <span key={a.usuario}>
                  <i aria-hidden>{a.nombre.charAt(0)}</i>
                  <b>{a.nombre}</b>
                  <small>{a.cargo}</small>
                </span>
              ))}
            </div>
          </div>

          <p className="jn-adm-puerta-nota">
            La sala se cierra sola al cerrar la pestaña o a las 8 horas. Puedes cerrarla
            antes con el botón <b>Cerrar</b> de la cabecera. ¿Sin llave? Pídela a quien
            administra la red.
          </p>

          <a className="jn-adm-puerta-volver mono" href="#/panel/inicio">← volver al panel</a>
        </div>
      </div>
    </section>
  );
}
