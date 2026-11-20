/* Logo de JumperNET, edición 2.1.
   Un hexágono (nodo de red) con la ruta que salta hacia arriba y a la
   derecha: tres escalones —oro, crema y coral— y la flecha de salida.
   Se lee a 18 px y se mueve al pasar el ratón: la flecha despega. */

export default function Logo({ tam = 38, className = "" }) {
  const radio = Math.max(7, Math.round(tam * 0.26));
  return (
    <span
      className={`logo-jn ${className}`}
      style={{ width: tam, height: tam, borderRadius: radio }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 44" fill="none" focusable="false">
        <path className="logo-jn-ruta" pathLength="100" d="M9.6 33.4 18.8 24l6.2 4.2L35.6 15.6" />
        <path className="logo-jn-salida" d="M28.7 15.1 35.6 15.6l-.5 6.9" />
        <circle className="logo-jn-nodo a" cx="9.6" cy="33.4" r="2.7" />
        <circle className="logo-jn-nodo b" cx="18.8" cy="24" r="2" />
        <circle className="logo-jn-nodo c" cx="25" cy="28.2" r="2" />
      </svg>
    </span>
  );
}
