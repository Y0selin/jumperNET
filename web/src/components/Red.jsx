import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { me, nodos, conectar, rotar, desconectar_, geo } from "../lib/api.js";
import { Stat, Tuberia, AnilloJwt, Hecho } from "./Piezas.jsx";
import Revela from "./Revela.jsx";

const SERVIDOR_IP = "129.213.137.20";
const ASHBURN = { lat: 39.0439, lon: -77.4874, lugar: "Ashburn, Virginia, EE. UU." };

/* ── interruptor de red grande ── */
function Interruptor({ activo, ocupado, alCambiar }) {
  return (
    <div className="red-card tarjeta apa brillo">
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
          ? <div className="chip vivo" style={{ fontSize: 13 }}>● red activa — tráfico viajando por 3 saltos</div>
          : <div className="chip muerto" style={{ fontSize: 13 }}>○ red apagada — tus credenciales no conectarán por SOCKS5</div>}
        <p className="nota" style={{ marginTop: 10, fontSize: 12.5, maxWidth: 520, marginInline: "auto" }}>
          {activo
            ? "tu circuito está vivo. Puedes girarlo (nuevos nodos al azar) o apagarlo cuando quieras — el mapa y la ruta de abajo van en tiempo real."
            : "nada se conecta hasta que tú lo digas: pulsa el interruptor y la red elegirá 3 nodos vivos al azar, cifrará cada salto y saldrá solo por 80/443."}
        </p>
      </div>

      <div style={{ maxWidth: 620, margin: "18px auto 0" }}>
        <Tuberia activo={activo} saltos={["nodo₁", "nodo₂", "nodo₃"]} paquetes={5} compacta />
      </div>
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
}

