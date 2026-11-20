/* Logo de JumperNET: una «J» dibujada como circuito.
   Tres relés en el trazo, una salida con punta y un paquete que recorre la
   ruta. SVG propio para que se vea nítido y se pueda animar sin imágenes. */

export default function Logo({ tam = 38, className = "" }) {
  const radio = Math.max(8, Math.round(tam * 0.32));
  const ruta = "M30.5 9.5v16.2c0 6.2-4.4 9.8-9.9 9.8-4.7 0-8.2-2.5-9.9-6.6";
  return (
    <span
      className={`logo-jn ${className}`}
      style={{ width: tam, height: tam, borderRadius: radio }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 44" fill="none" focusable="false">
        <path className="logo-jn-ruta logo-jn-salto" pathLength="100" d={ruta} />
        <path className="logo-jn-haz" pathLength="100" d={ruta} />
        <path className="logo-jn-punta" d="M10.5 29.6 5.9 31.5M10.5 29.6l-1.2 4.6" />
        <circle className="logo-jn-nodo" cx="30.5" cy="9.5" r="2.5" />
        <circle className="logo-jn-nodo medio" cx="30.5" cy="21.6" r="1.8" />
        <circle className="logo-jn-nodo medio" cx="20.6" cy="35.5" r="2.2" />
        <circle className="logo-jn-nodo fin" cx="10.7" cy="28.9" r="2.7" />
        <circle className="logo-jn-chispa" cx="36.4" cy="17.4" r="1.3" />
      </svg>
    </span>
  );
}
