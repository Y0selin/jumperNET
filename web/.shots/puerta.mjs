import puppeteer from "puppeteer-core";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const AHORA = Math.floor(Date.now() / 1000);
const DIA = 86400;

const USUARIOS = [
  { id: 1, email: "ana@jumpernet.es", alias: "Ana", rol: "admin", plan: "empresarial", saltos_plan: 7, activo: true, circuito: ["nodo_es_1", "nodo_fr_2", "nodo_de_3"], p_clara: "clave-demo-ana", alta: AHORA - 62 * DIA, ultimo_cambio: AHORA - 3400, ip_salida: "185.44.12.9" },
  { id: 2, email: "bruno@correo.net", alias: "Bruno", rol: "moderador", plan: "pro", saltos_plan: 5, activo: true, circuito: ["nodo_es_1", "nodo_nl_4", "nodo_se_7"], p_clara: "clave-demo-bruno", alta: AHORA - 24 * DIA, ultimo_cambio: AHORA - 900 },
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
p.on("request", (req) => {
  const u = req.url();
  if (req.method() === "OPTIONS") {
    return req.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
  }
  if (!u.startsWith("https://jumpernet.duckdns.org")) return req.continue();
  const ruta = new URL(u).pathname;
  if (ruta === "/me") return responder(req, { ...USUARIOS[0], foto: "" });
  if (ruta === "/admin/dashboard") return responder(req, DASH);
  if (ruta === "/admin/usuarios") return responder(req, USUARIOS);
  if (ruta === "/nodos") return responder(req, NODOS);
  if (ruta === "/precio-pro") return responder(req, { precio: 5 });
  return responder(req, { detail: "no simulado: " + ruta }, 404);
});

const errores = [];
const fallos = [];
p.on("pageerror", (e) => errores.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") errores.push("console: " + m.text()); });
p.on("response", (r) => { if (r.status() >= 400) fallos.push(`${r.status()} ${r.url()}`); });
await b.defaultBrowserContext().overridePermissions("http://127.0.0.1:5199", ["clipboard-read", "clipboard-write"]);

await p.evaluateOnNewDocument(() => {
  if (!localStorage.getItem("token")) localStorage.setItem("token", "demo-token");
  if (!localStorage.getItem("jumpernet-usuario-v1")) {
    localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 1, email: "ana@jumpernet.es", alias: "Ana", plan: "empresarial", activo: true, rol: "admin" }));
  }
  if (!localStorage.getItem("jumpernet-modo-v1")) localStorage.setItem("jumpernet-modo-v1", "oscuro");
  if (!localStorage.getItem("jumpernet-intro-v31")) localStorage.setItem("jumpernet-intro-v31", "vista");
  if (!sessionStorage.getItem("jumpernet-panel-tab")) sessionStorage.setItem("jumpernet-panel-tab", "admin");
});

async function estado(texto) {
  const d = await p.evaluate(() => ({
    puerta: !!document.querySelector(".jn-adm-puerta"),
    sala: !!document.querySelector(".jn-adm-cab"),
    titulo: document.querySelector(".jn-adm-puerta-cab h1, .jn-adm-cab h1")?.textContent.trim() || "",
    error: document.querySelector(".jn-adm-puerta-error")?.textContent.trim() || "",
    cuerpo: document.querySelector(".jn-adm-puerta-caja")?.className || "",
    meta: document.querySelector(".jn-adm-cab-meta")?.textContent.replace(/\s+/g, " ").trim() || "",
    kpis: [...document.querySelectorAll(".jn-adm-kpi b")].map((x) => x.textContent.trim()),
    tabs: [...document.querySelectorAll(".jn-adm-tabs button")].map((x) => x.textContent.replace(/\s+/g, " ").trim()),
    chispa: !!document.querySelector(".jn-adm-chispa"),
    sesion: sessionStorage.getItem("jumpernet-sala-sesion-v1"),
    tituloDoc: document.title,
  }));
  console.log(texto, JSON.stringify(d));
  return d;
}

async function entrar(llave) {
  await p.type(".jn-adm-puerta-input input[name='nombre']", "fernando");
  if (llave) await p.type(".jn-adm-puerta-input input[name='llave']", llave);
  await p.click(".jn-adm-puerta-entrar");
  await espera(900);
}

