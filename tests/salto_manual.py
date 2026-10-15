"""Cliente de prueba de la Fase 1: envia una peticion HTTP a traves de una ruta manual.

Uso: python salto_manual.py nodo1:9000 "nodo2:9000,nodo3:9000" http://web-destino/
"""
import asyncio
import re
import sys


async def main():
    entrada = sys.argv[1]      # primer nodo al que nos conectamos
    ruta = sys.argv[2]         # saltos intermedios que vienen despues de entrada
    url = sys.argv[3]
    host, puerto = entrada.rsplit(":", 1)
    m = re.match(r"http://([^:/]+)(?::(\d+))?(/.*)?", url)
    dest_host, dest_port, path = m.group(1), m.group(2) or "80", m.group(3) or "/"

    reader, writer = await asyncio.open_connection(host, int(puerto))
    # linea 1: saltos restantes separados por comas
    writer.write((f"{ruta},{dest_host}:{dest_port}\n").encode())
    peticion = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {dest_host}:{dest_port}\r\n"
        "Connection: close\r\n"
        "\r\n"
    )
    writer.write(peticion.encode())
    await writer.drain()
    datos = await reader.read(-1)
    print(datos.decode(errors="replace"))


asyncio.run(main())
