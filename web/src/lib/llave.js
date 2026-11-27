/* Segunda cerradura de la sala de mando.
 *
 * El rol lo decide el servidor: sin `rol: admin|moderador` en /me no se llega
 * aquí. Esta llave añade una barrera local para el navegador compartido o para
 * quien copie la URL #/panel/admin a mano: hay que saber el nombre y la clave.
 *
 * La llave viaja en el paquete de la web, así que esto no es criptografía:
 * frena a un curioso, no a un atacante. La API sigue siendo la que manda en
 * cada operación y la que rechaza lo que ese rol no pueda hacer.
 */

const CLAVE_SESION = "jumpernet-sala-sesion-v1";
const CLAVE_INTENTOS = "jumpernet-sala-intentos-v1";
const DURACION = 8 * 60 * 60 * 1000; // 8 h o hasta cerrar la pestaña
const ESPERA = 60 * 1000;

export const MAX_INTENTOS = 5;

/* Llaves válidas para cualquiera de los nombres de abajo. Se comparan sin
   mayúsculas, tildes ni espacios. */
export const CLAVES = ["jumpernet15", "jumpernet"];

/* Quién tiene llave. Cambia aquí los nombres: el primero es el que aparece
   como ejemplo en la puerta. */
export const ACCESOS = [
  { usuario: "fernando", nombre: "Fernando", cargo: "Fundador" },
  { usuario: "alex", nombre: "Alex", cargo: "Fundador" },
  { usuario: "yoselin", nombre: "Yoselin", cargo: "Fundador" },
  { usuario: "juno", nombre: "Juno", cargo: "Fundador" },
];

function normaliza(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function leeIntentos() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_INTENTOS) || "null");
    if (d && typeof d === "object") {
      return { fallos: Number(d.fallos) || 0, hasta: Number(d.hasta) || 0 };
    }
  } catch { /* almacenamiento bloqueado */ }
  return { fallos: 0, hasta: 0 };
}

function guardaIntentos(d) {
  try { localStorage.setItem(CLAVE_INTENTOS, JSON.stringify(d)); } catch { /* sin persistencia */ }
}

function limpiaIntentos() {
  try { localStorage.removeItem(CLAVE_INTENTOS); } catch { /* sin persistencia */ }
}

/** Milisegundos que faltan para poder volver a probar (0 si se puede ya). */
export function esperaBloqueo() {
  return Math.max(0, leeIntentos().hasta - Date.now());
}

export function leeSesion() {
  try {
    const d = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null");
    if (d && d.usuario && Date.now() - (d.ts || 0) < DURACION) return d;
    if (d) sessionStorage.removeItem(CLAVE_SESION);
  } catch { /* sin sesión de pestaña */ }
  return null;
}

export function abreSesion(acceso) {
  const sesion = { usuario: acceso.usuario, nombre: acceso.nombre, cargo: acceso.cargo, ts: Date.now() };
  try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion)); } catch { /* sin persistencia */ }
  limpiaIntentos();
  return sesion;
}

export function cierraSesion() {
  try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* sin persistencia */ }
}

/**
 * Comprueba nombre + llave y anota el fallo si no abre.
 * Devuelve {ok:true, acceso} o {ok:false, motivo:"no"|"espera", espera}.
 */
export function pruebaLlave(nombre, llave) {
  const espera = esperaBloqueo();
  if (espera > 0) return { ok: false, motivo: "espera", espera };

  const n = normaliza(nombre);
  const k = normaliza(llave);
  const acceso = ACCESOS.find(
    (a) => n && (normaliza(a.usuario) === n || normaliza(a.nombre) === n),
  );

  if (!acceso || !k || !CLAVES.some((c) => normaliza(c) === k)) {
    const fallos = leeIntentos().fallos + 1;
    const bloqueado = fallos >= MAX_INTENTOS;
    guardaIntentos({
      fallos: bloqueado ? 0 : fallos,
      hasta: bloqueado ? Date.now() + ESPERA : 0,
    });
    return {
      ok: false,
      motivo: bloqueado ? "espera" : "no",
      espera: bloqueado ? ESPERA : 0,
      restantes: Math.max(0, MAX_INTENTOS - fallos),
    };
  }

  limpiaIntentos();
  return { ok: true, acceso };
}
