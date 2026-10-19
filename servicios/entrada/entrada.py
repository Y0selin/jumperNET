"""Proxy SOCKS5 de entrada de JumperNAT - Fase 5.

Punto de entrada del circuito. Implementa SOCKS5 (RFC 1928) con
autenticacion usuario/contrasena (RFC 1929) sobre el protocolo base
(los nodos intermedios y de salida hablan el protocolo propio de la Fase 1).

Funcionamiento:
  1. El cliente se conecta al puerto 1080 y saluda con SOCKS5.
  2. Solo se acepta el metodo de usuario/contrasena (0x02). Los metodos
     GSSAPI (0x01) y SIN AUTENTICACION (0x00) se rechazan SIEMPRE:
     esto no es un proxy abierto.
  3. Las credenciales se validan contra la API (argon2) y el usuario debe
     tener un circuito conectado; se recibe su lista de 3 saltos.
  4. Se leen la peticion CONNECT y AQUI (defensa en profundidad, ademas de
     en el nodo de salida) se valida el destino: solo puertos 80/443 y
     bloqueo de IPs privadas, de docker, link-local y la metadata de Oracle.
     Excepciones explicitas para el destino interno de pruebas (web-destino).
  5. Se conecta al primer salto y se le envia la ruta restante
     familia Fase 1: "nodo2,nodo3,destino:host/port" + '\\n'.
  6. Se retransmite en ambos sentidos (el cliente habla HTTP "a traves"
     del circuito, como una web normal).

El stream del cliente se cifra ANTES de salir hacia el primer salto cuando
CLAVE_SALTOS esta configurado (Fase 8, cifrado en capas): los nodos son
reenvio ciego y el nodo de salida descifra (deteccion automatica JENC).

Sin dependencias externas salvo cryptography (ChaCha20-Poly1305): SOCKS con
asyncio stdlib y cliente HTTP minimo a mano para hablar con la API.
"""
import asyncio
import ipaddress
import json
import os

from _comun import cifra

PUERTO = int(os.environ.get("PUERTO_ENTRADA", "1080"))
API_URL = os.environ.get("API_URL", "http://api:8000")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
# Fase 8: secreto compartido entrada<->nodos para el cifrado extremo a extremo
CLAVE_SALTOS = os.environ.get("CLAVE_SALTOS", "")
PUERTOS_PERMITIDOS = {int(p) for p in os.environ.get("PUERTOS_PERMITIDOS", "80,443").split(",")}
# destinos internos excluidos del bloqueo de redes privadas (solo para pruebas)
EXCEPCIONES = {h.strip().lower() for h in os.environ.get("EXCEPCIONES_PRIVADAS", "web-destino").split(",")}

# Redes prohibidas como destino: privadas, loopback, docker, CGNAT,
# link-local (incluida la metadata 169.254.169.254 de Oracle) y ULA IPv6.
REDES_PROHIBIDAS = [ipaddress.ip_network(n) for n in (
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.168.0.0/16",
    "::1/128", "fc00::/7", "fe80::/10",
)]

SOCKS_VER = 5
METODO_USERPASS = 0x02
CMD_CONNECT = 0x01
ATYP_IPV4 = 0x01
ATYP_DOM = 0x03
ATYP_IPV6 = 0x04


def destino_bloqueado(host: str) -> bool:
    """False si el host es una IP autorizada en claro (permitido), True si
    host no es resolvible como IP; lo hace el nodo de salida."""
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        return False
    return any(ip in red for red in REDES_PROHIBIDAS)


# ------------------------------------------------------------- cliente HTTP min

def _sync_api(metodo: str, ruta: str, cuerpo: dict | None = None, cab: dict | None = None) -> tuple[int, dict | None]:
    """HTTP contra la API con socket bloqueante (se ejecuta en un hilo)."""
    import socket
    from urllib.parse import urlsplit
    partes = urlsplit(API_URL)
    host, puerto = partes.hostname, partes.port or 80
    s = socket.create_connection((host, puerto), timeout=10)
    try:
        cabs = {"Host": f"{host}:{puerto}", "Connection": "close", **(cab or {})}
        if cuerpo is not None:
            cabs["Content-Type"] = "application/json"
        cuerpo_b = json.dumps(cuerpo).encode() if cuerpo is not None else b""
        if cuerpo_b:
            cabs["Content-Length"] = str(len(cuerpo_b))
        req = f"{metodo} {ruta} HTTP/1.1\r\n" + "".join(f"{k}: {v}\r\n" for k, v in cabs.items()) + "\r\n"
        s.sendall(req.encode() + cuerpo_b)
        buf = b""
        while True:
            trozo = s.recv(65536)
            if not trozo:
                break
            buf += trozo
    finally:
        s.close()
    cabec, _, cuerpo_r = buf.partition(b"\r\n\r\n")
    estado = int(cabec.split(b" ", 2)[1])
    cuerpo_json = None
    if cuerpo_r:
        try:
            cuerpo_json = json.loads(cuerpo_r)
        except ValueError:
            pass
    return estado, cuerpo_json


