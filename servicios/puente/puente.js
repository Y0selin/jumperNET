/* Puente WEB de JumperNET (Fase 9-tunel, todo automático desde el VPS).
 *
 * EL OBJETIVO: que «acepto ser salto» sea TODO lo que el usuario necesita
 * hacer — sin descargas, sin ejecutar nada en su equipo. Este contenedor
 * vive en el VPS y, por cada usuario con el opt-in aceptado, mantiene
 * ABIERTO el agente de túnel (agente_tunel.js, el mismo código probado en
 * campo) hacia el broker. Con ello:
 *
 *   · su fila de nodo (peer_u<id>, dirección tunel:peer_u<id>) existe desde
 *     el momento del opt-in (la crea PATCH /me),
 *   · el sondeo del broker le contesta OK → la API lo marca saltable con
 *     su latencia real (milisegundos del PING),
 *   · el contador «X equipo(s) externo(s) validados ahora» sube solo.
 *
 * El túnel SALE de este contenedor (IP privada del VPS): el broker lo ve y
 * la API clasifica el nodo vía='web'. Un puente web REENVÍA como salto
 * intermedio pero NO puede ser el exit (la salida de verdad — la IP que ve
 * internet — la ejecuta un agente en la casa del peer, via='agente'). Por
 * eso el agente que lanzamos va SIN clave JENC: aunque alguien intentase
 * saltar por él como exit, el stream cifrado saldría sin descifrar y el
 * destino no podría hablarle (defensa en profundidad aparte de la política
 * de elegir_circuito).
 *
 * Reconcilio cada 20 s contra GET /interno/salto_web (token interno):
 *   · usuario con opt-in     → agente arriba (si no lo está)
 *   · usuario sin opt-in     → agente parado
 *   · agente muerto          → se re-lanza (con retardo mínimo entre intentos)
 * y por cada puente vivo emite el latido estándar POST /nodos/heartbeat
 * con x-interno PEER_TOKEN (endpoint público de nodos personales), de modo
 * que la fila del nodo no envejece entre sondeos.
 */
"use strict";
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const API_URL = process.env.API_URL || "http://api:8000";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";
const PEER_TOKEN = process.env.PEER_TOKEN || "";
// CLAVE_SALTOS: los agentes del puente son AGENTES COMPLETOS y pueden
// ejecutar el EXIT (JENC: descifran el stream punt-a-punt). La salida que
// ejecutan sale del VPS (IP pública del servidor) y la API lo etiqueta
// Honestamente como exit_via='vps' — nunca como la casa del peer.
const CLAVE_SALTOS = process.env.CLAVE_SALTOS || "";
const BROKER = process.env.BROKER || "broker:9008";
const RECONCILIO_MS = 20000;
const RELANZAMINIMO_MS = 45000; // entre intentos fallidos del mismo peer
const UNA_VEZ = process.argv.includes("--once");  // despliega-agentes.sh

function log(m) { console.log("[puente " + new Date().toISOString().slice(11, 19) + "] " + m); }

/* resumen del estado para --once (despliega-agentes.sh): qué pares tienen
 * agente desplegado, en cola, o retirados por agente real de casa. */
function resumen() {
  const vivos = [...hijos.entries()].filter(([, i]) => i.proc && i.proc.exitCode === null).map(([n]) => n);
  return { desplegados: vivos.length, lista: vivos };
}

const hijos = new Map(); // peer_u<id> -> {proc, ultimoIntento}
const net = require("net");

/* ── PING al broker (puerto de nodos): ¿quién sostiene el túnel hoy? ──
 * Devuelve {vivo, publica}: publico = el túnel sale de una IP PÚBLICA,
 * o sea el AGENTE REAL corriendo en la casa del peer (equipos con el
 * navegador JumperNET encendido). En ese caso el puente NO debe pisarlo:
 * la salida por su casa vale más que la del contenedor. El broker contesta
 * "OK nombre <ip_origen>" o "ERR nombre fuera de linea". */
function viaActual(nombre) {
  return new Promise((resolve) => {
    const [bHost, bPuerto] = (process.env.BROKER_NODOS || "broker:9009").split(":");
    const s = net.connect({ host: bHost, port: Number(bPuerto || 9009), timeout: 4000 }, () => {
      s.write(`PING ${nombre}\n`);
    });
    let resp = "";
    s.on("data", (d) => {
      resp += String(d);
      if (resp.includes("\n")) {
        const partes = resp.split("\n")[0].split(" ");
        if (partes[0] === "OK" && partes.length >= 3) {
          const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(partes[2]);
          let publica = false;
          if (m) {
            const [a, b] = [+m[1], +m[2]];
            publica = !(a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127);
          }
          s.destroy();
          resolve({ vivo: true, publica });
        } else {
          s.destroy();
          resolve({ vivo: false, publica: false });
        }
      }
    });
    s.on("error", () => resolve({ vivo: false, publica: false }));
    s.on("timeout", () => { try { s.destroy(); } catch {} resolve({ vivo: false, publica: false }); });
  });
}

/* ── cifrar soltamos, así el agente nunca des cifra: sin la clave el exit
 *    Web sería imposible (el stream JENC saldría intacto e inválido). ── */

