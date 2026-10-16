import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { me, nodos, conectar, rotar, desconectar_, decodificaJwt, getToken, geo } from "../lib/api.js";

const SERVIDOR_IP_FALLBACK = "129.213.137.20";
const SERVIDOR_UBICACION = { lat: 39.04, lon: -77.49 }; // us-ashburn-1

function AnilloJwt({ token }) {
  const [segundos, setSeg] = useState(0);
  const info = useMemo(() => decodificaJwt(token), [token]);
  useEffect(() => {
    if (!info?.cuerpo?.exp) return;
    const id = setInterval(() => setSeg(Math.max(0, info.cuerpo.exp - Math.floor(Date.now() / 1000))), 500);
    return () => clearInterval(id);
  }, [info]);
  if (!info) return null;
  const total = 7200, frac = Math.min(1, segundos / total), R = 26, C = 2 * Math.PI * R;
  return (
    <div className="tarjeta visor t-led" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div className="pulso-nucleo" style={{ borderRadius: "50%", display: "grid", placeItems: "center" }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgb(255 255 255 / .12)" strokeWidth="5" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={frac > .25 ? "var(--acento-2)" : "var(--acento-1)"}
            strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)} transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dashoffset .5s ease" }} />
          <text x="32" y="30" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="800">{Math.floor(segundos / 60)}</text>
          <text x="32" y="42" textAnchor="middle" fontSize="8" fill="currentColor" opacity=".65">min restantes</text>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <h2 className="seccion" style={{ marginBottom: 6 }}>Sesión · JWT</h2>
        <div className="dato"><span className="etq">subject (id)</span><span className="val">{info.cuerpo.sub}</span></div>
        <div className="dato"><span className="etq">algoritmo</span><span className="val">{info.cab.alg}</span></div>
        <div className="dato"><span className="etq">expira</span><span className="val">{new Date(info.cuerpo.exp * 1000).toLocaleTimeString()}</span></div>
        <div className="dato"><span className="etq">emisión (iat)</span><span className="val">{new Date(info.cuerpo.iat * 1000).toLocaleTimeString()}</span></div>
      </div>
    </div>
  );
}

function Parada({ nombre, sub, tipo, pulso,onClick }) {
  const color = tipo === "tu" ? "var(--acento-1)" : tipo === "exit" ? "var(--acento-2)" : tipo === "destino" ? "var(--acento-3)" : "var(--borde)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <button onClick={onClick} className={pulso ? "pulso-nucleo" : ""} title={sub} style={{
        display: "grid", placeItems: "center", gap: 0, background: `rgb(from ${color} r g b / .16)`,
        border: `2px solid ${color}`, borderRadius: 13, padding: "9px 13px",
        color: "var(--texto)", cursor: "pointer", minWidth: 86, textAlign: "center",
      }}>
        <b style={{ fontSize: 13 }}>{nombre}</b>
        <span style={{ fontSize: 10, color: "var(--texto-suave)" }}>{sub}</span>
      </button>
      {tipo !== "destino" && <span style={{ color: "var(--texto-suave)", padding: "0 4px", fontWeight: 900 }}>→</span>}
    </div>
  );
}

