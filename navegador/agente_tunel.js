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
const crypto = require("crypto");

const [_, _2, BROKER_HOST, BROKER_PUERTO, NOMBRE, PEER_TOKEN, PUERTOS_PERMITIDOS_] = process.argv;
const PUERTOS_OK = new Set((PUERTOS_PERMITIDOS_ || "80,443").split(",").map(Number));
// Clave del cifrado de saltos (JENC, ver servicios/_comun/cifra.py): la entrega
// /peer_token SOLO al dueño del peer (JWT + opt-in). Con ella, el agente puede
// ejecutar el EXIT descifrando el stream punt-a-punt. Sin clave: relés ciegos
// (intermedio) y exit plano (red sin JENC).
const CLAVE_SALTOS = process.argv[7] || "";
// Puerto de NODOS del broker (DIAL entre peers): convención 9008 peers /
// 9009 nodos; el 9º arg lo permite pasar por si un despliegue cambia puertos.
const PTO_BROKER_NODOS = Number(process.argv[9]) || 9009;
// laboratorio (prueba_tunel local con destinos 127.x): nunca en producción
const PRUEBA_LOCAL = /^(1|prueba|local)$/i.test(process.argv[8] || "");
const JENC = {
  MAGIA: Buffer.from("JENC"),
  LEN: 4,           // prefijo de longitud BE
  CHUNK: 16 * 1024, // texto claro por registro (igual que _comun/cifra.py)
  clave: CLAVE_SALTOS
    ? crypto.createHash("sha256").update(CLAVE_SALTOS, "utf8").digest()
    : null,
};

function jenc_descifra(ucha, nonce, tag) {
  const d = crypto.createDecipheriv("chacha20-poly1305", JENC.clave, nonce, { authTagLength: 16 });
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ucha), d.final()]);
}
function jenc_cifra(plano) {
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv("chacha20-poly1305", JENC.clave, nonce, { authTagLength: 16 });
  // Node devuelve ct en update/final y el tag por SEPARADO (getAuthTag): el
  // formato del registro es ct||tag (como ChaCha20Poly1305.encrypt de python)
  const ucha = Buffer.concat([c.update(plano), c.final(), c.getAuthTag()]);
  return { nonce, ucha };   // registro: [len=ucha.length][nonce][ucha=ct||tag]
}

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

