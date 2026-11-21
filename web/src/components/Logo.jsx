/* Logo de JumperNET, edición 3.0.
   Una marca propia: tres nodos conectados que forman la J del salto,
   con la ruta saliendo hacia arriba y a la derecha. Escala desde 16 px. */
export default function Logo({ tam = 38, className = "" }) {
  return (
    <span
      className={`logo-jn ${className}`}
      style={{ width: tam, height: tam }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" fill="none" focusable="false">
        <defs>
          <linearGradient id="jn-mark" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#167D68" />
            <stop offset="1" stopColor="#FF6347" />
          </linearGradient>
        </defs>
        {/* ruta: J curva con tres saltos y salida */}
        <path
          d="M14 34 C 14 40, 20 42, 26 38 L 30 34 L 30 16 L 38 10"
          stroke="url(#jn-mark)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* flecha de salida */}
        <path
          d="M33 10 L 38 10 L 38 15"
          stroke="#FF6347"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* tres nodos del circuito */}
        <circle cx="14" cy="34" r="3.6" fill="#167D68" />
        <circle cx="30" cy="34" r="3.6" fill="#D6A84B" />
        <circle cx="30" cy="16" r="3.6" fill="#FF6347" />
        <circle cx="38" cy="10" r="2.6" fill="#14283E" />
      </svg>
    </span>
  );
}