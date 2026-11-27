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

async function abrir({ rol, token = true, hash = "#/panel/admin", clic = false, promociona = false }) {
  let vistas = 0;
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
    if (ruta === "/me") {
      vistas += 1;
      /* promociona: la primera consulta dice «usuario» y las siguientes «admin»,
         como cuando otro admin sube el rol desde otra pestaña */
      const efectivo = promociona && vistas > 1 ? "admin" : rol;
      return responder(req, { id: 9, email: "yo@jumpernet.es", alias: "Fer", plan: "pro", rol: efectivo, activo: true });
    }
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
  await p.goto(`${BASE}/${hash}`, { waitUntil: "networkidle2" });
  await espera(1600);
  await p.waitForSelector(".lateral-btn", { timeout: 4000 }).catch(() => {});

  /* la entrada debe estar en el menú aunque la cuenta no tenga rol */
  const menu = await p.evaluate(() =>
    [...document.querySelectorAll(".lateral-btn")].map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  const entrada = menu.find((t) => t.includes("Administración")) || null;

  if (clic) {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll(".lateral-btn")]
        .find((x) => x.textContent.includes("Administración"));
      b?.click();
    });
    await espera(600);
  }

  if (promociona) {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll(".fila-btn .btn")]
        .find((x) => /Comprobar mi rol/.test(x.textContent));
      b?.click();
    });
    await espera(1200);
  }

  const d = await p.evaluate(() => ({
    hash: location.hash,
    puerta: !!document.querySelector(".jn-adm-puerta"),
    texto: (document.querySelector(".pu-vacio")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
    volver: sessionStorage.getItem("jumpernet-volver"),
  }));
  console.log(rol === "sin-sesion" ? "sin sesión" : `rol ${rol}${clic ? " (desde el menú)" : ""}${promociona ? " + promoción en vivo" : ""}`,
    JSON.stringify({ ...d, entrada }));
  await p.close();
  return { ...d, entrada };
}

const admin = await abrir({ rol: "admin" });
const usuario = await abrir({ rol: "usuario" });
const desdeMenu = await abrir({ rol: "usuario", hash: "#/panel", clic: true });
const sinSesion = await abrir({ rol: null, token: false });
const promo = await abrir({ rol: "usuario", promociona: true });

const bien =
  admin.puerta && !!admin.entrada &&
  !usuario.puerta && usuario.hash === "#/panel/admin" && usuario.texto.includes("usuario") &&
  usuario.texto.includes("yo@jumpernet.es") && !!usuario.entrada &&
  promo.puerta &&
  desdeMenu.hash === "#/panel/admin" && desdeMenu.texto.includes("usuario") &&
  sinSesion.hash.includes("/acceso/login") && sinSesion.volver === "/panel/admin" &&
  errores.length === 0;

console.log("errores:", errores.length ? errores : "ninguno");
console.log(bien ? "OK" : "FALLO");
await b.close();
process.exit(bien ? 0 : 1);
