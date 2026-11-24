import { useEffect, useRef, useState } from "react";
import { DOCS_URL } from "../lib/enlaces.js";

/* Aviso de documentación.
   A los dos minutos de estar en la web aparece una tarjeta discreta que
   invita a leer la documentación. Se muestra una vez cada siete días y se
   puede cerrar sin dejar rastro. Para probarlo: dispatchEvent(new Event("jumpernet-aviso")). */

const CLAVE = "jumpernet-aviso-docs-v1";
const ESPERA = 120000;
const SEMANA = 7 * 24 * 60 * 60 * 1000;

function yaVisto() {
  try {
    const t = Number(localStorage.getItem(CLAVE) || 0);
    return t > 0 && Date.now() - t < SEMANA;
  } catch { return false; }
}

export default function AvisoDocs({ activa = "/" }) {
  const [visible, setVisible] = useState(false);
  const temporizador = useRef(0);

  useEffect(() => {
    if (yaVisto()) return;

    const abre = () => {
      const ruta = (location.hash || "").replace(/^#/, "");
      if (ruta.startsWith("/acceso") || ruta.startsWith("/panel")) return;
      setVisible(true);
    };

    const programa = () => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => {
        if (document.visibilityState === "hidden") {
          /* si la pestaña está en segundo plano, esperamos un poco más */
          temporizador.current = setTimeout(programa, 30000);
          return;
        }
        abre();
      }, ESPERA);
    };

    programa();
    window.addEventListener("jumpernet-aviso", abre);
    return () => {
      clearTimeout(temporizador.current);
      window.removeEventListener("jumpernet-aviso", abre);
    };
  }, []);

  /* no dejar el aviso encima del acceso ni del panel */
  useEffect(() => {
    if (activa === "/acceso" || activa === "/panel") setVisible(false);
  }, [activa]);

  function cierra() {
    setVisible(false);
    try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* privado */ }
  }

  if (!visible) return null;

  return (
    <aside className="pp-aviso" role="complementary" aria-label="Documentación de JumperNET">
      <button type="button" className="pp-aviso-cerrar" onClick={cierra} aria-label="Cerrar el aviso">×</button>
      <span className="pp-aviso-badge mono"><i aria-hidden="true" /> documentación</span>
      <h3>¿Quieres saber más de JumperNET?</h3>
      <p>
        Llevas un rato por aquí. En la documentación está la arquitectura, el cifrado
        JENC, la API y las pruebas de cada afirmación. Y si quieres probarlo, tu cuenta
        tarda menos de un minuto.
      </p>
      <div className="pp-aviso-acc">
        <a className="btn primario" href={DOCS_URL} target="_blank" rel="noreferrer" onClick={cierra}>
          Abrir la documentación <span aria-hidden="true">→</span>
        </a>
        <button type="button" className="pp-aviso-no" onClick={cierra}>Ahora no</button>
      </div>
      <div className="pp-aviso-cuenta">
        <span className="mono">o entra en la red</span>
        <a href="#/acceso/registro" onClick={cierra}>Crear cuenta</a>
        <i aria-hidden="true">·</i>
        <a href="#/acceso/login" onClick={cierra}>Iniciar sesión</a>
      </div>
    </aside>
  );
}