function pedir(host, ruta) {
  return new Promise((resolve, reject) => {
    const req = http.request(API_URL + ruta, { method: "GET", headers: { "X-Interno": INTERNAL_TOKEN } }, (res) => {
      let cuerpo = "";
      res.on("data", (d) => { cuerpo += d; });
      res.on("end", () => {
        if (res.statusCode !== 200) { reject(new Error("HTTP " + res.statusCode + " " + cuerpo.slice(0, 120))); return; }
        try { resolve(JSON.parse(cuerpo)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function latido(nombre) {
  return new Promise((resolve) => {
    const cuerpo = JSON.stringify({ nombre, direccion: `tunel:${nombre}`, conexiones: 0 });
    const req = http.request(API_URL + "/nodos/heartbeat", {
      method: "POST",
      headers: { "X-Interno": PEER_TOKEN, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(cuerpo) },
      timeout: 8000,
    }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode === 200)); });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { try { req.destroy(); } catch {} resolve(false); });
    req.end(cuerpo);
  });
}

function lanze(nombre) {
  const ya = hijos.get(nombre);
  if (ya && ya.proc && ya.proc.exitCode === null) return;   // vive: nada
  const ahora = Date.now();
  if (ya && ahora - ya.ultimoIntento < RELANZAMINIMO_MS) return;  // espera el turno (evita ciclo de choque)
  const [brokerHost, brokerPuerto] = BROKER.split(":");
  const proc = spawn("node", [
    path.join(__dirname, "agente_tunel.js"),
    brokerHost,
    brokerPuerto || "9008",
    nombre,
    PEER_TOKEN,
    "80,443",
    CLAVE_SALTOS,     // agente completo: puede ejecutar el EXIT (JENC)
  ], { stdio: ["ignore", "pipe", "pipe"] });
  proc.stdout.on("data", (d) => { const s = String(d).trim(); if (s) log(`${nombre}: ${s.split("\n").slice(-1)[0]}`); });
  proc.stderr.on("data", (d) => log(`${nombre} (stderr): ${String(d).slice(0, 160)}`));
  proc.on("exit", (code) => log(`${nombre}: el agente salió (código ${code})`));
  hijos.set(nombre, { proc, ultimoIntento: ahora });
  log(`${nombre}: agente del puente arrancado (túnel saliente al broker, sin puertos)`);
}

async function reconcilar() {
  let lista;
  try {
    lista = await pedir(API_URL, "/interno/salto_web");
  } catch (e) {
    log("sin lista de la API (" + e.message.slice(0, 100) + "): reintentaré");
    return;
  }
  const deseados = new Set(lista.map((u) => `peer_u${u.id}`));
  for (const nosotros of [...hijos.keys()]) {
    if (deseados.has(nosotros)) {
      const info = hijos.get(nosotros);
      const vivo = info && info.proc && info.proc.exitCode === null;
      if (!vivo) hijos.delete(nosotros);
      continue;
    }
    const info = hijos.get(nosotros);
    if (info && info.proc) { try { info.proc.kill(); } catch {} }
    hijos.delete(nosotros);
    log(`${nosotros}: opt-in revocado → agente parado`);
  }
  for (const nombre of deseados) {
    // RESPETO al agente real: si el túnel del peer sale ya desde una casa
    // (IP pública), el puente se retira — no compite ni lo pisa. En cuanto
    // el agente real de casa muera, el siguiente reconcilio (≤20 s) retoma
    // el relevo y el peer no pierde el salto.
    const st = await viaActual(nombre);
    if (st && st.vivo && st.publica) {
      if (hijos.has(nombre)) {
        const info = hijos.get(nombre);
        try { info.proc.kill(); } catch {}
        hijos.delete(nombre);
        log(`${nombre}: tu agente local está vivo (IP pública): puente retirado`);
      }
      continue;
    }
    lanze(nombre);
  }
  // latidos: solo de los puentes que CADA UNO sostiene (fila del nodo):
  // nunca latimos por un túnel que mantiene otro proceso (honesto)
  for (const nombre of hijos.keys()) {
    const ok = await latido(nombre);
    if (!ok) log(`${nombre}: latido de fila rechazado (seguirá la fila por sondeo)`);
  }
}

async function run() {
  if (!PEER_TOKEN || !INTERNAL_TOKEN) {
    log("faltan PEER_TOKEN o INTERNAL_TOKEN: el puente no puede operar (','.env del VPS)");
    // no exit(1): docker lo reciclará si hace falta, pero mejor seguir reintentando
  }
  for (;;) {
    try { await reconcilar(); } catch (e) { log("reconcilio: " + (e && e.message)); }
    await new Promise((r) => setTimeout(r, RECONCILIO_MS));
  }
}

process.on("SIGTERM", () => { for (const i of hijos.values()) { try { i.proc.kill(); } catch {} } process.exit(0); });
process.on("SIGINT", () => process.exit(0));

if (UNA_VEZ) {
  /* Modo del script despliega-agentes.sh: UNA pasada ahora mismo —
   * lanza los agentes que falten, retira los revocados y saca resumen. */
  reconcilar()
    .then(() => new Promise((r) => setTimeout(r, 5000)))   // deja respirar a los spawns
    .then(() => { console.log(JSON.stringify(resumen())); process.exit(0); })
    .catch((e) => { console.error(String(e && e.message)); process.exit(1); });
} else {
  run();
}
