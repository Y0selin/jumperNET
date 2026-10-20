#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Agente de salida de JumperNET — corre en TU equipo (Linux/Mac) en Python 3
sin DEPENDENCIAS (solo librería estándar; usa `cryptography` si la tienes).

Qué hace: mantiene UNA conexión TCP SALIENTE hacia el broker de la red y por
ella llegan los circuitos de otros usuarios. Tu equipo ejecuta el SALTO con
su propia conexión a internet — como un relay de Tor: sin abrir NINGÚN puerto
en tu router y la IP que ven los destinos es LA DE TU CASA.

Uso:
    python3 agente_salida.py <token> <nombre>     # token y nombre (peer_u<N>)
                                                  # los copias del panel web
    python3 agente_salida.py                      # primera vez: los pregunta
    python3 agente_salida.py -d <token> <nombre>  # en 2.º plano (jn_agente.log)
        (opcional:  --broker host  ·  --clave CLAVE_SALTOS)

PARARLO:
    python3 agente_salida.py --stop           # cierra el agente en marcha
    (o Ctrl+C si lo ves en consola; o  pkill -f agente_salida.py)

Sin el «acepto ser salto» activado en el panel, el broker contesta NOOPTIN y
el agente se apaga: acepta el opt-in antes de ejecutarlo."""
import os
import re
import socket
import struct
import sys
import threading
import time

BROKER_DEF = os.environ.get("JN_BROKER", "jumpernet.duckdns.org")
API_DEF = os.environ.get("JN_API", "https://jumpernet.duckdns.org")
PTO_TUNEL = 9008     # túnel de peers (sin puertos abiertos)
PTO_NODOS = 9009     # DIAL entre peers / DIALN hacia la red interna
PUERTOS_OK = {80, 443}
CHUNK = 16 * 1024    # texto claro por registro JENC (igual que _comun/cifra.py)

nota = lambda m: print("[" + time.strftime("%H:%M:%S") + "] " + m, flush=True)


# ════════════════════════ JENC: ChaCha20-Poly1305 (RFC 8439) ═════════════════
# Formato byte a byte igual que servicio/_comun/cifra.py:
#   magia "JENC" + registros [len 4B BE][nonce 12B][ciphertext||tag 16B]
#   clave = SHA-256(CLAVE_SALTOS) · AAD nulo · ct||tag concatenados
MAGIA = b"JENC"

try:
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305 as _AEAD
except ImportError:
    _AEAD = None

if _AEAD:
    class _Cifra:
        def __init__(self, k): self.k = k
        def cifra(self, plano, nonce): return _AEAD(self.k).encrypt(nonce, plano, None)
        def descifra(self, ct_tag, nonce): return _AEAD(self.k).decrypt(nonce, ct_tag, None)
else:
    # implementación PURA (solo stdlib) en su propio fichero: sin trucos de
    # import, misma salida byte a byte que la lib (comprobado contra ella)
    from _chacha_puro import Cifrador as _CifraPura   # clase pura en su fichero

    class _Cifra:
        __slots__ = ("_real",)
        def __init__(self, k):
            self._real = _CifraPura(k)
        def cifra(self, plano, nonce): return self._real.cifra(plano, nonce)
        def descifra(self, ct_tag, nonce): return self._real.descifra(ct_tag, nonce)


class JENC:
    """Registros JENC sobre bytes: registra() / descifra_registro()."""

    def __init__(self, secreto: str):
        self.aead = _Cifra(__import__("hashlib").sha256(secreto.encode()).digest()) if secreto else None

    def registra(self, plano: bytes, nonce: bytes) -> bytes:
        ct_tag = self.aead.cifra(plano, nonce)
        return struct.pack("!I", len(ct_tag)) + nonce + ct_tag

    def descifra(self, ct_tag: bytes, nonce: bytes) -> bytes:
        return self.aead.descifra(ct_tag, nonce)


# ─── reglas de salida (mismo espíritu que nodo.py) ───────────────────────────
REDES_PRIV = ("0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
              "169.254.0.0/16", "172.16.0.0/12", "192.168.0.0/16")


def es_ip_privada(host: str) -> bool:
    if not re.fullmatch(r"\d+\.\d+\.\d+\.\d+", host or ""):
        return False          # es un nombre: lo decide el DNS al conectar
    try:
        import ipaddress
        ip = ipaddress.ip_address(host)
        return any(ip in ipaddress.ip_network(r) for r in REDES_PRIV)
    except ValueError:
        return True


# ══════════════════════════════════════════════ agente ═══════════════════════
class Subcon:
    """Una sub-conexión: id del broker ↔ socket hacia el siguiente salto/destino."""
    __slots__ = ("idc", "sock", "cola", "buf", "fase", "puede_jenc", "modo", "salio_jenc", "ruta_leida")

    def __init__(self, idc):
        self.idc = idc
        self.sock = None
        self.cola = []          # bytes del usuario que llegaron mientras conecta
        self.buf = b""
        self.ruta_leida = False
        self.fase = "conectando"   # conectando | dial_gate | decide | plano | jenc
        self.puede_jenc = False
        self.modo = None        # 'jenc' | 'plano' (lo decide la magia del stream)
        self.salio_jenc = False # magia ya emitida en las respuestas


class Agente:
    def __init__(self, nombre, token, clave, broker, pto_tunel, pto_nodos):
        self.nombre, self.token, self.broker = nombre, token, broker
        self.pto_tunel, self.pto_nodos = pto_tunel, pto_nodos
        self.jenc = JENC(clave)
        self.sock = None
        self.subs: dict[str, Subcon] = {}
        self.vivo = True
        self.tok = threading.Lock()   # los sendall al broker son atómicos
        threading.Thread(target=self.latido, daemon=True).start()

    # ── envío al broker (atómico) ──
    def manda(self, datos: bytes):
        with self.tok:
            self.sock.sendall(datos)

    def payload_a_broker(self, idc, tipo, payload: bytes):
        if payload:
            self.manda(f"{tipo} {idc} {len(payload)}\n".encode() + payload)
        else:
            self.manda(f"{tipo} {idc}\n".encode())

    def fin(self, idc=None, sub: Subcon | None = None):
        idc = idc or (sub.idc if sub else None)
        sub = sub or self.subs.pop(idc, None)
        if idc:
            try: self.payload_a_broker(idc, "FIN", b"")
            except Exception: pass
        if sub and sub.sock:
            try: sub.sock.destroy = None
            except AttributeError: pass
            try: sub.sock.shutdown(socket.SHUT_RDWR)
            except Exception: pass
            try: sub.sock.close()
            except Exception: pass

    # ── apertura del salto (hilo aparte: conecta y arranca el eco) ──
    def abre_salto(self, sub: Subcon, ruta_linea: bytes, sobra: bytes):
        partes = [p for p in ruta_linea.decode(errors="replace").strip().split(",") if p]
        if not partes:
            self.fin(sub=sub); return
        primero = partes[0]
        es_exit = len(partes) == 1
        dial_peer = primero[len("tunel:"):] if primero.startswith("tunel:") else None
        if dial_peer:
            host, puerto = self.broker, self.pto_nodos
        else:
            host, _, pto = primero.rpartition(":")
            try:
                puerto = int(pto)
            except ValueError:
                nota("ruta sin puerto válido"); self.fin(sub=sub); return
        # EXIT EXTERNO: mismas reglas que nodo.py (80/443 · nada de privadas).
        if es_exit and (puerto not in PUERTOS_OK or es_ip_privada(host) or host.lower() == "localhost"):
            nota(f"exit denegado a {host}:{puerto} (política 80/443 y anti-privadas)")
            self.fin(sub=sub); return
        sub.puede_jenc = bool(self.jenc.aead)
        self.subs[sub.idc] = sub
        if sobra:
            sub.buf = sobra
        threading.Thread(target=self._conecta_salto,
                         args=(sub, host, puerto, dial_peer, partes, es_exit), daemon=True).start()

    def _conecta_salto(self, sub, host, puerto, dial_peer, partes, es_exit):
        try:
            sock = socket.create_connection((host, puerto), timeout=8)
        except Exception as e:
            if isinstance(e, socket.gaierror) and not es_exit and dial_peer is None:
                # nombre de la red interna (nodoX del VPS) no resuelve desde la
                # casa del peer: el broker vive dentro y sí lo ve → DIALN
                self._dialn(sub, partes, host, puerto)
                return
            nota(f"salto {host}:{puerto}: {e}")
            self.fin(sub=sub); return
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        sub.sock = sock
        resto = ",".join(partes[1:])
        try:
            if dial_peer:
                # la conexión con el siguiente peer se pide por el 9009; la
                # línea DIAL y la ruta restante VAN PRIMERO (el broker lee
                # líneas: si se colase un binario JENC lo leeria como DIAL)
                sock.sendall(f"DIAL {dial_peer} {self.token}\n".encode())
                sub.fase = "dial_gate"
                if resto:
                    sock.sendall((resto + "\n").encode())
            elif not es_exit and resto:
                sub.fase = "decide"
                sock.sendall((resto + "\n").encode())
            else:
                sub.fase = "decide"
        except Exception as e:
            nota(f"salto {host}:{puerto}: {e}"); self.fin(sub=sub); return
        # bytes del usuario que ya llegaron (posible magia JENC incluida):
        for trozo in sub.cola:
            self.alimenta(sub, trozo)
        sub.cola = []
        self.alimenta(sub, b"")          # dispara la maq. de estados con lo acumulado
        threading.Thread(target=self._eco, args=(sub, sock), daemon=True).start()

    def _dialn(self, sub, partes, host, puerto):
        """DIALN <host:puerto> al broker: él conecta el siguiente salto por ti."""
        try:
            sock = socket.create_connection((self.broker, self.pto_nodos), timeout=8)
        except Exception as e:
            nota(f"DIALN {host}:{puerto}: {e}"); self.fin(sub=sub); return
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        sub.sock = sock
        try:
            sock.sendall(f"DIALN {host}:{puerto} {self.token}\n".encode())
            resto = ",".join(partes[1:])
            if resto:
                sock.sendall((resto + "\n").encode())
        except Exception as e:
            nota(f"DIALN: {e}"); self.fin(sub=sub); return
        sub.fase = "decide"
        for trozo in sub.cola:
            self.alimenta(sub, trozo)
        sub.cola = []
        self.alimenta(sub, b"")
        threading.Thread(target=self._eco, args=(sub, sock), daemon=True).start()

    # ── bytes del USUARIO (por el túnel) → al destino ──
    def alimenta(self, sub: Subcon, datos: bytes):
        sock = sub.sock
        if sock is None:
            sub.cola.append(bytes(datos)); return
        sub.buf += bytes(datos)
        if sub.fase == "dial_gate" and b"\n" in sub.buf:
            # la primera línea quiere ser el 'OK/ERR' del broker: si dice ERR
            # aborta; si no, es tráfico del peer y a decidir el modo
            primera, _, resto = sub.buf.partition(b"\n")
            if first_word(primera) == "ERR":
                nota(f"DIAL: {primera.decode(errors='replace').strip()}")
                self.fin(sub=sub); return
            sub.buf, sub.fase = resto, "decide"
        if sub.fase == "decide":
            if len(sub.buf) < 4:
                return
            if sub.puede_jenc and sub.buf[:4] == MAGIA:
                sub.modo, sub.buf, sub.fase = "jenc", sub.buf[4:], "jenc"
            else:
                sub.modo, sub.fase = "plano", "plano"
        if sub.fase == "plano":
            try: sock.sendall(sub.buf)
            except Exception: self.fin(sub=sub)
            sub.buf = b""
            return
        while len(sub.buf) >= 4:
            (n,) = struct.unpack("!I", sub.buf[:4])
            if n == 0:                      # terminador: cierre ordenado del usuario
                self.cierra_ordenado(sub); return
            if len(sub.buf) < 4 + 12 + n:
                break
            nonce = sub.buf[4:16]
            ct_tag = sub.buf[16:16 + n]
            sub.buf = sub.buf[16 + n:]
            try:
                plano = self.jenc.descifra(ct_tag, nonce)
            except Exception as e:
                nota("registro JENC corrupto: " + str(e)); self.fin(sub=sub); return
            try: sock.sendall(plano)
            except Exception: self.fin(sub=sub); return

    def cierra_ordenado(self, sub):
        # el usuario cerró: registro len=0 por el túnel + FIN
        if sub.modo == "jenc" and sub.salio_jenc is None:
            try: self.payload_a_broker(sub.idc, "DATA", struct.pack("!I", 0))
            except Exception: pass
        self.fin(sub=sub)

    # ── respuestas del DESTINO → por el túnel hacia el broker ──
    def _eco(self, sub: Subcon, sock: socket.socket):
        try:
            while True:
                datos = sock.recv(65536)
                if not datos:
                    break
                if sub.modo == "jenc":
                    payload = bytearray()
                    if not sub.salio_jenc:
                        payload += MAGIA
                        sub.salio_jenc = True
                    for i in range(0, len(datos), CHUNK):
                        payload += self.jenc.registra(datos[i:i + CHUNK], os.urandom(12))
                    self.payload_a_broker(sub.idc, "DATA", bytes(payload))
                else:
                    self.payload_a_broker(sub.idc, "DATA", datos)
        except Exception:
            pass
        # el destino cerró (o el túnel murió): registro len=0 + FIN
        try:
            if sub.modo == "jenc":
                self.payload_a_broker(sub.idc, "DATA", struct.pack("!I", 0))
        except Exception:
            pass
        self.fin(sub=sub)

    # ── túnel con el broker: framing + despacho ──
    def latido(self):
        while self.vivo:
            time.sleep(25)
            try:
                self.manda(b"PING\n")
            except Exception:
                pass    # el bucle principal se encarga de reconectar

    def mensaje_broker(self, tipo: str):
        if tipo == "OK":
            nota(f"túnel de {self.nombre} aceptado (conexión saliente, cero puertos abiertos)")
        elif tipo == "NOOPTIN":
            nota("tu dueño NO ha aceptado el salto: acepta «acepto ser salto» en el panel y vuelve a lanzar")
            self.vivo = False
        elif tipo == "NO":
            nota("credenciales rechazadas por el broker (¿token correcto?)")
            self.vivo = False
        else:
            nota("broker dice: " + tipo)

    def conectar(self):
        backoff = 1.0
        while self.vivo:
            try:
                self.sock = socket.create_connection((self.broker, self.pto_tunel), timeout=10)
            except Exception as e:
                nota(f"broker {self.broker}:{self.pto_tunel}: {e} — reintento en {backoff:.0f} s")
                time.sleep(backoff); backoff = min(30, backoff * 2); continue
            backoff = 1.0
            self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            try:
                self.sock.sendall(f"TUNNEL {self.nombre} {self.token}\n".encode())
            except Exception as e:
                nota("túnel: " + str(e)); continue
            buf = b""
            try:
                while self.vivo:
                    datos = self.sock.recv(65536)
                    if not datos:
                        raise ConnectionError("túnel cerrado por el broker")
                    buf += datos
                    while True:
                        nl = buf.find(b"\n")
                        if nl < 0:
                            break
                        linea = buf[:nl]; consumo = nl + 1; payload = None
                        partes = linea.decode(errors="replace").split(" ")
                        if partes[0] == "DATA" and len(partes) == 3 and partes[2].isdigit():
                            n = int(partes[2])
                            if len(buf) < consumo + n:
                                break
                            payload = buf[consumo:consumo + n]
                            consumo += n
                        buf = buf[consumo:]
                        self.despacha(partes, payload)
            except Exception as e:
                if self.vivo:
                    nota(f"túnel: {e} — reconectando en {backoff:.0f} s")
                    self.corta_subs()
                    time.sleep(backoff); backoff = min(30, backoff * 2)

    def despacha(self, partes, payload):
        tipo = partes[0]
        if tipo in ("OK", "NOOPTIN", "NO", "ERR", "PING", "PONG"):
            self.mensaje_broker(tipo)
            return
        if len(partes) < 2:
            return
        idc = partes[1]
        if tipo == "OPEN":
            self.subs[idc] = Subcon(idc)
            return
        if tipo == "FIN":
            sub = self.subs.pop(idc, None)
            if sub and sub.sock:
                try: sub.sock.close()
                except Exception: pass
            return
        if tipo == "DATA" and idc in self.subs:
            sub = self.subs[idc]
            if not sub.ruta_leida and sub.sock is None:
                # PRIMER payload = línea de ruta (con o sin \n: pueden llegar en
                # frames separados); los siguientes son el stream del usuario
                # (magia JENC incluida) y van COLA hasta que el salto conecte
                sub.ruta_leida = True
                nl = payload.find(b"\n")
                ruta, sobra = (payload, b"") if nl < 0 else (payload[:nl], payload[nl + 1:])
                self.abre_salto(sub, ruta, sobra)
            elif sub.sock is not None:
                self.alimenta(sub, payload)
            else:
                sub.cola.append(payload)
            return

    def corta_subs(self):
        for sub in list(self.subs.values()):
            if sub.sock:
                try: sub.sock.close()
                except Exception: pass
            try: self.payload_a_broker(sub.idc, "FIN", b"")
            except Exception: pass
        self.subs.clear()


def first_word(linea: bytes) -> str:
    return linea.split(b" ", 1)[0].decode(errors="replace").strip()


def canjea_jwt(jwt: str, api: str):
    """Si lo pegado es el token de SESIÓN de la web (JWT, empieza por «eyJ»),
    lo cambiamos aquí por el token de peer REAL (y la clave, el broker y el
    NOMBRE del nodo) llamando a /peer_token con esa misma sesión. Así el
    usuario puede dejar «solo» el token que ya conoce: el agente saca el resto
    de su cuenta. Devuelve (token, clave, broker, nombre)."""
    import json as _json
    import urllib.request
    req = urllib.request.Request(api + "/peer_token", headers={"Authorization": "Bearer " + jwt})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            datos = _json.loads(r.read(16384))
    except Exception as e:
        raise SystemExit("no pude validar tu sesión (" + str(e)[:90] + "): entra en el panel, "
                         "pestaña Nodos → «Mi equipo como salto», y copia el comando completo.")
    if not isinstance(datos, dict) or not datos.get("peer_token"):
        raise SystemExit("la respuesta de /peer_token no vale: " + str(datos)[:90])
    return (datos["peer_token"], datos.get("clave_saltos") or "",
            datos.get("broker") or "", datos.get("nombre") or "")


def pid_path(nombre: str) -> str:
    base = os.environ.get("HOME") or os.environ.get("APPDATA") or "."
    return os.path.join(base, f".jn_agente_{nombre}.pid")


def pid_vivo(nombre: str):
    try:
        pid = int(open(pid_path(nombre)).read().strip())
        os.kill(pid, 0)
        return pid
    except Exception:
        return None


def parar(nombre: str):
    pid = pid_vivo(nombre)
    if not pid:
        nota(f"no hay ningún agente {nombre} en marcha"); return 1
    os.kill(pid, 15)
    for _ in range(20):
        time.sleep(0.15)
        try:
            os.kill(pid, 0)
        except OSError:
            break
    else:
        os.kill(pid, 9)
    try: os.unlink(pid_path(nombre))
    except Exception: pass
    nota(f"agente {nombre} (pid {pid}) parado")
    return 0


def demonio():
    try:
        pid = os.fork()
        if pid:
            os._exit(0)     # el padre se va; el hijo sigue
        os.setsid()
        segunda = os.fork()
        if segunda:
            os._exit(0)
    except Exception as e:
        nota("no pude ir a 2.º plano (¿Windows?): " + str(e))
        nota("en Windows usa el .exe o un Tarea Programada — sigo en 1.er plano")
        return
    log = open("jn_agente.log", "ab", buffering=0)
    os.dup2(log.fileno(), 1); os.dup2(log.fileno(), 2)


def main():
    args = sys.argv[1:]
    broker, clave, api = BROKER_DEF, os.environ.get("JN_CLAVE", ""), API_DEF
    if "--broker" in args:
        i = args.index("--broker")
        broker = args[i + 1] if i + 1 < len(args) else broker
        args = args[:i] + args[i + 2:]
    if "--clave" in args:
        i = args.index("--clave")
        clave = args[i + 1] if i + 1 < len(args) else clave
        args = args[:i] + args[i + 2:]
    if "--api" in args:
        i = args.index("--api")
        api = args[i + 1] if i + 1 < len(args) else api
        args = args[:i] + args[i + 2:]
    if "--help" in args or "-h" in args:
        print(__doc__); return 0

    if args and args[0] == "--stop":
        return parar(args[1] if len(args) > 1 else None or "peer")

    nombre = None
    token = None
    plano = "-d" in args
    args = [a for a in args if a != "-d"]
    if len(args) >= 1: token = args[0]
    if len(args) >= 2: nombre = args[1]
    # canje ANTES de validar el nombre: con el JWT de la web los dos datos
    # (token real y nombre del nodo) salen de la respuesta de /peer_token
    if token and token.startswith("eyJ"):
        nota(f"detectado token de SESIÓN (JWT): lo cambio por tu token de peer en {api}…")
        token, clave_nueva, broker_canje, nombre_canje = canjea_jwt(token, api)
        nombre = nombre or nombre_canje
        if not clave:
            clave = clave_nueva
        if broker_canje:
            partes_br = broker_canje.split(":")
            broker = partes_br[0]
            if len(partes_br) > 1:
                PTO_TUNEL = int(partes_br[1])
        nota(f"cambio hecho: token de peer aceptado ({nombre})")
    if not token or not nombre:
        print("Falta el token: cópialo del panel web (pestaña Nodos → «Mi equipo como salto»)")
        print("o pega el token de tu SESIÓN (el que empieza por eyJ) — el agente saca el resto solo.")
        token = token or input("token de peer o de sesión: ").strip()
        if token and token.startswith("eyJ") and not nombre:
            token, clave_nueva, broker_canje, nombre_canje = canjea_jwt(token, api)
            nombre = nombre or nombre_canje
            if not clave:
                clave = clave_nueva
        nombre = nombre or input("nombre del nodo (peer_u<N>): ").strip()
    if not (nombre and nombre.startswith("peer_")):
        nota(f"nombre de nodo no válido ({nombre!r}): se necesita peer_u<N>")
        return 2
    if plano:
        demonio()
    if pid_vivo(nombre):
        nota(f"ya hay un agente {nombre} en marcha (pid {pid_vivo(nombre)}); no arranco otro")
        return 0

    nota(f"agente de salida {nombre} → {broker} (conexión saliente: sin puertos abiertos)")
    if not clave:
        nota("(sin clave JENC: intersuelo servidor sin cifrado de saltos)")
    a = Agente(nombre, token, clave, broker, PTO_TUNEL, PTO_NODOS)
    try:
        open(pid_path(nombre), "w").write(str(os.getpid()))
    except Exception:
        pass
    try:
        a.conectar()
    except KeyboardInterrupt:
        pass
    finally:
        a.vivo = False
        try: os.unlink(pid_path(nombre))
        except Exception: pass
        nota(f"agente {nombre} apagado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
