/* Promoción de bienvenida: un único código, el mismo que valida el carrito
   (BIENVENIDA10). La marca de «ya visto» evita repetir la alerta durante una
   semana en el mismo navegador. */

export const PROMO = {
  codigo: "BIENVENIDA10",
  descuento: 10,
  plan: "Pro",
};

const CLAVE = "jumpernet-oferta-v1";
const SEMANA = 7 * 24 * 60 * 60 * 1000;

export function ofertaVista() {
  try {
    const t = Number(localStorage.getItem(CLAVE) || 0);
    return t > 0 && Date.now() - t < SEMANA;
  } catch {
    return false;
  }
}

export function marcaOfertaVista() {
  try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* navegación privada */ }
}

/* Copia con respaldo para navegadores sin Clipboard API. */
export async function copiarTexto(texto) {
  const valor = String(texto || "");
  if (!valor) return false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(valor);
      return true;
    } catch { /* probamos el respaldo */ }
  }
  try {
    const area = document.createElement("textarea");
    area.value = valor;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
