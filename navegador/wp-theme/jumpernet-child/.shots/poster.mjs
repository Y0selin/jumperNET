import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=9225', '--window-size=1440,1000', 'about:blank'
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
const pending = new Map();
let ws;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});

async function main() {
  let targets;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json/list');
      targets = await res.json();
      if (targets.length) break;
    } catch {}
    await sleep(250);
  }
  ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: process.argv[2] });
  await sleep(2500);
  const r = await send('Runtime.evaluate', {
    expression: `(async function(){
      var sec=document.querySelector('.jn-cine'); var v=sec.querySelector('video');
      sec.classList.add('is-playing');
      document.querySelector('.jn-cine__play').style.display='none';
      document.querySelector('.jn-cine__velo').style.display='none';
      document.querySelector('.jn-cine__controles').style.display='none';
      v.controls=false; v.pause();
      await new Promise(function(res){ if(v.readyState>=2) res(); else v.addEventListener('loadeddata',res,{once:true}); });
      v.currentTime=3;
      await new Promise(function(res){ v.addEventListener('seeked',res,{once:true}); setTimeout(res,1200); });
      v.scrollIntoView({block:'center'});
      await new Promise(function(res){ setTimeout(res,600); });
      var b=v.getBoundingClientRect();
      return {x:Math.round(b.left + window.scrollX), y:Math.round(b.top + window.scrollY), w:Math.round(b.width), h:Math.round(b.height), rw:v.videoWidth, rh:v.videoHeight};
    })()`,
    returnByValue: true, awaitPromise: true
  });
  console.log('rect', r.result?.value);
  const box = r.result?.value;
  if (!box || !box.w) { console.log('sin caja'); ws.close(); chrome.kill(); return; }
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
  writeFileSync('.shots/poster-frame.png', Buffer.from(shot.data, 'base64'));
  console.log('frame guardado');
  ws.close();
  chrome.kill();
}
main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
