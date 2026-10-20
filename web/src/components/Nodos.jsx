import { useEffect, useMemo, useState } from "react";
import { nodos, miNodo, editarMe, peerToken } from "../lib/api.js";
import { Stat } from "./Piezas.jsx";

/* Nodos: la foto completa de la red — todos los saltos registrados, su estado
   por heartbeat, la latencia medida de verdad (TCP connect) y cuántas
   conexiones está reenviando cada uno ahora mismo. Vista en TARJETAS o TABLA,
   se refresca solo y refleja en vivo el papel de cada nodo en tu circuito. */

/* Base de las descargas del agente de salida: sirven del MISMO sitio que el
   panel propio (GitHub Pages), carpeta «descargas» al lado del index. */
function baseDescarga() {
  const { origin, pathname } = window.location;
  return origin + pathname.replace(/[^/]*$/, "") + "descargas/";
}

/* ¿Windows, para resaltar el botón recomendado? */
function esWindows() {
  return /windows/i.test(navigator.userAgent || "");
}

export default function Nodos({ yo, aviso, compacta = false, segundos = 8 }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [auto, setAuto] = useState(true);
  const [visto, setVisto] = useState(null);
  const [vista, setVista] = useState("tarjetas");   // tarjetas | tabla
  const [orden, setOrden] = useState("nombre");     // nombre | latencia | conexiones
  const [bloque, setBloque] = useState("todos");    // todos|vivos|circuito|peer|externos|infra
  const [busca, setBusca] = useState("");
  const [tokInfo, setTokInfo] = useState(null);   // {peer_token, clave_saltos, nombre} para los comandos
  const [cambiando, setCambiando] = useState(false);

  /* OPT-IN del salto: tu nodo personal (peer_u<id>) se registra al abrir esta
     pestaña, pero NUNCA salta hasta que aceptas ser salto de la red. Aquí
     se muestra el estado y el botón de aceptar/revocar. */
  const miPeer = lista.find((n) => n.nombre === `peer_u${yo?.id}`);      async function cambiarSalto(acepta) {
        setCambiando(true);
        try {
          await editarMe({ salto_publico: acepta });
          aviso(acepta
            ? "✓ Aceptado: tu equipo ya es salto de la red — el navegador abre el túnel solo (cero puertos abiertos)"
            : "✓ Revocado: tu equipo ya no salta por el circuito de nadie");
          await trae();
        } catch (e) { aviso(e.message, "error"); }
        finally { setCambiando(false); }
      }

  /* Privacidad de la vista: un usuario NORMAL solo ve los nodos DE SU CIRCUITO
     (dónde pega el tráfico). Moderadores y administradores ven la red completa.
     Si la red está apagada, un usuario normal no ve lujo: solo un aviso limpio. */
  const esGestion = yo?.rol === "admin" || yo?.rol === "moderador";
  const filtroCircuito = yo?.circuito || [];

  async function trae(silencioso = true) {
    try {
      const d = await nodos();
      setLista(d);
      setVisto(new Date());
      // latido del equipo del usuario: cada refresco de esta vista mantiene
      // vivo tu nodo personal (peer_u<id>) mientras pestaña abierta
      if (yo?.id) { try { await miNodo(); } catch { /* best-effort */ } }
    } catch (e) { if (!silencioso) aviso(e.message, "error"); }
    finally { setCargando(false); }
  }

  useEffect(() => { trae(); }, []);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => trae(), segundos * 1000);
    return () => clearInterval(id);
  }, [auto, segundos]);

  /* Comandos con el token REAL de tu cuenta (lo saco de TU sesión con
     /peer_token): si no lo tengo todavía, lo pido una vez y lo cacheo. */
  const necesitaComandos = !!miPeer?.salto_publico && yo?.salto_despliegue?.salto_via !== "agente" && yo?.id;
  useEffect(() => {
    if (!necesitaComandos || tokInfo) return;
    peerToken().then(setTokInfo).catch((e) => setTokInfo({ error: e.message }));
  }, [necesitaComandos, yo?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const comandoWin = tokInfo && !tokInfo.error ? `JumperNET-Agent.exe ${tokInfo.peer_token} ${tokInfo.nombre}${tokInfo.clave_saltos ? " --clave " + tokInfo.clave_saltos : ""}` : null;
  const comandoLin = tokInfo && !tokInfo.error ? `python3 agente_salida.py ${tokInfo.peer_token} ${tokInfo.nombre}${tokInfo.clave_saltos ? " --clave " + tokInfo.clave_saltos : ""}` : null;

  const circuito = yo?.circuito || [];
  const papel = (nombre) => {
    const i = circuito.indexOf(nombre);
    if (i < 0) return null;
    if (circuito.length === 1) return "exit";
    return i === 0 ? "entrada" : i === circuito.length - 1 ? "exit" : "relé ciego";
  };

  const visibles = useMemo(() => {
    let copia = [...lista];
    if (bloque === "vivos") copia = copia.filter((n) => n.estado === "vivo");
    else if (bloque === "desconectados") copia = copia.filter((n) => n.estado !== "vivo");
    else if (bloque === "circuito") copia = copia.filter((n) => papel(n.nombre) != null);
    else if (bloque === "peer") copia = copia.filter((n) => (n.tipo || "infra") === "usuario");
    else if (bloque === "externos") copia = copia.filter((n) => (n.tipo || "infra") === "usuario" && n.saltable);
    else if (bloque === "infra") copia = copia.filter((n) => (n.tipo || "infra") === "infra");
    const q = busca.trim().toLowerCase();
    if (q) copia = copia.filter((n) =>
      (n.nombre || "").toLowerCase().includes(q) || (n.alias || "").toLowerCase().includes(q) || (n.direccion || "").toLowerCase().includes(q));
    if (orden === "latencia") copia.sort((a, b) => (a.ms ?? 9999) - (b.ms ?? 9999));
    else if (orden === "conexiones") copia.sort((a, b) => (b.conexiones || 0) - (a.conexiones || 0));
    else copia.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    // los de tu circuito SIEMPRE delante
    return copia.sort((a, b) => Number(papel(b.nombre) != null) - Number(papel(a.nombre) != null));
  }, [lista, orden, bloque, busca, circuito.join(), esGestion]);

  const resumen = useMemo(() => {
    const vivos = lista.filter((n) => n.estado === "vivo");
    return {
      total: lista.length,
      vivos: vivos.length,
      conexiones: lista.reduce((s, n) => s + (n.conexiones || 0), 0),
      enCircuito: circuito.length,
      msMedio: vivos.length
        ? Math.round(vivos.reduce((s, n) => s + (n.ms || 0), 0) / vivos.filter((n) => n.ms != null).length || 0)
        : null,
    };
  }, [lista, circuito.length]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!compacta && (
        <div className="tira-stats">
          {esGestion ? (
            <Stat etq="nodos vivos" val={`${resumen.vivos} / ${resumen.total}`} pie="según heartbeat" tono={resumen.vivos === resumen.total ? "ok" : "aviso"} />
          ) : (
            <Stat etq="nodos de tu circuito" val={resumen.enCircuito} pie="dónde viaja tu tráfico" tono={yo?.activo ? "ok" : "off"} />
          )}
          <Stat etq="en tu circuito" val={`${resumen.enCircuito} / ${yo?.saltos_max || 3}`} pie={yo?.activo ? "tráfico activo" : "red apagada"} tono={yo?.activo ? "ok" : "off"} />
          <Stat etq="conexiones reenviando" val={resumen.conexiones} pie={esGestion ? "suma de todos los nodos" : "de tus nodos"} tono="info" />
          <Stat etq="latencia media" val={resumen.msMedio != null ? `${resumen.msMedio} ms` : "—"} pie="TCP connect real" tono="aviso" />
        </div>
      )}

      {!compacta && yo?.id && (
        <div className="tarjeta" style={{
          borderColor: miPeer?.salto_publico ? "rgb(from var(--acento-1) r g b / .5)" : undefined,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 340px", minWidth: 0 }}>
              <h2 className="seccion" style={{ marginBottom: 6 }}>
                Mi equipo como salto {miPeer?.salto_publico && (
                  (() => {
                    const via = yo?.salto_despliegue?.salto_via;
                    const chip = via === "agente"
                      ? { clase: "vivo", texto: "salida desde tu casa ✓" }
                      : via === "web"
                        ? { clase: "mono", texto: "salto intermedio (puente del VPS)" }
                        : { clase: "mono", texto: "esperando tu agente local…" };
                    return <span className={`chip ${chip.clase}`} style={{ marginLeft: 8 }}>{chip.texto}</span>;
                  })()
                )}
              </h2>
              <p className="nota" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55 }}>
                Tu equipo está registrado en la red como <b className="mono">peer_u{yo?.id}</b>
                {miPeer && <> · estado <b>{miPeer.estado}</b> · dirección <b className="mono">{miPeer.direccion}</b></>}.
                Por defecto <b>no salta por el circuito de nadie</b>. Si lo aceptas, tu equipo
                entra al pool de saltos externos y el tráfico de otros usuarios puede pasar
                por él — igual que una relay de Tor — <b>sin abrir NADA en tu router</b>: el
                navegador (o <span className="mono">nodo_personal.py --tunel</span>) mantiene
                una conexión saliente al servidor y la red salta por ahí. Revócalo cuando quieras.
              </p>
              {!miPeer && (
                <p className="nota" style={{ marginTop: 6, fontSize: 11.5 }}>
                  Tu nodo personal aparecerá aquí cuando conectes la red (o mantengas esta pestaña abierta).
                </p>
              )}
              {miPeer?.salto_publico && (() => {
                const st = yo?.salto_despliegue || {};
                const via = st.salto_via;
                if (via === "agente") {
                  return (
                    <p className="nota" style={{ marginTop: 6, fontSize: 12, color: "var(--acento-1)" }}>
                      ✓ {st.mensaje}
                    </p>
                  );
                }
                return (
                  <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <a href={baseDescarga() + "JumperNET-Agent.exe"} download
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                          padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                          border: esWindows() ? "2px solid var(--acento-1)" : "1px solid var(--borde)",
                          background: esWindows() ? "rgb(from var(--acento-1) r g b / .16)" : "rgb(255 255 255 / .04)",
                          color: esWindows() ? "var(--acento-1)" : "var(--texto)",
                          boxShadow: esWindows() ? "0 0 18px rgb(from var(--acento-1) r g b / .25)" : "none",
                        }}>
                        ⬇ Windows (.exe)
                      </a>
                      <a href={baseDescarga() + "agente_salida.py"} download
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                          padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                          border: !esWindows() ? "2px solid var(--acento-1)" : "1px solid var(--borde)",
                          background: !esWindows() ? "rgb(from var(--acento-1) r g b / .16)" : "rgb(255 255 255 / .04)",
                          color: !esWindows() ? "var(--acento-1)" : "var(--texto)",
                          boxShadow: !esWindows() ? "0 0 18px rgb(from var(--acento-1) r g b / .25)" : "none",
                        }}>
                        ⬇ Linux / Mac (.py)
                      </a>
                      <a href={baseDescarga() + "AGENTE_LEEME.md"} target="_blank" rel="noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", textDecoration: "none",
                          padding: "10px 14px", borderRadius: 12, fontSize: 13,
                          border: "1px dashed var(--borde)", color: "var(--texto-suave)",
                        }}>
                        📖 manual (instalar y parar)
                      </a>
                    </div>
                    <div>
                      <p className="nota" style={{ margin: "0 0 6", fontSize: 12 }}>
                        Tu comando <b>ya incluye tu token y la clave</b> — solo cambia el nombre del
                        archivo si lo guardaste con otro, y pégalo en tu consola (conexión solo
                        SALIENTE, sin abrir ningún puerto en el router):
                      </p>
                      {!tokInfo && (
                        <div className="tarjeta nota" style={{ margin: 0, fontSize: 12 }}>pidiendo tu token…</div>
                      )}
                      {tokInfo?.error && (
                        <div className="tarjeta nota" style={{ margin: 0, fontSize: 12, color: "var(--acento-3)" }}>
                          no pude pedir tu token ({tokInfo.error}): refresca la página con la sesión iniciada
                        </div>
                      )}
                      {comandoWin && comandoLin && (
                        <div className="tarjeta mono" style={{
                          margin: 0, padding: "10px 12px", fontSize: 11.5, lineHeight: 1.6,
                          background: "rgb(255 255 255 / .03)", overflowX: "auto",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="nota" style={{ fontSize: 10.5 }}>Windows (PowerShell o cmd):</span>
                            <button className="btn" style={{ fontSize: 10.5, padding: "2px 10px", marginLeft: "auto" }}
                              onClick={() => navigator.clipboard.writeText(comandoWin).then(() => setTokInfo({ ...tokInfo, copiado: true }))}
                            >{tokInfo.copiado ? "✓ copiado" : "⧉ copiar"}</button>
                          </div>
                          <code style={{ display: "block", whiteSpace: "pre-wrap" }}>{comandoWin}</code>
                          <div className="nota" style={{ fontSize: 10.5, marginTop: 6 }}>Linux / Mac (terminal):</div>
                          <code style={{ display: "block", whiteSpace: "pre-wrap" }}>{comandoLin}</code>
                        </div>
                      )}
                      <p className="nota" style={{ margin: "6px 0 0", fontSize: 11.5 }}>
                        Deja el agente en marcha: en unos segundos verás aquí el chip
                        <b> «salida desde tu casa ✓»</b>. Para dejar de colaborar, cierra el agente
                        (o revoca el salto) y tu nodo deja de ser salida al instante.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <button
              className={`btn ${miPeer?.salto_publico ? "" : "primario"}`}
              style={{ flex: "0 0 auto", marginTop: 4 }}
              disabled={cambiando}
              onClick={() => cambiarSalto(!miPeer?.salto_publico)}
              title={miPeer?.salto_publico ? "Revocar: tu equipo deja de saltar al instante" : "Aceptar que tu equipo sea salto de la red"}
            >
              {cambiando ? <span className="spin" /> : (miPeer?.salto_publico ? "⨯ no ser salto" : "✓ acepto ser salto")}
            </button>
          </div>
        </div>
      )}

      <div className="tarjeta">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="seccion" style={{ marginBottom: 0 }}>{esGestion ? "Todos los nodos" : "Tus nodos"}</h2>
          <span className="nota mono" style={{ fontSize: 11 }}>
            {visto ? `actualizado ${visto.toLocaleTimeString()}` : "cargando…"}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!compacta && (
              <input className="campo" style={{ width: "auto", minWidth: 150, padding: "6px 10px", fontSize: 12 }}
                placeholder="buscar nodo, alias o dirección…" value={busca}
                onChange={(e) => setBusca(e.target.value)} aria-label="Buscar nodos" />
            )}
            {!compacta && (
              <select className="campo" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                value={bloque} onChange={(e) => setBloque(e.target.value)} aria-label="Filtrar nodos">
                <option value="todos">todos los nodos</option>
                <option value="vivos">solo conectados</option>
                <option value="desconectados">solo desconectados</option>
                <option value="circuito">de mi circuito</option>
                <option value="peer">equipos de usuarios</option>
                <option value="externos">externos saltables (validados)</option>
                <option value="infra">infraestructura</option>
              </select>
            )}
            {!compacta && (
              <select className="campo" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Orden de nodos">
                <option value="nombre">↕ nombre</option>
                <option value="latencia">↕ latencia</option>
                <option value="conexiones">↕ conexiones</option>
              </select>
            )}
            {!compacta && (
              <span style={{ display: "inline-flex", borderRadius: 10, border: "1px solid var(--borde)", overflow: "hidden" }}>
                <button className={`btn ${vista === "tarjetas" ? "primario" : ""}`} style={{ border: 0, borderRadius: 0, padding: "6px 12px" }}
                  onClick={() => setVista("tarjetas")} title="Vista de tarjetas">▦</button>
                <button className={`btn ${vista === "tabla" ? "primario" : ""}`} style={{ border: 0, borderRadius: 0, padding: "6px 12px" }}
                  onClick={() => setVista("tabla")} title="Vista de tabla">☰</button>
              </span>
            )}
            <button className="btn" onClick={() => setAuto((a) => !a)} title="Refresco automático cada 8 s">
              {auto ? "⏸ auto" : "▶ auto"}
            </button>
            <button className="btn" onClick={() => trae(false)} disabled={cargando} aria-label="Refrescar nodos">
              {cargando ? <span className="spin" /> : "⟳"}
            </button>
          </span>
        </div>

        {vista !== "tabla" || compacta ? (
          <TarjetasNodos lista={visibles} yo={yo} papel={papel} cargando={cargando} />
        ) : (
          <TablaNodos lista={visibles} papel={papel} cargando={cargando} />
        )}

        <p className="nota" style={{ marginTop: 12, fontSize: 12 }}>
          Lista DINÁMICA de la red: los nodos entran al conectarse (heartbeat) y quedan
          registrados para siempre; si dejan de latir se muestran como <b>desconectados</b>.
          Los equipos de usuarios (marcados «personal») <b>no saltan hasta que su dueño acepta
          ser salto</b> (tarjeta «Mi equipo como salto») y, además, tienen el servicio peer
          encendido y validado por sondeo TCP. Latencia TCP connect real medida por el servidor.
        </p>
      </div>
    </div>
  );
}

