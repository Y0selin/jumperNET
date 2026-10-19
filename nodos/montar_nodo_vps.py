#!/usr/bin/env python3
"""montar_nodo_vps.py — convierte un VPS en NODO de la red JumperNET sin tocar
nada de lo que ya está funcionando en el servidor central.

Qué hace (lo más automático posible):
  1) pide/lee configuración (API, puerto, PEER_TOKEN, CLAVE_SALTOS opcional)
  2) abre el puerto del nodo en el firewall LOCAL del VPS si puede
     (ufw → firewalld → iptables con sudo)
  3) comprueba desde FUERA si el puerto queda alcanzable; si no, imprime el
     paso manual (Security List de la nube)
  4) detecta la IP pública del VPS y se registra con heartbeat cada 10 s
     (nombre peer_vps… por defecto; el sondeo de la red lo toma como salto)
  5) arranca el SERVICIO NODO — el MISMO protocolo Fase 1 que los nodos del
     servidor (primera línea de ruta + reenvío ciego) con:
       · puertos de salida 80/443 y bloqueo de IPs privadas/metadata,
       · JENC (cifrado de saltos) como EXIT cuando el red lo tenga activado,
         si está instalado `pip install cryptography` y configuraste la clave.
  6) con --systemd instala una unidad que lo levanta al arrancar el VPS.

Pasos MANUALES que el script deja escritos en pantalla cuando tocan:
  · Oracle/otras nubes con Security List: regla INBOUND TCP <puerto> desde
    0.0.0.0/0 en el panel web (el script lo repite si sigue cerrado).
  · Sin systemd: correrlo con `nohup python3 montar_nodo_vps.py &`.

Solo Python estándar; la cripografía JENC es opcional (pip cryptography).
"""
import argparse
import asyncio
import ipaddress
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

PUERTOS_PERMITIDOS = {80, 443}
REDES_PROHIBIDAS = [ipaddress.ip_network(n) for n in (
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.168.0.0/16",
    "::1/128", "fc00::/7", "fe80::/10",
)]
CHUNK = 16 * 1024
API_DEFECTO = "https://jumpernet.duckdns.org"
MAGIA = b"JENC"
NONCE_BYTES = 12

# crypto opcional (JENC)
try:
    import hashlib as _hashlib
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305 as _AEAD
    TIENE_CRYPTO = True
except Exception:
    TIENE_CRYPTO = False


# ─────────────────────────────── utilidades ───────────────────────────────
def log(m):
    print(f"[nodo-vps {time.strftime('%H:%M:%S')}] {m}", flush=True)


def pregunta(t, defecto=""):
    v = input(f"{t} [{defecto}]: ").strip()
    return v or defecto


def ip_publica() -> str:
    for url in ("https://api.ipify.org", "https://ifconfig.me/ip"):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "jumpernat-nodo/1.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                ip = r.read(64).decode(errors="replace").strip()
            if ip and ip.count(".") == 3:
                return ip
        except Exception:
            continue
    raise RuntimeError("no pude averiguar la IP pública del VPS")


def correr(comando: list[str]) -> tuple[bool, str]:
    try:
        r = subprocess.run(comando, capture_output=True, text=True, timeout=25)
        return r.returncode == 0, (r.stdout + r.stderr).strip()
    except Exception as e:
        return False, str(e)


def somos_root() -> bool:
    try:
        return os.geteuid() == 0
    except Exception:
        return False


def sudo(comando: list[str]) -> tuple[bool, str]:
    return correr(comando) if somos_root() else correr(["sudo"] + comando)


