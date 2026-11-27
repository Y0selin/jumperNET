import puppeteer from "puppeteer-core";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const AHORA = Math.floor(Date.now() / 1000);
const DIA = 86400;

const USUARIOS = [
  { id: 1, email: "ana@jumpernet.es", alias: "Ana", rol: "admin", plan: "empresarial", saltos_plan: 7, activo: true, circuito: ["nodo_es_1", "nodo_fr_2", "nodo_de_3"], p_clara: "clave-demo-ana", alta: AHORA - 62 * DIA, ultimo_cambio: AHORA - 3400, ip_salida: "185.44.12.9" },
  { id: 2, email: "bruno@correo.net", alias: "Bruno", rol: "moderador", plan: "pro", saltos_plan: 5, activo: true, circuito: ["nodo_es_1", "nodo_nl_4", "nodo_se_7", "nodo_fi_2", "nodo_ro_1"], p_clara: "clave-demo-bruno", alta: AHORA - 24 * DIA, ultimo_cambio: AHORA - 900 },
  { id: 3, email: "carla@correo.net", alias: "Carla", rol: "usuario", plan: "pro", saltos_plan: 3, activo: false, circuito: [], p_clara: "clave-demo-carla", alta: AHORA - 4 * DIA },
  { id: 4, email: "david@correo.net", alias: "", rol: "usuario", plan: "free", activo: false, circuito: [], p_clara: "clave-demo-david", alta: AHORA - 2 * DIA },
  { id: 5, email: "elena@correo.net", alias: "Elena", rol: "usuario", plan: "free", activo: true, circuito: ["nodo_es_1", "nodo_fr_2", "nodo_de_3"], p_clara: "clave-demo-elena", alta: AHORA - 20 * 3600 },
  { id: 6, email: "fran@empresa.com", alias: "Fran", rol: "usuario", plan: "empresarial", saltos_plan: 7, activo: false, circuito: [], p_clara: "clave-demo-fran", alta: AHORA - 11 * DIA },
  { id: 7, email: "gema@correo.net", alias: "Gema", rol: "usuario", plan: "free", activo: false, circuito: [], p_clara: "clave-demo-gema", alta: AHORA - 40 * DIA },
  { id: 8, email: "hugo@correo.net", alias: "Hugo", rol: "usuario", plan: "pro", saltos_plan: 4, activo: false, circuito: [], p_clara: "clave-demo-hugo", alta: AHORA - 70 * DIA },
];

const NODOS = [
  { nombre: "nodo_es_1", estado: "vivo", tipo: "infra", ms: 21, conexiones: 14, ultimo_hb: 2, direccion: "10.0.0.11:443" },
  { nombre: "nodo_fr_2", estado: "vivo", tipo: "infra", ms: 38, conexiones: 9, ultimo_hb: 1, direccion: "10.0.0.12:443" },
  { nombre: "nodo_de_3", estado: "vivo", tipo: "infra", ms: 52, conexiones: 7, ultimo_hb: 3, direccion: "10.0.0.13:443" },
  { nombre: "nodo_nl_4", estado: "vivo", tipo: "infra", ms: 44, conexiones: 5, ultimo_hb: 1, direccion: "10.0.0.14:443" },
  { nombre: "peer_u2", estado: "vivo", tipo: "usuario", ms: 61, conexiones: 3, ultimo_hb: 2, direccion: "casa-bruno:8443", saltable: true, alias: "Bruno" },
  { nombre: "peer_u5", estado: "vivo", tipo: "usuario", ms: 88, conexiones: 1, ultimo_hb: 4, direccion: "10.8.0.5:8443", saltable: true, alias: "Elena" },
  { nombre: "nodo_it_5", estado: "", tipo: "infra", ms: null, conexiones: 0, ultimo_hb: 900, direccion: "10.0.0.15:443" },
];

const DASH = {
  usuarios: { total: 8, activos: 3, moderadores: 1, planes: { free: 3, pro: 3, empresarial: 2 } },
  nodos_ahora: 17,
  nodos: { vivos: 6 },
  equipos_conectados: 3,
};

function responder(req, cuerpo, estado = 200) {
  return req.respond({
    status: estado,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    body: JSON.stringify(cuerpo),
  });
}

const b = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 1000 });

await p.setRequestInterception(true);
let rolActual = "admin";
p.on("request", (req) => {
  const u = req.url();
  if (req.method() === "OPTIONS") {
    return req.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
  }
  if (!u.startsWith("https://jumpernet.duckdns.org")) return req.continue();
  const ruta = new URL(u).pathname;
  if (ruta === "/me") return responder(req, { ...USUARIOS[0], rol: rolActual, foto: "" });
  if (ruta === "/admin/dashboard") return responder(req, DASH);
  if (ruta === "/admin/usuarios") return responder(req, USUARIOS.map((x) => ({ ...x, rol: x.rol === "admin" ? rolActual : x.rol })));
  if (ruta === "/nodos") return responder(req, NODOS);
  if (ruta === "/peer_token") return responder(req, { peer_token: "demo", nombre: "peer_u1" });
  if (ruta === "/precio-pro") return responder(req, { precio: 5 });
  return responder(req, { detail: "no simulado: " + ruta }, 404);
});

