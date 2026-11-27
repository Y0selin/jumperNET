import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
for (const url of ["/", "/admin", "/panel/admin", "/jumperNET/panel/admin", "#/admin"]) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0,120)));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0,120)); });
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem("jumpernet-intro-v31", "vista");
    localStorage.setItem("jumpernet-modo-v1", "oscuro");
    localStorage.setItem("token", "demo");
    localStorage.setItem("jumpernet-usuario-v1", JSON.stringify({ id: 9, email: "yo@jumpernet.es", alias: "Fer", plan: "pro", rol: "admin", activo: true }));
  });
  await p.goto("http://127.0.0.1:5199" + url, { waitUntil: "networkidle2" }).catch((e) => errs.push("goto: " + e.message.slice(0,80)));
  await espera(1800);
  const d = await p.evaluate(() => ({
    hash: location.hash,
    titulo: document.title,
    texto: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
    puerta: !!document.querySelector(".jn-adm-puerta"),
    overlays: [...document.querySelectorAll("body > div, #root > div")].map((x) => x.className).filter(Boolean).slice(0, 6),
  }));
  console.log(url, JSON.stringify(d), "errs:", errs.slice(0, 2));
  await p.close();
}
await b.close();