# ─────────────────────────── firewall automático ──────────────────────────
def abre_puerto(puerto: int) -> None:
    """Abre el puerto TCP en el firewall LOCAL (ufw → firewalld → iptables)."""
    log("abriendo el puerto en el firewall local…")
    hecho = False
    ok, _ = correr(["which", "ufw"])
    if ok:
        ok, sal = sudo(["ufw", "allow", f"{puerto}/tcp"])
        if ok:
            log(f"ufw: regla {puerto}/tcp añadida")
            hecho = True
        else:
            log(f"ufw sin efecto ({sal[:80]})")
    if not hecho:
        ok, _ = correr(["which", "firewall-cmd"])
        if ok:
            ok, sal = sudo(["firewall-cmd", "--permanent", f"--add-port={puerto}/tcp"])
            if ok:
                sudo(["firewall-cmd", "--reload"])
                log("firewalld: puerto añadido y recargado")
                hecho = True
            else:
                log(f"firewall-cmd sin efecto ({sal[:80]})")
    if not hecho:
        ok, _ = correr(["which", "iptables"])
        if ok:
            ok, sal = sudo(["iptables", "-I", "INPUT", "1", "-p", "tcp",
                            "--dport", str(puerto), "-j", "ACCEPT"])
            if ok:
                log("iptables: regla insertada (se pierde al reiniciar; "
                    "con --systemd se reabrirá pero usa iptables-persistent si puedes)")
                hecho = True
            else:
                log(f"iptables sin efecto ({sal[:80]})")
    if not hecho:
        log("AVISO: no hay firewall local controlable (¿contenedor/Docker?) — "
            "si el puerto no abre desde fuera, el bloqueo viene de la NUBE.")


def puerto_abre_desde_fuera(ip: str, puerto: int, timeout: float = 4.0) -> bool:
    try:
        with socket.create_connection((ip, puerto), timeout=timeout):
            return True
    except Exception:
        return False


# ─────────────────────────────── JENC (Fase 8) ────────────────────────────
class JencEmisor:
    """Cifra el stream hacia el circuito tras escribir la magia (la entrada
    espera exactamente esto: ver deploy/servicios/_comun/cifra.py)."""

    def __init__(self, aead):
        self.aead = aead
        self._magia = False

    async def enviar(self, writer, datos: bytes) -> None:
        if not self._magia:
            writer.write(MAGIA)
            self._magia = True
        nonce = os.urandom(NONCE_BYTES)
        ct = self.aead.encrypt(nonce, datos, None)
        writer.write(len(ct).to_bytes(4, "big") + nonce + ct)
        await writer.drain()

    async def cerrar(self, writer) -> None:
        if self._magia:
            writer.write((0).to_bytes(4, "big"))
            await writer.drain()


class JencReceptor:
    """Descifra el stream que LLEGA del circuito (usado por el EXIT)."""

    def __init__(self, aead):
        self.aead = aead

    async def recibir(self, reader) -> bytes:
        prefijo = await reader.readexactly(4)
        n = int.from_bytes(prefijo, "big")
        if n == 0:
            return b""
        bloque = await reader.readexactly(NONCE_BYTES + n)
        nonce, ct = bloque[:NONCE_BYTES], bloque[NONCE_BYTES:]
        return self.aead.decrypt(nonce, ct, None)


# ───────────────────────────── protocolo de saltos ────────────────────────
def destino_valido(objetivo: str) -> bool:
    try:
        host, puerto = objetivo.rsplit(":", 1)
        puerto = int(puerto)
    except ValueError:
        return False
    if puerto not in PUERTOS_PERMITIDOS:
        return False
    if host.strip().lower() == "web-destino":
        return True          # destino interno para pruebas del dueño
    try:
        ips = {i[4][0] for i in socket.getaddrinfo(host, None)}
    except Exception:
        return False
    for ip in ips:
        try:
            if any(ipaddress.ip_address(ip) in r for r in REDES_PROHIBIDAS):
                return False
        except ValueError:
            continue
    return True


async def reenviar_plano(a: asyncio.StreamReader, b: asyncio.StreamWriter) -> None:
    try:
        while True:
            datos = await a.read(CHUNK)
            if not datos:
                break
            b.write(datos)
            await b.drain()
    except (ConnectionError, asyncio.IncompleteReadError):
        pass
    finally:
        try:
            b.close()
        except Exception:
            pass


async def reenviar_cifrado_entrada(a: asyncio.StreamReader, b: asyncio.StreamWriter,
                                   aead) -> None:
    emisor = JencEmisor(aead)
    try:
        while True:
            datos = await a.read(CHUNK)
            if not datos:
                break
            await emisor.enviar(b, datos)
        await emisor.cerrar(b)
    except (ConnectionError, asyncio.IncompleteReadError):
        pass
    finally:
        try:
            b.close()
        except Exception:
            pass


