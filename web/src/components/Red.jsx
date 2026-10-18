import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { me, conectar, rotar, desconectar_, geoApi, salida, comprobar, nodosVivos } from "../lib/api.js";
import { Stat, Tuberia, AnilloJwt, Hecho } from "./Piezas.jsx";
import Nodos from "./Nodos.jsx";
import Revela from "./Revela.jsx";

/* ── interruptor de red grande ── */
function Interruptor({ activo, ocupado, alCambiar }) {
  return (
    <div className="red-card tarjeta brillo">
      <div className="int-estados">
        <span className={`mono bfases ${activo ? "" : "on"}`}>DESACTIVADA</span>
        <button
          className={"interruptor" + (activo ? " activo" : "") + (ocupado ? " ocupado" : "")}
          onClick={alCambiar} disabled={ocupado}
          aria-label={activo ? "Desactivar red" : "Activar red"}
          title={activo ? "Desactivar la red (cierra tu circuito)" : "Activar la red (crea tu circuito de 3 saltos)"}
        >
          <span className="interruptor-bola" />
        </button>
        <span className={`mono bfases ${activo ? "on" : ""}`}>ACTIVADA</span>
      </div>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        {activo
          ? <div className="chip vivo" style={{ fontSize: 12.5 }}>● red activa — tráfico viajando por 3 saltos</div>
          : <div className="chip muerto" style={{ fontSize: 12.5 }}>○ red apagada — tus credenciales no conectarán por SOCKS5</div>}
        <p className="nota" style={{ marginTop: 10, fontSize: 12.5, maxWidth: 560, marginInline: "auto" }}>
          {activo
            ? "tu circuito está vivo: al navegar con el proxy, la IP que ve internet es la del nodo de salida, no la tuya. Abajo puedes comprobarlo de verdad."
            : "nada se conecta hasta que tú lo digas: pulsa el interruptor y la red elegirá 3 nodos vivos al azar, cifrará cada salto y saldrá solo por 80/443."}
        </p>
      </div>

      <div style={{ maxWidth: 620, margin: "18px auto 0" }}>
        <Tuberia activo={activo} saltos={["nodo₁", "nodo₂", "nodo₃"]} paquetes={5} compacta />
      </div>
    </div>
  );
}

/* ── selector de nº de saltos (solo plan pro; free lo ve bloqueado) ── */
function SelectorSaltos({ yo, saltosSel, setSel, ocupado }) {
  const puede = !!yo?.puede_elegir_saltos;
  const max = yo?.saltos_max || 3;
  return (
    <div className="tarjeta" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h2 className="seccion" style={{ marginBottom: 0 }}>¿Cuántos saltos quieres?</h2>
        <span className={`chip mono ${puede ? "acento" : ""}`} style={{ fontSize: 10.5 }}>
          plan {yo?.plan || "free"} · {puede ? `elige 3…${max}` : "3 fijos"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[3, 4, 5, 6, 7].map((n) => {
          const bloqueado = !puede || (n === 4 && max < 4);
          const prohibido = n > max;
          const sel = saltosSel === n;
          return (
            <button key={n}
              className={`btn ${sel ? "primario" : ""}`}
              style={{
                minWidth: 74, opacity: prohibido || bloqueado ? .45 : 1,
                cursor: prohibido || bloqueado ? "not-allowed" : "pointer",
                position: "relative",
              }}
              disabled={ocupado || prohibido || bloqueado}
              onClick={() => setSel(n)}
              title={prohibido
                ? `tu plan permite hasta ${max}`
                : bloqueado ? "elegir nº de saltos es del plan Pro" : `conectar con ${n} saltos`}>
              {n} saltos
              {n === 3 && <span style={{ position: "absolute", top: -8, right: -4, fontSize: 10 }}>🔒</span>}
            </button>
          );
        })}
      </div>
      {!puede ? (
        <p className="nota" style={{ marginTop: 8, fontSize: 12 }}>
          🔒 Con el plan <b>Free</b> la conexión usa siempre 3 saltos fijos.
          Con el plan <b>Pro</b> eliges cuántos quieres, de 3 a 7 — y refrescas el circuito cada 10 h en vez de 1 vez al día.
        </p>
      ) : (
        <p className="nota" style={{ marginTop: 8, fontSize: 12 }}>
          El nº de saltos se aplica la PRÓXIMA vez que conectes (o al girar el circuito).
          Más saltos = más relés entre tú y la salida: más privacidad, algo más de latencia.
        </p>
      )}
    </div>
  );
}