const errores = [];
p.on("pageerror", (e) => errores.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") errores.push("console: " + m.text()); });

async function entra(rol = "admin", modo = "oscuro") {
  await p.evaluateOnNewDocument((r, mod) => {
    localStorage.setItem("token", "demo-token");
    localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 1, email: "ana@jumpernet.es", alias: "Ana", plan: "empresarial", activo: true, rol: r }));
    localStorage.setItem("jumpernet-modo-v1", mod);
    localStorage.setItem("jumpernet-intro-v31", "vista");
    sessionStorage.setItem("jumpernet-panel-tab", "inicio");
  }, rol, modo);
}

async function tab(n) {
  /* clic por JS: con scroll suave, el clic por coordenadas puede caer antes
     de que la pestaña termine de moverse */
  await p.evaluate((i) => document.querySelectorAll(".jn-adm-tabs button")[i - 1]?.click(), n);
  await espera(500);
}

await entra("admin", "oscuro");
await p.goto("http://127.0.0.1:5199/#/panel/admin", { waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm", { timeout: 15000 });
await espera(900);

const info = await p.evaluate(() => ({
  hash: location.hash,
  tabs: [...document.querySelectorAll(".jn-adm-tabs button")].map((b) => b.textContent.trim()),
  kpis: [...document.querySelectorAll(".jn-adm-kpi b")].map((b) => b.textContent.trim()),
  filas: document.querySelectorAll(".jn-adm-tabla tbody tr").length,
  semanal: document.querySelectorAll(".jn-adm-semana").length,
  nodos: document.querySelectorAll(".jn-adm-nodo").length,
  modo: document.documentElement.dataset.modo,
}));
console.log("admin inicial", JSON.stringify(info));
await p.screenshot({ path: ".shots/admin/oscuro-resumen.png" });

await tab(2);
const tabla = await p.evaluate(() => ({
  filas: document.querySelectorAll(".jn-adm-tabla tbody tr").length,
  claves: document.querySelectorAll(".jn-adm-clave, .jn-adm-fila .btn[title='Ver la contraseña guardada']").length,
  cols: document.querySelectorAll(".jn-adm-tabla thead th").length,
}));
await p.click(".jn-adm-fila .btn[title='Ver la contraseña guardada']");
await espera(250);
const clave = await p.$eval(".jn-adm-clave code", (e) => e.textContent);
console.log("usuarios", JSON.stringify({ ...tabla, clave }));
await p.screenshot({ path: ".shots/admin/oscuro-usuarios.png" });

await tab(3);
console.log("nodos tarjetas", await p.$$eval(".jn-adm-nodo", (l) => l.length));
await p.screenshot({ path: ".shots/admin/oscuro-nodos.png" });

await tab(4);
console.log("estadisticas", JSON.stringify(await p.evaluate(() => ({
  barras: document.querySelectorAll(".jn-adm-barra").length,
  semanas: document.querySelectorAll(".jn-adm-semana").length,
  filas: document.querySelectorAll(".jn-adm-tabla-datos tbody tr").length,
}))));
await p.screenshot({ path: ".shots/admin/oscuro-datos.png" });

// claro (el último script registrado gana al de entra())
await p.evaluateOnNewDocument(() => localStorage.setItem("jumpernet-modo-v1", "claro"));
await p.reload({ waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm", { timeout: 15000 });
await espera(700);
await tab(2);
await p.screenshot({ path: ".shots/admin/claro-usuarios.png" });
await tab(1);
await p.screenshot({ path: ".shots/admin/claro-resumen.png" });

// móvil
await p.setViewport({ width: 390, height: 844 });
await espera(300);
await tab(2);
await p.screenshot({ path: ".shots/admin/movil-usuarios.png", fullPage: true });
await tab(1);
await p.screenshot({ path: ".shots/admin/movil-resumen.png", fullPage: true });

// moderador
rolActual = "moderador";
await p.setViewport({ width: 1440, height: 1000 });
await p.evaluateOnNewDocument(() => {
  localStorage.setItem("jumpernet-modo-v1", "oscuro");
  localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 1, email: "ana@jumpernet.es", alias: "Ana", plan: "empresarial", activo: true, rol: "moderador" }));
});
await p.reload({ waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm", { timeout: 15000 });
await espera(600);
await tab(2);
const mod = await p.evaluate(() => ({
  titulo: document.querySelector(".jn-adm-cab h1").textContent,
  cols: document.querySelectorAll(".jn-adm-tabla thead th").length,
  borrar: document.querySelectorAll(".jn-adm-fila .btn.peligro").length,
  roles: document.querySelectorAll(".jn-adm-fila select").length,
}));
console.log("moderador", JSON.stringify(mod));
await p.screenshot({ path: ".shots/admin/moderador-usuarios.png" });

console.log("errores", JSON.stringify(errores));
await b.close();