export default function Red({ yo: yo0, aviso }) {
  const [yo, setYo] = useState(yo0);
  const [lista, setLista] = useState([]);
  const [latencia, setLat] = useState(null);
  const [ocupado, setOcu] = useState(false);
  const [geos, setGeos] = useState({ tu: null, srv: null });
  const divMapa = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);

  async function refrescar(silent = true) {
    setOcu(true);
    try {
      const t0 = performance.now();
      setYo(await me());
      setLat(Math.round(performance.now() - t0));
      setLista(await nodos());
    } catch (e) { if (!silent) aviso(e.message, "error"); }
    finally { setOcu(false); }
  }
  useEffect(() => { refrescar(); }, []);

  useEffect(() => {
    (async () => {
      const [tu, srv] = await Promise.all([geo(yo?.ip_real), geo(SERVIDOR_IP)]);
      setGeos({ tu: tu || { lat: 43.26, lon: -2.93, lugar: "tu ubicación aproximada", ip: yo?.ip_real }, srv: srv || { ...ASHBURN, ip: SERVIDOR_IP } });
    })();
  }, [yo?.ip_real]);

  /* el mapa se crea UNA vez, cuando ya existen contenedor y datos */
  useEffect(() => {
    if (!yo || mapa.current || !divMapa.current) return;
    const m = L.map(divMapa.current, { attributionControl: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    setTimeout(() => m.invalidateSize(), 80);
  }, [yo]);

  /* pintar la ruta cuando cambian los datos */
  useEffect(() => {
    if (!mapa.current || !capa.current || !geos.srv) return;
    const c = capa.current; c.clearLayers();
    const activo = !!yo?.activo;
    const srv = geos.srv, tu = geos.tu;
    const tenue = !activo;
    L.polyline([[tu.lat, tu.lon], [srv.lat, srv.lon]], {
      color: "var(--acento-2)", opacity: tenue ? .35 : .95, weight: 3,
      dashArray: tenue ? "4 10" : undefined, className: tenue ? "" : "linea-avanza",
    }).addTo(c);
    L.polyline([[srv.lat, srv.lon], [srv.lat + 1.7, srv.lon + 2.4]], {
      color: "var(--acento-1)", opacity: tenue ? .35 : .8, weight: 2, dashArray: "6 8",
    }).bindPopup("→ destino (solo 80/443)").addTo(c);
    L.marker([tu.lat, tu.lon]).addTo(c).bindPopup(`<b>TÚ</b><br>${tu.lugar || ""}<br>IP ${yo?.ip_real ?? "?"}`);
    L.marker([srv.lat, srv.lon]).addTo(c).bindPopup(`<b>Nodos JumperNAT</b><br>${srv.lugar}<br>3 saltos sobre la misma máquina`);
    if (activo) {
      (yo?.circuito || []).forEach((n, i) => {
        L.circleMarker([srv.lat, srv.lon], { radius: 6 + i * 4, color: "#2ee88a", weight: 1.4, fill: false })
          .bindTooltip(`${i + 1} · ${n}${i === (yo.circuito.length - 1) ? " (exit)" : ""}`).addTo(c);
      });
    }
    mapa.current.fitBounds(L.latLngBounds([[tu.lat, tu.lon], [srv.lat, srv.lon]]).pad(.4));
  }, [geos, yo?.activo, yo?.circuito?.join()]);

  async function accion(fn, msg) {
    setOcu(true);
    try { await fn(); aviso(msg, "ok"); await refrescar(); }
    catch (e) { aviso(e.message, "error"); }
    finally { setOcu(false); }
  }

  const activo = !!yo?.activo;
  const infoNodos = useMemo(() => Object.fromEntries(lista.map((n) => [n.nombre, n])), [lista]);
  const saltos = yo?.circuito?.length ? yo.circuito : ["nodo·", "nodo·", "nodo·"];

  if (!yo) return <div className="tarjeta apa"><h2 className="seccion">cargando tu cuenta…</h2><span className="spin" /></div>;

  return (
    <div className="apa" style={{ display: "grid", gap: 14 }}>

      {/* ── cabecera de sesión ── */}
      <div className="tarjeta apa" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="whoami mono">≋</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, wordBreak: "break-all" }}>{yo.email}</div>
          <div className="nota mono" style={{ fontSize: 11 }}>
            id {yo.id} · API <span className={latencia != null ? "" : "parpadea"}>{latencia != null ? latencia + " ms" : "…"}</span>
          </div>
        </div>
        <span className={`chip ${activo ? "vivo" : "muerto"} mono`} style={{ marginLeft: "auto" }}>{activo ? "RED ACTIVA" : "RED OFF"}</span>
        <button className="btn" onClick={() => refrescar(false)} disabled={ocupado} aria-label="Refrescar datos">
          {ocupado ? <span className="spin" /> : "⟳"}
        </button>
      </div>

      {/* ── métricas rápidas ── */}
      <div className="tira-stats">
        <Stat etq="estado" val={activo ? "ACTIVA" : "APAGADA"} pie={activo ? "circuito en pie" : "sin tráfico"} tono={activo ? "ok" : "off"} />
        <Stat etq="saltos" val={`${yo.circuito?.length || 0} / 3`} pie="nodos aleatorios" tono="ok" />
        <Stat etq="cifrado" val="ChaCha20" pie="Poly1305 por capa" tono="info" />
        <Stat etq="salida" val="80 / 443" pie={activo ? `${yo.ip_salida || "—"}` : "sin IP de salida"} tono="aviso" />
      </div>

      {/* ── interruptor ── */}
      <Interruptor
        activo={activo} ocupado={ocupado}
        alCambiar={() => accion(activo ? desconectar_ : conectar, activo ? "red desactivada" : "red activada ✓ — tu tráfico ya viaja por 3 saltos")}
      />

      {/* ── ruta en vivo ── */}
      <Revela className="tarjeta">
        <div className="seccion-titulo" style={{ marginBottom: 10 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>Ruta de tu tráfico</h2>
          <span className={`etiqueta-viva`} style={activo ? undefined : { color: "var(--texto-suave)", opacity: .7 }}>
            {activo ? "en vivo" : "detenida"}
          </span>
        </div>

        <div className="ruta-lin">
          <Parada nombre="TÚ" sub={yo.ip_real || "tu IP"} tipo="tu" pulso={activo} />
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

        <div ref={divMapa} style={{ height: 380, marginTop: 14, borderRadius: "var(--radio)", border: "1px solid rgb(from var(--borde) r g b / .6)" }} />
        <p className="nota" style={{ marginTop: 8, fontSize: 12 }}>
          ℹ honestidad de diseño: los 3 saltos corren en el MISMO servidor (Oracle, Ashburn us-ashburn-1) —
          la separación es lógica (contenedores aislados), no geográfica.
        </p>
      </Revela>

      {/* ── detalles + costado ── */}
      <div className="rejilla-cuenta">
        <div className="tarjeta">
          <h2 className="seccion">Tu cuenta y tu circuito</h2>
          <div className="dato"><span className="etq">email</span><span className="val">{yo.email}</span></div>
          <div className="dato"><span className="etq">id interno</span><span className="val">{yo.id}</span></div>
          <div className="dato"><span className="etq">tu IP pública (la ve el servidor)</span><span className="val">{yo.ip_real || "—"}</span></div>
          <div className="dato"><span className="etq">IP que ve internet (exit)</span><span className="val">{activo ? `${yo.ip_salida} (IP del servidor)` : "—"}</span></div>
          <div className="dato"><span className="etq">circuito</span><span className="val">{yo.circuito?.length ? yo.circuito.join(" → ") : "—"}</span></div>
          <div className="dato"><span className="etq">estado</span><span className="val mono">{activo ? "ACTIVA · JENC" : "OFF"}</span></div>
          <div className="dato"><span className="etq">último cambio</span><span className="val">{yo.ultimo_cambio ? new Date(yo.ultimo_cambio * 1000).toLocaleString() : "—"}</span></div>
          <div className="dato"><span className="etq">API</span><span className="val">jumpernet.duckdns.org · {latencia ?? "…"} ms</span></div>

          {activo && (
            <div className="fila-btn" style={{ marginTop: 14 }}>
              <button className="btn aviso" disabled={ocupado} onClick={() => accion(rotar, "circuito girado: nuevos saltos ✓")}>
                🌀 Girar circuito
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <AnilloJwt />

          {activo ? (
            <div className="tarjeta">
              <h2 className="seccion">Nodos de tu circuito</h2>
              {saltos.map((n, i) => {
                const info = infoNodos[n] || {};
                return (
                  <div key={i} className="dato-fila">
                    <b className="mono" style={{ color: i === 2 ? "var(--acento-1)" : "var(--texto)" }}>{i + 1} · {n}</b>
                    <span className="nota mono" style={{ fontSize: 11.5 }}>
                      {info.direccion || "?"} · {info.estado || "?"} · {i < 2 ? "reenvío ciego" : "exit"} · ChaCha20
                    </span>
                  </div>
                );
              })}
              <pre className="mono codigo" style={{ marginTop: 12, fontSize: 11.5 }}>
# copia y sustituye TU_CLAVE
curl --socks5-hostname "{yo.email}:TU_CLAVE@jumpernet.duckdns.org:1080" https://example.com/
              </pre>
              <button className="btn" style={{ marginTop: 8 }} onClick={(e) => {
                navigator.clipboard.writeText(`curl --socks5-hostname "${yo.email}:TU_CLAVE@jumpernet.duckdns.org:1080" https://example.com/`);
                e.currentTarget.textContent = "¡copiado ✓!";
                setTimeout(() => { e.currentTarget.textContent = "Copiar comando"; }, 1600);
              }}>Copiar comando</button>
            </div>
          ) : (
            <div className="tarjeta">
              <h2 className="seccion">¿Qué pasa si activo?</h2>
              <div className="lista-hechos">
                <Hecho>Se eligen <b>3 nodos vivos al azar</b> y se abre tu circuito.</Hecho>
                <Hecho>Aparece el comando SOCKS5 con tus credenciales.</Hecho>
                <Hecho>El mapa y la ruta empiezan a moverse en tiempo real.</Hecho>
                <Hecho>Puedes girar el circuito sin cortar la sesión.</Hecho>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
