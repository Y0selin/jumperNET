import { useEffect, useRef, useState } from "react";
import { PROMO, copiarTexto, marcaOfertaVista, ofertaVista } from "../lib/promo.js";
import {
  CODIGO_BIENVENIDA, PCT_BIENVENIDA, aplicarCodigo, abreCarrito,
  promoUsada, resumenCarrito,
} from "../lib/carrito.js";
import { ir } from "../lib/router.js";

/* Bienvenida: aparece una sola vez cada semana, después de un rato en la
   portada. No interrumpe la intro ni la visita guiada; si hay otra capa
   abierta, espera a que se cierre. El código es el mismo que valida el
   carrito, y si ya hay un plan elegido el descuento se aplica solo. */

const ESPERA = 7000;
const REINTENTO = 8000;

export default function Oferta({ activa }) {
  const [abierta, setAbierta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [aplicado, setAplicado] = useState(false);
  const cerrarRef = useRef(null);
  const antesFoco = useRef(null);

  useEffect(() => {
    if (activa !== "/" || ofertaVista() || promoUsada()) return;

    let t = 0;
    let vivo = true;

    const programa = (espera = ESPERA) => {
      clearTimeout(t);
      t = window.setTimeout(() => {
        if (!vivo) return;
        if (document.visibilityState === "hidden") {
          programa(REINTENTO);
          return;
        }
        const otraCapa = document.querySelector(".jn-intro, .jn-visita-velo, .jn-tour, .video-modal, .jns-drawer.abierto");
        if (otraCapa) {
          programa(REINTENTO);
          return;
        }
        antesFoco.current = document.activeElement;
        setAbierta(true);
      }, espera);
    };

    programa();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [activa]);

  useEffect(() => {
    if (!abierta) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTec = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", alTec);
    const foco = window.setTimeout(() => cerrarRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", alTec);
      clearTimeout(foco);
      if (antesFoco.current?.focus) antesFoco.current.focus();
    };
  }, [abierta]);

  function cerrar() {
    if (!abierta) return;
    marcaOfertaVista();
    setAbierta(false);
  }

  async function copiar() {
    const ok = await copiarTexto(CODIGO_BIENVENIDA);
    if (ok) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    }
  }

  /* «Aprovechar» no compra nada: si ya hay un plan en el carrito aplica el
     descuento; si no, lleva a tarifas para elegirlo. */
  function aprovechar() {
    const r = resumenCarrito();
    if (r.item) {
      const res = aplicarCodigo(CODIGO_BIENVENIDA);
      if (res.ok) {
        setAplicado(true);
        window.setTimeout(() => {
          marcaOfertaVista();
          setAbierta(false);
          abreCarrito();
        }, 900);
        return;
      }
    }
    marcaOfertaVista();
    setAbierta(false);
    ir("/tarifas");
  }

  if (!abierta) return null;

  return (
    <div className="jn-oferta" role="presentation">
      <button type="button" className="jn-oferta-velo" aria-label="Cerrar la promoción" onClick={cerrar} />

      <section
        className="jn-oferta-caja"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jn-oferta-titulo"
        aria-describedby="jn-oferta-texto"
      >
        <button
          ref={cerrarRef}
          type="button"
          className="jn-oferta-cerrar"
          onClick={cerrar}
          aria-label="Cerrar la promoción"
        >
          ×
        </button>

        <div className="jn-oferta-arte" aria-hidden="true">
          <span className="jn-oferta-orbita o1" />
          <span className="jn-oferta-orbita o2" />
          <span className="jn-oferta-nodo n1" />
          <span className="jn-oferta-nodo n2" />
          <span className="jn-oferta-nodo n3" />
          <div className="jn-oferta-sello">
            <b>{PCT_BIENVENIDA}</b><i>%</i><small>bienvenida</small>
          </div>
          <span className="jn-oferta-arte-pie mono">primera suscripción · {CODIGO_BIENVENIDA}</span>
        </div>

        <div className="jn-oferta-texto">
          <span className="jn-oferta-etq mono">bienvenido a JumperNET</span>
          <h2 id="jn-oferta-titulo">
            Consigue un {PCT_BIENVENIDA} %<br />
            <em>en tu primera suscripción.</em>
          </h2>
          <p id="jn-oferta-texto">
            Empieza gratis o llévate Pro con un <b>{PCT_BIENVENIDA} % menos</b> la primera vez:
            hasta <b>7 saltos</b>, elección de circuito y refresco cada 10 horas.
          </p>

          <button type="button" className="jn-oferta-codigo" onClick={copiar}>
            <span className="mono">{CODIGO_BIENVENIDA}</span>
            <span>{copiado ? "copiado ✓" : "copiar código"}</span>
          </button>

          <div className="jn-oferta-acciones">
            <button type="button" className="btn primario grande" onClick={aprovechar}>
              {aplicado ? "✓ Descuento aplicado" : "Aprovechar el descuento"} <span aria-hidden>→</span>
            </button>
            <button type="button" className="jn-oferta-no" onClick={cerrar}>
              Ahora no
            </button>
          </div>

          <small className="jn-oferta-legal">
            Código {CODIGO_BIENVENIDA} · {PCT_BIENVENIDA} % en la primera suscripción de pago.
            Válido una sola vez por cuenta y no acumulable; no se aplica a planes gratuitos ni a
            acuerdos empresariales. {PROMO.plan} desde {PROMO.plan === "Pro" ? "5 €/mes" : ""}.
          </small>
        </div>
      </section>
    </div>
  );
}
