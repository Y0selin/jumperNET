import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900 });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
await p.evaluateOnNewDocument(() => localStorage.setItem("jumpernet-intro-v31", "vista"));
await p.goto("http://127.0.0.1:5199/#/tarifas", { waitUntil: "networkidle2" });
await espera(1200);
const titulo1 = await p.title();
await p.evaluate(() => { location.hash = "#/equipo"; });
await espera(120);
const durante = await p.evaluate(() => ({
  clase: document.documentElement.classList.contains("jn-cambio-pagina"),
  anim: getComputedStyle(document.getElementById("root")).animationName,
}));
await espera(500);
const despues = await p.evaluate(() => ({
  clase: document.documentElement.classList.contains("jn-cambio-pagina"),
  titulo: document.title,
  texto: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60),
}));
/* con el apagado global no debe quedar animación */
await p.evaluate(() => { document.documentElement.dataset.anim = "off"; location.hash = "#/proyecto"; });
await espera(120);
const apagado = await p.evaluate(() => getComputedStyle(document.getElementById("root")).animationName);
console.log(JSON.stringify({ titulo1, durante, despues, apagado, errs }, null, 1));
const ok = durante.clase && durante.anim === "jn-cambio-pagina" && !despues.clase &&
  despues.titulo.toLowerCase().includes("equipo") && apagado === "none" && errs.length === 0;
console.log(ok ? "OK" : "FALLO");
await b.close();
process.exit(ok ? 0 : 1);
