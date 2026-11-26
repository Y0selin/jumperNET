import { useEffect, useMemo, useState } from "react";
import { DOCS_URL } from "../lib/enlaces.js";
import { abreCarrito } from "../lib/carrito.js";
import { abreNotificaciones } from "../lib/notificaciones.js";
import { planDe, puede } from "../lib/planes.js";
import { ir } from "../lib/router.js";

/* Menú lateral del área privada.
 *
 * Grupos desplegables, buscador de herramientas, sección activa y modo
 * contraído. Cada entrada lleva a algo que existe de verdad: las que viven
 * dentro del panel de red se marcan con `seccion` y hacen scroll a su bloque.
 */

const GRUPOS = [
  {
    id: "general",
    nombre: "General",
    ico: "⌂",
    items: [
      { id: "inicio", texto: "Inicio", ico: "◧" },
      { id: "notificaciones", texto: "Notificaciones", ico: "◔", accion: "notificaciones" },
      { id: "actividad", texto: "Actividad del sistema", ico: "≡", seccion: "actividad", tab: "red" },
      { id: "novedades", texto: "Novedades", ico: "✦", href: "#/dudas" },
    ],
  },
  {
    id: "red",
    nombre: "Red y conexiones",
    ico: "◉",
    items: [
      { id: "red", texto: "Panel de red", ico: "◉", tab: "red" },
      { id: "nodos", texto: "Gestor de nodos", ico: "⛓", tab: "nodos" },
      { id: "circuito", texto: "Circuito activo", ico: "⌁", tab: "red", seccion: "circuito" },
      { id: "mapa", texto: "Mapa de red", ico: "◎", tab: "red", seccion: "mapa" },
      { id: "monitor", texto: "Monitor de conexiones", ico: "◔", tab: "nodos" },
      { id: "diagnostico", texto: "Diagnóstico de red", ico: "◈", tab: "red", seccion: "diagnostico" },
      { id: "rendimiento", texto: "Rendimiento y latencia", ico: "⌁", tab: "red" },
      { id: "socks", texto: "Configuración SOCKS5", ico: "⌸", tab: "red", seccion: "socks" },
    ],
  },
  {
    id: "seguridad",
    nombre: "Seguridad y privacidad",
    ico: "⛨",
    items: [
      { id: "seguridad", texto: "Centro de seguridad", ico: "⛨", tab: "red", seccion: "seguridad" },
      { id: "ip", texto: "Comprobación de IP", ico: "◇", tab: "red", seccion: "ip" },
      { id: "cifrado", texto: "Estado del cifrado", ico: "▤", tab: "inicio", seccion: "cifrado" },
      { id: "conectividad", texto: "Pruebas de conectividad", ico: "◇", tab: "red", seccion: "ip" },
      { id: "privacidad", texto: "Privacidad de los datos", ico: "⊘", tab: "cuenta", seccion: "privacidad" },
    ],
  },
  {
    id: "herramientas",
    nombre: "Herramientas",
    ico: "⌘",
    items: [
      { id: "lab", texto: "JumperNET Lab", ico: "⌘", href: "#/lab" },
      { id: "terminal", texto: "Terminal interactiva", ico: "›_", href: "#/lab" },
      { id: "inspector", texto: "Inspector de paquetes", ico: "◫", href: "#/lab" },
      { id: "fallos", texto: "Simulador de fallos", ico: "⚠", href: "#/lab" },
      { id: "descargas", texto: "Descargas", ico: "⬇", tab: "descargas" },
      { id: "ajustes", texto: "Apariencia del panel", ico: "✦", tab: "ajustes", cap: "personalizacion" },
      { id: "admin", texto: "Administración", ico: "🛡", tab: "admin", soloGestion: true },
    ],
  },
  {
    id: "suscripcion",
    nombre: "Suscripción y facturación",
    ico: "◈",
    items: [
      { id: "suscripcion", texto: "Mi suscripción", ico: "◈", tab: "suscripcion" },
      { id: "mejorar", texto: "Mejorar plan", ico: "↑", href: "#/tarifas" },
      { id: "carrito", texto: "Carrito", ico: "▱", accion: "carrito" },
      { id: "facturas", texto: "Facturas", ico: "▤", tab: "suscripcion", seccion: "jns-facturas" },
      { id: "historial", texto: "Historial de compras", ico: "≡", tab: "suscripcion", seccion: "jns-historial" },
      { id: "promos", texto: "Códigos promocionales", ico: "◇", accion: "carrito" },
    ],
  },
  {
    id: "cuenta",
    nombre: "Mi cuenta",
    ico: "☻",
    items: [
      { id: "cuenta", texto: "Mi perfil", ico: "☻", tab: "cuenta" },
      { id: "preferencias", texto: "Preferencias", ico: "⚙", tab: "cuenta" },
      { id: "pago", texto: "Proceso de pago", ico: "▣", tab: "pago" },
    ],
  },
  {
    id: "ayuda",
    nombre: "Ayuda y soporte",
    ico: "?",
    items: [
      { id: "soporte", texto: "Contacto y soporte", ico: "✉", tab: "soporte" },
      { id: "faq", texto: "Preguntas frecuentes", ico: "?", href: "#/dudas" },
      { id: "docs", texto: "Documentación", ico: "▤", externo: DOCS_URL },
      { id: "estado", texto: "Estado del servicio", ico: "◉", tab: "soporte", seccion: "jns-estado" },
      { id: "sugerencias", texto: "Enviar sugerencias", ico: "✦", tab: "soporte" },
      { id: "problema", texto: "Informar de un problema", ico: "!", tab: "soporte" },
    ],
  },
];

