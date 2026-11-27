import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const chrome = spawn("chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=9226", "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
const pending = new Map();
let ws;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});

const mock = `
(() => {
  const user = { id: 42, email: "demo@jumpernet.test", alias: "demo", plan: "pro",
    activo: true, circuito: ["nodo-madrid", "nodo-paris", "nodo-frankfurt"],
    saltos_max: 5, saltos_plan: 3, precio_mes: 9 };
  const nodes = [
    { nombre: "nodo-madrid", estado: "vivo", tipo: "infra", ms: 28, pais: "ES" },
    { nombre: "nodo-paris", estado: "vivo", tipo: "infra", ms: 41, pais: "FR" },
    { nombre: "nodo-frankfurt", estado: "vivo", tipo: "infra", ms: 36, pais: "DE" },
    { nombre: "nodo-lisboa", estado: "vivo", tipo: "infra", ms: 52, pais: "PT" },
    { nombre: "nodo-milan", estado: "caido", tipo: "infra", ms: null, pais: "IT" },
    { nombre: "equipo-demo", estado: "vivo", tipo: "equipo", ms: 19, pais: "ES" },
  ];
  localStorage.setItem("token", "token-de-prueba");
  localStorage.setItem("jumpernet-usuario-v1", JSON.stringify(user));
  localStorage.setItem("jumpernet-modo-v1", "claro");
  localStorage.removeItem("jumpernat-tema-v3");
  localStorage.removeItem("jumpernet-actividad");
  const real = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (!u.includes("jumpernet.duckdns.org")) return real(url, opts);
    await new Promise((r) => setTimeout(r, 38 + Math.random() * 46));
    let data = {};
    if (u.endsWith("/me")) data = user;
    else if (u.endsWith("/nodos")) data = nodes;
    else if (u.endsWith("/nodosvivos")) data = { total: 5, infra: 4, equipos: 1 };
    else if (u.endsWith("/salida")) data = { ok: true, ip: "203.0.113.42" };
    const body = JSON.stringify(data);
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  };
})();`;

