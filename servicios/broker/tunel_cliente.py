"""Cliente de túnel inverso de JumperNET (lado PEER).

Lo usan:
  · el agente automático del JumperNET Browser (main.js vía node),
  · nodo_personal.py --tunel (ejecución standalone en el equipo del usuario).

Funcionamiento (0 puertos abiertos: TODO es conexión saliente):
  1. Abre UNA conexión TCP al broker (:9008) y manda
        TUNNEL peer_u<id> <PEER_TOKEN>\n
  2. Espera OK\n (el broker validó token + opt-in del dueño contra la API).
  3. Recibe del broker:
        OPEN <id>\n                 -> abre TCP local a SERVICIO_LOCAL (peer server)
        DATA <id> <n>\n + bytes     -> ese payload va a la conexión local
        FIN <id>\n                  -> cierra la local
     Y responde con DATA <id> n / FIN <id> hacia el broker.
  4. STOP <id>... no existe: si el broker manda KEEPALIVE no eccho… (el broker
     no manda nada espontáneo salvo OPEN; la reconexión es automática).

Reconexión automática con retirada exponencial (1 s, 2, 4… máx 30) mientras
se suela LA fichero_parar no existe: el proceso vive hasta que lo matan o
el tunnel STD de ir — el agente del navegador lo lanza/limpia como hijo.
"""
import asyncio
import json
import os
import sys
import time
import urllib.request

BROKER_HOST = os.environ.get("BROKER_HOST", "jumpernet.duckdns.org")
BROKER_PUERTO = int(os.environ.get("BROKER_PORT_PEERS", "9008"))
API_URL = os.environ.get("API_URL", "https://jumpernet.duckdns.org")
SERVICIO_LOCAL = os.environ.get("SERVICIO_LOCAL", "127.0.0.1:9007")
MAX_LINEA = 256


def peertoken_de_api(token_sesion: str) -> str:
    """El PEER_TOKEN no es secreto del usuario: lo publica la API al login
    (endpoint /peer_token con su JWT). Así el agente del navegador puede
    presentar el túnel sin configurar nada."""
    req = urllib.request.Request(
        f"{API_URL}/peer_token",
        headers={"Authorization": "Bearer " + token_sesion},
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)["peer_token"]


class Sub:
    """Una sub-conexión: par de streams hacia el SERVICIO_LOCAL del peer."""

    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer


async def una_conexion(broker_r: asyncio.StreamReader, broker_w: asyncio.StreamWriter,
                       nombre: str, token: str, subs: dict):
    """Ciclo completo de una conexión de túnel: presenta, atiende frames y
    retorna cuando se cierra (el llamador reconecta)."""
    broker_w.write(f"TUNNEL {nombre} {token}\n".encode())
    await broker_w.drain()
    resp = (await asyncio.wait_for(broker_r.readline(), timeout=30))[:MAX_LINEA].decode().strip()
    if resp != "OK":
        raise RuntimeError(f"broker rechazó el túnel: {resp!r}")
    print(f"[tunel] aceptado por el broker (sin puertos abiertos)", flush=True)
    while True:
        cab = (await asyncio.wait_for(broker_r.readline(), timeout=180))[:MAX_LINEA].decode().strip()
        if not cab:
            return          # el broker cerró: reconectar
        partes = cab.split()
        if len(partes) < 2:
            continue
        tipo, idc = partes[0], partes[1]
        if tipo == "OPEN":
            try:
                host_l, puerto_l = SERVICIO_LOCAL.rsplit(":", 1)
                r_local, w_local = await asyncio.open_connection(host_l, int(puerto_l))
            except Exception as e:
                # sin servicio local: responde FIN (la conexión no puede ser salto)
                broker_w.write(b"DATA %s 0" % idc if False else f"FIN {idc}\n".encode())
                await broker_w.drain()
                print(f"[tunel] OPEN sin servicio local ({e}): fin", flush=True)
                continue
            subs[idc] = Sub(r_local, w_local)

            async def hacia_broker():
                s = subs[idc]
                try:
                    while True:
                        datos = await s.reader.read(65536)
                        if not datos:
                            break
                        s2 = subs.get(idc)
                        if not s2:
                            break
                        broker_w.write(f"DATA {idc} {len(datos)}\n".encode() + datos)
                        await broker_w.drain()
                    s2 = subs.get(idc)
                    if s2:
                        broker_w.write(f"FIN {idc}\n".encode())
                        await broker_w.drain()
                except Exception:
                    pass

            asyncio.ensure_future(hacia_broker())
        elif tipo == "DATA" and len(partes) == 3:
            n = int(partes[2])
            payload = await broker_r.readexactly(n)
            s = subs.get(idc)
            if s:
                s.writer.write(payload)
                await s.writer.drain()
        elif tipo == "FIN":
            s = subs.pop(idc, None)
            if s:
                try:
                    s.writer.close()
                except Exception:
                    pass


async def main():
    nombre = sys.argv[1]
    token = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("PEER_TOKEN", "")
    if token == "-":
        token = peertoken_de_api(os.environ["JWT"])
    subs: dict[str, Sub] = {}
    retardo = 1
    while True:
        try:
            r, w = await asyncio.open_connection(BROKER_HOST, BROKER_PUERTO)
            await una_conexion(r, w, nombre, token, subs)
        except Exception as e:
            print(f"[tunel] reconectando en {retardo}s: {e}", flush=True)
        for s in list(subs.values()):
            try:
                s.writer.close()
            except Exception:
                pass
        subs.clear()
        await asyncio.sleep(retardo)
        retardo = min(30, retardo * 2) if not subs else 1


asyncio.run(main())
