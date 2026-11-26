import { useState } from "react";
import { planDe } from "../lib/planes.js";
import { hayPrefCircuitoGuardada, leePrefCircuito } from "../lib/panel.jsx";
import { recolectaInforme, descargarInformePDF, leeUltimoDiagnostico, modoLegible } from "../lib/informe.js";

function fechaCorta(valor) {
  try {
    return new Date(valor).toLocaleString("es-ES", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

export default function InformesPanel({ yo, aviso, navega }) {
  const [datos, setDatos] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const cuenta = datos?.cuenta || yo;
  const planBase = planDe(cuenta);
  const plan = datos
    ? { ...planBase, nombre: datos.cuenta.planNombre, demo: datos.cuenta.demo }
    : planBase;
  const activo = datos ? datos.red.activa : !!yo?.activo;
  const guardada = datos ? datos.config.guardada : hayPrefCircuitoGuardada();
  const pref = datos?.config || leePrefCircuito(yo);
  const diag = datos?.resultados?.diagnostico || leeUltimoDiagnostico();
  const max = plan.saltosMax || cuenta?.saltos_max || 3;
  const circuito = datos?.cuenta?.circuito || yo?.circuito || [];
  const estado = activo
    ? { txt: "RED ACTIVA", clase: "vivo", titulo: "Red configurada y activa" }
    : guardada
      ? { txt: "RED OFF · CONFIGURADA", clase: "aviso", titulo: "Red apagada, configuración guardada" }
      : { txt: "SIN CONFIGURAR", clase: "muerto", titulo: "Red no configurada" };

  async function generar() {
    setGenerando(true);
    setError("");
    try {
      const nuevo = await recolectaInforme(yo);
      await descargarInformePDF(nuevo);
      setDatos(nuevo);
      aviso?.("informe PDF descargado", "ok");
    } catch (e) {
      const mensaje = e.message || "no se pudo generar el PDF";
      setError(mensaje);
      aviso?.(`no se pudo generar el informe: ${mensaje}`, "error");
    } finally {
      setGenerando(false);
    }
  }

  async function repetir() {
    if (!datos) return;
    try {
      await descargarInformePDF(datos);
      aviso?.("informe PDF descargado de nuevo", "ok");
    } catch (e) {
      const mensaje = e.message || "no se pudo descargar el PDF";
      setError(mensaje);
      aviso?.(`no se pudo descargar el informe: ${mensaje}`, "error");
    }
  }

  return (
    <div className="pu-pagina pu-informes">
      <header className="pu-cab">
        <div>
          <span className="pu-kicker">panel / informes</span>
          <h1>Informes de tu red</h1>
          <p>
            Descarga un PDF con el estado real, la configuración y los resultados medidos.
            Si la red no está configurada o está apagada, el informe lo dice y no rellena los huecos.
          </p>
        </div>
        <span className={`chip ${estado.clase} mono`}>{estado.txt}</span>
      </header>

      <div className="pu-dos">
        <section className="tarjeta pu-informe-acciones">
          <span className="pu-kicker">documento</span>
          <h2 className="seccion">Informe PDF</h2>
          <p className="pu-texto">
            El PDF se genera en tu navegador con los datos de tu sesión, la configuración guardada
            en el panel y el último diagnóstico. No se envía ningún archivo al servidor.
          </p>
          <div className="pu-informe-botonera">
            <button className="btn primario" type="button" onClick={generar} disabled={generando}>
              {generando ? <><span className="spin" /> Generando…</> : "⬇ Generar y descargar PDF"}
            </button>
            {datos && (
              <button className="btn" type="button" onClick={repetir}>
                Descargar otra vez
              </button>
            )}
          </div>
          {error && <p className="pu-error" role="alert">{error}</p>}
          {datos && (
            <p className="pu-nota mono">
              último PDF generado · {fechaCorta(datos.generado)} · {datos.errorCuenta ? "con aviso de actualización" : "datos actualizados"}
            </p>
          )}
        </section>

        <section className="tarjeta">
          <span className="pu-kicker">contenido</span>
          <h2 className="seccion">Qué incluye</h2>
          <ul className="pu-informe-lista">
            <li><b>Estado real:</b> activa, apagada o sin configurar, con su circuito e IPs si existen.</li>
            <li><b>Configuración:</b> saltos, modo y SOCKS5 de la próxima conexión.</li>
            <li><b>Resultados:</b> API, sesión, nodos vivos, salida y último diagnóstico.</li>
            <li><b>Sin inventar:</b> lo que no responde se marca como «sin dato» o «no ejecutado».</li>
          </ul>
          <p className="pu-nota">
            El informe no incluye contraseñas, destinos visitados ni historial de navegación.
          </p>
        </section>
      </div>

      {!activo && (
        <div className="pu-vacio pu-informe-vacio">
          <b>{estado.titulo}.</b>
          <p>
            {guardada
              ? `No hay un circuito activo, pero sí una configuración guardada: ${pref.saltos} saltos · ${modoLegible(pref.modo)}. El PDF la incluirá como próxima conexión.`
              : "No hay un circuito activo ni preferencias guardadas. Al conectar se usarán 3 saltos y todos los nodos; el PDF dejará constancia de este estado."}
          </p>
          <button className="btn" type="button" onClick={() => navega?.("red")}>Ir al panel de red</button>
        </div>
      )}

      <section className="tarjeta">
        <div className="pu-informe-cab">
          <div>
            <span className="pu-kicker">vista actual</span>
            <h2 className="seccion">Lo que se incluiría ahora</h2>
          </div>
          {datos && <span className="pu-informe-fecha mono">actualizado {fechaCorta(datos.generado)}</span>}
        </div>
        <div className="pu-datos">
          <span><small>estado</small><b>{estado.titulo}</b><i>{datos?.red?.estado || (guardada ? "configuración guardada, sin circuito" : "sin configuración guardada")}</i></span>
          <span><small>plan</small><b>{plan.nombre}{plan.demo ? " · demo" : ""}</b><i>máximo {max} saltos</i></span>
          <span><small>circuito</small><b className="mono">{activo ? `${circuito.length} saltos` : `próxima: ${pref.saltos}`}</b><i>{activo ? (circuito.join(" → ") || "activo") : "red apagada"}</i></span>
          <span><small>modo</small><b>{modoLegible(activo ? (cuenta?.modo || pref.modo) : pref.modo)}</b><i>{activo ? "en uso" : "próxima conexión"}</i></span>
          <span><small>IP de salida</small><b className="mono">{activo ? (cuenta?.ip_salida || "midiendo…") : "—"}</b><i>{activo ? "la que ve internet" : "sin circuito"}</i></span>
          <span><small>último diagnóstico</small><b>{diag?.fecha ? fechaCorta(diag.fecha) : "sin ejecutar"}</b><i>{diag?.filas?.length ? `${diag.filas.length} comprobaciones` : "se puede incluir cuando lo ejecutes"}</i></span>
        </div>
        <p className="pu-nota">
          La vista se calcula con los datos de tu sesión y la configuración local. El PDF hace una
          consulta fresca a la API al generarse.
        </p>
      </section>
    </div>
  );
}
