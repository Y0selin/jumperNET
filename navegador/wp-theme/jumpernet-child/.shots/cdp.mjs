import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=9223', '--window-size=1440,1000', 'about:blank'
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
      const res = await fetch('http://127.0.0.1:9223/json/list');
      targets = await res.json();
      if (targets.length) break;
    } catch {}
    await sleep(250);
  }
  const target = targets.find((t) => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION', msg.params.exceptionDetails.text,
        msg.params.exceptionDetails.exception?.description || '');
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE', msg.params.type, msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 1000);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.navigate', { url: process.argv[2] });
  await sleep(2500);

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) console.log('EVAL ERR', r.exceptionDetails.text, r.exceptionDetails.exception?.description);
    return r.result?.value;
  };

  console.log('meta', await evalJs(`JSON.stringify({
    height: document.documentElement.scrollHeight,
    visible: document.querySelectorAll('.jn-visible').length,
    reveal: document.querySelectorAll('.jn-reveal').length,
    blocks: document.querySelectorAll('.jn-bloque').length,
    title: document.title
  })`));

  const steps = (process.argv[3] || '0').split(',').map(Number);
  for (const y of steps) {
    await evalJs(`window.scrollTo(0, ${y}); new Promise(r => setTimeout(r, 700))`);
    await sleep(900);
    await send('Page.captureScreenshot', { format: 'png' });
    await sleep(900);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = `.shots/cdp-${W}-${y}.png`;
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('shot', file, await evalJs(`JSON.stringify({y:scrollY, cls:(document.querySelector('.jn-exp > .jn-bloque')||{}).className, top:Math.round((document.querySelector('.jn-exp > .jn-bloque')||{getBoundingClientRect:()=>({top:-1})}).getBoundingClientRect().top), op:getComputedStyle(document.querySelector('.jn-exp > .jn-bloque')||document.body).opacity, vis:document.querySelectorAll('.jn-visible').length})`));
  }

  console.log('after', await evalJs(`JSON.stringify({visible: document.querySelectorAll('.jn-visible').length, y: scrollY})`));
  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
