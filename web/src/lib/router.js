import { useEffect, useState } from "react";

/* Router mínimo por hash.
   Se usa hash (#/proyecto) a propósito: GitHub Pages sirve el sitio en una
   subcarpeta y no reescribe rutas, así que con rutas «de verdad» (/proyecto)
   un refresco daría 404. Con hash, cada página tiene su URL, su historial y
   su botón atrás sin tocar el servidor. */

/* Rutas cortas que la gente escribe a mano en la barra de direcciones. */
const ALIAS = { "/admin": "/panel/admin" };

/* Páginas conocidas: sirven para reconocer una ruta «de verdad». */
const PAGINAS = new Set([
  "panel", "acceso", "usos", "recursos", "proyecto", "equipo", "funciona",
  "tarifas", "dudas", "descargas", "video", "lab", "checkout", "admin",
]);

/* Quien escribe /jumperNET/panel/admin o /admin en la barra tiene que llegar a
   la sala, no a la portada. Vite y GitHub Pages devuelven index.html en esas
   rutas, así que se reconoce la página por el último tramo del camino y se
   convierte al hash antes de pintar nada (sin parpadeo de portada). */
export function rutaDesdeCamino() {
  if (typeof location === "undefined" || location.hash) return null;
  const trozos = (location.pathname || "/").split("/").filter(Boolean);
  const i = trozos.findIndex((t) => PAGINAS.has(t.toLowerCase()));
  if (i < 0) return null;
  const ruta = "/" + trozos.slice(i).join("/");
  return ALIAS[ruta] || ruta;
}

export function rutaActual() {
  const h = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
  if (h.startsWith("/")) return ALIAS[h] || h;
  return rutaDesdeCamino() || "/";
}

/* parte «de página» de una ruta: /acceso/registro → /acceso */
export function baseRuta(ruta) {
  const p = (ruta || "/").split("?")[0];
  const trozos = p.split("/").filter(Boolean);
  return trozos.length ? "/" + trozos[0] : "/";
}

export function ir(ruta) {
  if (!ruta) return;
  const destino = "#" + (ruta.startsWith("/") ? ruta : "/" + ruta);
  if (location.hash === destino) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  location.hash = destino;
}

let relojCambio = 0;

export function useRuta() {
  const [ruta, setRuta] = useState(rutaActual);

  useEffect(() => {
    if (!location.hash) history.replaceState(null, "", "#" + rutaActual());
    /* cada página empieza arriba: con scroll suave global, un scrollTo(0,0)
       normal se queda a medias al cambiar de ruta desde el pie */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const alCambiar = () => {
      /* un ancla interna (#esquema) no es una ruta: deja que el navegador
         haga el salto y no reinicies la página ni el scroll. */
      if (location.hash && !location.hash.startsWith("#/")) return;
      setRuta(rutaActual());
      const raiz = document.documentElement;
      /* fundido corto al cambiar de página: el apagado global de animaciones
         (reduced-motion y data-anim="off") ya lo neutraliza si toca */
      raiz.classList.remove("jn-cambio-pagina");
      void raiz.offsetWidth;
      raiz.classList.add("jn-cambio-pagina");
      clearTimeout(relojCambio);
      relojCambio = setTimeout(() => raiz.classList.remove("jn-cambio-pagina"), 340);
      const antes = raiz.style.scrollBehavior;
      raiz.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      raiz.style.scrollBehavior = antes;
    };
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  return ruta;
}