/* ── contador real de nodos de la red (infra + equipos conectados) ── */
function ContadorVivos({ yo }) {
  const [vivo, setVivo] = useState(null);
  useEffect(() => {
    let vivo = true;
    async function llena() {
      try { const d = await nodosVivos(); if (vivo) setVivo(d); } catch { /* silencio */ }
    }
    llena();
    const t = setInterval(llena, 10000);
    return () => { vivo = false; clearInterval(t); };
  }, [yo?.activo]);
  return (
    <div className="tarjeta tarjeta" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span className="punto-vivo" />
      <b className="mono" style={{ fontSize: 15.5 }}>≈ {vivo ? vivo.total : "…"} nodos activos ahora</b>
      <span className="nota mono" style={{ fontSize: 11.5 }}>
        {vivo ? <> (infra {vivo.infra} + equipos de usuarios conectados {vivo.equipos})</> : "midiendo…"} · en vivo, 10 s
      </span>
    </div>
  );
}

/* ── parada de la ruta ── */
function Parada({ nombre, sub, tipo, pulso }) {
  const col = tipo === "tu" ? "var(--acento-2)" : tipo === "exit" ? "var(--acento-1)" : tipo === "destino" ? "var(--acento-3)" : "var(--borde)";
  return (
    <div className={`parada ${pulso ? "pulso" : ""}`} style={{ "--parada-col": col }} title={sub}>
      <b>{nombre}</b>
      <span className="mono">{sub}</span>
    </div>
  );
}/* ── marcadores propios del mapa (divIcon: sin imágenes → sin 404) ── */
function marca(clase) {
  return L.divIcon({
    className: "marca-envoltorio",
    html: `<span class="marca-mapa ${clase}"></span>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10],
  });
}

/* aviso de instalación de la extensión (se propone al encender la red) */
function AvisoExtension({ alCerrar, email }) {
  const urlZip = `${import.meta.env.BASE_URL}extension.zip`;
  return (
    <div className="red-card tarjeta brillo" role="dialog" aria-label="Instalar la extensión del navegador">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <h2 className="seccion" style={{ marginBottom: 0 }}>Extensión del navegador</h2>
        <a className="btn primario" style={{ marginLeft: "auto", textDecoration: "none" }} href={urlZip} download="jumpernet-extension.zip">⬇ Descargar extensión</a>
        <button className="btn" onClick={alCerrar} aria-label="Cerrar aviso">✕</button>
      </div>
      <p className="nota" style={{ fontSize: 12.5 }}>
        ¿Quieres que <b>todo tu navegador</b> salga por aquí (como FoxyProxy, pero automático)?
        <b>Descarga el zip</b> (botón de arriba), descomprímelo y carga la extensión en modo
        desarrollador: la extensión configura el proxy ella sola; solo tendrás que poner tus
        credenciales <b>({email})</b> una vez en su popup. Los navegadores no permiten instalar
        extensiones “desde la web” directamente: hay que cargarlas tú, 1 minuto.
      </p>
      <p className="nota" style={{ fontSize: 12.5 }}>
        ¿Prefieres no instalar nada? El <b>JumperNET Browser</b> es un navegador completo que ya
        viene conectado a tu red: todo el tráfico por el circuito de 3 saltos nada más abrirlo,
        con sus botones de <b>nuevo circuito</b> y <b>reiniciar</b> estilo Tor.
        <a style={{ textDecoration: "none" }} className="btn" href="https://jumpernet.duckdns.org/bajares/jumpernet-navegador-windows.zip">⬇ Windows (portátil)</a>
        <a style={{ textDecoration: "none" }} className="btn" href="https://jumpernet.duckdns.org/bajares/JumperNET-1.0.0.AppImage">⬇ Linux (AppImage)</a>
        <a style={{ textDecoration: "none" }} className="btn" href="https://jumpernet.duckdns.org/bajares/LEEME-navegador.txt">Instrucciones</a>
      </p>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="tarjeta" style={{ margin: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Firefox</div>
          <ol className="nota" style={{ fontSize: 12, paddingLeft: 18, margin: 0, display: "grid", gap: 4 }}>
            <li>Descomprime el zip descargado.</li>
            <li>Abre <span className="mono">about:debugging#/runtime/this-firefox</span>.</li>
            <li>“Cargar complemento temporal” → escoge <span className="mono">firefox/manifest.json</span>.</li>
            <li>En el popup: tu email + contraseña → <b>Activar</b>.</li>
          </ol>
        </div>
        <div className="tarjeta" style={{ margin: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Chrome / Edge / Brave</div>
          <ol className="nota" style={{ fontSize: 12, paddingLeft: 18, margin: 0, display: "grid", gap: 4 }}>
            <li>Descomprime el zip descargado (la carpeta <span className="mono">chrome</span> va lista).</li>
            <li>Abre <span className="mono">chrome://extensions</span> y activa <b>Modo de desarrollador</b>.</li>
            <li>“Cargar sin comprimir” → carpeta <span className="mono">chrome</span>.</li>
            <li>En el popup: tu email + contraseña → <b>Activar</b>.</li>
          </ol>
        </div>
      </div>
      <p className="nota" style={{ marginTop: 8, fontSize: 11.5 }}>
        Funciona igual en Windows y Linux (el zip trae <span className="mono">LEEME.txt</span> con los pasos).
        Alternativa sin extensión: <span className="mono">cliente/proxy_local.sh</span> del repo (relé local para cualquier app del sistema).
      </p>
    </div>
  );
}

export default function Red({ yo: yo0, aviso, alRecargar }) {
  const [yo, setYo] = useState(yo0);
  const [latencia, setLat] = useState(null);
  const [ocupado, setOcu] = useState(false);
  const [geoTu, setGeoTu] = useState(null);
  const [geoSal, setGeoSal] = useState(null);
  const [clave, setClave] = useState("");
  const [prueba, setPrueba] = useState(null);
  const [probando, setProbando] = useState(false);
  const [ipSalida, setIpSalida] = useState(null);
  const [avisaExt, setAvisaExt] = useState(false);
  const [saltosSel, setSel] = useState(3);   // nº deseado de saltos (plan pro)
  const divMapa = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);

  async function refrescar(silent = true) {
    setOcu(true);
    try {
      const t0 = performance.now();
      const datos = await me();
      setYo(datos); alRecargar?.(datos);
      setLat(Math.round(performance.now() - t0));
      if (datos.activo) { try { const s = await salida(); setIpSalida(s.ip_salida); } catch { /* seguimos */ } }
    } catch (e) { if (!silent) aviso(e.message, "error"); }
    finally { setOcu(false); }
  }
  useEffect(() => { refrescar(); }, []);

  /* geolocalización REAL (la resuelve el servidor, con caché) */
  useEffect(() => {
    let vivo = true;
    if (yo?.ip_real) geoApi(yo.ip_real).then((g) => vivo && setGeoTu(g));
    return () => { vivo = false; };
  }, [yo?.ip_real]);
  useEffect(() => {
    const ip = yo?.ip_salida || ipSalida;
    if (!yo?.activo || !ip) { setGeoSal(null); return; }
    let vivo = true;
    geoApi(ip).then((g) => vivo && setGeoSal(g));
    return () => { vivo = false; };
  }, [yo?.activo, yo?.ip_salida, ipSalida]);

  /* mapa: se crea una vez y se repinta con cada dato nuevo */
  useEffect(() => {
    if (mapa.current || !divMapa.current) return;
    const m = L.map(divMapa.current, { attributionControl: false });
    // FONDO VECTORIAL ÚNICO: los proveedores de tiles responden HTTP 200 con
    // la imagen del mensaje «API KEY REQUIRED» (no hay tileerror que detectar,
    // el mapa queda en hueso) y encima dependen de terceros. Con el GeoJSON
    // de países que vive en el propio panel el mapa SIEMPRE se pinta: sin
    // tiles, sin claves, sin red necesaria para el fondo.
    (async () => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}mundo.json`);
        const mundo = await r.json();
        L.geoJSON(mundo, {
          style: { color: "#3a3a44", weight: .6, fillColor: "#1c1c24", fillOpacity: 1 },
          interactive: false,
        }).addTo(m);
      } catch (e) { /* sin fondo: los marcadores siguen funcionando */ }
    })();
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    m.setView([40, -30], 3);
    setTimeout(() => m.invalidateSize(), 80);
  }, []);

  useEffect(() => {
    if (!mapa.current || !capa.current) return;
    const c = capa.current; c.clearLayers();
    const activo = !!yo?.activo;
    const puntos = [];
    if (geoTu?.ok) {
      puntos.push([geoTu.lat, geoTu.lon]);
      L.marker([geoTu.lat, geoTu.lon], { icon: marca("tu") }).addTo(c)
        .bindPopup(`<b>TÚ</b><br>${[geoTu.ciudad, geoTu.region, geoTu.pais].filter(Boolean).join(", ")}<br>IP ${geoTu.ip}${geoTu.org ? `<br>${geoTu.org}` : ""}`);
    }
    if (geoSal?.ok) {
      puntos.push([geoSal.lat, geoSal.lon]);
      L.marker([geoSal.lat, geoSal.lon], { icon: marca("srv") }).addTo(c)
        .bindPopup(`<b>Salida del circuito</b><br>${[geoSal.ciudad, geoSal.region, geoSal.pais].filter(Boolean).join(", ")}<br>IP ${geoSal.ip}<br>${geoSal.org || ""}`);
    }
    if (puntos.length === 2) {
      L.polyline(puntos, {
        color: "var(--acento-1)", opacity: activo ? .95 : .35, weight: 2.5,
        dashArray: activo ? undefined : "4 10", className: activo ? "linea-avanza" : "",
      }).addTo(c);
      mapa.current.fitBounds(L.latLngBounds(puntos).pad(.45));
    } else if (puntos.length === 1) {
      mapa.current.setView(puntos[0], 6);
    }
  }, [geoTu, geoSal, yo?.activo]);

  async function accion(fn, msg) {
    setOcu(true);
    try { await fn(); aviso(msg, "ok"); if (fn === conectar) setAvisaExt(true); await refrescar(); }
    catch (e) { aviso(e.message, "error"); }
    finally { setOcu(false); }
  }

  async function comprobarAhora() {
    if (!clave) { aviso("escribe tu contraseña para la comprobación", "error"); return; }
    setProbando(true); setPrueba(null);
    try {
      const r = await comprobar(clave);
      setPrueba(r);
      if (r.ok) aviso(r.cambia_tu_ip ? "¡funciona! el destino te ve con otra IP" : "el circuito responde (tu IP no cambia porque ya sales por ahí)", "ok");
      else aviso(r.error || "la comprobación falló", "error");
    } catch (e) { aviso(e.message, "error"); }
    finally { setProbando(false); }
  }

  const activo = !!yo?.activo;
  const saltos = yo?.circuito?.length ? yo.circuito : ["nodo·", "nodo·", "nodo·"];
  const ipExit = yo?.ip_salida || ipSalida;

  return (
    <div className="apa" style={{ display: "grid", gap: 14 }}>

      {/* ── cabecera de sesión ── */}
      <div className="tarjeta" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="whoami">≋</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, wordBreak: "break-all" }}>{yo?.email}</div>
          <div className="nota mono" style={{ fontSize: 11 }}>
            id {yo?.id} · API <span className={latencia != null ? "" : "parpadea"}>{latencia != null ? latencia + " ms" : "…"}</span>
          </div>
        </div>
        <span className={`chip ${activo ? "vivo" : "muerto"}`} style={{ marginLeft: "auto" }}>{activo ? "RED ACTIVA" : "RED OFF"}</span>
        <button className="btn" onClick={() => refrescar(false)} disabled={ocupado} aria-label="Refrescar datos">
          {ocupado ? <span className="spin" /> : "⟳"}
        </button>
      </div>

      {/* ── métricas rápidas ── */}
      <div className="tira-stats">
        <Stat etq="estado" val={activo ? "ACTIVA" : "APAGADA"} pie={activo ? "circuito en pie" : "sin tráfico"} tono={activo ? "ok" : "off"} />
        <Stat etq="saltos" val={`${yo?.circuito?.length || 0} / ${yo?.saltos_max || 3}`} pie={`plan ${yo?.plan || "free"}`} tono="ok" />
        <Stat etq="IP que ve internet" val={<span style={{ fontSize: 13 }}>{activo ? (ipExit || "midiendo…") : "—"}</span>} pie={activo ? "la del nodo de salida" : "usa la tuya"} tono="aviso" />
        <Stat etq="tu IP" val={<span style={{ fontSize: 13 }}>{yo?.ip_real || "—"}</span>} pie="la que ve el servidor" tono="info" />
      </div>

      {/* ── contador real de nodos (en vivo) ── */}
      <ContadorVivos yo={yo} />

      {/* ── selector de nº de saltos (pro elige, free lo ve bloqueado) ── */}
      <SelectorSaltos yo={yo} saltosSel={saltosSel} setSel={setSel} ocupado={ocupado} />

      {/* ── interruptor ── */}
      <Interruptor
        activo={activo} ocupado={ocupado}
        alCambiar={() => accion(activo ? () => desconectar_() : () => conectar(saltosSel),
          activo ? "red desactivada" : `red activada ✓ — ${saltosSel} saltos`)}
        saltos={saltosSel}
      />

      {/* ── aviso de instalar la extensión (solo tras encender) ── */}
      {avisaExt && activo && (
        <AvisoExtension alCerrar={() => setAvisaExt(false)} email={yo?.email || ""} />
      )}

      {/* ── verificación real del circuito ── */}
      <Revela className="tarjeta">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>¿Está funcionando de verdad?</h2>
          <span className={`etiqueta-viva`} style={activo ? undefined : { color: "var(--texto-suave)", opacity: .7 }}>
            {activo ? "comprobación real" : "red apagada"}
          </span>
        </div>

        <div className="par-ips">
          <div className="ip-caja entrada">
            <span className="rotulo">tu IP (origen)</span>
            <div className="ip">{yo?.ip_real || "—"}</div>
            <div className="lugar">
              {geoTu?.ok ? [geoTu.ciudad, geoTu.pais].filter(Boolean).join(", ") : (geoTu ? "no se pudo localizar (⟳ reintenta)" : "localizando…")}
            </div>
          </div>
          <div className="flecha-cambia">⟶</div>
          <div className="ip-caja salida">
            <span className="rotulo">IP al salir (destino)</span>
            <div className="ip">{activo ? (ipExit || "midiendo…") : "—"}</div>
            <div className="lugar">
              {!activo ? "activa la red para verla"
                : geoSal?.ok ? [geoSal.ciudad, geoSal.pais].filter(Boolean).join(", ")
                : geoSal ? "no se pudo localizar (⟳ reintenta)" : "localizando…"}
            </div>
          </div>
        </div>

        <div className="verificacion" style={{ marginTop: 14 }}>
          <p className="nota" style={{ fontSize: 12.5 }}>
            Esto no es una estimación: el servidor abre un SOCKS5 con tu cuenta, pide a un servicio externo
            «¿qué IP ves?» y te enseña la respuesta. Tu contraseña viaja cifrada por HTTPS y <b>no se guarda</b>;
            solo se usa para ese handshake.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="campo-caja" style={{ flex: "1 1 220px" }}>
              <input className="campo" type="password" autoComplete="current-password" style={{ marginBottom: 0 }}
                placeholder="tu contraseña (solo para esta prueba)" value={clave}
                onChange={(e) => setClave(e.target.value)} />
            </div>
            <button className="btn primario" onClick={comprobarAhora} disabled={probando || !activo}>
              {probando ? <span className="spin" /> : "▶ Comprobar circuito ahora"}
            </button>
          </div>

          {prueba && (
            <div className={`veredicto apa ${prueba.ok ? (prueba.cambia_tu_ip ? "ok" : "duda") : "mal"}`}>
              <span>{prueba.ok ? (prueba.cambia_tu_ip ? "✓" : "!") : "✗"}</span>
              <div>
                {prueba.ok ? (
                  <>
                    <b>{prueba.cambia_tu_ip
                      ? "el circuito funciona: el destino te vio con otra IP"
                      : "el circuito responde, pero el destino te vio tu misma IP"}</b>
                    <div style={{ marginTop: 4 }}>
                      IP observada por el destino: <b>{prueba.ip_observada}</b>
                      {prueba.ip_esperada ? <> · esperada (salida del servidor): <b>{prueba.ip_esperada}</b></> : null}
                      {" · "}{prueba.ms} ms
                    </div>
                    <div style={{ marginTop: 2 }}>
                      circuito: {prueba.circuito?.join(" → ")} → {prueba.destino} · tu IP real: {prueba.tu_ip || "—"}
                    </div>
                  </>
                ) : (
                  <>
                    <b>la comprobación falló</b>
                    <div style={{ marginTop: 4 }}>{prueba.error}{prueba.ms != null ? ` (${prueba.ms} ms)` : ""}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Revela>

      {/* ── ruta en vivo ── */}
      <Revela className="tarjeta">
        <div className="seccion-titulo" style={{ marginBottom: 10 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>Ruta de tu tráfico</h2>
          <span className="nota mono" style={{ fontSize: 11 }}>{activo ? "en vivo" : "detenida"}</span>
        </div>

        <div className="ruta-lin">
          <Parada nombre="TÚ" sub={yo?.ip_real || "tu IP"} tipo="tu" pulso={activo} />
          <span className="mono flecha">━━▶</span>
          {saltos.map((n, i) => (
            <span key={n + i} style={{ display: "contents" }}>
              <Parada nombre={n} sub={i === 2 ? "_exit_" : i === 0 ? "entrada" : "relé ciego"}
                tipo={i === 2 ? "exit" : "nodo"} pulso={activo && i === 0} />
              <span className="mono flecha">━━▶</span>
            </span>
          ))}
          <Parada nombre="INTERNET" sub="80 / 443" tipo="destino" />
        </div>

        <div style={{ marginTop: 14 }}>
          <Tuberia activo={activo} saltos={saltos} origen="TÚ" destino="INTERNET" />
        </div>

        <div ref={divMapa} style={{ height: 360, marginTop: 14, borderRadius: "var(--radio)", border: "1px solid rgb(from var(--borde) r g b / .6)" }} />
        <p className="nota" style={{ marginTop: 8, fontSize: 12 }}>
          El mapa usa <b>geolocalización real</b> resuelta por el servidor (tu IP y la IP de salida del circuito).
          {!geoTu?.ok && geoTu && " Tu IP no se pudo localizar: no inventamos ninguna posición."}
          {" "}Los 3 saltos corren en el mismo servidor de salida, así que solo hay dos puntos reales: tú y la salida.
        </p>
      </Revela>

      {/* ── nodos en vivo (siempre visible) ── */}
      <Nodos yo={yo} aviso={aviso} compacta />

      {/* ── detalles + costado ── */}
      <div className="rejilla-cuenta">
        <div className="tarjeta">
          <h2 className="seccion">Tu circuito y tu cuenta</h2>
          <div className="dato"><span className="etq">email</span><span className="val">{yo?.email}</span></div>
          <div className="dato"><span className="etq">id interno</span><span className="val">{yo?.id}</span></div>
          <div className="dato"><span className="etq">tu IP (ve el servidor)</span><span className="val">{yo?.ip_real || "—"}</span></div>
          <div className="dato"><span className="etq">IP de salida (ve internet)</span><span className="val destaca">{activo ? (ipExit || "midiendo…") : "—"}</span></div>
          <div className="dato"><span className="etq">nodo de salida</span><span className="val">{yo?.nodo_exit || yo?.circuito?.slice(-1)[0] || "—"}</span></div>
          <div className="dato"><span className="etq">circuito</span><span className="val">{yo?.circuito?.length ? yo.circuito.join(" → ") : "—"}</span></div>
          <div className="dato"><span className="etq">estado</span><span className="val mono">{activo ? "ACTIVA · JENC" : "OFF"}</span></div>
          <div className="dato"><span className="etq">último cambio</span><span className="val">{yo?.ultimo_cambio ? new Date(yo.ultimo_cambio * 1000).toLocaleString() : "—"}</span></div>

          {activo && (
            <div className="fila-btn" style={{ marginTop: 14 }}>
              <button className="btn aviso" disabled={ocupado} onClick={() => accion(rotar, "circuito girado: nuevos saltos ✓")}>
                🌀 Girar circuito
              </button>
              <button className="btn" disabled={ocupado} onClick={() => accion(desconectar_, "red desactivada")}>
                ⏻ Apagar red
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <AnilloJwt />
          {activo ? (
            <div className="tarjeta">
              <h2 className="seccion">Nodos de tu circuito</h2>
              {saltos.map((n, i) => (
                <div key={i} className="dato-fila">
                  <b className="mono" style={{ color: i === 2 ? "var(--acento-1)" : "var(--texto)" }}>{i + 1} · {n}</b>
                  <span className="nota mono" style={{ fontSize: 11.5 }}>{i < 2 ? "reenvío ciego" : "exit · salida real"} · ChaCha20</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="tarjeta">
              <h2 className="seccion">¿Qué pasa si activo?</h2>
              <div className="lista-hechos">
                <Hecho>Se eligen <b>3 nodos vivos al azar</b> y se abre tu circuito.</Hecho>
                <Hecho>Aparece el comando SOCKS5 listo para copiar.</Hecho>
                <Hecho>Podrás <b>comprobar</b> que internet te ve con otra IP.</Hecho>
                <Hecho>Puedes girar el circuito sin cortar la sesión.</Hecho>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
