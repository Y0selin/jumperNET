/* Telemetría del panel.
 *
 * Solo datos reales: latencia de /me, tráfico de aplicación medido en api.js
 * y estado de /nodos. La demostración vive en `demoTelemetria()` y siempre se
 * muestra con una etiqueta visible; nunca se mezcla con las medidas reales.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { me, nodos, nodosVivos } from "./api.js";

function bytesDeEvento(d) {
  return {
    enviado: Math.max(0, Number(d?.enviado) || 0),
    recibido: Math.max(0, Number(d?.recibido) || 0),
  };
}

export function useTelemetria({ intervalo = 6000, max = 180, activo = true } = {}) {
  const [muestras, setMuestras] = useState([]);
  const [lista, setLista] = useState([]);
  const [vivos, setVivos] = useState(null);
  const [circuito, setCircuito] = useState([]);
  const [activoRed, setActivoRed] = useState(false);
  const [error, setError] = useState("");
  const [ultima, setUltima] = useState(null);
  const [pausado, setPausado] = useState(false);
  const buffer = useRef({ enviado: 0, recibido: 0 });
  const enCurso = useRef(false);

  useEffect(() => {
    const escucha = (e) => {
      const { enviado, recibido } = bytesDeEvento(e.detail);
      buffer.current.enviado += enviado;
      buffer.current.recibido += recibido;
    };
    window.addEventListener("jumpernet-api-medida", escucha);
    return () => window.removeEventListener("jumpernet-api-medida", escucha);
  }, []);

  const mide = useCallback(async () => {
    if (pausado || enCurso.current) return;
    enCurso.current = true;
    const t = Date.now();
    let ms = null;
    let cuenta = null;
    let ns = [];
    let vv = null;
    let fallo = "";
    try {
      const t0 = performance.now();
      cuenta = await me();
      ms = Math.round(performance.now() - t0);
    } catch (e) {
      fallo = e.message || "sin conexión con la API";
    }
    try {
      [ns, vv] = await Promise.all([nodos(), nodosVivos().catch(() => null)]);
      if (!Array.isArray(ns)) ns = [];
    } catch {
      /* los nodos pueden fallar aunque /me responda */
    }
    const enviado = buffer.current.enviado;
    const recibido = buffer.current.recibido;
    buffer.current = { enviado: 0, recibido: 0 };
    const ruta = (cuenta?.circuito || []).map((nombre) => {
      const nodo = ns.find((n) => n.nombre === nombre);
      return { nombre, ms: Number.isFinite(nodo?.ms) ? nodo.ms : null };
    });
    setLista(ns);
    setVivos(vv);
    setCircuito(cuenta?.circuito || []);
    setActivoRed(!!cuenta?.activo);
    setError(fallo);
    setUltima(t);
    setMuestras((m) => [...m.slice(-(max - 1)), {
      t, ms, enviado, recibido,
      activo: !!cuenta?.activo,
      fallo: fallo || null,
      saltos: ruta,
    }]);
    enCurso.current = false;
  }, [pausado, max]);

  useEffect(() => {
    if (!activo) return undefined;
    mide();
    const id = setInterval(mide, intervalo);
    return () => clearInterval(id);
  }, [activo, intervalo, mide]);

  return {
    muestras, lista, vivos, circuito, activo: activoRed,
    error, ultima, pausado, setPausado, mide,
  };
}

/* Serie de demostración: función pura y determinista para que las capturas y
   las pruebas no cambien en cada render. Marcada como demo en la interfaz. */
export function demoTelemetria(puntos = 48, minutos = 5, ahora = Date.now()) {
  const paso = (minutos * 60000) / Math.max(1, puntos - 1);
  return Array.from({ length: puntos }, (_, i) => {
    const onda = Math.sin(i / 4.2) * 9 + Math.cos(i / 2.3) * 4;
    const pico = i === 31 ? 26 : 0;
    const ms = Math.max(18, Math.round(54 + onda + pico + (i % 5) * 2));
    const enviado = Math.round(860 + Math.sin(i / 5) * 260 + (i % 4) * 84);
    const recibido = Math.round(2400 + Math.cos(i / 3.1) * 760 + (i % 3) * 190);
    return {
      t: ahora - (puntos - 1 - i) * paso,
      ms,
      enviado,
      recibido,
      activo: true,
      demo: true,
      saltos: [
        { nombre: "entrada-demo", ms: Math.round(ms * .42) },
        { nombre: "rele-centro-demo", ms: Math.round(ms * .66) },
        { nombre: "salida-demo", ms: Math.round(ms * .88) },
      ],
    };
  });
}

export const DEMO_NODOS = [
  { nombre: "entrada-demo", estado: "vivo", tipo: "infra", ms: 20 },
  { nombre: "rele-centro-demo", estado: "vivo", tipo: "infra", ms: 32 },
  { nombre: "salida-demo", estado: "vivo", tipo: "infra", ms: 42 },
  { nombre: "nodo-espejo-demo", estado: "vivo", tipo: "infra", ms: 44 },
  { nombre: "nodo-reserva-demo", estado: "caido", tipo: "infra", ms: null },
];

export function formatoBytes(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v < 1024) return `${Math.round(v)} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(v < 10240 ? 1 : 0)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}
