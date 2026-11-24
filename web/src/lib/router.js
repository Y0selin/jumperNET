import { useEffect, useState } from "react";

/* Router mínimo por hash.
   Se usa hash (#/proyecto) a propósito: GitHub Pages sirve el sitio en una
   subcarpeta y no reescribe rutas, así que con rutas «de verdad» (/proyecto)
   un refresco daría 404. Con hash, cada página tiene su URL, su historial y
   su botón atrás sin tocar el servidor. */

export function rutaActual() {
  const h = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
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

export function useRuta() {
  const [ruta, setRuta] = useState(rutaActual);

  useEffect(() => {
    if (!location.hash) history.replaceState(null, "", "#/");
    /* cada página empieza arriba: con scroll suave global, un scrollTo(0,0)
       normal se queda a medias al cambiar de ruta desde el pie */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const alCambiar = () => {
      /* un ancla interna (#esquema) no es una ruta: deja que el navegador
         haga el salto y no reinicies la página ni el scroll. */
      if (location.hash && !location.hash.startsWith("#/")) return;
      setRuta(rutaActual());
      const raiz = document.documentElement;
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