/* ── color de salud por latencia: <40ms estupendo, <80 bien, más aviso ── */
function saludLat(m) {
  if (m == null) return { etiqueta: "sin medida", color: "var(--texto-suave)", ancho: 0 };
  if (m < 40) return { etiqueta: `${m} ms · rapidísimo`, color: "var(--acento-1)", ancho: Math.max(8, 100 - m) };
  if (m < 80) return { etiqueta: `${m} ms · bien`, color: "var(--acento-3)", ancho: Math.max(8, 100 - m) };
  return { etiqueta: `${m} ms · lento`, color: "#ffb454", ancho: Math.max(8, 100 - m) };
}

function TarjetasNodos({ lista, yo, papel, cargando }) {
  const activo = !!yo?.activo;
  const esGestion = yo?.rol === "admin" || yo?.rol === "moderador";
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {lista.map((n) => {
        const p = papel(n.nombre);
        const pos = circuitoPos(yo, n.nombre);
        const vivo = n.estado === "vivo";
        const sal = saludLat(n.ms);
        const hbd = n.ultimo_hb != null ? Math.min(100, Math.max(0, 100 - (n.ultimo_hb / 40) * 100)) : 0;
        return (
          <div key={n.nombre} className="tarjeta" style={{
            margin: 0, padding: "14px 16px",
            borderColor: p ? "rgb(from var(--acento-1) r g b / .55)" : undefined,
            boxShadow: p ? "0 0 24px rgb(from var(--acento-1) r g b / .12)" : undefined,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="punto" style={{
                width: 10, height: 10, borderRadius: "50%",
                background: vivo ? "var(--acento-1)" : "#e2524a",
                boxShadow: vivo ? "0 0 10px rgb(from var(--acento-1) r g b / .8)" : "none",
                animation: vivo && p ? "jn-pulso 1.6s ease-in-out infinite" : undefined,
              }} />
              <b className="mono" style={{ fontSize: 14.5 }}>{n.nombre}</b>
              {(n.tipo || "infra") === "usuario" || n.nombre?.startsWith("peer_") ? (
                <span className="chip acento" style={{ fontSize: 10 }}>
                  personal{!n.hoppable && " · sin servicio peer"}{n.hoppable && !n.responde && " · no responde"}
                </span>
              ) : null}
              {/* validación de vida: responde = la sonda TCP lo alcanzó ya */}
              {n.responde && (
                <span className="chip mono" style={{ fontSize: 9.5, color: "var(--acento-1)" }} title="el servidor conectó por TCP con este nodo hace menos de 1 minuto">✓ verificado</span>
              )}
              {n.hoppable && !n.responde && (
                <span className="chip mono nota" style={{ fontSize: 9.5 }} title="anuncia un servicio peer (host:puerto) pero la última sonda TCP no conectó: no salta">◌ sin verificar</span>
              )}
              {n.alias && <span className="nota" style={{ fontSize: 11.5 }}>“{n.alias}”</span>}
              {p && <span className={`chip ${p === "exit" ? "vivo" : "acento"}`}>{activo ? `${p} · tu circuito #${pos + 1}` : p}</span>}
              <span className={`chip mono ${vivo ? "vivo" : "muerto"}`} style={{ marginLeft: "auto", fontSize: 10.5 }}>{n.estado.toUpperCase()}</span>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {/* el estado CONECTADO/DESCONECTADO en vivo (cada 8 s) */}
              {n.ultimo_hb != null && (
                <div className="mono nota" style={{ fontSize: 11 }}>
                  {vivo ? "● conectado en vivo" : "○ desconectado"} · hace {n.ultimo_hb ?? "—"} s
                </div>
              )}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }} className="mono">
                  <span className="nota">latencia TCP connect</span>
                  <span style={{ color: sal.color }}>{sal.etiqueta}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgb(255 255 255 / .07)", overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${vivo ? sal.ancho : 0}%`, borderRadius: 99, background: sal.color, transition: "width .5s ease" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }} className="mono">
                  <span className="nota">último latido</span>
                  <span className="nota">{n.ultimo_hb != null ? `hace ${n.ultimo_hb} s` : "—"}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgb(255 255 255 / .07)", overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${hbd}%`, borderRadius: 99, background: "var(--acento-2)", transition: "width .5s ease" }} />
                </div>
              </div>
              <div className="mono nota" style={{ fontSize: 11.5, display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span>⛓ {n.conexiones ?? 0} conexiones</span>
                <span>↔ {n.direccion}</span>
                {n.saltable && <span style={{ color: "var(--acento-1)" }}>⚡ saltable</span>}
                {(n.tipo || "infra") === "usuario" && n.via === "agente" && (
                  <span style={{ color: "var(--acento-1)" }} title="el túnel del peer llega desde una IP pública: el agente corre en su equipo y puede ejecutar la salida">🏠 salida desde su casa</span>
                )}
                {(n.tipo || "infra") === "usuario" && n.via === "web" && (
                  <span title="el túnel lo sostiene el puente del VPS: pueden saltar POR ÉL como intermedio, pero no puede ejecutar la salida">⇄ salto sin salida</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {!lista.length && (
        <div className="tarjeta nota" style={{ margin: 0 }}>
          {cargando ? "cargando nodos…"
            : bloque === "vivos" ? "no hay nodos conectados en este momento"
            : bloque === "desconectados" ? "ningún nodo desconectado ahora: todos están en pie"
            : bloque === "externos" ? "todavía no hay equipos externos validados: conéctate con un peer y saldrá aquí"
            : bloque === "busca" ? "nadie casa con la búsqueda"
            : "no hay nodos registrados todavía"}
        </div>
      )}
    </div>
  );
}

function circuitoPos(yo, nombre) {
  return (yo?.circuito || []).indexOf(nombre);
}

function TablaNodos({ lista, papel, cargando }) {
  return (
    <div className="envuelve-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th>nodo</th>
            <th>papel</th>
            <th>estado</th>
            <th>validación</th>
            <th className="der">latencia</th>
            <th className="der">conexiones</th>
            <th className="der">último latido</th>
            <th>dirección interna</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((n) => {
            const p = papel(n.nombre);
            const vivo = n.estado === "vivo";
            return (
              <tr key={n.nombre} className={p ? "en-circuito" : ""}>
                <td><b>{n.nombre}</b>{n.nombre?.startsWith("peer_") && <span className="chip acento" style={{ marginLeft: 6, fontSize: 10 }}>personal</span>}</td>
                <td>{p ? <span className={`chip ${p === "exit" ? "vivo" : "acento"}`}>{p}</span> : <span className="nota">—</span>}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: vivo ? "var(--acento-1)" : "#ff9088" }}>
                    <span className="punto" style={{ background: vivo ? "var(--acento-1)" : "#e2524a", boxShadow: vivo ? "0 0 8px rgb(from var(--acento-1) r g b / .8)" : "none" }} />
                    {n.estado}
                  </span>
                </td>
                <td>
                  {n.responde
                    ? <span className="chip mono" style={{ fontSize: 10, color: "var(--acento-1)" }} title="la sonda TCP del servidor conectó">✓ verificado</span>
                    : (n.tipo || "infra") === "usuario"
                      ? <span className="chip mono nota" style={{ fontSize: 10 }}>sin verificar</span>
                      : <span className="nota">—</span>}
                </td>
                <td className="der">{n.ms != null ? `${n.ms} ms` : "—"}</td>
                <td className="der">{n.conexiones ?? 0}</td>
                <td className="der nota" style={{ textAlign: "right" }}>{n.ultimo_hb != null ? `hace ${n.ultimo_hb}s` : "—"}</td>
                <td className="nota">{n.direccion}</td>
              </tr>
            );
          })}
          {!lista.length && !cargando && (
            <tr><td colSpan={8} className="nota">no hay nodos registrados todavía</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
