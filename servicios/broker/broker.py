"""Broker de túnel inverso de JumperNET (Fase 9-tunel).

Permite que el equipo de un USUARIO actúe como salto del circuito SIN abrir
ningún puerto en su router: el peer conecta HACIA EL BROKER (conexión saliente
normal, como la de un navegador) y la mantiene viva; cuando un nodo de la red
necesita reenviar hacia ese peer, lo hace a través de ese túnel ya establecido.

Protocolo (una sola conexión TCP por peer, de larga vida; primera línea texto
y después binario plano):
  1. El peer se conecta y manda su presentación:
       TUNNEL peer_u<id> <PEER_TOKEN>\n
  2. El broker valida el token (PEER_TOKEN del .env, igual que el heartbeat)
     y que ese usuario tiene su OPT-IN aceptado (GET /interno/peer_tunel de la
     API). Si todo va bien responde OK\n y el túnel queda activo.
  3. Cuando un NODO de la infraestructura quiere reenviar hacia el peer, se
     conecta al broker y manda:
       DIAL peer_u<id>\n
     El broker, por el túnel del peer, envía:
       OPEN <id_conexion>\n
     y empalma los bytes de esa conexión del nodo con la sub-conexión abierta
     en el peer (multiplexado por id).

  Multiplexado por el túnel del peer (todo en binario tras la presentación):
     OPEN <id>\n      -> el peer debe abrir SU servicio local (127.0.0.1:PUERTO)
     DATA <id> <n>\n  -> n bytes de payload a continuación
     FIN <id>\n       -> cierre de esa conexión

  Del peer hacia el broker:
     DATA <id> <n>\n / FIN <id>\n (mismo formato)

Los nodos NO hablan este multiplexado: para ellos el broker expone un modo
transparente — la conexión DIAL del nodo se comporta EXACTAMENTE como si
hubiera abierto un socket TCP al peer (primera línea de ruta, reenvío ciego).
El broker hace de puente byte a byte entre esa conexión y la sub-conexión
OPEN/DATA del tunnel del peer.

Sin estado persistente y sin registros: solo conexiones vivas (regla 4 del
proyecto). Todo el control va con límites de tamaño (línea <= 256 B) y el
reenvío no interpreta contenido.
"""
import asyncio
import json
import os
import time
import urllib.request

LISTEN_PEERS = int(os.environ.get("BROKER_PORT_PEERS", "9008"))
LISTEN_NODOS = int(os.environ.get("BROKER_PORT_NODOS", "9009"))
API_URL = os.environ.get("API_URL", "http://api:8000")
PEER_TOKEN = os.environ.get("PEER_TOKEN", "")
INTERNAL_TOKEN_v = os.environ.get("INTERNAL_TOKEN", "")
MAX_CONEX_POR_PEER = int(os.environ.get("BROKER_MAX_CONEX", "8"))
MAX_LINEA = 256

# los peers vivos: nombre -> {reader, writer, sub-conexiones, ultimo_ok}
TUNELES: dict[str, dict] = {}
# esperas: id_nodo_pedido -> (peer, reader, writer) conectado aguardando empalme
PREPARADOS: dict[str, tuple[str, asyncio.StreamReader, asyncio.StreamWriter]] = {}
contador = 0


def _log(mensaje: str) -> None:
    print(f"[broker {time.strftime('%H:%M:%S')}] {mensaje}", flush=True)


