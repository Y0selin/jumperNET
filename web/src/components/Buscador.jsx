import { useEffect, useMemo, useRef, useState } from "react";
import { DOCS_URL, GITHUB_URL } from "../lib/enlaces.js";
import { ENLACES } from "../lib/contenido.js";

/* Buscador global (Ctrl/Cmd + K).
   No inventa contenido: indexa páginas, secciones del laboratorio y acciones
   que existen de verdad. Se puede recorrer con las flechas y Enter. */

const PAGINAS = [
  { ruta: "/", t: "Portada", d: "La red, el circuito y el vídeo de presentación", ico: "⌂", grupo: "Páginas" },
  ...ENLACES.map((e) => ({ ruta: e.ruta, t: e.texto, d: e.corto, ico: e.ico, grupo: "Páginas" })),
  { ruta: "/descargas", t: "Descargas", d: "Extensión, navegador y GitHub Releases", ico: "↓", grupo: "Páginas" },
  { ruta: "/video", t: "El viaje en vídeo", d: "El recorrido completo, parada a parada", ico: "▷", grupo: "Páginas" },
  { ruta: "/acceso/registro", t: "Crear cuenta", d: "Entrar en JumperNET en 20 segundos", ico: "＋", grupo: "Cuenta" },
  { ruta: "/acceso/login", t: "Iniciar sesión", d: "Volver a tu panel de red", ico: "→", grupo: "Cuenta" },
  { ruta: "/acceso/login", t: "Panel de red", d: "Necesita sesión · entra para ver el circuito y tus nodos", ico: "◉", grupo: "Cuenta" },
];

const ACCIONES = [
  {
    t: "Abrir la consola del laboratorio", d: "Ejecuta help, status, nodes, route, connect…",
    ico: "▰", grupo: "Laboratorio", ruta: "/lab", seccion: "consola",
  },
  {
    t: "Explorar la topología de la red", d: "Toca cada salto y mira qué conoce",
    ico: "⌁", grupo: "Laboratorio", ruta: "/lab", seccion: "explorador",
  },
  {
    t: "Inspeccionar un paquete", d: "Qué ve y qué no ve cada nodo",
    ico: "◫", grupo: "Laboratorio", ruta: "/lab", seccion: "inspector",
  },
  {
    t: "Simular la caída de un nodo", d: "Comprueba cómo reacciona el circuito",
    ico: "⚠", grupo: "Laboratorio", ruta: "/lab", seccion: "fallos",
  },
  {
    t: "Abrir la documentación", d: "Arquitectura, cifrado JENC y pruebas",
    ico: "▤", grupo: "Recursos", externo: DOCS_URL,
  },
  {
    t: "Ver el código en GitHub", d: "Repositorio del proyecto",
    ico: "◇", grupo: "Recursos", externo: GITHUB_URL,
  },
  {
    t: "Cambiar entre modo claro y oscuro", d: "La preferencia se guarda en este navegador",
    ico: "◐", grupo: "Preferencias", accion: "modo",
  },
  {
    t: "Repetir la visita guiada", d: "Seis paradas por la portada",
    ico: "?", grupo: "Preferencias", accion: "tour",
  },
];

function normaliza(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function Buscador({ abierto, cerrar }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const entrada = useRef(null);
  const lista = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    setQ("");
    setSel(0);
    const t = setTimeout(() => entrada.current?.focus(), 40);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.body.style.overflow = antes; };
  }, [abierto]);

  const todos = useMemo(() => [...PAGINAS, ...ACCIONES], []);
  const resultados = useMemo(() => {
    const n = normaliza(q.trim());
    if (!n) return todos;
    const palabras = n.split(/\s+/);
    return todos
      .map((x) => {
        const texto = normaliza(`${x.t} ${x.d} ${x.grupo}`);
        if (!palabras.every((p) => texto.includes(p))) return null;
        const pos = normaliza(x.t).indexOf(palabras[0]);
        return { x, pos: pos < 0 ? 99 : pos };
      })
      .filter(Boolean)
      .sort((a, b) => a.pos - b.pos)
      .map((v) => v.x);
  }, [q, todos]);

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    if (!lista.current) return;
    const el = lista.current.querySelector('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [sel, resultados.length]);

  if (!abierto) return null;

  function ejecuta(x) {
    cerrar();
    if (!x) return;
    if (x.externo) {
      window.open(x.externo, "_blank", "noopener,noreferrer");
      return;
    }
    if (x.accion === "modo") {
      window.dispatchEvent(new Event("jumpernet-cambiar-modo"));
      return;
    }
    if (x.accion === "tour") {
      window.dispatchEvent(new Event("jumpernet-tour"));
      return;
    }
    if (x.seccion) {
      window.dispatchEvent(new CustomEvent("jumpernet-lab", { detail: { seccion: x.seccion } }));
    }
    if (location.hash !== `#${x.ruta}`) location.hash = x.ruta;
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function teclas(e) {
    if (e.key === "Escape") { e.preventDefault(); cerrar(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (resultados.length ? (s + 1) % resultados.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (resultados.length ? (s - 1 + resultados.length) % resultados.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      ejecuta(resultados[sel]);
    }
  }

  return (
    <div className="jn-buscador-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="jn-buscador" role="dialog" aria-modal="true" aria-label="Buscar en JumperNET">
        <div className="jn-buscador-cab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
          </svg>
          <input
            ref={entrada}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={teclas}
            placeholder="Busca una página, el laboratorio o una acción…"
            aria-label="Buscar"
            aria-controls="jn-buscador-resultados"
            aria-activedescendant={resultados[sel] ? `jn-res-${sel}` : undefined}
            autoComplete="off"
          />
          <kbd>esc</kbd>
        </div>

        <div className="jn-buscador-lista" id="jn-buscador-resultados" role="listbox" ref={lista}>
          {resultados.length === 0 && (
            <div className="jn-buscador-vacio">
              <b>Sin resultados</b>
              <span>Prueba con «lab», «nodos», «cuenta» o «documentación».</span>
            </div>
          )}
          {resultados.map((x, i) => (
            <button
              key={`${x.grupo}-${x.t}`}
              id={`jn-res-${i}`}
              type="button"
              role="option"
              aria-selected={i === sel}
              className={i === sel ? "sel" : ""}
              onMouseEnter={() => setSel(i)}
              onClick={() => ejecuta(x)}
            >
              <span className="jn-buscador-ico" aria-hidden>{x.ico}</span>
              <span className="jn-buscador-txt">
                <b>{x.t}</b>
                <span>{x.d}</span>
              </span>
              <span className="jn-buscador-grupo mono">{x.grupo}</span>
              <span className="jn-buscador-flecha" aria-hidden>{x.externo ? "↗" : "↵"}</span>
            </button>
          ))}
        </div>

        <div className="jn-buscador-pie mono">
          <span><kbd>↑</kbd><kbd>↓</kbd> mover</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>/</kbd> buscar</span>
          <span className="jn-buscador-marca">JumperNET <i>·</i> búsqueda local</span>
        </div>
      </div>
    </div>
  );
}
