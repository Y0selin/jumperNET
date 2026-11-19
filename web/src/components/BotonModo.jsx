import { useEffect, useState } from "react";
import { aplicaModo, cargaModo, guardaModo } from "../lib/modo.js";

/* Conmutador de interfaz: claro (por defecto) u oscuro.
   Aplica la paleta en <html> al momento y la recuerda. */
export default function BotonModo({ compacto = false }) {
  const [modo, setModo] = useState(cargaModo);

  useEffect(() => {
    aplicaModo(modo);
    guardaModo(modo);
  }, [modo]);

  const claro = modo === "claro";
  const etiqueta = claro ? "Cambiar a interfaz oscura" : "Cambiar a interfaz clara";

  return (
    <button
      type="button"
      className={`btn-modo ${claro ? "es-claro" : "es-oscuro"} ${compacto ? "compacto" : ""}`}
      onClick={() => setModo(claro ? "oscuro" : "claro")}
      aria-label={etiqueta}
      title={etiqueta}
    >
      <span className="btn-modo-ico" aria-hidden>{claro ? "☀" : "☾"}</span>
      <span className="btn-modo-txt">{claro ? "claro" : "oscuro"}</span>
    </button>
  );
}
