import puppeteer from "puppeteer-core";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://127.0.0.1:5199";
const errores = [];

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

async function abrir({ rol, token = true }) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.setRequestInterception(true);
  p.on("request", (req) => {
    if (req.method() === "OPTIONS") {
      return req.respond({ status: 204, headers: {
        "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
    }
    if (!req.url().startsWith("https://jumpernet.duckdns.org")) return req.continue();
    const ruta = new URL(req.url()).pathname;
    if (ruta === "/me") return responder(req, { id: 9, email: "yo@jumpernet.es", alias: "Fer", plan: "pro", rol, activo: true });
    return responder(req, { detail: "no simulado: " + ruta }, 404);
  });
  p.on("pageerror", (e) => errores.push(String(e)));
  await p.evaluateOnNewDocument((conToken) => {
    localStorage.clear(); sessionStorage.clear();
    if (conToken) {
      localStorage.setItem("token", "demo-token");
      localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 9, email: "yo@jumpernet.es", alias: "Fer", plan: "pro", activo: true }));
    }
    localStorage.setItem("jumpernet-modo-v1", "oscuro");
    localStorage.setItem("jumpernet-intro-v31", "vista");
  }, token);
  await p.goto(`${BASE}/#/panel/admin`, { waitUntil: "networkidle2" });
  await espera(1600);
  const d = await p.evaluate(() => ({
    hash: location.hash,
    puerta: !!document.querySelector(".jn-adm-puerta"),
    texto: (document.querySelector(".pu-vacio")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
    volver: sessionStorage.getItem("jumpernet-volver"),
  }));
  console.log(rol === "sin-sesion" ? "sin sesión" : `rol ${rol}`, JSON.stringify(d));
  await p.close();
  return d;
}

const admin = await abrir({ rol: "admin" });
const usuario = await abrir({ rol: "usuario" });
const sinSesion = await abrir({ rol: null, token: false });

const bien =
  admin.puerta &&
  !usuario.puerta && usuario.hash === "#/panel/admin" && usuario.texto.includes("usuario") &&
  sinSesion.hash.includes("/acceso/login") && sinSesion.volver === "/panel/admin" &&
  errores.length === 0;

console.log("errores:", errores.length ? errores : "ninguno");
console.log(bien ? "OK" : "FALLO");
await b.close();
process.exit(bien ? 0 : 1);
