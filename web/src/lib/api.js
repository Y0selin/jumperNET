export const API_URL = "https://jumpernet.duckdns.org";
const T = localStorage.getItem("token");

export function getToken() { return localStorage.getItem("token"); }
export function setToken(t) { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); }
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
  if (!resp.ok) throw new Error((datos && datos.detail) || `HTTP ${resp.status}`);
  return { datos, ms, estado: resp.status };
}

export async function nodos() { return (await api("GET", "/nodos", null, false)).datos; }
export async function me() { return (await api("GET", "/me")).datos; }
export async function conectar() { return (await api("POST", "/connect")).datos; }
export async function rotar() { return (await api("POST", "/rotate")).datos; }
export async function desconectar_() { return (await api("POST", "/disconnect")).datos; }
export async function registrar(email, pass) { return (await api("POST", "/register", { email, password: pass }, false)).datos; }
export async function login(email, pass) { return (await api("POST", "/login", { email, password: pass }, false)).datos; }
export async function borrar(me_) { return api("DELETE", "/me"); }

/** geolocalización de una IP vía ipapi.co (servicio público, desde el navegador) */
export async function geo(ip) {
  if (!ip) return null;
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const d = await r.json();
    if (d.latitude == null) return null;
    return { lat: d.latitude, lon: d.longitude, lugar: [d.city, d.region, d.country_name].filter(Boolean).join(", "), org: d.org };
  } catch { return null; }
}
