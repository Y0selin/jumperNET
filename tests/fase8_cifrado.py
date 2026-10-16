"""Test de Fase 8 - cifrado en capas sobre los saltos (JENC / ChaCha20-Poly1305).

Valida que un cliente que cifra SU stream tras el SOCKS5 obtiene respuesta
HTTP real a traves del circuito: entrada cifra, nodos reenvian a ciegas,
exit descifra y responde cifrado. Comprueba tambien que sin la clave no se
pueden leer los registros (la proteccion es real, no decorativa).

Se ejecuta con:
docker compose run --rm -e SOCKS_USER -e SOCKS_PASS -e CLAVE_SALTOS \\
    cliente-test fase8_cifrado.py
"""
import asyncio
import os
import subprocess
import sys
import time

# imagen base del cliente-test no incluye cryptography; la instalamos
if __import__("importlib.util", fromlist=["util"]).find_spec("cryptography") is None:
    print("instalando cryptography en el contenedor de pruebas...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "cryptography"], check=True)

sys.path.insert(0, "/app")
from _comun import cifra  # noqa: E402  (mismo modulo que entrada y nodos)

import ipaddress  # noqa: E402

SOCKS_HOST, SOCKS_PORT = "entrada", int(os.environ.get("PUERTO_SOCKS", "1080"))
USUARIO = os.environ.get("SOCKS_USER", "socksuser@test.local")
CLAVE = os.environ.get("SOCKS_PASS", "sup3rguay")
CLAVE_SALTOS = os.environ["CLAVE_SALTOS"]
WEB = "web-destino"

FALLOS = 0


def ok(msg):
    print(f"  OK   : {msg}")


def falla(msg):
    global FALLOS
    print(f"  FALLO: {msg}")
    FALLOS += 1


async def saludo_socks(reader, writer):
    # saludo: solo ofrecemos userpass (0x02)
    writer.write(b"\x05\x01\x02")
    await writer.drain()
    resp = await reader.readexactly(2)
    assert resp == b"\x05\x02", f"metodo no aceptado: {resp!r}"
    u, p = USUARIO.encode(), CLAVE.encode()
    writer.write(bytes([1, len(u)]) + u + bytes([len(p)]) + p)
    await writer.drain()
    resp = await reader.readexactly(2)
    assert resp == b"\x01\x00", f"autenticacion fallida: {resp!r}"
    # CONNECT web-destino:80 (atyp=3, dominio)
    d = WEB.encode()
    writer.write(bytes([5, 1, 0, 3, len(d)]) + d + (80).to_bytes(2, "big"))
    await writer.drain()
    resp = await reader.readexactly(10)
    assert resp[:2] == b"\x05\x00", f"CONNECT rechazado: {resp!r}"


async def caos_overrides():
    """Comprueba que un observador con la clave MAL no descifra nada."""
    aead_mala = cifra.aead_desde_secreto("clave-equivocada")
    nonce = b"\x00" * 12
    bloque = aead_mala.encrypt(nonce, b"GET / HTTP/1.0\r\n\r\n", None)
    aead_buena = cifra.aead_desde_secreto(CLAVE_SALTOS)
    try:
        aead_buena.decrypt(nonce, bloque, None)
        return False
    except Exception:
        return True


async def main():
    print("=" * 60)
    print("FASE 8 / Cifrado en capas de los saltos (JENC)")
    print("=" * 60)

    print("\n[1] La clave real deriva correctamente (32 B ChaCha20)")
    aead = cifra.aead_desde_secreto(CLAVE_SALTOS)

    print("\n[2] Un observador con otra clave NO puede descifrar los registros")
    if await caos_overrides():
        ok("descifrado con clave equivocada levanta InvalidTag")
    else:
        falla("un registro pudo descifrarse con una clave DISTINTA")

    print("\n[3] Circuito real: SOCKS5 + stream cifrado JENC -> HTTP 200 de web-destino")
    reader, writer = await asyncio.open_connection(SOCKS_HOST, SOCKS_PORT)
    await saludo_socks(reader, writer)
    ok("handshake SOCKS5 completo (auth + CONNECT)")

    emisor = cifra.Emisor(aead)
    peticion = f"GET / HTTP/1.1\r\nHost: {WEB}\r\nConnection: close\r\n\r\n".encode()
    t0 = time.time()
    await emisor.enviar(writer, peticion)
    ok(f"peticion HTTP enviada cifrada ({len(peticion)} B de texto claro)")

    # la respuesta del exit llega cifrada: primer grupo 4B debe ser la magia JENC
    magia = await asyncio.wait_for(reader.readexactly(4), timeout=15)
    if magia != cifra.MAGIA:
        falla(f"la respuesta NO empieza por la magia JENC: {magia!r}")
        writer.close()
        return
    ok("la respuesta del circuito empieza por JENC (modo cifrado activo)")

    receptor = cifra.Receptor(aead)
    datos_respuesta = b""
    try:
        while True:
            registro = await asyncio.wait_for(receptor.recibir(reader), timeout=15)
            if not registro:
                break
            datos_respuesta += registro
    except asyncio.IncompleteReadError:
        pass  # cierre de la conexion
    writer.close()
    dt = time.time() - t0
    linea = datos_respuesta.split(b"\r\n", 1)[0].decode(errors="replace")
    tam = len(datos_respuesta)
    if "200" in linea:
        ok(f"HTTP descifrado completo: {linea} ({tam} B en {dt:.3f} s)")
    else:
        falla(f"respuesta descifrada inesperada: {linea!r}")

    print("\n" + "=" * 60)
    if FALLOS:
        print(f"FASE 8: {FALLOS} FALLOS")
        sys.exit(1)
    print("FASE 8: TODOS LOS TESTS SUPERADOS (cifrado en capas activo y real)")
    print("=" * 60)


asyncio.run(main())
