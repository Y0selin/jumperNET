/* Agente del túnel inverso de JumperNET (lado peer del usuario).
 *
 * Lo lanza main.js como proceso hijo cuando el usuario ACEPTA ser salto (o
 * deja el opt-in marcado al arrancar). UNA conexión TCP SALIENTE al broker:
 * cero puertos abiertos, cero configuración — el peer "escucha" a través de
 * la conexión que ÉL abrió, exactamente como Tor con su relay.
 *
 * Protocolo (ver servicios/broker/broker.py), lado peer:
 *   envía   TUNELL...→ TUNNEL <peer_u<id>> <peer_token>\n   y espera OK\n
 *   recibe  OPEN <id>\n            → prepárate para esa sub-conexión
 *           DATA <id> <n>\n+bytes  → payload del lado redd (la PRIMERA DATA de
 *                                    una id es la línea de ruta del protocolo
 *                                    nodo: "siguiente,resto\n" o "destino\n")
 *           FIN <id>\n             → cierra la sub-conexión
 *   envía   DATA <id> <n>\n+bytes / FIN <id>\n (lo que responde el peer)
 *
 * El agente EJECUTA el salto en su propia máquina: maneja la línea de ruta
 * (conectar al siguiente salto por la red o hablar el destino) igual que
 * hace servicios/nodo/nodo.py, con las mismas reglas (80/443, anti-privadas) —
 * pero en JENC nunca descifra: es reenvío ciego igual que un nodo intermedio.
 * (El "exit" externo por túnel solo está permitido si el destino es público;
 *  la validación es la misma clase que nodo.py.)
 */
"use strict";
const net = require("net");

const [_, _2, BROKER_HOST, BROKER_PUERTO, NOMBRE, PEER_TOKEN, PUERTOS_PERMITIDOS_] = process.argv;
const PUERTOS_OK = new Set((PUERTOS_PERMITIDOS_ || "80,443").split(",").map(Number));
// laboratorio (prueba_tunel local con destinos 127.x): nunca en producción
const PRUEBA_LOCAL = /^(1|prueba|local)$/i.test(process.argv[7] || "");

/* ─── reglas de salida (mismo espíritu que nodo.py, sin asyncio) ─── */
const PRIV = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16],
];
function ipPrivada(host) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!m) return false;                      // nombre → decide el DNS al conectar
  const n = [+m[1], +m[2], +m[3], +m[4]];
  for (const [base, masc] of PRIV) {
    const b = base.split(".").map(Number);
    const bits = masc;
    let iguales = 0;
    for (let i = 0; i < 4 && iguales < bits; i++) {
      const quedan = bits - iguales;
      const cmpBits = Math.min(8, quedan);
      const mask = cmpBits === 0 ? 0 : (~0 << (8 - cmpBits)) & 0xff;
      if ((n[i] & mask) !== (b[i] & mask)) break;
      iguales += cmpBits;
      if (iguales >= bits) return true;
    }
  }
  return false;
}

function log(m) { console.log("[tunel] " + m); }
function envia(idc, tipo, payload) {
  socket.write(tipo + " " + idc + (payload ? " " + payload.length + "\n" : "\n"));
  if (payload && payload.length) socket.write(payload);
}

/* ─── sub-conexiones: la ejecución del salto ─── */
const subs = new Map(); // id -> {salto:{host,puerto,resto}, sock, rutaLeida}

function cierra(idc) {
  const s = subs.get(idc);
  subs.delete(idc);
  if (s && s.sock) { try { s.sock.destroy(); } catch {} }
}

