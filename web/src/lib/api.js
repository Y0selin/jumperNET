export const API_URL = "https://jumpernet.duckdns.org";

const CLAVE_USUARIO = "jumpernet-usuario-v1";
/* Respaldo en memoria: algunos navegadores privados bloquean localStorage.
   La sesión sigue funcionando en esa pestaña aunque no pueda persistir. */
let tokenMemoria = null;
let usuarioMemoria = null;

export function getToken() {
  try { return localStorage.getItem("token") ?? tokenMemoria; }
  catch { return tokenMemoria; }
}
export function setToken(t) {
  tokenMemoria = t || null;
  try {
    if (t) localStorage.setItem("token", t);
    else { localStorage.removeItem("token"); olvidaUsuario(); }
  } catch { if (!t) olvidaUsuario(); }
}

/* La ficha mínima de la cuenta se guarda junto al token. Así el número de
   usuario y el alias sobreviven a una recarga o a un /me lento, y el panel
   nunca se queda en blanco esperando a la API. */
export function getUsuarioGuardado() {
  try {
    const u = JSON.parse(localStorage.getItem(CLAVE_USUARIO) || "null");
    if (u && typeof u === "object" && u.id != null) return u;
  } catch { /* almacenamiento bloqueado */ }
  return usuarioMemoria;
}
export function guardaUsuario(u) {
  if (!u || u.id == null) return;
  const recorte = {
    id: u.id, email: u.email, alias: u.alias, plan: u.plan,
    activo: u.activo, circuito: u.circuito, saltos_max: u.saltos_max,
    saltos_plan: u.saltos_plan, precio_mes: u.precio_mes,
    solicitud_suscripcion: u.solicitud_suscripcion,
  };
  usuarioMemoria = recorte;
  try { localStorage.setItem(CLAVE_USUARIO, JSON.stringify(recorte)); }
  catch { /* almacenamiento bloqueado: se conserva en memoria */ }
}
export function olvidaUsuario() {
  usuarioMemoria = null;
  try { localStorage.removeItem(CLAVE_USUARIO); } catch { /* sin persistencia */ }
}
export function decodificaJwt(token) {
  try {
    const [h, p] = token.split(".");
    const b64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
    return { cab: JSON.parse(b64(h)), cuerpo: JSON.parse(b64(p)) };
  } catch { return null; }
}

export async function api(metodo, ruta, cuerpo, autorizado = true) {
  const cab = { "Content-Type": "application/json" };
  const token = getToken();
  if (autorizado && token) cab["Authorization"] = "Bearer " + token;
  const t0 = performance.now();
  let resp;
  try {
    resp = await fetch(API_URL + ruta, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  } catch (e) { throw new Error("sin conexión con la API"); }
  const ms = Math.round(performance.now() - t0);
  let datos = null;
  try { datos = await resp.json(); } catch { /* sin cuerpo */ }
  if (resp.status === 401 && autorizado && token) { setToken(null); window.location.reload(); }
  if (!resp.ok) {
    const err = new Error((datos && datos.detail) || `HTTP ${resp.status}`);
    err.estado = resp.status;
    throw err;
  }
  return { datos, ms, estado: resp.status };
}

export async function nodos() { return (await api("GET", "/nodos", null, false)).datos; }
export async function me() { return (await api("GET", "/me")).datos; }
export async function editarMe(prefs) { return (await api("PATCH", "/me", prefs)).datos; }
export async function conectar(saltos = null, modo = null) {
  const cuerpo = {};
  if (saltos) cuerpo.saltos = saltos;
  if (modo) cuerpo.modo = modo;          // "todos" | "externos"
  return (await api("POST", "/connect", cuerpo)).datos;
}
export async function rotar() { return (await api("POST", "/rotate", {})).datos; }
export async function desconectar_() { return (await api("POST", "/disconnect", {})).datos; }
export async function nodosVivos() { return (await api("GET", "/nodosvivos")).datos; }

/** Token de peer del usuario (lo usa su agente de salida en su equipo):
    {peer_token, nombre:"peer_u<N>", clave_saltos, broker} */
export async function peerToken() { return (await api("GET", "/peer_token")).datos; }

/* ── panel admin / moderador ── */
export async function adminUsuarios() { return (await api("GET", "/admin/usuarios")).datos; }
export async function adminEditar(id, cambios) { return (await api("PATCH", `/admin/usuarios/${id}`, cambios)).datos; }
export async function adminBorrar(id) { return (await api("DELETE", `/admin/usuarios/${id}`)).datos; }
export async function adminDashboard() { return (await api("GET", "/admin/dashboard")).datos; }
export async function adminBorrarNodo(nombre) { return (await api("DELETE", `/admin/nodos/${encodeURIComponent(nombre)}`)).datos; }
export async function registrar(email, pass) { return (await api("POST", "/register", { email, password: pass }, false)).datos; }
export async function login(email, pass) { return (await api("POST", "/login", { email, password: pass }, false)).datos; }
export async function borrar(me_) { return api("DELETE", "/me"); }

/** IP pública con la que sale el servidor (la que ve internet por el circuito) */
export async function salida() { return (await api("GET", "/salida")).datos; }

/** Latido del EQUIPO del usuario: su nodo personal entra y se mantiene vivo
    en «ver todos los nodos» mientras la sesión esté abierta. direccion (host:puerto
    de su servicio peer) hace su equipo SALTABLE por el circuito. */
export async function miNodo(direccion = null, conexiones = 0) {
  return (await api("POST", "/nodos/usuario", direccion ? { direccion, conexiones } : {})).datos;
}

/** Comprobación REAL del circuito: pide al destino que IP ve al salir por él */
export async function comprobar(password) { return (await api("POST", "/comprobar", { password })).datos; }

/** Precio Pro calculado por el backend. El frontend solo previsualiza. */
export async function precioPro(saltos = 3, promo = true) {
  return (await api("POST", "/precio-pro", { saltos, promo }, false)).datos;
}

/** Solicitud de cambio de saltos. No cobra ni cambia el plan: queda pendiente
    de que el equipo confirme el pago. */
export async function solicitarSuscripcion(saltos) {
  return (await api("POST", "/me/suscripcion", { saltos })).datos;
}

/** Geolocalización real hecha en el servidor (con caché); sin IP usa la tuya */
export async function geoApi(ip = null) {
  try { return (await api("GET", "/geo" + (ip ? `?ip=${encodeURIComponent(ip)}` : ""))).datos; }
  catch { return { ok: false, error: "sin respuesta de geolocalización" }; }
}
