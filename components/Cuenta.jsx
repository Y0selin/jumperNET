import { useEffect, useState } from "react";
import { me, api, decodificaJwt, getToken } from "../lib/api.js";
import { Stat, AnilloJwt, Hecho } from "./Piezas.jsx";
import Revela from "./Revela.jsx";

/* Cuenta: la ficha completa del usuario — quién eres, qué red tienes,
   qué garantías hay y la zona de peligro (borrado en dos pasos). */
export default function Cuenta({ yo: yoInicial, aviso, alSalir, irRed }) {
  const [yo, setYo] = useState(yoInicial || null);
  const [cargando, setCar] = useState(!yoInicial);
  const [confirmando, setConf] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const jwt = decodificaJwt(getToken() || "");

  useEffect(() => {
    let vivo = true;
    me().then((d) => { if (vivo) setYo(d); })
      .catch((e) => aviso(e.message, "error"))
      .finally(() => vivo && setCar(false));
    return () => { vivo = false; };
  }, []);

  async function eliminar() {
    setBorrando(true);
    try { await api("DELETE", "/me"); aviso("cuenta eliminada para siempre", "ok"); alSalir(); }
    catch (e) { aviso(e.message, "error"); setConf(false); }
    finally { setBorrando(false); }
  }

  if (cargando && !yo) return <div className="tarjeta apa"><h2 className="seccion">cargando tu cuenta…</h2><span className="spin" /></div>;

  const activo = !!yo?.activo;
  const inicial = (yo?.email || "?").trim().charAt(0).toUpperCase();
  const creada = jwt?.cuerpo?.iat ? new Date(jwt.cuerpo.iat * 1000) : null;

  return (
    <div className="apa" style={{ display: "grid", gap: 16 }}>

      <div className="seccion-titulo">
        <span className="migas mono">panel / cuenta</span>
        <h1>Tu cuenta</h1>
        <span className="nota">todo lo que el sistema sabe de ti — y nada más</span>
      </div>

      {/* ── identidad + métricas ── */}
      <div className="tarjeta apa brillo">
        <div className="identidad">
          <div className="avatar flota">{inicial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, wordBreak: "break-all" }}>{yo?.email}</div>
            <div className="nota mono" style={{ fontSize: 11.5 }}>
              id interno {yo?.id} · {creada ? `alta ${creada.toLocaleDateString()} ${creada.toLocaleTimeString()}` : "sesión activa"}
            </div>
          </div>
          <span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "RED ACTIVA" : "RED APAGADA"}</span>
        </div>

        <div className="tira-stats" style={{ marginTop: 16 }}>
          <Stat etq="estado de red" val={activo ? "ACTIVA" : "APAGADA"} pie={activo ? "tráfico en 3 saltos" : "sin circuito abierto"} tono={activo ? "ok" : "off"} />
          <Stat etq="saltos" val={`${yo?.circuito?.length || 0} / 3`} pie="nodos aleatorios" tono="ok" />
          <Stat etq="tu IP pública" val={<span style={{ fontSize: 13.5 }}>{yo?.ip_real || "—"}</span>} pie="la que ve el servidor" tono="info" />
          <Stat etq="IP de salida" val={<span style={{ fontSize: 13.5 }}>{activo ? yo?.ip_salida : "—"}</span>} pie={activo ? "la que ve internet" : "sin uso"} tono="aviso" />
        </div>

        <div className="fila-btn" style={{ marginTop: 16 }}>
          <button className="btn primario" onClick={irRed}>◀ Volver al panel de red</button>
          <button className="btn" onClick={() => { setCar(true); me().then(setYo).catch((e) => aviso(e.message, "error")).finally(() => setCar(false)); }} disabled={cargando}>
            {cargando ? <span className="spin" /> : "⟳ Refrescar datos"}
          </button>
        </div>
      </div>

      {/* ── detalle en dos columnas ── */}
      <div className="rejilla-cuenta">
        <Revela className="tarjeta apa">
          <h2 className="seccion">Datos de la cuenta</h2>
          <div className="dato"><span className="etq">email</span><span className="val">{yo?.email}</span></div>
          <div className="dato"><span className="etq">id interno</span><span className="val">{yo?.id}</span></div>
          <div className="dato"><span className="etq">contraseña</span><span className="val">guardada como argon2id (nunca en claro)</span></div>
          <div className="dato"><span className="etq">usuario SOCKS5</span><span className="val">{yo?.email}</span></div>
          <div className="dato"><span className="etq">contraseña SOCKS5</span><span className="val">la misma que usas para entrar</span></div>
          <div className="dato"><span className="etq">límite por cuenta</span><span className="val">1 circuito · 3 saltos</span></div>

          <h2 className="seccion" style={{ marginTop: 18 }}>Tu red ahora mismo</h2>
          <div className="dato"><span className="etq">estado</span><span className="val mono">{activo ? "ACTIVA · cifrado por capas" : "APAGADA"}</span></div>
          <div className="dato"><span className="etq">circuito</span><span className="val">{yo?.circuito?.length ? yo.circuito.join(" → ") : "—"}</span></div>
          <div className="dato"><span className="etq">último cambio</span><span className="val">{yo?.ultimo_cambio ? new Date(yo.ultimo_cambio * 1000).toLocaleString() : "—"}</span></div>
          <div className="dato"><span className="etq">proxy</span><span className="val">jumpernet.duckdns.org:1080</span></div>
          <div className="dato"><span className="etq">salida permitida</span><span className="val">solo 80/443 · IPs privadas bloqueadas</span></div>
        </Revela>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <AnilloJwt />
          <Revela className="tarjeta">
            <h2 className="seccion">Privacidad · en claro</h2>
            <div className="lista-hechos">
              <Hecho>Se guarda: <b>email</b>, estado de tu circuito y cuándo cambió. Nada más.</Hecho>
              <Hecho>No existe histórico de webs ni de destinos.</Hecho>
              <Hecho>Los nodos reenvían sin leer: reenvío ciego con ChaCha20.</Hecho>
              <Hecho>Puedes borrar la cuenta de golpe, sin periodo de gracia.</Hecho>
            </div>
          </Revela>
        </div>
      </div>

      {/* ── zona de peligro ── */}
      <Revela className="tarjeta zona-peligro">
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Zona de peligro</h3>
        <p className="nota" style={{ marginBottom: 12 }}>
          Cerrar sesión solo te saca de aquí. Eliminar la cuenta borra tu email, tu circuito y
          tus credenciales SOCKS5 al instante: no hay vuelta atrás y no guardamos copia.
        </p>
        {!confirmando ? (
          <div className="fila-btn" style={{ maxWidth: 460 }}>
            <button className="btn" onClick={alSalir}>Cerrar sesión</button>
            <button className="btn peligro" onClick={() => setConf(true)}>Eliminar cuenta…</button>
          </div>
        ) : (
          <div className="tarjeta" style={{ borderColor: "rgb(226 82 74 / .5)", background: "rgb(226 82 74 / .06)" }}>
            <b style={{ color: "#ff9088" }}>¿Seguro? Esto no se puede deshacer.</b>
            <div className="nota" style={{ margin: "6px 0 12px" }}>
              Serás expulsado del panel y tu email quedará libre de nuevo.
            </div>
            <div className="fila-btn" style={{ maxWidth: 420 }}>
              <button className="btn peligro" onClick={eliminar} disabled={borrando}>
                {borrando ? <span className="spin" /> : "Sí, eliminar para siempre"}
              </button>
              <button className="btn" onClick={() => setConf(false)} disabled={borrando}>Cancelar</button>
            </div>
          </div>
        )}
      </Revela>
    </div>
  );
}
