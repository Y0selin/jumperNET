/* Logo de JumperNET: tres relés y un salto.
   SVG propio (sin imágenes) para que se vea nítido en cualquier tamaño y
   se pueda animar: al pasar el ratón, la ruta late y el trazo brilla. */

export default function Logo({ tam = 38, className = "" }) {
  const radio = Math.max(8, Math.round(tam * 0.32));
  return (
    <span
      className={`logo-jn ${className}`}
      style={{ width: tam, height: tam, borderRadius: radio }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 44" fill="none" focusable="false">
        <path className="logo-jn-salto" d="M9 31.5 17.5 22l8 5.5L35 12.5" />
        <path className="logo-jn-punta" d="M27.5 11.5 36.5 11l-1.5 9" />
        <circle className="logo-jn-nodo" cx="9" cy="31.5" r="3.1" />
        <circle className="logo-jn-nodo medio" cx="17.5" cy="22" r="2.5" />
        <circle className="logo-jn-nodo medio" cx="25.5" cy="27.5" r="2.2" />
        <circle className="logo-jn-nodo fin" cx="35" cy="12.5" r="3.1" />
      </svg>
    </span>
  );
}