const CLAVE_MENU = "jumpernet-menu-v1";

function leeMenu() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_MENU) || "{}");
    return {
      colapsado: !!d.colapsado,
      cerrados: Array.isArray(d.cerrados) ? d.cerrados : [],
    };
  } catch { return { colapsado: false, cerrados: [] }; }
}

export default function MenuPanel({ tab, setTab, yo, abierto, onCerrar, noLeidas = 0, onSalir }) {
  const [config, setConfig] = useState(leeMenu);
  const [busca, setBusca] = useState("");
  const plan = planDe(yo?.plan);
  const esGestion = yo?.rol === "admin" || yo?.rol === "moderador";

  useEffect(() => {
    try { localStorage.setItem(CLAVE_MENU, JSON.stringify(config)); } catch { /* privado */ }
  }, [config]);

  useEffect(() => { if (abierto) setBusca(""); }, [abierto]);

  const q = busca.trim().toLowerCase();
  const grupos = useMemo(() => GRUPOS.map((g) => {
    const items = g.items.filter((i) => !i.soloGestion || esGestion);
    if (!q) return { ...g, items };
    const filtrados = items.filter((i) => i.texto.toLowerCase().includes(q));
    return { ...g, items: filtrados };
  }).filter((g) => g.items.length), [q, esGestion]);

  function alternaGrupo(id) {
    setConfig((c) => ({
      ...c,
      cerrados: c.cerrados.includes(id) ? c.cerrados.filter((x) => x !== id) : [...c.cerrados, id],
    }));
  }

  function navega(item) {
    onCerrar?.();
    if (item.accion === "carrito") { abreCarrito(); return; }
    if (item.accion === "notificaciones") { abreNotificaciones(); return; }
    if (item.externo) { window.open(item.externo, "_blank", "noopener"); return; }
    if (item.href) { ir(item.href.replace(/^#/, "")); return; }
    if (item.tab) {
      setTab(item.tab);
      if (item.seccion) {
        window.setTimeout(() => {
          const el = document.getElementById(item.seccion);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 90);
      }
    }
  }

  function esActiva(item) {
    if (item.tab && item.tab === tab && !item.seccion) return true;
    if (item.tab === tab && item.seccion) return false;
    return false;
  }

  return (
    <>
      {abierto && <button type="button" className="jns-velo menu" aria-label="Cerrar el menú" onClick={onCerrar} />}
      <aside
        className={`jns-menu${config.colapsado ? " colapsado" : ""}${abierto ? " abierto" : ""}`}
        aria-label="Menú del panel"
      >
        <div className="jns-menu-marca">
          <a href="#/" className="jns-menu-logo" aria-label="JumperNET, portada">
            <span aria-hidden>≋</span>
            <b>Jumper<span>NET</span></b>
          </a>
          <button
            type="button"
            className="jns-menu-plegar"
            onClick={() => setConfig((c) => ({ ...c, colapsado: !c.colapsado }))}
            aria-label={config.colapsado ? "Expandir el menú" : "Contraer el menú"}
            title={config.colapsado ? "Expandir menú" : "Contraer menú"}
          >
            {config.colapsado ? "»" : "«"}
          </button>
        </div>

        <button type="button" className={`jns-perfil tono-${plan.tono}`} onClick={() => { setTab("suscripcion"); onCerrar?.(); }}>
          <span className="jns-avatar" aria-hidden>
            {yo?.foto ? <img src={yo.foto} alt="" /> : (yo?.alias || yo?.email || "?").trim().charAt(0).toUpperCase()}
          </span>
          <span className="jns-perfil-txt">
            <b>{yo?.alias || (yo?.email || "invitado").split("@")[0]}</b>
            <small className="mono">{plan.ico} {plan.nombre} · #{yo?.id ?? "—"}</small>
          </span>
          <span className={`jns-perfil-punto ${yo?.activo ? "on" : ""}`} aria-label={yo?.activo ? "Red activa" : "Red apagada"} />
        </button>

        <label className="jns-menu-buscar">
          <span aria-hidden>⌕</span>
          <input
            type="search"
            placeholder="Buscar herramienta…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar en el menú"
          />
          {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpiar búsqueda">✕</button>}
        </label>

        <nav className="jns-menu-cuerpo">
          {grupos.length === 0 && (
            <p className="jns-menu-vacio">Nada coincide con «{busca}».</p>
          )}
          {grupos.map((g) => {
            const cerrado = !q && config.cerrados.includes(g.id);
            return (
              <div className={`jns-grupo${cerrado ? " cerrado" : ""}`} key={g.id}>
                <button
                  type="button"
                  className="jns-grupo-t"
                  onClick={() => alternaGrupo(g.id)}
                  aria-expanded={!cerrado}
                >
                  <span className="jns-grupo-ico" aria-hidden>{g.ico}</span>
                  <span>{g.nombre}</span>
                  <i aria-hidden>{cerrado ? "+" : "−"}</i>
                </button>
                {!cerrado && (
                  <div className="jns-grupo-items">
                    {g.items.map((item) => {
                      const bloqueada = item.cap && !puede(yo, item.cap);
                      const activa = esActiva(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`jns-item${activa ? " activa" : ""}${bloqueada ? " bloqueada" : ""}`}
                          onClick={() => navega(item)}
                          aria-current={activa ? "page" : undefined}
                          title={bloqueada ? `${item.texto} · disponible en Pro` : item.texto}
                        >
                          <span className="jns-item-ico" aria-hidden>{item.ico}</span>
                          <span className="jns-item-txt">{item.texto}</span>
                          {item.id === "notificaciones" && noLeidas > 0 && (
                            <span className="jns-item-badge mono">{noLeidas > 9 ? "9+" : noLeidas}</span>
                          )}
                          {bloqueada && <span className="jns-item-lock" aria-hidden>🔒</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="jns-menu-pie">
          <button type="button" className="jns-item" onClick={() => { setTab("soporte"); onCerrar?.(); }}>
            <span className="jns-item-ico" aria-hidden>?</span>
            <span className="jns-item-txt">Ayuda y soporte</span>
          </button>
          <button type="button" className="jns-item peligro" onClick={onSalir}>
            <span className="jns-item-ico" aria-hidden>⏻</span>
            <span className="jns-item-txt">Cerrar sesión</span>
          </button>
          <a className="jns-menu-web" href="#/">
            <span aria-hidden>←</span><span>Web pública</span>
          </a>
        </div>
      </aside>
    </>
  );
}