async def reenviar_cifrado_salida(a: asyncio.StreamReader, b: asyncio.StreamWriter,
                                  aead) -> None:
    """Del circuito CIFRADO hacia el DESTINO (este nodo es el exit JENC)."""
    try:
        magia = await asyncio.wait_for(a.readexactly(4), timeout=15)
        if magia[:4] != MAGIA:
            log(f"el upstream no habló JENC ({magia!r}); aborto")
            return
        receptor = JencReceptor(aead)
        while True:
            datos = await receptor.recibir(a)
            if not datos:
                break
            b.write(datos)
            await b.drain()
    except (ConnectionError, asyncio.IncompleteReadError, asyncio.TimeoutError):
        pass
    finally:
        try:
            b.close()
        except Exception:
            pass


async def hop_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    contador = getattr(hop_handler, "contador", None)
    aead = getattr(hop_handler, "aead", None)
    try:
        linea = await asyncio.wait_for(reader.readline(), timeout=15)
        ruta = linea.decode(errors="replace").strip()
        partes = [p for p in ruta.split(",") if p]
        if not partes:
            writer.close()
            return
        destino = partes[0]
        if not destino_valido(destino):
            log(f"salto rechazado (reglas): {destino}")
            writer.close()
            return
        host, puerto_ = destino.rsplit(":", 1)
        r2, w2 = await asyncio.open_connection(host, int(puerto_))
        if partes[1:]:
            w2.write(",".join(partes[1:]).encode() + b"\n")
            await w2.drain()
        if contador is not None:
            contador["vivas"] += 1
        try:
            if aead is not None:
                # este nodo ES el exit: descifra lo que llega y cifra las respuestas
                await asyncio.gather(
                    reenviar_cifrado_salida(reader, w2, aead),
                    reenviar_cifrado_entrada(r2, writer, aead),
                    return_exceptions=True)
            else:
                await asyncio.gather(reenviar_plano(reader, w2),
                                     reenviar_plano(r2, writer),
                                     return_exceptions=True)
        finally:
            if contador is not None:
                contador["vivas"] = max(0, contador["vivas"] - 1)
    except Exception:
        pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


# ──────────────────────────────── heartbeat ───────────────────────────────
def hilo_heartbeat(conf: dict, listen_port: int, contador: dict) -> None:
    direccion = f"{ip_publica()}:{listen_port}"
    log(f"heartbeat: registro {conf['nombre']} @ {direccion}")
    url = conf["api_url"].rstrip("/") + "/nodos/heartbeat"
    while True:
        cuerpo = json.dumps({
            "nombre": conf["nombre"],
            "direccion": direccion,
            "conexiones": contador["vivas"],
        }).encode()
        req = urllib.request.Request(url, data=cuerpo, headers={
            "Content-Type": "application/json",
            "X-Interno": conf["peer_token"],
        })
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                r.read()
        except Exception as e:
            code = getattr(e, "code", None)
            if code == 401:
                log("heartbeat 401: PEER_TOKEN rechazado — pide el token "
                    "vigente al dueño de la red y reinicia")
            else:
                log(f"heartbeat sin respuesta ({code or e}); reintento en 10 s")
        time.sleep(10)


# ──────────────────────────────── systemd ─────────────────────────────────
def instalar_systemd(script: Path) -> bool:
    """Instala jumpernat-nodo.service: el nodo vive en el arranque del VPS."""
    try:
        user = os.environ.get("SUDO_USER", "root")
        unidad = (
            "[Unit]\n"
            "Description=Nodo JumperNET (peering en VPS)\n"
            "After=network-online.target\n\n"
            "[Service]\n"
            f"ExecStart={sys.executable} {script}\n"
            f"WorkingDirectory={script.parent}\n"
            "Restart=always\n"
            "RestartSec=10\n"
            f"User={user}\n\n"
            "[Install]\n"
            "WantedBy=multi-user.target\n"
        )
        Path("/etc/systemd/system/jumpernat-nodo.service").write_text(unidad)
        sudo(["systemctl", "daemon-reload"])
        ok, _ = sudo(["systemctl", "enable", "--now", "jumpernat-nodo.service"])
        if ok:
            log("systemd: jumpernat-nodo.service instalado y ARRANCADO "
                "(logs: journalctl -u jumpernat-nodo -f)")
        return ok
    except Exception as e:
        log(f"systemd falló ({e}); corre el script con nohup/tmux")
        return False


# ───────────────────────────── configuración ──────────────────────────────
def ruta_conf() -> Path:
    if somos_root():
        try:
            Path("/etc/jumpernat").mkdir(parents=True, exist_ok=True)
            return Path("/etc/jumpernat/nodo_vps.json")
        except Exception:
            pass
    return Path(__file__).resolve().parent / "nodo_vps.json"


