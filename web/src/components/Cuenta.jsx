import { useEffect, useState } from "react";
import { me, api, editarMe, decodificaJwt, getToken } from "../lib/api.js";
import { Stat, AnilloJwt, Hecho } from "./Piezas.jsx";
import Revela from "./Revela.jsx";

/* Cuenta: la ficha completa del usuario — quién eres, qué red tienes,
   qué garantías hay y la zona de peligro (borrado en dos pasos). */
export default function Cuenta({ yo: yoInicial, aviso, alSalir, irRed, alRecargar }) {
  const [yo, setYo] = useState(yoInicial || null);
  const [cargando, setCar] = useState(!yoInicial);
  const [confirmando, setConf] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [editando, setEdit] = useState(false);
  const [alias, setAlias] = useState("");
  const [lema, setLema] = useState("");
  const [guardando, setGuard] = useState(false);

  const jwt = decodificaJwt(getToken() || "");

  useEffect(() => {
    let vivo = true;
    me().then((d) => { if (vivo) { setYo(d); setAlias(d.alias || ""); setLema(d.lema || ""); } })
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

  async function guardarPref() {
    setGuard(true);
    try {
      const d = await editarMe({ alias: alias || null, lema: lema || null });
      setYo(d); alRecargar?.(d); setEdit(false);
      aviso("perfil actualizado ✓", "ok");
    } catch (e) { aviso(e.message, "error"); }
    finally { setGuard(false); }
  }

  function copiar(texto, que) {
    navigator.clipboard.writeText(texto).then(() => aviso(`${que} copiado al portapapeles ✓`, "ok"),
      () => aviso("no se pudo copiar", "error"));
  }

  function exportarFicha() {
    const ficha = {
      exportado: new Date().toISOString(),
      nota: "Esto es TODO lo que el sistema guarda de ti. Nada de qué webs visitas ni con qué codecs, ni de tus destinos.",
      cuenta: { email: yo?.email, id: yo?.id, alias: yo?.alias, lema: yo?.lema, alta: yo?.alta ? new Date(yo.alta * 1000).toISOString() : null },
      red: { estado: yo?.activo ? "ACTIVA" : "APAGADA", circuito: yo?.circuito, nodo_exit: yo?.nodo_exit, tu_ip: yo?.ip_real, ip_salida: yo?.ip_salida, ultimo_cambio: yo?.ultimo_cambio ? new Date(yo.ultimo_cambio * 1000).toISOString() : null },
      proxy: { host: "jumpernet.duckdns.org", puerto_socks5: 1080, puertos_salida: "80/443", credenciales: "las de esta web (argon2id)" },
    };
    const blob = new Blob([JSON.stringify(ficha, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jumpernet-ficha-${(yo?.email || "cuenta").split("@")[0]}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    aviso("ficha exportada ✓", "ok");
  }

  if (cargando && !yo) return <div className="tarjeta apa"><h2 className="seccion">cargando tu cuenta…</h2><span className="spin" /></div>;

  const activo = !!yo?.activo;
  const nombreVisible = yo?.alias || (yo?.email || "?").split("@")[0];
  const inicial = nombreVisible.trim().charAt(0).toUpperCase();
  const alta = yo?.alta ? new Date(yo.alta * 1000) : (jwt?.cuerpo?.iat ? new Date(jwt.cuerpo.iat * 1000) : null);
  const dias = alta ? Math.max(1, Math.floor((Date.now() - alta.getTime()) / 86400000)) : null;

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
          <div className="avatar flota" style={{ fontSize: 20 }}>{inicial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{nombreVisible}</span>
              {yo?.lema && <span className="nota" style={{ fontSize: 12.5, fontStyle: "italic" }}>«{yo.lema}»</span>}
              {!editando && (
                <button className="btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setEdit(true)} title="Editar tu perfil">✎ editar</button>
              )}
            </div>
            <div className="nota mono" style={{ fontSize: 11.5 }}>
              {yo?.email} · id interno {yo?.id}
              {dias ? ` · ${dias} día${dias > 1 ? "s" : ""} en la red` : ""}
            </div>
            {editando && (
              <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 520 }}>
                <input className="campo" placeholder="alias visible (máx. 24 caracteres)" value={alias} maxLength={24}
                  onChange={(e) => setAlias(e.target.value)} />
                <input className="campo" placeholder="lema / estado personal (máx. 80)" value={lema} maxLength={80}
                  onChange={(e) => setLema(e.target.value)} />
                <div className="fila-btn">
                  <button className="btn primario" onClick={guardarPref} disabled={guardando}>
                    {guardando ? <span className="spin" /> : "✓ Guardar perfil"}
                  </button>
                  <button className="btn" onClick={() => { setEdit(false); setAlias(yo?.alias || ""); setLema(yo?.lema || ""); }}>Cancelar</button>
                  <span className="nota" style={{ fontSize: 11 }}>se guarda en el servidor y se ve en el panel · no afecta a tu conexión</span>
                </div>
              </div>
            )}
          </div>
          <span className={`chip ${activo ? "vivo" : "muerto"} mono`}>{activo ? "RED ACTIVA" : "RED APAGADA"}</span>
        </div>

        <div className="tira-stats" style={{ marginTop: 16 }}>
          <Stat etq="estado de red" val={activo ? "ACTIVA" : "APAGADA"} pie={activo ? "tráfico en 3 saltos" : "sin circuito abierto"} tono={activo ? "ok" : "off"} />
          <Stat etq="saltos" val={`${yo?.circuito?.length || 0} / 3`} pie="nodos aleatorios" tono="ok" />
          <Stat etq="tu IP pública" val={<span style={{ fontSize: 13.5 }}>{yo?.ip_real || "—"}</span>} pie="la que ve el servidor" tono="info" />
          <Stat etq="IP de salida" val={<span style={{ fontSize: 13.5 }}>{activo ? yo?.ip_salida : "—"}</span>} pie={activo ? "la que ve internet" : "sin uso"} tono="aviso" />
        </div>

        <div className="tira-stats" style={{ marginTop: 16 }}>
          <Stat etq="días en la red" val={dias ? `${dias}` : "—"} pie="desde tu alta" tono="info" />
          <Stat etq="máximo de saltos" val="3" pie="elegidos al azar para ti" tono="ok" />
          <Stat etq="credenciales" val="SOCKS5" pie="email + clave argon2" tono="aviso" />
          <Stat etq="datos guardados" val="mínimos" pie="email + estado de red" tono="ok" />
        </div>

        <div className="fila-btn" style={{ marginTop: 16 }}>
          <button className="btn primario" onClick={irRed}>◀ Volver al panel de red</button>
          <button className="btn" onClick={() => { setCar(true); me().then(setYo).catch((e) => aviso(e.message, "error")).finally(() => setCar(false)); }} disabled={cargando}>
            {cargando ? <span className="spin" /> : "⟳ Refrescar datos"}
          </button>
          <button className="btn" onClick={exportarFicha} title="Descarga un JSON con TODO lo que el sistema guarda de ti">
            ⬇ Exportar mi ficha (JSON)
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

          <h2 className="seccion" style={{ marginTop: 18 }}>Credenciales rápidas</h2>
          <p className="nota" style={{ fontSize: 12, margin: "4px 0 10px" }}>
              Cópialas donde las necesites (navegador, terminal, apps de proxy). Son las mismas de la web.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="chip mono">SOCKS5 · 1080</span>
              <button className="btn" style={{ padding: "4px 12px", fontSize: 11.5 }} onClick={() => copiar("jumpernet.duckdns.org", "host")}>⧉ copiar host</button>
              <button className="btn" style={{ padding: "4px 12px", fontSize: 11.5 }} onClick={() => copiar(String(yo?.email || ""), "usuario")}>⧉ copiar usuario</button>
            </div>
            <div className="dato" style={{ marginTop: 4 }}>
              <span className="etq">host:puerto</span><span className="val mono">jumpernet.duckdns.org:1080</span>
            </div>
            <div className="dato">
              <span className="etq">usuario</span><span className="val mono">{yo?.email}</span>
            </div>
            <div className="dato">
              <span className="etq">clave</span><span className="val">la de esta web · no se enseña aquí nunca</span>
            </div>
          </div>
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