async function main() {
  let targets;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9226/json/list");
      targets = await res.json();
      if (targets.length) break;
    } catch { /* arrancando */ }
    await sleep(250);
  }
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const errors = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || ""));
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push("console: " + msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: mock });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/#/panel" });
  await sleep(4200);

  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: `(function(){${expr}})()`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return "EXCEPTION: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };
  const shot = async (name) => {
    const s = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`.shots/${name}.png`, Buffer.from(s.data, "base64"));
  };

  const out = {};
  out.dash = await ev(`return {
    overflow: document.documentElement.scrollWidth > innerWidth,
    vistazo: !!document.querySelector('.jn-vistazo'),
    primeraMedida: !!document.querySelector('.jn-vistazo .jn-grafico-primera'),
    graficos: document.querySelectorAll('.recharts-wrapper').length,
    nav: [...document.querySelectorAll('.lateral-btn')].map(b=>b.textContent.trim()).filter(t=>t.includes('Estad')),
    titulo: document.querySelector('.pu-hero h1')?.textContent,
    modo: document.documentElement.dataset.modo,
    tema: document.documentElement.dataset.tema,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg-1'),
    overflowNodes: [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return cs.position !== 'fixed' && r.width > 0 && (r.right > innerWidth + 2 || r.left < -2);
    }).slice(0, 14).map(el => ({ tag: el.tagName, cls: String(el.className).slice(0,90), w: Math.round(el.getBoundingClientRect().width), l: Math.round(el.getBoundingClientRect().left), r: Math.round(el.getBoundingClientRect().right) }))
  }`);
  await shot("jn-dash-claro");

  await ev(`[...document.querySelectorAll('.lateral-btn')].find(b=>b.textContent.includes('Estadísticas'))?.click(); return 1`);
  await sleep(2800);
  out.stats = await ev(`return {
    hayTitulo: document.querySelector('.jn-estadisticas h1')?.textContent,
    kpis: document.querySelectorAll('.jn-kpi').length,
    graficos: document.querySelectorAll('.recharts-wrapper').length,
    topologia: !!document.querySelector('.jn-topo'),
    demo: !!document.querySelector('.jn-aviso-demo'),
    overflow: document.documentElement.scrollWidth > innerWidth,
    vacios: document.querySelectorAll('.jn-grafico-vacio').length,
    botones: [...document.querySelectorAll('.jn-filtro-grupo button')].map(b=>b.textContent.trim()),
    yTicks: [...document.querySelectorAll('.jn-grafico .recharts-yAxis .recharts-cartesian-axis-tick-value')].slice(0, 12).map(t => ({
      txt: t.textContent,
      x: Math.round(t.getBoundingClientRect().left),
      w: Math.round(t.getBoundingClientRect().width)
    }))
  }`);
  await shot("jn-stats-claro-top");
  await ev(`window.scrollTo(0, 720); return 1`);
  await sleep(600);
  await shot("jn-stats-claro-mid");
  await ev(`window.scrollTo(0, 1500); return 1`);
  await sleep(600);
  await shot("jn-stats-claro-bottom");

  await ev(`[...document.querySelectorAll('.jn-filtro-grupo button')].find(b=>b.textContent.trim()==='Datos reales')?.click(); return 1`);
  await sleep(500);
  out.real = await ev(`return {
    aviso: document.querySelector('.jn-aviso-demo.real')?.textContent.slice(0, 120),
    primera: !!document.querySelector('.jn-grafico-primera'),
    demoMarca: document.querySelectorAll('.jn-demo-marca').length
  }`);

  await ev(`[...document.querySelectorAll('.jn-filtro-grupo button')].find(b=>b.textContent.trim()==='Demostración')?.click(); return 1`);
  await sleep(900);
  out.demo = await ev(`return { aviso: !!document.querySelector('.jn-aviso-demo'), marcas: document.querySelectorAll('.jn-demo-marca').length, graficos: document.querySelectorAll('.recharts-wrapper').length }`);
  await ev(`window.scrollTo(0, 0); return 1`);
  await sleep(300);
  await shot("jn-stats-demo");

  out.navApariencia = await ev(`return {
    botones: [...document.querySelectorAll('.lateral-btn')].map(b=>b.textContent.trim()),
    grupos: [...document.querySelectorAll('.pu-grupo-boton')].map(b=>b.textContent.trim())
  }`);
  await ev(`[...document.querySelectorAll('.pu-grupo-boton')].find(b=>b.textContent.includes('Cuenta'))?.click(); return 1`);
  await sleep(400);
  await ev(`[...document.querySelectorAll('.lateral-btn')].find(b=>b.textContent.includes('Apariencia'))?.click(); return 1`);
  await sleep(900);
  out.apariencia = await ev(`return {
    tarjetas: document.querySelectorAll('.jn-tema-card').length,
    mini: document.querySelectorAll('.jn-mini-diseno').length,
    activo: document.querySelector('.jn-tema-card.activo .jn-tema-txt b')?.textContent,
    overflow: document.documentElement.scrollWidth > innerWidth
  }`);
  await shot("jn-apariencia-claro");

  out.temas = {};
  for (const nombre of ["Arctic", "Midnight", "Forest", "Minimal", "Grafito Pro", "JumperNET Classic"]) {
    await ev(`[...document.querySelectorAll('.jn-tema-card')].find(b=>b.textContent.includes(${JSON.stringify(nombre)}))?.click(); return 1`);
    await sleep(320);
    out.temas[nombre] = await ev(`return {
      id: document.documentElement.dataset.tema,
      bg: getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim(),
      acento: getComputedStyle(document.documentElement).getPropertyValue('--acento-1').trim(),
      fuente: getComputedStyle(document.documentElement).getPropertyValue('--fuente-titulo').trim(),
      guardado: JSON.parse(localStorage.getItem('jumpernat-tema-v3')||'{}').id
    }`);
  }

  await ev(`[...document.querySelectorAll('.jn-tema-card')].find(b=>b.textContent.includes('Midnight'))?.click(); return 1`);
  await sleep(500);
  await ev(`[...document.querySelectorAll('.jn-modo-segmento button')].find(b=>b.textContent.includes('Oscuro'))?.click(); return 1`);
  await sleep(900);
  out.oscuro = await ev(`return {
    modo: document.documentElement.dataset.modo,
    tema: document.documentElement.dataset.tema,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg-1'),
    acento: getComputedStyle(document.documentElement).getPropertyValue('--acento-1'),
    guardado: JSON.parse(localStorage.getItem('jumpernat-tema-v3')||'{}').id,
    modoGuardado: localStorage.getItem('jumpernet-modo-v1'),
    activo: document.querySelector('.jn-tema-card.activo .jn-tema-txt b')?.textContent,
    fuenteTitulo: (() => { const h = document.querySelector('.pu-hero h1, .pu-cab h1'); return h ? getComputedStyle(h).fontFamily : null; })(),
    cta: (() => { const b = document.querySelector('.btn.primario'); return b ? getComputedStyle(b).backgroundImage : null; })()
  }`);
  await ev(`window.scrollTo(0, 0); return 1`);
  await sleep(500);
  await shot("jn-apariencia-oscuro");

  await ev(`[...document.querySelectorAll('.lateral-btn')].find(b=>b.textContent.includes('Inicio'))?.click(); return 1`);
  await sleep(1600);
  await shot("jn-dash-oscuro");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(900);
  out.movil = await ev(`return { overflow: document.documentElement.scrollWidth > innerWidth, ancho: document.documentElement.scrollWidth, graficos: document.querySelectorAll('.recharts-wrapper').length }`);
  await shot("jn-dash-movil-oscuro");

  await ev(`[...document.querySelectorAll('.lateral-btn')].find(b=>b.textContent.includes('Estadísticas'))?.click(); return 1`);
  await sleep(1500);
  await ev(`window.scrollTo(0, 360); return 1`);
  await sleep(500);
  out.movilStats = await ev(`return { overflow: document.documentElement.scrollWidth > innerWidth, ancho: document.documentElement.scrollWidth }`);
  await shot("jn-stats-movil");

  await ev(`document.querySelector('.jn-ancho-12')?.scrollIntoView({ block: 'start' }); return 1`);
  await sleep(600);
  out.movilTopo = await ev(`return {
    overflow: document.documentElement.scrollWidth > innerWidth,
    apilada: document.querySelectorAll('.jn-topo-movil-nodo').length,
    svg: document.querySelectorAll('.jn-topo-lienzo svg').length
  }`);
  await shot("jn-stats-movil-topo");
  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
