import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900 });
await p.setRequestInterception(true);
p.on("request", (req) => {
  if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
  if (!req.url().startsWith("https://jumpernet.duckdns.org")) return req.continue();
  return req.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ id: 9, email: "yo@jumpernet.es", alias: "Fer", plan: "pro", rol: "admin", activo: true }) });
});
await p.evaluateOnNewDocument(() => {
  localStorage.setItem("token", "demo");
  localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 9, email: "yo@jumpernet.es", alias: "Fer", plan: "pro", rol: "admin", activo: true }));
  localStorage.setItem("jumpernet-intro-v31", "vista");
});
await p.goto("http://127.0.0.1:5199/#/panel/apariencia", { waitUntil: "networkidle2" });
await espera(1500);
const d = await p.evaluate(() => ({
  titulo: document.title,
  temaIgual: document.documentElement.dataset.tema || null,
  botones: [...document.querySelectorAll("[class*=preset], [class*=tema]")].map((x) => (x.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)).filter(Boolean).slice(0, 8),
  texto: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200),
}));
console.log(JSON.stringify(d, null, 1));
await b.close();