def optin_ok(nombre: str) -> bool:
    """Pregunta a la API si ese peer (peer_u<id>) tiene el salto aceptado.

    Sin contestación positiva el túnel no se abre: el opt-in en el panel es
    obligatorio para participar como salto."""
    try:
        req = urllib.request.Request(
            f"{API_URL}/interno/peer_tunel?nombre={nombre}",
            headers={"X-Interno": INTERNAL_TOKEN_v},
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            return bool(json.load(r).get("tunel_ok"))
    except Exception as e:
        _log(f"opt-in de {nombre}: no confirmado ({e})")
        return False


# ═══════════════════════════ lado PEER (conexión de salida del usuario) ═══════════════════

async def limpiar_peer(nombre: str) -> None:
    t = TUNELES.pop(nombre, None)
    if t:
        for _, w in list(t["subs"].values()):
            try:
                w.close()
            except Exception:
                pass
        try:
            t["writer"].close()
        except Exception:
            pass
        _log(f"túnel cerrado: {nombre}")


async def de_broker_a_peer(t: dict, idc: str, payload: bytes) -> None:
    frame = (f"DATA {idc} {len(payload)}\n" if payload else f"KEEP {idc}\n").encode()
    t["writer"].write(frame + payload)
    await t["writer"].drain()


async def atender_peer(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        linea = (await asyncio.wait_for(reader.readline(), timeout=30))[:MAX_LINEA]
        partes = linea.decode(errors="replace").strip().split()
        if len(partes) != 3 or partes[0] != "TUNNEL":
            writer.close()
            return
        _, nombre, token = partes
        if not nombre.startswith("peer_") or not PEER_TOKEN or token != PEER_TOKEN:
            writer.write(b"NO\n")
            await writer.drain()
            writer.close()
            _log(f"presentación rechazada: {nombre}")
            return
        if not optin_ok(nombre):
            writer.write(b"NOOPTIN\n")
            await writer.drain()
            writer.close()
            _log(f"{nombre}: sin opt-in de su dueño (salto no aceptado)")
            return
        # cierra el túnel viejo del mismo peer (reconexión) y deja el nuevo
        await limpiar_peer(nombre)
        writer.write(b"OK\n")
        await writer.drain()
        TUNELES[nombre] = {"reader": reader, "writer": writer, "subs": {}, "pulse": time.time()}
        _log(f"túnel abierto: {nombre} (sin puertos abiertos en su router)")
        await bombear_peer(nombre, reader)
    except Exception as e:
        _log(f"peer error: {e}")
    finally:
        for nom, t in list(TUNELES.items()):
            if t["writer"] is writer:
                await limpiar_peer(nom)
        try:
            writer.close()
        except Exception:
            pass


async def bombear_peer(nombre: str, reader: asyncio.StreamReader) -> None:
    """Lee del túnel los frames del peer y los empalma con las conexiones
    del lado nodo (DATA -> conexion del nodo; FIN -> cerrar)."""
    t = TUNELES.get(nombre)
    while t:
        try:
            cab = (await asyncio.wait_for(reader.readline(), timeout=120))[:MAX_LINEA].decode().strip()
        except Exception:
            break
        if not cab:
            break
        partes = cab.split()
        tipo = partes[0]
        idc = partes[1] if len(partes) > 1 else ""
        if tipo == "DATA" and len(partes) == 3:
            n = int(partes[2])
            payload = await reader.readexactly(n)
            destino = t["subs"].get(idc)
            if destino:
                _, wdest = destino
                wdest.write(payload)
                await wdest.drain()
            else:
                # peer hablando antes del empalme (no debería): descarta
                _log(f"{nombre}: DATA de subconexión inexistente {idc}")
        elif tipo == "FIN":
            destino = t["subs"].pop(idc, None)
            if destino:
                _, wdest = destino
                try:
                    wdest.close()
                except Exception:
                    pass


# ═══════════════════════════ lado NODO (conexión DIAL de la red) ═══════════════════

async def atender_nodo(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    global contador
    try:
        linea = (await asyncio.wait_for(reader.readline(), timeout=15))[:MAX_LINEA].decode().strip()
        partes = linea.split()
        if len(partes) != 2:
            writer.close()
            return
        cmd, nombre = partes
        if cmd == "PING":
            # sondeo de vida que usa la API para validar nodos tunel:
            # un túnel solo responde OK si está ABIERTO de verdad (en RAM)
            vivo = nombre in TUNELES
            writer.write((f"OK {nombre}\n" if vivo else f"ERR {nombre} fuera de linea\n").encode())
            await writer.drain()
            writer.close()
            return
        if cmd != "DIAL":
            writer.close()
            return
        t = TUNELES.get(nombre)
        if not t:
            writer.write(b"ERR peer fuera de linea\n")
            await writer.drain()
            writer.close()
            return
        contador += 1
        idc = f"c{contador}"
        t["subs"][idc] = ("nodo", writer)
        # pide al peer abrir su servicio local para esta conexión
        t["writer"].write(f"OPEN {idc}\n".encode())
        await t["writer"].drain()
        # a partir de aquí la conexión del nodo es TRANSPARENTE: el broker solo
        # rellega bytes en ambos sentidos (el peer hablará DATA/FIN sobre túnel)
        await puente(writer, reader, nombre, idc)
    except Exception as e:
        _log(f"nodo error: {e}")
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def puente(w_nodo: asyncio.StreamWriter, r_nodo: asyncio.StreamReader,
                 peer: str, idc: str) -> None:
    """Reenvía bytes: nodo -> peer (como DATA) y peer -> nodo (payloads ya
    manejados en bombear_peer; aquí solo el cierre)."""
    t = TUNELES.get(peer)

    async def hacia_peer():
        try:
            while t:
                datos = await r_nodo.read(65536)
                if not datos:
                    break
                await de_broker_a_peer(t, idc, datos)
        except Exception:
            pass
        finally:
            tt = TUNELES.get(peer)
            if tt:
                tt["subs"].pop(idc, None)
            if t:
                try:
                    t["writer"].write(f"FIN {idc}\n".encode())
                    await t["writer"].drain()
                except Exception:
                    pass

    await hacia_peer()


# ═══════════════════════════ arranque ═══════════════════

async def main() -> None:
    p1 = await asyncio.start_server(atender_peer, "0.0.0.0", LISTEN_PEERS)
    p2 = await asyncio.start_server(atender_nodo, "0.0.0.0", LISTEN_NODOS)
    _log(f"broker listo: peers :{LISTEN_PEERS} · nodos :{LISTEN_NODOS}")
    async with p1, p2:
        await asyncio.gather(p1.serve_forever(), p2.serve_forever())


asyncio.run(main())
