import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
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
  if (r === "/me") return ok({ id: 1, email: "ana@x.es", alias: "Ana", rol: "admin", plan: "pro", activo: true, saltos_max: 7 });
  if (r === "/admin/dashboard") return ok({ usuarios: { total: 1, activos: 1, moderadores: 0, planes: { free: 0, pro: 1, empresarial: 0 } }, nodos_ahora: 3, nodos: { vivos: 2 }, equipos_conectados: 1 });
  if (r === "/admin/usuarios") return ok([{ id: 1, email: "ana@x.es", alias: "Ana", rol: "admin", plan: "pro", saltos_plan: 7, activo: true, circuito: ["a", "b"], p_clara: "x", alta: 1700000000 }]);
  if (r === "/nodos") return ok([]);
  return ok({});
});
p.on("pageerror", (e) => console.log("ERR", String(e)));
await p.evaluateOnNewDocument(() => {
  localStorage.setItem("token", "t");
  localStorage.setItem("jumpernet-modo-v1", "claro");
  localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 1, rol: "admin", plan: "pro" }));
});
await p.goto("http://127.0.0.1:5199/#/panel/admin", { waitUntil: "networkidle2" });
await p.waitForSelector(".jn-adm");
await espera(600);
const info = await p.evaluate(() => {
  const bs = [...document.querySelectorAll(".jn-adm-tabs button")];
  const b2 = bs[1].getBoundingClientRect();
  const top = document.elementFromPoint(b2.x + b2.width / 2, b2.y + b2.height / 2);
  return { boxes: bs.map((x) => [x.textContent.trim(), Math.round(x.getBoundingClientRect().top), Math.round(x.getBoundingClientRect().left)]), topEnPunto: top?.className + "|" + top?.tagName, y: Math.round(b2.y) };
});
console.log(JSON.stringify(info));
await p.evaluate(() => document.querySelectorAll(".jn-adm-tabs button")[1].click());
await espera(500);
console.log("tras click JS", await p.evaluate(() => ({ hash: location.hash, panel: document.querySelector(".jn-adm-tabla") ? "tabla" : "sin tabla", kpi: !!document.querySelector(".jn-adm-kpi") })));
await b.close();
