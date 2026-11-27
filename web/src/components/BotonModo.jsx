import { useEffect, useState } from "react";
import { aplicaModo, cargaModo, guardaModo } from "../lib/modo.js";
import { lanzarAviso } from "../lib/avisos.js";
import { aplicaTema, cargaTema } from "../lib/temas.js";

/* Conmutador de interfaz: oscuro (por defecto) o claro.
   Aplica la paleta en <html> al momento y la recuerda. */
export default function BotonModo({ compacto = false }) {
  const [modo, setModo] = useState(cargaModo);

  useEffect(() => {
    aplicaModo(modo);
    aplicaTema(cargaTema());
    guardaModo(modo);
  }, [modo]);

  const claro = modo === "claro";
  const etiqueta = claro ? "Cambiar a interfaz oscura" : "Cambiar a interfaz clara";

  function cambia() {
    const nuevo = claro ? "oscuro" : "claro";
    aplicaModo(nuevo);
    aplicaTema(cargaTema());
    guardaModo(nuevo);
    setModo(nuevo);
    lanzarAviso(`Interfaz ${nuevo === "claro" ? "clara" : "oscura"} activada.`, "info");
  }

  /* el buscador global también puede cambiar el modo */
  useEffect(() => {
    const alterna = () => cambia();
    window.addEventListener("jumpernet-cambiar-modo", alterna);
    return () => window.removeEventListener("jumpernet-cambiar-modo", alterna);
  });

  return (
    <button
      type="button"
      className={`btn-modo ${claro ? "es-claro" : "es-oscuro"} ${compacto ? "compacto" : ""}`}
      onClick={cambia}
      aria-label={etiqueta}
      title={etiqueta}
    >
      <span className="btn-modo-ico" aria-hidden>{claro ? "☀" : "☾"}</span>
      <span className="btn-modo-txt">{claro ? "claro" : "oscuro"}</span>
    </button>
  );
}
