import { useEffect, useState } from "react";
import { datosHoy } from "../lib/fecha.js";

/* El «hoy» de la web: día de la semana, fecha y reloj.
   Sustituye la cuenta atrás de diciembre por lo que de verdad importa al
   abrir la página: qué día es, qué hora es y en qué semana vamos. */

export function useReloj(cada = 1000) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), cada);
    const alVolver = () => { if (!document.hidden) setAhora(new Date()); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cada]);
  return ahora;
}

/* píldora del hero: «hoy es jueves · 20 de noviembre · semana 47 · 11:52» */
export function PildoraHoy() {
  const h = datosHoy(useReloj(15000));
  return (
    <div className="hn-hoy" role="note" aria-label={`Hoy es ${h.completa}`}>
      <span className="hn-hoy-ico" aria-hidden>◷</span>
      <span className="hn-hoy-txt">
        <b>Hoy es {h.diaMayus}</b>
        <span>
          {h.numero} de {h.mes} · semana {h.semana}
        </span>
      </span>
      <span className="hn-hoy-hora mono" aria-hidden>{h.hora}</span>
    </div>
  );
}

/* sello de la postal: un calendario inclinado con el día de hoy */
export function SelloHoy() {
  const h = datosHoy(useReloj(30000));
  return (
    <span className="hn-sello" aria-label={`Calendario: ${h.completa}`}>
      <small>{h.diaCorto} · S{h.semana}</small>
      <b>{h.numero}</b>
      <small>{h.mesCorto} {h.anio}</small>
    </span>
  );
}

/* banda de la portada: el día por delante y la red en vivo al lado */
export function BandaHoy({ vivos, sinApi, edicion }) {
  const h = datosHoy(useReloj(1000));
  return (
    <div className="pp-hoy-fecha">
      <span className="migas">hoy en la red</span>
      <div className="pp-hoy-dia">{h.diaMayus}</div>
      <div className="pp-hoy-linea">
        <b>{h.numero}</b> de {h.mes} de {h.anio}
      </div>
      <div className="pp-hoy-hora mono">{h.horaSeg}</div>
      <span className="pp-hoy-sem mono">semana {h.semana} · {edicion}</span>
      <div className="pp-hoy-datos">
        <div><span className="mono">nodos vivos</span><b>{vivos?.total ?? "—"}</b></div>
        <div><span className="mono">infra / equipos</span><b>{vivos ? `${vivos.infra} / ${vivos.equipos}` : "—"}</b></div>
        <div><span className="mono">saltos por circuito</span><b>3</b></div>
        <div><span className="mono">ventana de salida</span><b>80 / 443</b></div>
      </div>
      <span className="pp-hoy-nota nota">
        {sinApi ? "La API no responde ahora mismo: estas cifras se actualizan solas en cuanto vuelva." : "Cifras medidas contra la API cada 15 s. El reloj es el de tu equipo."}
      </span>
    </div>
  );
}

/* tarjeta del panel: día completo, reloj con segundos y tiempo en la red */
export function TarjetaHoy({ activo, desde }) {
  const reloj = useReloj(1000);
  const h = datosHoy(reloj);
  const [encendida, setEncendida] = useState(null);

  useEffect(() => {
    if (!activo || !desde) { setEncendida(null); return; }
    const calcula = () => {
      const s = Math.max(0, Math.floor(Date.now() / 1000 - desde));
      setEncendida(`${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);
    };
    calcula();
    const id = setInterval(calcula, 1000);
    return () => clearInterval(id);
  }, [activo, desde]);

  return (
    <div className="tarjeta pn-hoy">
      <div className="pn-hoy-cab">
        <span className="pn-kicker">{h.diaMayus}</span>
        <span className={`chip mono ${activo ? "vivo" : "muerto"}`}>{activo ? "en línea" : "apagada"}</span>
      </div>
      <div className="pn-hoy-fecha">
        <b>{h.numero}</b>
        <span>
          {h.mes} {h.anio}
          <small>semana {h.semana}</small>
        </span>
      </div>
      <div className="pn-hoy-reloj mono" aria-live="off">{h.horaSeg}</div>
      <p className="nota pn-hoy-pie">
        {activo && encendida
          ? <>Tu circuito lleva <b>{encendida}</b> encendido.</>
          : "La red está en espera; el reloj sigue corriendo."}
      </p>
    </div>
  );
}
