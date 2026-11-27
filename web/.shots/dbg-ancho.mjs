import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844 });
await p.setRequestInterception(true);
p.on("request", (req) => {
  const u = req.url();
  if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  if (!u.startsWith("https://jumpernet.duckdns.org")) return req.continue();
  const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
  const r = new URL(u).pathname;
  const ok = (c) => req.respond({ status: 200, contentType: "application/json", headers: h, body: JSON.stringify(c) });
  if (r === "/me") return ok({ id: 1, email: "ana@x.es", alias: "Ana", rol: "admin", plan: "empresarial", activo: true, saltos_max: 7 });
  if (r === "/admin/dashboard") return ok({ usuarios: { total: 2, activos: 1, moderadores: 1, planes: { free: 0, pro: 1, empresarial: 1 } }, nodos_ahora: 3, nodos: { vivos: 2 }, equipos_conectados: 1 });
  if (r === "/admin/usuarios") return ok(Array.from({ length: 4 }, (_, i) => ({ id: i + 1, email: `persona${i}@correo.net`, alias: `Persona ${i}`, rol: "usuario", plan: "pro", saltos_plan: 5, activo: i === 0, circuito: ["nodo_es_1", "nodo_fr_2", "nodo_de_3", "nodo_nl_4", "nodo_se_7"], p_clara: "clave", alta: 1700000000 })));
  if (r === "/nodos") return ok([]);
  return ok({});
});
await p.evaluateOnNewDocument(() => {
  localStorage.setItem("token", "t");
  localStorage.setItem("jumpernet-modo-v1", "claro");
  localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 1, rol: "admin", plan: "empresarial" }));
});
await p.goto("http://127.0.0.1:5199/#/panel/admin", { waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm");
await new Promise((r) => setTimeout(r, 500));
const mide = () => p.evaluate(() => {
  const out = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 2 && r.width > 60) out.push({ t: el.tagName, c: String(el.className).slice(0, 50), right: Math.round(r.right), w: Math.round(r.width) });
  });
  return { scroll: document.documentElement.scrollWidth, inner: innerWidth, top: out.slice(0, 12) };
});
console.log("RESUMEN", JSON.stringify(await mide()));
await p.evaluate(() => document.querySelectorAll(".jn-adm-tabs button")[1].click());
await new Promise((r) => setTimeout(r, 500));
console.log("USUARIOS", JSON.stringify(await mide()));
const env = await p.evaluate(() => {
  const e = document.querySelector(".envuelve-tabla");
  const cs = getComputedStyle(e);
  return { overflowX: cs.overflowX, width: e.getBoundingClientRect().width, scrollWidth: e.scrollWidth, tabla: document.querySelector(".jn-adm-tabla").getBoundingClientRect().width };
});
console.log("ENV", JSON.stringify(env));
await b.close();
