import { useEffect, useState } from "react";
import { PROMO } from "../lib/planes.js";
import { agregaPro, promoUsada, useCarrito } from "../lib/carrito.js";

const CLAVE_AVISO = "jumpernet-promo-aviso-v1";

/* Aviso discreto de bienvenida. Aparece una vez por sesión, se puede cerrar
   y no bloquea la navegación. Si el carrito ya tiene Pro, no se repite. */
export default function PromoAviso() {
  const carrito = useCarrito();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cerrada = false;
    try { cerrada = sessionStorage.getItem(CLAVE_AVISO) === "1"; } catch { /* sin sesión */ }
    if (cerrada || promoUsada() || carrito.cantidad > 0) return;
    /* en tarifas y contratación la promoción ya se ve en contexto:
       no hace falta una tarjeta flotante encima del contenido */
    const enContexto = () => /^#\/(tarifas|checkout)/.test(location.hash);
    if (enContexto()) return;
    const t = setTimeout(() => setVisible(true), 1400);
    const auto = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(CLAVE_AVISO, "1"); } catch { /* sin persistencia */ }
    }, 15000);
    const alCambiar = () => { if (enContexto()) setVisible(false); };
    window.addEventListener("hashchange", alCambiar);
    return () => { clearTimeout(t); clearTimeout(auto); window.removeEventListener("hashchange", alCambiar); };
  }, []);

  useEffect(() => {
    if (carrito.cantidad > 0) setVisible(false);
  }, [carrito.cantidad]);

  function cerrar() {
    setVisible(false);
    try { sessionStorage.setItem(CLAVE_AVISO, "1"); } catch { /* sin persistencia */ }
  }

  function aprovechar() {
    agregaPro();
    cerrar();
    window.dispatchEvent(new CustomEvent("jumpernet-carrito-abrir"));
  }

  return (
    <aside className={`jn-aviso ${visible ? "visible" : ""}`} role="status" aria-live="polite">
      <span className="jn-aviso-ico" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7C9 7 7 5.7 7 4a2.5 2.5 0 0 1 5 0c0 1.3 0 3 0 3Zm0 0c3 0 5-1.3 5-3a2.5 2.5 0 0 0-5 0" />
        </svg>
      </span>
      <div className="jn-aviso-txt">
        <b>Tu primera conexión tiene premio</b>
        <span>10 % en tu primera suscripción Pro con <code>{PROMO.codigo}</code>.</span>
        <button type="button" onClick={aprovechar}>Aprovechar el descuento</button>
      </div>
      <span className="jn-aviso-linea" aria-hidden />
      <button type="button" className="jn-aviso-cerrar" onClick={cerrar} aria-label="Cerrar el aviso de bienvenida">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </aside>
  );
}