def pedir_config(conf_path: Path) -> dict:
    print("== nodo VPS de JumperNET — configuración ==\n")
    nombre = input(f"nombre del nodo [peer_vps{time.strftime('%H%M')}]: ").strip() \
        or f"peer_vps{time.strftime('%H%M')}"
    if not nombre.startswith("peer_"):
        nombre = "peer_" + nombre
    puerto = int(pregunta("puerto TCP del nodo", "9001"))
    api = pregunta("URL de la API", API_DEFECTO)
    token = ""
    while not token:
        token = input("PEER_TOKEN (lo da el dueño de la red): ").strip()
    clave = pregunta("CLAVE_SALTOS si el servidor cifre (deja vacío si no)", "")
    if clave and not TIENE_CRYPTO:
        log("AVISO: no está instalado `cryptography` — el nodo no podrá ser EXIT "
            "en una red con JENC; instálalo con: pip install cryptography")
    conf = {"nombre": nombre, "puerto": puerto, "api_url": api,
            "peer_token": token, "clave_saltos": clave}
    conf_path.write_text(json.dumps(conf, indent=2, ensure_ascii=False),
                         encoding="utf-8")
    log(f"config guardada en {conf_path}")
    return conf


def cargar_config(conf_path: Path) -> dict:
    if conf_path.exists():
        try:
            return json.loads(conf_path.read_text(encoding="utf-8"))
        except Exception:
            log("fichero de config corrupto — reconfigura")
    return pedir_config(conf_path)


# ────────────────────────────────── main ──────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", action="store_true", help="reconfigurar desde cero")
    ap.add_argument("--systemd", action="store_true",
                    help="instalar unidad systemd (arranca al boot del VPS)")
    args = ap.parse_args()

    conf_path = ruta_conf()
    conf = pedir_config(conf_path) if args.config else cargar_config(conf_path)
    puerto = int(conf["puerto"])
    log(f"nodo: {conf['nombre']} · puerto {puerto} · api {conf['api_url']}")

    # 1) firewall local
    abre_puerto(puerto)

    # 2) IP pública y verificación desde fuera
    ip = ip_publica()
    log(f"IP pública del VPS: {ip}")
    if not puerto_abre_desde_fuera(ip, puerto):
        log(f"AVISO: el puerto {puerto} NO responde desde fuera todavía.")
        log(f"   PASO MANUAL: en el panel de tu nube (p. ej. Oracle: Networking → "
            f"VNIC → Security Lists → Add Ingress Rule) permite TCP {puerto} "
            "desde 0.0.0.0/0. El script continúa: cuando el puerto se abra, el "
            "sondeo de la red tomará el nodo como VIVO automáticamente.")
    else:
        log("puerto alcanzable desde fuera ✓")

    # 3) JENC si toca
    aead = None
    if conf.get("clave_saltos"):
        if TIENE_CRYPTO:
            aead = _AEAD(_hashlib.sha256(conf["clave_saltos"].encode()).digest())
            log("JENC activado (este nodo puede ser EXIT en la red cifrada)")
        else:
            log("sin cryptography: el nodo no podrá actuar de EXIT con JENC "
                "(pip install cryptography) — sigue como hop intermedio")

    # 4) heartbeat de vida + servicio del nodo
    contador = {"vivas": 0}
    hop_handler.contador = contador
    hop_handler.aead = aead
    threading.Thread(target=hilo_heartbeat, args=(conf, puerto, contador),
                     daemon=True).start()

    if args.systemd:
        if somos_root():
            log("instalando unidad systemd y desenganchando…")
            if instalar_systemd(Path(__file__).resolve()):
                return
        else:
            log("--systemd necesita root (sudo python3 montar_nodo_vps.py --systemd)")
            log("continúo en primer plano…")

    async def servir():
        servidor = await asyncio.start_server(hop_handler, "0.0.0.0", puerto)
        log(f"nodo a la escucha en 0.0.0.0:{puerto} (solo 80/443, anti-privadas)")
        async with servidor:
            await servidor.serve_forever()

    log("CTRL+C para detener")
    try:
        asyncio.run(servir())
    except KeyboardInterrupt:
        log("nodo detenido")


if __name__ == "__main__":
    main()