async def api(metodo: str, ruta: str, cuerpo: dict | None = None, cab: dict | None = None):
    return await asyncio.get_event_loop().run_in_executor(
        None, lambda: _sync_api(metodo, ruta, cuerpo, cab)
    )


# ------------------------------------------------------------- SOCKS5

async def leer_n(reader: asyncio.StreamReader, n: int) -> bytes:
    b = await reader.readexactly(n)
    return b


async def handshake_socks(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> str | None:
    """Devuelve (user, password) o None si el saludo no es SOCKS5+userpass."""
    ver, nmet = await leer_n(reader, 2)
    if ver != SOCKS_VER or nmet < 1:
        return None
    metodos = await leer_n(reader, nmet)
    if METODO_USERPASS not in metodos:
        writer.write(b"\x05\xff")  # no hay metodo aceptable: cerrar
        return None
    writer.write(b"\x05\x02")
    ever, ulen = await leer_n(reader, 2)
    if ever != 1 or ulen == 0:
        return None
    usuario = (await leer_n(reader, ulen)).decode(errors="replace")
    plen = (await leer_n(reader, 1))[0]
    clave = (await leer_n(reader, plen)).decode(errors="replace") if plen else ""
    return usuario, clave


async def pedir_conexion(reader: asyncio.StreamReader) -> str | None:
    """Lee la peticion CONNECT; devuelve 'host:puerto' o None."""
    ver, cmd, _, atyp = await leer_n(reader, 4)
    if ver != SOCKS_VER or cmd != CMD_CONNECT:
        return None
    if atyp == ATYP_IPV4:
        host = ".".join(str(b) for b in await leer_n(reader, 4))
    elif atyp == ATYP_IPV6:
        import socket as _s
        bruto = await leer_n(reader, 16)
        host = _s.inet_ntop(_s.AF_INET6, bruto)
    elif atyp == ATYP_DOM:
        l = (await leer_n(reader, 1))[0]
        host = (await leer_n(reader, l)).decode(errors="replace")
    else:
        return None
    puerto = int.from_bytes(await leer_n(reader, 2), "big")
    return f"{host}:{puerto}"


async def validar_destino(dest: str) -> bool:
    """Solo puertos 80/443 y sin IPs privadas/docker/metadata (salvo
    excepciones declaradas para las pruebas internas)."""
    try:
        host, puerto = dest.rsplit(":", 1)
        puerto = int(puerto)
    except ValueError:
        return False
    if puerto not in PUERTOS_PERMITIDOS:
        return False
    if host.strip().lower() in EXCEPCIONES:
        return True
    if destino_bloqueado(host):
        return False
    return True


async def retransmitir(a: asyncio.StreamReader, b: asyncio.StreamWriter):
    try:
        while True:
            datos = await a.read(65536)
            if not datos:
                break
            b.write(datos)
    except (ConnectionError, asyncio.IncompleteReadError):
        pass
    finally:
        try:
            b.close()
        except Exception:
            pass


async def retransmitir_cifrado(a: asyncio.StreamReader, b: asyncio.StreamWriter, aead):
    """Del cliente PLANO hacia el circuito CIFRADO (Fase 8): cada trozo leido
    del cliente se convierte en un registro JENC."""
    emisor = cifra.Emisor(aead)
    try:
        while True:
            datos = await a.read(cifra.CHUNK)
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


async def retransmitir_descifrado(a: asyncio.StreamReader, b: asyncio.StreamWriter, aead):
    """Del circuito CIFRADO hacia el cliente PLANO (respuestas).
    El exit manda la magia JENC al comienzo: hay que consumirla ANTES de
    leer los registros, o el primer prefijo de longitud se corrompe."""
    try:
        magia = await asyncio.wait_for(a.readexactly(4), timeout=15)
        if not cifra.es_magia(magia):
            print(f"[entrada] el exit no respondio en modo JENC (recibi {magia!r})", flush=True)
            return
        receptor = cifra.Receptor(aead)
        while True:
            datos = await receptor.recibir(a)
            if not datos:
                break
            b.write(datos)
    except Exception:
        pass
    finally:
        try:
            b.close()
        except Exception:
            pass


async def atender(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    peer = writer.get_extra_info("peername")
    print(f"[entrada] conexion desde {peer}", flush=True)
    try:
        cred = await handshake_socks(reader, writer)
        if cred is None:
            return
        usuario, clave = cred
        # 1. autenticar contra la API y obtener el circuito del usuario
        estado, resp = await api(
            "POST", "/interno/socks_auth",
            {"email": usuario, "password": clave},
            {"X-Interno": INTERNAL_TOKEN},
        )
        if estado != 200 or not resp or "circuito" not in resp:
            print(f"[entrada] credenciales rechazadas para {usuario!r} (HTTP {estado})", flush=True)
            # respuesta de fallo de auth RFC 1929: version 1, estado != 0
            writer.write(b"\x01\x01")
            return
        writer.write(b"\x01\x00")  # autenticacion OK (RFC 1929)
        await writer.drain()
        saltos = resp["circuito"]
        # 2. pedir la tabla de saltos para resolver nombres a direcciones
        estado2, redes = await api("GET", "/nodos", None, {"X-Interno": INTERNAL_TOKEN})
        # solo nodos VIVOS: /nodos puede listar hosts caidos (latido vencido) y
        # el mapa con datos muertos hace que el circuito muera en silencio dentro
        # de un hop intermedio (fallo de DNS o TCP) sin error para el cliente
        mapa = {r["nombre"]: r["direccion"] for r in (redes or []) if r.get("estado") == "vivo"}
        primera = mapa.get(saltos[0])
        if not primera:
            print(f"[entrada] primer salto {saltos[0]!r} no esta en /nodos", flush=True)
            writer.write(b"\x01\x01")
            return
        # 3. peticion CONNECT del cliente y validacion del destino
        dest = await pedir_conexion(reader)
        if dest is None or not await validar_destino(dest):
            print(f"[entrada] destino denegado: {dest!r} para {usuario!r}", flush=True)
            # rep 0x02 (not allowed) con BND.IPV4 0.0.0.0:0
            writer.write(b"\x05\x02\x00\x01" + b"\x00" * 4 + b"\x00\x00")
            return
        # 4. conectar al primer salto y enviarle la ruta restante
        #    Nodo PERSONAL por túnel inverso (tunel:<peer>): el primer salto no
        #    tiene host:puerto real — se conecta al BROKER (puerto de nodos) y
        #    manda DIAL <peer>; desde ahí la conversación es idéntica (la entrada
        #    solo ve un socket y retransmite ciego, no cambia nada de protocolo).
        if primera.startswith("tunel:"):
            broker = os.environ.get("BROKER_HOST", "broker")
            puerto_b = int(os.environ.get("BROKER_PORT_NODOS", "9009"))
            conecta, w_nodo = await asyncio.open_connection(broker, puerto_b)
            w_nodo.write(f"DIAL {primera[6:]}\n".encode())
            await w_nodo.drain()
        else:
            host_p, puerto_p = primera.rsplit(":", 1) if ":" in primera else (primera, "9000")
            conecta, w_nodo = await asyncio.open_connection(host_p, int(puerto_p))
        ruta = f"{','.join(mapa[s] for s in saltos[1:]) if len(saltos) > 1 else ''},{dest}\n"
        if len(saltos) == 1:
            ruta = f"{dest}\n"
        w_nodo.write(ruta.encode())
        await w_nodo.drain()
        # 5. responder SOCKS OK (BND.ADDR 0.0.0.0:0) y retransmitir
        writer.write(b"\x05\x00\x00\x01" + b"\x00" * 4 + b"\x00\x00")
        await writer.drain()
        print(f"[entrada] circuito {saltos} para {usuario!r} -> {dest}", flush=True)
        if CLAVE_SALTOS:
            # Fase 8: cifrar en ambos sentidos (cliente plano <-> circuito JENC)
            aead = cifra.aead_desde_secreto(CLAVE_SALTOS)
            t1 = asyncio.create_task(retransmitir_cifrado(reader, w_nodo, aead))
            t2 = asyncio.create_task(retransmitir_descifrado(conecta, writer, aead))
        else:
            t1 = asyncio.create_task(retransmitir(reader, w_nodo))
            t2 = asyncio.create_task(retransmitir(conecta, writer))
        await asyncio.gather(t1, t2)
    except (asyncio.IncompleteReadError, ConnectionError, OSError) as e:
        print(f"[entrada] error con {peer}: {type(e).__name__}", flush=True)
        try:
            writer.write(b"\x05\x01\x00\x01" + b"\x00" * 4 + b"\x00\x00")
        except Exception:
            pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def main():
    servidor = await asyncio.start_server(atender, "0.0.0.0", PUERTO)
    print(f"[entrada] SOCKS5 a la escucha en 0.0.0.0:{PUERTO} (permitidos: {sorted(PUERTOS_PERMITIDOS)})", flush=True)
    async with servidor:
        await servidor.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
