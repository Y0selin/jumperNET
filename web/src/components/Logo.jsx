/* Logo de JumperNET, edición 3.1.
   Tres nodos y un salto, ahora con la paleta del plano técnico:
   tinta clara, lima, rosa y cian según el modo. */
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
            <stop offset="0" stopColor="var(--texto)" />
            <stop offset="1" stopColor="var(--acento-1)" />
          </linearGradient>
        </defs>
        <path
          d="M14 34 C 14 40, 20 42, 26 38 L 30 34 L 30 16 L 38 10"
          stroke="url(#jn-mark)"
          strokeWidth="3.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <path
          d="M33 10 L 38 10 L 38 15"
          stroke="var(--acento-1)"
          strokeWidth="3.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <circle cx="14" cy="34" r="3.6" fill="var(--texto)" />
        <circle cx="30" cy="34" r="3.6" fill="var(--acento-2)" />
        <circle cx="30" cy="16" r="3.6" fill="var(--acento-1)" />
        <circle cx="38" cy="10" r="2.6" fill="var(--acento-3)" />
      </svg>
    </span>
  );
}