function abre_salto(idc, rutaLinea) {
  // rutaLinea = "siguiente,resto\n" (intermedio) o "destino:puerto\n" (exit).
  // El peer SIEMPRE conecta al primero de la lista: si él es el exit, la
  // "ruta" es el destino y no envía línea alguna (protocolo nodo).
  const partes = rutaLinea.trim().split(",").filter(Boolean);
  if (!partes.length) { cierra(idc); envia(idc, "FIN"); return; }
  const primero = partes[0];
  const esExit = partes.length === 1;
  const idx = primero.lastIndexOf(":");
  if (idx < 1) { envia(idc, "FIN"); cierra(idc); return; }
  const host = primero.slice(0, idx);
  const puerto = Number(primero.slice(idx + 1));

  if (esExit) {
    // exit externo: mismas reglas del circuito (80/443, anti-privadas). Con
    // el flag de laboratorio (8º argumento = "prueba") se permiten destinos
    // locales para el e2e; en producción el agente lanza SIN ese flag.
    if (!PUERTOS_OK.has(puerto) || (!PRUEBA_LOCAL && (ipPrivada(host) || /^localhost$/i.test(host)))) {
      log(`exit denegado a ${host}:${puerto}`);
      envia(idc, "FIN"); cierra(idc); return;
    }
  }
  const s = subs.get(idc) || {};
  s.ruta = { partes };
  subs.set(idc, s);
  const sock = net.connect(puerto, host, () => {
    s.sock = sock;
    // usar la cola antes de la conexión (payloads llegados entre medias)
    if (s.cola && s.cola.length) {
      for (const trozo of s.cola) sock.write(trozo);
      s.cola = [];
    }
    // si quedan más saltos tras este peer, pasar la ruta restante
    if (!esExit) {
      const resto = partes.slice(1).join(",");
      if (resto) sock.write(resto + "\n");
    }
    // (si es exit: nada que escribir, el destino espera bytes del usuario)
  });
  s.sock = sock;
  sock.setNoDelay(true);
  sock.on("data", (d) => { try { envia(idc, "DATA", d); } catch { cierra(idc); } });
  sock.on("close", () => { try { envia(idc, "FIN"); } catch {} cierra(idc); });
  sock.on("error", (e) => { log(`salto ${host}:${puerto}: ${e.message}`); try { envia(idc, "FIN"); } catch {} cierra(idc); });
}

/* ─── conexión al broker + framing ─── */
let socket = null;
let vivo = true;
let retardo = 1000;
let acumulado = Buffer.alloc(0);

function conectar() {
  if (!vivo) return;
  socket = net.connect({ host: BROKER_HOST, port: Number(BROKER_PUERTO) }, () => {
    socket.write(`TUNNEL ${NOMBRE} ${PEER_TOKEN}\n`);
  });
  socket.on("data", (d) => { acumulado = Buffer.concat([acumulado, d]); procesar(); });
  socket.on("error", (e) => log("broker: " + e.message));
  socket.on("close", () => {
    subs.forEach((_, idc) => cierra(idc));
    acumulado = Buffer.alloc(0);
    if (vivo) {
      log(`reconectando en ${retardo} ms`);
      setTimeout(conectar, retardo);
      retardo = Math.min(30000, retardo * 2);
    }
  });

  function procesar() {
    for (;;) {
      const nl = acumulado.indexOf("\n");
      if (nl < 0) return;
      const linea = acumulado.slice(0, nl).toString();
      const partes = linea.split(" ");
      let consumo = nl + 1;
      let payload = null;
      if (partes[0] === "DATA" && partes.length === 3) {
        const n = Number(partes[2]);
        if (acumulado.length < consumo + n) return; // payload incompleto
        payload = acumulado.slice(consumo, consumo + n);
        consumo += n;
      }
      acumulado = acumulado.slice(consumo);
      despacha(partes, payload);
    }
  }

  function despacha(partes, payload) {
    const [tipo, idc] = partes;
    if (tipo === "OK") { retardo = 1000; log("túnel aceptado (sin puertos abiertos en tu router)"); return; }
    if (tipo === "NOOPTIN") { log("tu dueño NO ha aceptado el salto: túnel rechazado"); vivo = false; return; }
    if (tipo === "NO") { log("credenciales rechazadas"); vivo = false; return; }
    if (tipo === "OPEN") { subs.set(idc, {}); return; }
    if (tipo === "DATA" && subs.has(idc)) {
      const s = subs.get(idc);
      if (!s.ruta) {
        // primer payload = línea de ruta del protocolo nodo
        const ruta = payload.toString().split("\n")[0];
        abre_salto(idc, ruta);
      } else if (s.sock) {
        s.sock.write(payload);
      } else {
        // el salto aún conecta: encola
        (s.cola = s.cola || []).push(payload);
      }
      return;
    }
    if (tipo === "FIN") { cierra(idc); return; }
  }
}

process.on("SIGTERM", () => { vivo = false; process.exit(0); });
process.on("SIGINT", () => { vivo = false; process.exit(0); });
log(`agente arriba (${NOMBRE} → ${BROKER_HOST}:${BROKER_PUERTO}, conexión saliente: sin puertos)`);
conectar();