export default function Panel({ yo: yoInicial, aviso }) {
  const [yo, setYo] = useState(yoInicial);
  const [listaNodos, setNodos] = useState([]);
  const [latencia, setLat] = useState(null);
  const [cargando, setCar] = useState(false);
  const [geos, setGeos] = useState({ tu: null, srv: null });
  const mapaRef = useRef(null);
  const mapaObj = useRef(null);
  const capaRef = useRef(null);

  async function refresca(silencio = true) {
    setCar(true);
    try {
      const r = await me(); setYo(r.datos); setLat(r.ms);
      const n = await nodos(); setNodos(n);
    } catch (e) { if (!silencio) aviso(e.message, "error"); }
    finally { setCar(false); }
  }

  // primera carga + geolocalización
  useEffect(() => { refresca(); }, []);
  useEffect(() => {
    (async () => {
      const [tu, srv] = await Promise.all([geo(yo?.ip_real), geo(SERVIDOR_IP_FALLBACK)]);
      setGeos({ tu, srv });
    })();
  }, [yo?.ip_real]);

  // inicializar mapa una vez
  useEffect(() => {
    if (mapaRef.current && !mapaObj.current) {
      const m = L.map(mapaRef.current, { attributionControl: false, zoomControl: true }); 
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
      capaRef.current = L.layerGroup().addTo(m);
      mapaObj.current = m;
    }
    return () => { /* no destruir entre renders */ };
  }, []);

  // dibujar la ruta en el mapa cuando hay datos
  useEffect(() => {
    if (!mapaObj.current || !capaRef.current || !yo) return;
    const capa = capaRef.current; capa.clearLayers();
    const activo = !!yo.activo;
    const srv = geos.srv || { lat: SERVIDOR_UBICACION.lat, lon: SERVIDOR_UBICACION.lon };
    const tu = geos.tu || { lat: 40.0, lon: -3.7 };
    const pts = [[tu.lat, tu.lon], [srv.lat, srv.lon]];
    L.polyline(pts, { color: "#4f8cff", weight: 3, dashArray: activo ? undefined : "4 10", className: activo ? "linea-avanza" : "" }).addTo(capa);
    L.polyline([[srv.lat, srv.lon],[srv.lat + 1.6, srv.lon + 2.2]], { color: "#2ecc71", weight: 2, dashArray: "6 8" }).addTo(capa)
      .bindPopup("→ destino en internet (80/443)");
    L.marker([tu.lat, tu.lon]).addTo(capa).bindPopup(`<b>TÚ</b><br>${geos.tu?.lugar || tu.lat + "," + tu.lon}<br>IP ${yo.ip_real}`);
    L.marker([srv.lat, srv.lon]).addTo(capa).bindPopup(`<b>nodos jumper</b><br>${geos.srv?.lugar || "Ashburn"}<br>3 saltos en la misma máquina`);
    if (activo) {
      // estelas animadas por salto: círculos concéntricos en el servidor
      (yo.circuito || []).forEach((n, i) => {
        L.circleMarker([srv.lat, srv.lon], { radius: 5 + i * 4, color: "#2ecc71", weight: 1.5, fill: false })
          .bindTooltip(`${i + 1} · ${n} ${i === (yo.circuito.length - 1) ? "(exit)" : ""}`).addTo(capa);
      });
    }
    mapaObj.current.fitBounds(L.latLngBounds(pts).pad(.45));
  }, [geos, yo, listaNodos]);

  async function vuelo() {
    if (!mapaObj.current || !yo) return;
    const srv = geos.srv || SERVIDOR_UBICACION, tu = geos.tu || { lat: 40, lon: -3.7 };
    const paradas = [[tu.lat, tu.lon], [srv.lat, srv.lon], [srv.lat + 1.6, srv.lon + 2.2]];
    paradas.forEach((p, i) => setTimeout(() => mapaObj.current.flyTo(p, i === 0 ? 7 : 13, { duration: 1.6 }), i * 1400));
  }

  async function accion(fn, texto) {
    setCar(true);
    try { await fn(); aviso(texto, "ok"); await refresca(); }
    catch (e) { aviso(e.message, "error"); }
    finally { setCar(false); }
  }

  if (!yo) return <div className="tarjeta"><h2 className="seccion">Cargando tu circuito…</h2><span className="spin" /></div>;
  const activo = !!yo.activo;

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* ===== estado del circuito ===== */}
      <div className="tarjeta visor grande efecto-brillo t-led aparecer">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className={`chip ${activo ? "vivo" : "muerto"}`} style={{ fontSize: 14, padding: "8px 18px" }}>
            {activo ? "● CONECTADO" : "○ desconectado"}
          </span>
          <span className="nota" style={{ fontSize: 13.5 }}>{yo.email}</span>
          <span className="chip info">API {latencia != null ? latencia + " ms" : "…"}</span>
          <button className="btn" onClick={() => refresca(false)} style={{ marginLeft: "auto" }}>
            {cargando ? <span className="spin" /> : "⟳ Refrescar"}
          </button>
        </div>

        {activo && (
          <div className="aparecer-1 aparecer" style={{ marginTop: 14 }}>
            <div className="ruta" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, margin: "10px 0 4px" }}>
              <Parada nombre="TÚ" sub={yo.ip_real || "tu IP"} tipo="tu" onClick={vuelo} />
              {(yo.circuito || []).map((n, i) => (
                <Parada key={n} nombre={n} sub={i === 2 ? "exit · salida" : "salto intermedio"} tipo={i === 2 ? "exit" : "nodo"} pulso={i === 0} onClick={vuelo} />
              ))}
              <Parada nombre="DESTINO" sub="internet · 80/443" tipo="destino" onClick={vuelo} />
            </div>
          </div>
        )}
        {!activo && <div className="nota" style={{ marginTop: 10 }}>Conéctate para generar un circuito de 3 saltos aleatorios y envolver tu tráfico con ChaCha20.</div>}

        <div className="fila-btn" style={{ marginTop: 16 }}>
          <button className="btn primario" disabled={activo || cargando} onClick={() => accion(conectar, "circuito conectado ✓")}>Conectar</button>
          <button className="btn aviso" disabled={!activo || cargando} onClick={() => accion(rotar, "circuito rotado: nuevos saltos ✓")}>Rotar</button>
          <button className="btn" disabled={!activo || cargando} onClick={() => accion(desconectar_, "circuito desconectado")}>Desconectar</button>
        </div>
      </div>

      {/* ===== viaje en vivo: mapa ===== */}
      <div className="tarjeta visor grande t-led aparecer aparecer-1 borde-latiente">
        <h2 className="seccion">Viaje de tu conexión · en vivo</h2>
        <button className="btn" style={{ marginBottom: 8 }} onClick={vuelo}>🎬 Reproducir viaje (vuelo animado)</button>
        <div ref={mapaRef} style={{ height: 400, borderRadius: "var(--radio)", border: "1px solid rgb(from var(--borde) r g b / .4)", background: "#0b1020" }} />
        <div className="nota" style={{ marginTop: 8 }}>
          ℹ Honestidad de diseño: los 3 saltos viven en el <b>mismo servidor</b> (Oracle Cloud, Ashburn,
          us-ashburn-1). La separación es lógica (contenedores aislados), no geográfica — por eso en el
          mapa todos los saltos comparten punto: son capas sobre la misma máquina.
        </div>
      </div>

      {/* ===== nodos del circuito ===== */}
      {activo && (
        <div className="grid2">
          {(yo.circuito || []).map((n, i) => {
            const info = listaNodos.find((x) => x.nombre === n) || {};
            return (
              <div key={n} className="tarjeta visor t-led" style={{ animationDelay: `${i * 0.1}s` }}>
                <h2 className="seccion">Salto {i + 1} · {n}</h2>
                <span className="chip info" style={{ marginBottom: 10 }}>
                  {i === 2 ? "🚪 EXIT (salida)" : "🔁 reenvío ciego"} {i === 0 && <span className="barra-actividad" />}
                </span>
                <div className="dato"><span className="etq">dirección interna</span><span className="val">{info.direccion || "—"}</span></div>
                <div className="dato"><span className="etq">estado (heartbeat)</span><span className="val" style={{ color: info.estado === "vivo" ? "var(--acento-2)" : "#ff8f80" }}>{info.estado || "—"}</span></div>
                <div className="dato"><span className="etq">salta hacia →</span><span className="val">{i < 2 ? (yo.circuito[i + 1]) : "destino (80/443)"}</span></div>
                <div className="dato"><span className="etq">enlace</span><span className="val">ChaCha20-Poly1305 (JENC)</span></div>
                <div className="dato"><span className="etq">ve tu contenido</span><span className="val">{i < 2 ? "NO (cifrado)" : "NO (solo destino)"}</span></div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== info de usuario + sesión ===== */}
      <div className="grid2">
        <AnilloJwt token={getToken()} />

        <div className="tarjeta visor t-led">
          <h2 className="seccion">Tu información</h2>
          <div className="dato"><span className="etq">cuenta</span><span className="val">{yo.email}</span></div>
          <div className="dato"><span className="etq">tu IP pública (ve el servidor)</span><span className="val">{yo.ip_real || "—"}</span></div>
          <div className="dato"><span className="etq">IP que ve internet (uso del circuito)</span><span className="val">{activo ? `${yo.ip_salida} (IP del servidor)` : "—"}</span></div>
          <div className="dato"><span className="etq">circuito actual</span><span className="val">{yo.circuito ? yo.circuito.join(" → ") : "—"}</span></div>
          <div className="dato"><span className="etq">estado</span><span className="val">{activo ? "conectado · JENC activo" : "desconectado"}</span></div>
          <div className="dato"><span className="etq">último cambio de circuito</span><span className="val">{yo.ultimo_cambio ? new Date(yo.ultimo_cambio * 1000).toLocaleString() : "—"}</span></div>
          <div className="dato"><span className="etq">latencia de esta consulta</span><span className="val">{latencia ?? "—"} ms</span></div>
        </div>
      </div>

      {/* ===== comando socks ===== */}
      <div className="tarjeta visor grande t-led aparecer-2">
        <h2 className="seccion">Usa el proxy SOCKS5</h2>
        <p className="peque nota">Puerto 1080 · tus mismas credenciales · solo puertos 80/443 · cifrado en capas hasta el exit.</p>
        <pre className="codigo"># sustituye TU_CLAVE por tu contraseña
curl --socks5-hostname "{yo.email}:TU_CLAVE@jumpernet.duckdns.org:1080" https://example.com/</pre>
        <button className="btn" style={{ marginTop: 10 }} onClick={(e) => {
          navigator.clipboard.writeText(`curl --socks5-hostname "${yo.email}:TU_CLAVE@jumpernet.duckdns.org:1080" https://example.com/`);
          e.target.textContent = "¡copiado ✓!"; setTimeout(() => (e.target.textContent = "Copiar comando"), 1800);
        }}>Copiar comando</button>
      </div>
    </div>
  );
}
