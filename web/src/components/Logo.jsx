/* Logo de JumperNET: una «J» trazada como un circuito.
   Tres nodos —oro, crema y coral— marcan los tres saltos y la salida.
   Sin órbitas ni paquetes: se lee bien incluso a 34 px. */

export default function Logo({ tam = 38, className = "" }) {
  const radio = Math.max(8, Math.round(tam * 0.3));
  const ruta = "M30.5 9.5v16.2c0 6.2-4.4 9.8-9.9 9.8-4.7 0-8.2-2.5-9.9-6.6";
  return (
    <span
      className={`logo-jn ${className}`}
      style={{ width: tam, height: tam, borderRadius: radio }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 44" fill="none" focusable="false">
        <path className="logo-jn-ruta" pathLength="100" d={ruta} />
        <path className="logo-jn-salida" d="M10.7 29.5 6 31.5M10.7 29.5l-1 4.4" />
        <circle className="logo-jn-nodo a" cx="30.5" cy="9.5" r="2.7" />
        <circle className="logo-jn-nodo b" cx="30.5" cy="24" r="2.1" />
        <circle className="logo-jn-nodo c" cx="10.7" cy="28.9" r="2.4" />
      </svg>
    </span>
  );
}
