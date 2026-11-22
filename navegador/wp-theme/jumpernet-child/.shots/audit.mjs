import { spawn } from 'node:child_process';

const url = process.argv[2];
const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=9224', '--window-size=1440,1000', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

async function main() {
  let targets;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/list');
      targets = await res.json();
      if (targets.length) break;
    } catch {}
    await sleep(250);
  }
  const target = targets.find((t) => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const errors = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push('console: ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 1000);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.navigate', { url });
  await sleep(2500);

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(function(){${expr}})()`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return 'EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };

  const out = {};
  out.overflow = await ev(`return {sw: document.documentElement.scrollWidth, iw: innerWidth, body: document.body.scrollWidth}`);
  out.meta = await ev(`return {theme: document.documentElement.getAttribute('data-jn-tema'), blocks: document.querySelectorAll('.jn-bloque').length, anchors: document.querySelectorAll('[data-jn-anclas] a').length}`);
  out.video = await ev(`var v=document.querySelector('.jn-hero-video video'); return {ready: v && v.readyState, duration: v && v.duration, paused: v && v.paused, poster: v && v.getAttribute('poster')}`);
  out.movie = await ev(`var v=document.querySelector('.jn-cine video'); return {ready: v && v.readyState, duration: v && v.duration, paused: v && v.paused}`);

  // tema
  out.tema = await ev(`document.querySelector('[data-jn-tema-btn]').click(); return new Promise(r=>setTimeout(()=>r({theme:document.documentElement.getAttribute('data-jn-tema'), label:document.querySelector('[data-jn-tema-btn]').getAttribute('aria-label'), guardado:localStorage.getItem('jn-tema')}),300))`);
  await ev(`document.querySelector('[data-jn-tema-btn]').click(); return 1`);

  // mapa
  await ev(`document.querySelector('.jn-mapa__lista [data-nodo="s2"]').click(); return 1`);
  out.mapa = await ev(`return {activo: document.querySelector('.jn-mapa__nodo.is-activo')?.getAttribute('data-nodo'), ficha: document.querySelector('[data-nodo-vista="s2"]')?.hidden, on: document.querySelectorAll('.jn-mapa__flujos path.is-on').length}`);

  // viaje paso a paso
  await ev(`document.querySelector('[data-jn-viaje-paso]').click(); return 1`);
  await sleep(300);
  await ev(`document.querySelector('[data-jn-viaje-paso]').click(); return 1`);
  out.viaje = await ev(`return {estado: document.querySelector('[data-jn-viaje-estado]').textContent, etapa: [...document.querySelectorAll('[data-etapa]')].findIndex(e=>!e.hidden), actual: document.querySelector('.jn-viaje__paradas li.is-actual b')?.textContent, barra: document.querySelector('[data-jn-viaje-barra]').style.transform}`);

  // cifrado: pestañas accesibles
  await ev(`document.querySelector('[data-vista-btn="s1"]').click(); return 1`);
  out.cifrado = await ev(`var t=document.querySelector('[data-vista-btn="s1"]'), u=document.querySelector('[data-vista-btn="tu"]'); return {sel:t.getAttribute('aria-selected'), ti:t.tabIndex, tabindexTu:u.tabIndex, panel:document.querySelector('#jn-cif-panel-s1').hidden, rol:document.querySelector('#jn-cif-panel-s1').getAttribute('role'), controls:t.getAttribute('aria-controls')}`);

  // terminal chip + comando desconocido
  await ev(`document.querySelector('[data-jn-term-chip="help"]').click(); return 1`);
  await ev(`var i=document.querySelector('[data-jn-term-input]'); i.value='whoami'; document.querySelector('[data-jn-term-form]').requestSubmit(); return 1`);
  out.terminal = await ev(`return {lineas: document.querySelector('[data-jn-term-salida]').children.length, ultima: document.querySelector('[data-jn-term-salida]').lastElementChild.textContent}`);

  // reproductor grande
  await ev(`document.querySelector('[data-jn-play-grande]').click(); return 1`);
  await sleep(900);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  (await import('node:fs')).writeFileSync('.shots/audit-play.png', Buffer.from(shot.data, 'base64'));
  out.play = await ev(`var b=document.querySelector('.jn-cine'), v=document.querySelector('.jn-cine video'); return {playing:b.classList.contains('is-playing'), cls:b.className, paused:v.paused, overlay:getComputedStyle(document.querySelector('.jn-cine__play')).opacity, pe:getComputedStyle(document.querySelector('.jn-cine__play')).pointerEvents}`);
  await ev(`var v=document.querySelector('.jn-cine video'); v.pause(); return 1`);

  // indice
  await ev(`document.querySelector('[data-ancla="terminal"]').click(); return 1`);
  await sleep(3500);
  out.ancla = await ev(`return {hash: location.hash, activa: document.querySelector('[data-ancla="terminal"]').className, y: Math.round(scrollY), clases:[...document.querySelectorAll('[data-jn-anclas] a')].map(a=>a.className), tops:[...document.querySelectorAll('.jn-bloque')].map(s=>Math.round(s.getBoundingClientRect().top+scrollY)), limite: Math.round(scrollY + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--jn-cab-alto'),10)||64) + Math.min(260, innerHeight*0.34))}`);

  // glosario + faq
  out.glosario = await ev(`var i=document.querySelector('[data-jn-glos-buscar]'); i.value='cifrado'; i.dispatchEvent(new Event('input',{bubbles:true})); return {visibles:[...document.querySelectorAll('.jn-glos__item')].filter(d=>!d.hidden).length, cuenta:document.querySelector('[data-jn-glos-cuenta]').textContent}`);
  await ev(`document.querySelector('.jn-faq__item summary').click(); return 1`);
  out.faq = await ev(`return document.querySelector('.jn-faq__item').open`);

  out.visible = await ev(`return {visibles:document.querySelectorAll('.jn-visible').length, total:document.querySelectorAll('.jn-reveal').length}`);
  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
