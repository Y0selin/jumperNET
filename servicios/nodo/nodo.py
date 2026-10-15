"""Nodo de reenvio de JumperNAT (Fase 1 + heartbeat de Fase 2).

Protocolo: al conectarse, el cliente envia UNA primera linea con la ruta restante:
    nodoX:9000,nodoY:9000,destino:puerto
El nodo quita el primer elemento (su siguiente salto), se conecta a el, y le
pasa el resto de la ruta (misma linea). Si en la ruta solo queda el destino,
este nodo es el "exit": se conecta al destino y no envia linea de ruta.

Despues reenvia bytes en ambos sentidos con asyncio (sin interpretar contenido).
Solo registra [HOP] con el origen interno y el siguiente interno; nunca el
contenido ni el destino final del usuario.

Ademas envia un heartbeat periodico a la API para que esta mantenga el
registro de nodos vivos (Fase 2).
"""
import asyncio
import json
import os
import socket
import threading
import time
import urllib.request

LISTEN_PORT = int(os.environ.get("NODO_PORT", "9000"))
API_URL = os.environ.get("API_URL", "")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
INTERVALO_HB = int(os.environ.get("INTERVALO_HB_SEG", "10"))


def hilo_heartbeat():
    """Avisa a la API de forma periodica de que este nodo esta vivo."""
    if not API_URL:
        return
    nombre = os.environ.get("NODO_NOMBRE", socket.gethostname())
    cuerpo = json.dumps(
        {"nombre": nombre, "direccion": f"{nombre}:{LISTEN_PORT}"}
    ).encode()
    req = urllib.request.Request(
        f"{API_URL}/nodos/heartbeat",
        data=cuerpo,
        headers={"Content-Type": "application/json", "X-Interno": INTERNAL_TOKEN},
    )
    while True:
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                r.read()
        except Exception as e:
            print(f"[HB] sin respuesta de la API: {e}", flush=True)
        time.sleep(INTERVALO_HB)


async def pipe(reader, writer):
    """Reenvia todo lo que lea de reader hacia writer hasta EOF."""
    try:
        while True:
            datos = await reader.read(65536)
            if not datos:
                break
            writer.write(datos)
            await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def hop_handler(reader, writer):
    try:
        # 1) leer la linea de ruta (con limite de tiempo para no bloquear el nodo)
        linea = await asyncio.wait_for(reader.readline(), timeout=15)
        ruta = linea.decode(errors="replace").strip()
        partes = [p for p in ruta.split(",") if p]
        if not partes:
            writer.close()
            return
        siguiente = partes[0]
        resto = ",".join(partes[1:])
        origen = writer.get_extra_info("peername")
        print(f"[HOP] origen={origen} -> siguiente={siguiente} restosaltos={resto or '(exit)'}", flush=True)

        # 2) conectar al siguiente salto (o al destino si somos el exit)
        host, puerto = siguiente.rsplit(":", 1)
        r2, w2 = await asyncio.open_connection(host, int(puerto))

        # 3) si quedan saltos, pasar la ruta restante; si es exit, no se envia nada
        if partes[1:]:
            w2.write((",".join(partes[1:]) + "\n").encode())
            await w2.drain()

        # 4) reenvio bidireccional hasta que ambas partes cierren
        await asyncio.gather(pipe(reader, w2), pipe(r2, writer), return_exceptions=True)
    except Exception as e:
        print(f"[HOP-ERR] {e}", flush=True)
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def main():
    threading.Thread(target=hilo_heartbeat, daemon=True).start()
    servidor = await asyncio.start_server(hop_handler, "0.0.0.0", LISTEN_PORT)
    print(f"nodo listo, escuchando en 0.0.0.0:{LISTEN_PORT}", flush=True)
    async with servidor:
        await servidor.serve_forever()


asyncio.run(main())