function abre_salto(idc, rutaLinea, resto) {
  // rutaLinea = "siguiente,resto\n" (intermedio) o "destino:puerto\n" (exit).
  // resto   = bytes del MISMO frame que venían tras la línea de ruta (el TCP
  //         puede coalescer ruta + magia JENC + primer registro): nada se pierde.
  // El peer SIEMPRE conecta al primero de la lista: si él es el exit, la
  // "ruta" es el destino y no envía línea alguna (protocolo nodo).
  const partes = rutaLinea.trim().split(",").filter(Boolean);
  if (!partes.length) { cierra(idc); envia(idc, "FIN"); return; }
  const primero = partes[0];
  const esExit = partes.length === 1;
  // Salto a OTRO peer por túnel ("tunel:peer_u41"): igual que hace la entrada
  // (ver conectar_circuito de entrada-http): DIAL al puerto de NODOS del
  // broker y desde ahí la conversación es un socket directo al servicio local
  // del siguiente peer — ese peer nunca abre puertos en su router.
  const dialPeer = primero.startsWith("tunel:") ? primero.slice(6) : null;
  const host = dialPeer ? BROKER_HOST : primero.slice(0, primero.lastIndexOf(":"));
  const puerto = dialPeer ? PTO_BROKER_NODOS : Number(primero.slice(primero.lastIndexOf(":") + 1));

  if (esExit) {
    // exit externo: mismas reglas del circuito (80/443, anti-privadas). Con
    // el flag de laboratorio (9º argumento = "prueba") se permiten destinos
    // locales para el e2e; en producción el agente lanza SIN ese flag.
    if (!PUERTOS_OK.has(puerto) || (!PRUEBA_LOCAL && (ipPrivada(host) || /^localhost$/i.test(host)))) {
      log(`exit denegado a ${host}:${puerto}`);
      envia(idc, "FIN"); cierra(idc); return;
    }
  }
  const s = subs.get(idc) || {};
  s.ruta = { partes, esExit };
  s.inbuf = Buffer.alloc(0);
  s.fase = "decide";         // primeralectura del stream: ¿viene JENC?
  if (esExit && JENC.clave) s.puede_jenc = true;
  subs.set(idc, s);
  s.pendiente = Buffer.alloc(0);
  if (resto && resto.length) s.inbuf = Buffer.concat([s.inbuf, resto]);
  const sock = net.connect(puerto, host, () => {
    s.sock = sock;
    // usar la cola antes de la conexión (payloads llegados entre medias)
    if (s.cola && s.cola.length) {
      for (const trozo of s.cola) alimenta(s, trozo);
      s.cola = [];
    }
    if (s.inbuf.length) { alimenta(s, s.inbuf); s.inbuf = Buffer.alloc(0); }
    if (dialPeer) {
      // pedimos al broker la conexión con el siguiente peer y le pasamos la
      // ruta restante (el servicio local de ese peer ejecuta el salto)
      sock.write(`DIAL ${dialPeer}\n`);
      const resto = partes.slice(1).join(",");
      if (resto) sock.write(resto + "\n");
    } else if (!esExit) {
      // si quedan más saltos tras este peer, pasar la ruta restante (ciego:
      // el JENC del circuito es transpaente para los intermedios)
      const resto = partes.slice(1).join(",");
      if (resto) sock.write(resto + "\n");
    }
      // (si es exit: nada que escribir, el destino espera bytes del usuario)
  });
  s.sock = sock;
  sock.setNoDelay(true);
  sock.on("data", (d) => respuesta(s, idc, d));
  sock.on("close", () => { try { cierra_salida(s, idc); } catch {} cierra(idc); });
  sock.on("error", (e) => { log(`salto ${host}:${puerto}: ${e.message}`); try { envia(idc, "FIN"); } catch {} cierra(idc); });
  if (esExit && s.inbuf.length && sock.writable && sock.connecting === false) {
    alimenta(s, s.inbuf); s.inbuf = Buffer.alloc(0);
  }
}

/* ─── lado usuario (lo que llega por el túnel) → al destino ─── */
// Con JENC el exit lee: magia "JENC" + registros [4B len][12B nonce][ct||tag];
// registro len=0 = cierre ordenado. Sin JENC: bytes planos. La decisión es
// OJO: los 4 primeros bytes tras la ruta (exacto como nodo.py exit).
function alimenta(s, d) {
  if (!s.sock || !s.sock.writable) { (s.pendiente = Buffer.concat([s.pendiente||Buffer.alloc(0), d])); return; }
  s.inbuf = Buffer.concat([s.inbuf, d]);
  if (s.fase === "decide") {
    // entrada de datos en espera de conocer el modo
    if (s.inbuf.length < 4) return;
    const mag = s.inbuf.slice(0, 4).toString("latin1");
    if (s.puede_jenc && mag === "JENC") {
      s.fase = "jenc";
      s.modo = "jenc";
      s.inbuf = s.inbuf.slice(4);
    } else {
      s.fase = "plano";
      s.modo = "plano";
    }
  }
  if (s.fase === "plano") {
    s.sock.write(s.inbuf);
    s.inbuf = Buffer.alloc(0);
    return;
  }
  // modo jenc: registros frameados
  while (s.inbuf.length >= 4) {
    const n = s.inbuf.readUInt32BE(0);
    if (n === 0) { cierra_salida_ordenada(s); return; }
    const total = 4 + 12 + n;   // n = ct||tag
    if (s.inbuf.length < total) break;
    const nonce = s.inbuf.slice(4, 16);
    const ucha = s.inbuf.slice(16, total);
    const tag = ucha.slice(ucha.length - 16);
    const cuerpo = ucha.slice(0, ucha.length - 16);
    let plano;
    try { plano = jenc_descifra(cuerpo, nonce, tag); }
    catch { log("registro JENC corrupto"); envia(s.idc, "FIN"); cierra(s.idc); return; }
    s.sock.write(plano);
    s.inbuf = s.inbuf.slice(total);
  }
}

