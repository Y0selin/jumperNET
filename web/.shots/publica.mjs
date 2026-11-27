import puppeteer from "puppeteer-core";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
for (const url of ["https://y0selin.github.io/jumperNET/admin", "https://y0selin.github.io/jumperNET/panel/admin", "https://y0selin.github.io/jumperNET/panel/apariencia", "https://y0selin.github.io/jumperNET/tarifas", "https://y0selin.github.io/jumperNET/"]) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await p.evaluateOnNewDocument(() => { localStorage.setItem("jumpernet-intro-v31", "vista"); });
  await p.goto(url, { waitUntil: "networkidle2" });
  await espera(1500);
  const d = await p.evaluate(() => ({
    url: location.href,
    hash: location.hash,
    titulo: document.title,
    texto: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 90),
  }));
  console.log(url.split("/jumperNET")[1], JSON.stringify(d), "errs:", errs.slice(0, 1));
  await p.close();
}
await b.close();
