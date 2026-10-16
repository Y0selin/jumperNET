"""Proxy HTTP de entrada de JumperNAT (para la extension del navegador).

Los navegadores no admiten credenciales en SOCKS5: Chrome ni las pide y
Firefox pregunta en cada conexion, y su API de proxy no deja a una extension
autenticar SOCKS. Lo que SI estandarizan es un proxy HTTP (CONNECT para
HTTPS y peticiones con URI absoluta para HTTP) con autenticacion Basic,
cuya peticion de credenciales (407 + Proxy-Authenticate) la extension puede
responder automaticamente con webRequest.onAuthRequired. Por eso existe
esta entrada: la extension del navegador la apunta aqui y el usuario no
toca nada de la configuracion del navegador.

Mismo contrato que la entrada SOCKS5 (entrada/entrada.py):
  * credenciales = tu cuenta de la web, validadas contra la API (argon2) y
    con circuito conectado (POST /interno/socks_auth).
  * mismos destinos: solo 80/443, nada privado/docker/metadata de Oracle
    (salvo las excepciones internas de prueba).
  * reenvia DOMAIN NAMES tal cual: resuelve el nodo de salida.
  * JENC (CLAVE_SALTOS) cifra cliente<->circuito igual que en SOCKS.

HTTP soportado: CONNECT host:puerto (HTTPS) y peticiones con URI absoluta
(http://...). Solo el primer proxy-salto; en cadenas de proxies se usa la
cabecera de la propia peticion.
"""
import asyncio
import base64
import ipaddress
import json
import os

from _comun import cifra

PUERTO = int(os.environ.get("PUERTO_ENTRADA_HTTP", "1081"))
API_URL = os.environ.get("API_URL", "http://api:8000")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
CLAVE_SALTOS = os.environ.get("CLAVE_SALTOS", "")
PUERTOS_PERMITIDOS = {int(p) for p in os.environ.get("PUERTOS_PERMITIDOS", "80,443").split(",")}
EXCEPCIONES = {h.strip().lower() for h in os.environ.get("EXCEPCIONES_PRIVADAS", "web-destino").split(",")}

LIMITE_CABECERA = 32768  # bytes: una peticion de navegador nunca llega
LIMITE_ESPERA = 30      # segundos de silencio al leer peticion   (defensa anti lento)

REDES_PROHIBIDAS = [ipaddress.ip_network(n) for n in (
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.168.0.0/16",
    "::1/128", "fc00::/7", "fe80::/10",
)]