/* ─── lado destino (respuestas) → por el túnel hacia el especial ─── */
// Si el stream entró con JENC, las respuestas VUELVEN cifradas (el Receptor de
// la entrada espera la magia). En plano: bytes tal cual.
function respuesta(s, idc, datos) {
  // guarda ID para los errores del socket
  s.idc = idc;
  if (s.modo !== "jenc") { try { envia(idc, "DATA", datos); } catch { cierra(idc); } return; }
  try {
    // TODO lo que sale hacia el broker va EMARCADO como DATA <idc> <n> (el broker
    // multiplexa líneas; bytes crudos aquí se pierden — era el corte del salto JENC)
    const trozos = [];
    if (!s.jenc_out) {
      trozos.push(JENC.MAGIA);            // magia al circuito (4 bytes, una vez)
      s.jenc_out = true;
    }
    for (let i = 0; i < datos.length; i += JENC.CHUNK) {
      const trozo = datos.slice(i, i + JENC.CHUNK);
      const { nonce, ucha } = jenc_cifra(trozo);
      trozos.push(intABytes(ucha.length), nonce, ucha);   // registro: len+nonce+ct||tag
    }
    envia(idc, "DATA", Buffer.concat(trozos));
  } catch (e) { log("respuesta JENC: " + e.message); try { envia(idc, "FIN"); } catch {} cierra(idc); }
}

function cierra_salida_ordenada(s) {
  // el usuario cerró: registro len=0 (terminador, EMARCADO en DATA) + FIN del túnel
  if (s.modo === "jenc" && s.jenc_out && s.idc) {
    try { envia(s.idc, "DATA", intABytes(0)); } catch {}
  }
  if (s.sock) { try { s.sock.end(); } catch {}
    try { s.sock.destroy(); } catch {} }
}
function cierra_salida(s, idc) {
  // el destino cerró (o el túnel muere): en JENC envía len=0 y FIN; en plano FIN
  if (s.modo === "jenc" && s.jenc_out) { try { envia(idc, "DATA", intABytes(0)); } catch {} }
  try { envia(idc, "FIN"); } catch {}
}
function intABytes(n) {
  const b = Buffer.alloc(4); b.writeUInt32BE(n, 0); return b;
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
    // SO_KEEPALIVE del SO a 15 s: los routers/NAT modernos sueltan TCP
    // «invisibles» (el comportamiento que dejó el túnel muerto a los ~27 s
    // en campo); lo marcamos como vivo a nivel kernel TAMBIÉN.
    socket.setKeepAlive(true, 15000);
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
    for (;;) {    const nl = acumulado.indexOf("\n");
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
    if (tipo === "OPEN") { log("OPEN " + idc); subs.set(idc, {}); return; }
    if (tipo === "DATA" && subs.has(idc)) {
      const s = subs.get(idc);
      if (!s.ruta) {
        // primer payload = línea de ruta (y lo que venga detrás en el frame)
        const nl = payload.indexOf(10);   // '\n'
        const ruta = (nl >= 0 ? payload.slice(0, nl + 1) : payload).toString();
        const sobra = nl >= 0 ? payload.slice(nl + 1) : Buffer.alloc(0);
        abre_salto(idc, ruta, sobra);
      } else if (s.sock) {
        // bytes del usuario → alimenta (plano o JENC según lo detectado)
        alimenta(s, payload);
      } else {
        // el salto aún conecta: encola (alimenta se ocupa al conectar)
        (s.cola = s.cola || []).push(payload);
      }
      return;
    }
    if (tipo === "FIN") { cierra(idc); return; }
  }
}

process.on("SIGTERM", () => { vivo = false; process.exit(0); });
process.on("SIGINT", () => { vivo = false; process.exit(0); });

/* keepalive de aplicación (25 s < ventana del broker): línea PING sobre el
 * túnel. El broker la convierte en pulso + PONG — y el tráfico cada 25 s
 * mantiene vivo TAMBIÉN la entrada NAT del router (sin abrir puertos). */
setInterval(() => {
  if (socket && socket.writable) {
    try { socket.write("PING\n"); } catch { /* reconecta el propio socket */ }
  }
}, 25000);

log(`agente arriba (${NOMBRE} → ${BROKER_HOST}:${BROKER_PUERTO}, conexión saliente: sin puertos)`);
conectar();
