/* Latido de la red: tarjeta compacta que acompaña al sobre cifrado en
   pantallas anchas. Un radar vivo, tres cifras y una salida al panel.
   No inventa datos: usa los nodos que devuelve la API o deja un guion. */

export default function SenalRed({ vivos, sinApi }) {
  const nodos = vivos?.total;
  const equipos = vivos?.equipos;

  return (
    <aside className="hn-senal" aria-label="El estado de la red, en vivo">
      <div className="hn-senal-cab">
        <span className="hn-senal-migas mono">// la red, ahora</span>
        <span className="hn-senal-vivo mono"><i aria-hidden /> en vivo</span>
      </div>

      <div className="hn-senal-radar" aria-hidden="true">
        <span className="hn-senal-anillo r1" />
        <span className="hn-senal-anillo r2" />
        <span className="hn-senal-anillo r3" />
        <span className="hn-senal-barrido" />
        <i className="hn-senal-nodo a" />
        <i className="hn-senal-nodo b" />
        <i className="hn-senal-nodo c" />
        <div className="hn-senal-centro">
          <b>{nodos != null ? nodos : "—"}</b>
          <span>nodos vivos</span>
        </div>
      </div>

      <dl className="hn-senal-datos">
        <div><dt className="mono">saltos</dt><dd>3</dd></div>
        <div><dt className="mono">salida</dt><dd>80/443</dd></div>
        <div><dt className="mono">registros</dt><dd>0</dd></div>
      </dl>

      <p className="hn-senal-pie">
        {sinApi
          ? "La API no responde ahora; las cifras vuelven solas."
          : `${equipos != null ? `${equipos} equipos` : "tu equipo"} y los relés de la red. Tres saltos por petición, cero histórico.`}
      </p>

      <a className="hn-senal-cta" href="#/panel">
        Ver el panel <span aria-hidden="true">→</span>
      </a>
    </aside>
  );
}