await p.goto("http://127.0.0.1:5199/#/panel/admin", { waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm-puerta", { timeout: 15000 });
await espera(700);
await estado("puerta inicial");
await p.screenshot({ path: ".shots/admin/puerta-oscuro.png" });

// llave equivocada
await entrar("mala");
await estado("tras fallo");
await p.screenshot({ path: ".shots/admin/puerta-fallo.png" });

// ahora con la buena (el nombre sigue escrito)
await p.type(".jn-adm-puerta-input input[name='llave']", "jumpernet");
await p.click(".jn-adm-puerta-entrar");
await p.waitForSelector(".jn-adm-cab", { timeout: 15000 });
await espera(1200);
await estado("sala abierta");
await p.screenshot({ path: ".shots/admin/sala-oscuro.png" });

// recarga: la sesión de pestaña debe mantenerse
await p.reload({ waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm-cab", { timeout: 15000 });
await espera(900);
await estado("tras recargar");

// cerrar la sala
await p.click(".jn-adm-cerrar");
await espera(600);
await estado("tras cerrar");
await p.screenshot({ path: ".shots/admin/puerta-cerrada.png" });

// modo claro
await p.evaluate(() => localStorage.setItem("jumpernet-modo-v1", "claro"));
await p.reload({ waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm-puerta", { timeout: 15000 });
await espera(500);
await p.screenshot({ path: ".shots/admin/puerta-claro.png" });
await entrar("jumpernet15");
await p.waitForSelector(".jn-adm-cab", { timeout: 15000 });
await espera(1000);
await estado("sala clara");
await p.screenshot({ path: ".shots/admin/sala-claro.png" });

// tabla de usuarios: copia, atajo de teclado y filtros
await p.evaluate(() => document.querySelectorAll(".jn-adm-tabs button")[1].click());
await espera(800);
console.log("usuarios", JSON.stringify(await p.evaluate(() => ({
  filas: document.querySelectorAll(".jn-adm-tabla tbody tr").length,
  copias: document.querySelectorAll(".jn-adm-correo").length,
  filtros: document.querySelectorAll(".jn-adm-filtros .campo").length,
  kbd: document.querySelector(".jn-adm-busca kbd")?.textContent,
  tab: document.querySelector(".jn-adm-tabs button.on")?.textContent.trim(),
}))));
await p.screenshot({ path: ".shots/admin/sala-claro-usuarios.png", fullPage: true });

await p.click(".jn-adm-correo");
await espera(350);
console.log("portapapeles", JSON.stringify(await p.evaluate(() => navigator.clipboard.readText().catch(() => "bloqueado"))));

await p.evaluate(() => document.querySelector(".jn-adm-busca input")?.blur());
await p.keyboard.press("/");
await espera(400);
console.log("atajo / ", JSON.stringify(await p.evaluate(() => ({
  foco: document.activeElement?.getAttribute("aria-label"),
  tab: document.querySelector(".jn-adm-tabs button.on")?.textContent.trim(),
}))));
await p.type(".jn-adm-busca input", "ana");
await espera(400);
console.log("filtro", JSON.stringify(await p.evaluate(() => ({
  filas: document.querySelectorAll(".jn-adm-tabla tbody tr").length,
  limpiar: document.querySelector(".jn-adm-limpiar")?.textContent.trim(),
  chips: [...document.querySelectorAll(".jn-adm-tarjeta-cab .btn")].map((x) => x.textContent.trim()),
}))));
await p.screenshot({ path: ".shots/admin/sala-claro-filtro.png" });
await p.evaluate(() => document.querySelectorAll(".jn-adm-tabs button")[0].click());
await espera(400);

// móvil
await p.setViewport({ width: 390, height: 844 });
await espera(500);
await p.screenshot({ path: ".shots/admin/sala-movil.png", fullPage: true });
await p.click(".jn-adm-cerrar");
await espera(500);
await p.screenshot({ path: ".shots/admin/puerta-movil.png", fullPage: true });
await estado("puerta móvil");

// usuario normal: ni puerta ni sala
await p.evaluate(() => {
  localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 1, email: "ana@jumpernet.es", alias: "Ana", plan: "free", activo: true, rol: "usuario" }));
  sessionStorage.clear();
});
await p.reload({ waitUntil: "networkidle2" });
await espera(1200);
console.log("usuario normal", JSON.stringify(await p.evaluate(() => ({
  puerta: !!document.querySelector(".jn-adm-puerta"),
  sala: !!document.querySelector(".jn-adm-cab"),
  hash: location.hash,
  navAdmin: [...document.querySelectorAll(".lateral nav a, .lateral nav button")].some((x) => /administraci/i.test(x.textContent)),
}))));

console.log("fallos", JSON.stringify([...new Set(fallos)]));
console.log("errores", JSON.stringify(errores));
await b.close();