def destino_bloqueado(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        return False
    return any(ip in red for red in REDES_PROHIBIDAS)


def validar_destino(host: str, puerto: int) -> bool:
    if puerto not in PUERTOS_PERMITIDOS:
        return False
    if host.strip("[]").lower() in EXCEPCIONES:
        return True
    return not destino_bloqueado(host)


# ------------------------------------------------- cliente HTTP minimo (API)

def _api_sync(metodo: str, ruta: str, cuerpo: dict | None, cab: dict | None):
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
    salido = None
    if cuerpo_r:
        try:
            salido = json.loads(cuerpo_r)
        except ValueError:
            pass
    return estado, salido


async def api(metodo, ruta, cuerpo=None, cab=None):
    return await asyncio.get_event_loop().run_in_executor(
        None, lambda: _api_sync(metodo, ruta, cuerpo, cab)
    )


# ------------------------------------------------- circuito

async def conectar_circuito(saltos, mapa, dest: str):
    """Abre el primer salto y le deja escrita la ruta restante (Fase 1)."""
    primera = mapa[saltos[0]]
    host_p, _, puerto_p = primera.rpartition(":")
    await asyncio.sleep(0)
    reader, writer = await asyncio.open_connection(host_p, int(puerto_p or "9000"))
    ruta = (",".join(mapa[s] for s in saltos[1:]) if len(saltos) > 1 else "") or ""
    w = f"{f'{ruta},' if ruta else ''}{dest}\n"
    writer.write(w.encode())
    await writer.drain()
    return reader, writer


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


async def retransmitir_cifrado(a_reader, b_writer, aead):
    emisor = cifra.Emisor(aead)
    try:
        while True:
            datos = await a_reader.read(cifra.CHUNK)
            if not datos:
                break
            await emisor.enviar(b_writer, datos)
        await emisor.cerrar(b_writer)
    except (ConnectionError, asyncio.IncompleteReadError):
        pass
    finally:
        try:
            b_writer.close()
        except Exception:
            pass


async def retransmitir_descifrado(a_reader, b_writer, aead):
    try:
        magia = await asyncio.wait_for(a_reader.readexactly(4), timeout=15)
        if not cifra.es_magia(magia):
            print("[entrada-http] el exit no respondio en modo JENC", flush=True)
            return
        receptor = cifra.Receptor(aead)
        while True:
            datos = await receptor.recibir(a_reader)
            if not datos:
                break
            b_writer.write(datos)
    except Exception:
        pass
    finally:
        try:
            b_writer.close()
        except Exception:
            pass


# ------------------------------------------------- parser HTTP minimo

async def leer_peticion(reader: asyncio.StreamReader):
    """Linea de peticion + cabeceras (en minusculas), sin el cuerpo.
    Devuelve (metodo, destino, cabeceras, crudo_peticion) o None si vacio."""
    try:
        linea = await asyncio.wait_for(reader.readline(), timeout=LIMITE_ESPERA)
    except asyncio.TimeoutError:
        return None
    if not linea.strip():
        return None
    try:
        partes = linea.decode("latin-1").strip().split(" ")
        if len(partes) < 3:
            return None
        metodo, objetivo = partes[0], partes[1]
    except Exception:
        return None
    cabec = {}
    crudo = bytearray(linea)
    while True:
        l = await asyncio.wait_for(reader.readline(), timeout=LIMITE_ESPERA)
        crudo += l
        if len(crudo) > LIMITE_CABECERA:
            return None
        if l in (b"\r\n", b"\n", b""):
            break
        try:
            k, _, v = l.decode("latin-1").partition(":")
            cabec[k.strip().lower()] = v.strip()
        except Exception:
            continue
    return metodo, objetivo, cabec, bytes(crudo)


def destino_de_objetivo(objetivo: str):
    """'http://host:puerto/ruta' -> (host, puerto, 'ruta') o None para
    CONNECT 'host:puerto' -> (host, puerto, None)."""
    from urllib.parse import urlsplit
    if objetivo.lower().startswith("http://") or objetivo.lower().startswith("https://"):
        p = urlsplit(objetivo)
        return p.hostname, p.port or 80, (p.path or "/") + (f"?{p.query}" if p.query else "")
    # CONNECT host:puerto
    host, _, puerto = objetivo.rpartition(":")
    try:
        return host.strip("[]"), int(puerto), None
    except ValueError:
        return None


def credenciales_basic(cabec: dict):
    """('usuario', 'clave') de Proxy-Authorization: Basic ... o None."""
    valor = ""
    for k in ("proxy-authorization", "authorization"):
        if k in cabec and cabec[k].lower().startswith("basic "):
            valor = cabec[k][6:].strip()
            break
    if not valor:
        return None
    try:
        bruto = base64.b64decode(valor).decode("utf-8", errors="replace")
        usuario, _, clave = bruto.partition(":")
        return usuario, clave if usuario else None
    except Exception:
        return None


def es_dos_peticiones(crudo: bytes) -> bool:
    """Una cabecera de peticion puede traer Pipeline HTTP/1.0 style: solo
    permitimos UNA peticion por conexion (como CONNECT). Se detecta mirando
    si despues del primer bloque vienen mas cabeceras de metodo."""
    return False  # (por simplicidad: cada conexion = 1 peticion)


async def atender(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    peer = writer.get_extra_info("peername")
    peticion = None
    try:
        peticion = await leer_peticion(reader)
        if peticion is None:
            return
        metodo, objetivo, cabec, crudo = peticion
        fin = destino_de_objetivo(objetivo)
        if fin is None:
            writer.write(b"HTTP/1.1 400 Bad Request\r\n\r\n")
            await writer.drain()
            return
        host, puerto, ruta = fin
        if not validar_destino(host, puerto):
            print(f"[entrada-http] destino denegado: {host}:{puerto}", flush=True)
            writer.write(b"HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n")
            await writer.drain()
            return
        # credenciales: reintentamos 407 con Proxy-Authenticate Basic
        cred = credenciales_basic(cabec)
        if cred is None:
            writer.write(b"HTTP/1.1 407 Proxy Authentication Required\r\n"
                         b'Proxy-Authenticate: Basic realm="JumperNAT"\r\n'
                         b"Connection: keep-alive\r\nContent-Length: 0\r\n\r\n")
            await writer.drain()
            # el navegador reenvia la peticion con Proxy-Authorization
            peticion2 = await leer_peticion(reader)
            if peticion2 is None:
                return
            metodo, objetivo, cabec, crudo = peticion2
            fin = destino_de_objetivo(objetivo)
            if fin is None:
                return
            host, puerto, ruta = fin
            if not validar_destino(host, puerto):
                writer.write(b"HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n")
                await writer.drain()
                return
            cred = credenciales_basic(cabec)
        if cred is None:
            return
        usuario, clave = cred
        estado, resp = await api(
            "POST", "/interno/socks_auth",
            {"email": usuario, "password": clave},
            {"X-Interno": INTERNAL_TOKEN},
        )
        if estado != 200 or not resp or "circuito" not in resp:
            print(f"[entrada-http] credenciales rechazadas para {usuario!r} (HTTP {estado})", flush=True)
            writer.write(b"HTTP/1.1 401 Unauthorized\r\n"
                         b'Proxy-Authenticate: Basic realm="JumperNAT"\r\n'
                         b"Connection: close\r\nContent-Length: 0\r\n\r\n")
            await writer.drain()
            return
        saltos = resp["circuito"]
        estado2, redes = await api("GET", "/nodos", None, {"X-Interno": INTERNAL_TOKEN})
        mapa = {r["nombre"]: r["direccion"] for r in (redes or [])}
        if not all(s in mapa for s in saltos):
            writer.write(b"HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n")
            await writer.drain()
            return
        # ------------------------------------------------ peticion CONNECT
        if metodo.upper() == "CONNECT" and ruta is None:
            reader_n, writer_n = await conectar_circuito(saltos, mapa, f"{host}:{puerto}")
            writer.write(b"HTTP/1.1 200 Connection established\r\n\r\n")
            await writer.drain()
            print(f"[entrada-http] CONNECT {host}:{puerto} para {usuario!r} via {saltos}", flush=True)
            if CLAVE_SALTOS:
                aead = cifra.aead_desde_secreto(CLAVE_SALTOS)
                await asyncio.gather(
                    retransmitir_cifrado(reader, writer_n, aead),
                    retransmitir_descifrado(reader_n, writer, aead),
                )
            else:
                await asyncio.gather(retransmitir(reader, writer_n), retransmitir(reader_n, writer))
            return
        # ------------------------------------------ peticion HTTP normal (http://)
        if ruta is None:
            return
        destino_completo = f"{host}:{puerto}"
        reader_n, writer_n = await conectar_circuito(saltos, mapa, destino_completo)
        # reescribe la linea: ruta relativa, version par a par; cabeceras sin proxy-*
        lineas = crudo.split(b"\r\n", 1)
        resto = lineas[1] if len(lineas) == 2 else b""
        partes = (lineas[0].decode("latin-1")).split(" ")
        peticion_limpia = f"{partes[0]} {ruta} HTTP/1.0\r\n".encode("latin-1")
        for l in resto.split(b"\r\n"):
            if not l.strip():
                continue
            try:
                k, _, v = l.decode("latin-1").partition(":")
                kl = k.strip().lower()
                if kl in ("proxy-authorization", "proxy-connection", "proxy-authenticate"):
                    continue
                if kl == "connection" or kl == "keep-alive":
                    continue  # forzamos 1.0 (resp simple Connection: close)
                peticion_limpia += l + b"\r\n"
            except Exception:
                continue
        peticion_limpia += b"Connection: close\r\n\r\n"
        writer_n.write(peticion_limpia)
        await writer_n.drain()
        print(f"[entrada-http] HTTP {partes[0]} http://{destino_completo}{ruta} para {usuario!r} via {saltos}", flush=True)
        if CLAVE_SALTOS:
            aead = cifra.aead_desde_secreto(CLAVE_SALTOS)
            await asyncio.gather(
                retransmitir_cifrado(reader, writer_n, aead),
                retransmitir_descifrado(reader_n, writer, aead),
            )
        else:
            await asyncio.gather(retransmitir(reader, writer_n), retransmitir(reader_n, writer))
    except (asyncio.IncompleteReadError, asyncio.TimeoutError, ConnectionError, OSError, ValueError) as e:
        print(f"[entrada-http] error con {peer}: {type(e).__name__} {e}", flush=True)
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def main():
    servidor = await asyncio.start_server(atender, "0.0.0.0", PUERTO)
    print(f"[entrada-http] HTTP proxy a la escucha en 0.0.0.0:{PUERTO} "
          f"(permitidos: {sorted(PUERTOS_PERMITIDOS)})", flush=True)
    async with servidor:
        await servidor.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
