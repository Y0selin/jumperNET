"""Nodo de reenvio de JumperNAT (Fase 1 + heartbeat de Fase 2).

Protocolo: al conectarse, el cliente envia UNA primera linea con la ruta restante:
    nodoX:9000,nodoY:9000,destino:puerto
El nodo quita el primer elemento (su siguiente salto), se conecta a el, y le
pasa el resto de la ruta (misma linea). Si en la ruta solo queda el destino,
este nodo es el "exit": se conecta al destino y no envia linea de ruta.

El nodo de SALIDA valida el destino final (defensa en profundidad junto con
la validacion de la entrada, Fase 5): solo puertos 80/443 y bloqueo de IPs
privadas/loopback/docker/link-local (incluida la metadata de Oracle), salvo
las excepciones de pruebas internas (web-destino).

El nodo de SALIDA tambien DESCIFRA el stream del usuario cuando la entrada
uso el modo cifrado (Fase 8): deteccion automatica por los 4 primeros bytes
tras la linea de ruta (magia "JENC"). Sin CLAVE_SALTOS el exit se queda en
modo plano (compatibilidad con las fases 1-2).

Despues reenvia bytes en ambos sentidos con asyncio (sin interpretar contenido).
Solo registra [HOP] con el origen interno y el siguiente interno; nunca el
contenido ni el destino final del usuario.

Ademas envia un heartbeat periodico a la API para que esta mantenga el
registro de nodos vivos (Fase 2).
"""
import asyncio
import ipaddress
import json
import os
import socket
import threading
import time
import urllib.request

from _comun import cifra

LISTEN_PORT = int(os.environ.get("NODO_PORT", "9000"))
API_URL = os.environ.get("API_URL", "")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
INTERVALO_HB = int(os.environ.get("INTERVALO_HB_SEG", "10"))
# Fase 8: secreto compartido para el cifrado extremo a extremo de los saltos
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


# conexiones vivas que estamos reenviando ahora mismo (lo reporta el heartbeat)
CONEXIONES = 0
_lock_conexiones = threading.Lock()


def _conexion_suma(delta: int) -> None:
    global CONEXIONES
    with _lock_conexiones:
        CONEXIONES = max(0, CONEXIONES + delta)


def hilo_heartbeat():
    """Avisa a la API de forma periodica de que este nodo esta vivo y de
    cuantas conexiones lleva en este momento."""
    if not API_URL:
        return
    nombre = os.environ.get("NODO_NOMBRE", socket.gethostname())
    while True:
        cuerpo = json.dumps(
            {"nombre": nombre, "direccion": f"{nombre}:{LISTEN_PORT}", "conexiones": CONEXIONES}
        ).encode()
        req = urllib.request.Request(
            f"{API_URL}/nodos/heartbeat",
            data=cuerpo,
            headers={"Content-Type": "application/json", "X-Interno": INTERNAL_TOKEN},
        )
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


async def modo_cifrado_exit(reader, writer, r2, w2):
    """El exit descifra el stream de la entrada y habla plano con el destino;
    y en la vuelta, cifra las respuestas del destino hacia la entrada."""
    aead = cifra.aead_desde_secreto(CLAVE_SALTOS)
    receptor = cifra.Receptor(aead)

    async def hacia_destino():
        try:
            while True:
                datos = await receptor.recibir(reader)
                if not datos:
                    break
                w2.write(datos)
                await w2.drain()
        except Exception:
            pass
        finally:
            try:
                w2.close()
            except Exception:
                pass

    async def hacia_cliente():
        try:
            emisor = cifra.Emisor(aead)
            while True:
                datos = await r2.read(cifra.CHUNK)
                if not datos:
                    break
                await emisor.enviar(writer, datos)
            await emisor.cerrar(writer)
        except Exception:
            pass
        finally:
            try:
                writer.close()
            except Exception:
                pass

    await asyncio.gather(hacia_destino(), hacia_cliente(), return_exceptions=True)


def destino_bloqueado(host: str) -> bool:
    """True si el host ya es una IP dentro de las redes prohibidas."""
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        # es un nombre: no bloqueado aqui (resolverlo es cosa del exit tambien,
        # pero la entrada ya valida en su capa y el exit revalida la IP tras resolver)
        return False
    return any(ip in red for red in REDES_PROHIBIDAS)


async def hop_handler(reader, writer):
    _conexion_suma(1)
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

        if not resto:
            # ---- nodo de SALIDA: validar el destino final (Fase 5) ----
            try:
                host_d, puerto_d = siguiente.rsplit(":", 1)
                puerto_d = int(puerto_d)
            except ValueError:
                print("[HOP-ERR] destino mal formado", flush=True)
                writer.close()
                return
            if puerto_d not in PUERTOS_PERMITIDOS:
                print("[HOP-ERR] puerto no permitido en salida", flush=True)
                writer.close()
                return
            if host_d.strip().lower() in EXCEPCIONES:
                pass  # destino interno permitido para pruebas
            else:
                # resolver el nombre y revalidar la IP real (anti-DNS-bypass)
                try:
                    infos = await asyncio.get_event_loop().getaddrinfo(host_d, puerto_d, type=socket.SOCK_STREAM)
                    ips = {i[4][0] for i in infos}
                except socket.gaierror:
                    print("[HOP-ERR] destino no resoluble", flush=True)
                    writer.close()
                    return
                if not ips or any(destino_bloqueado(ip) for ip in ips):
                    print("[HOP-ERR] destino privado/metadata bloqueado en salida", flush=True)
                    writer.close()
                    return
                siguiente = f"{host_d}:{puerto_d}"
        print(f"[HOP] origen={origen} -> siguiente={siguiente} restosaltos={resto or '(exit)'}", flush=True)

        # 2) conectar al siguiente salto (o al destino si somos el exit)
        # Nodo PERSONAL por túnel inverso (sin puertos abiertos en su router):
        # la dirección viene como "tunel:<nombre>" y el BROKER mantiene la
        # conexión de salida que el peer ya abrió (modelo Tor). Se conecta al
        # puerto de nodos del broker, manda DIAL <nombre> y desde ahí la
        # conversación es idéntica a un socket directo (primera línea de
        # ruta + reenvío ciego).
        dial_broker = None
        if siguiente.startswith("tunel:"):
            dial_broker = siguiente[6:]
            host = os.environ.get("BROKER_HOST", "broker")
            puerto = os.environ.get("BROKER_PORT_NODOS", "9009")
        else:
            host, puerto = siguiente.rsplit(":", 1)
        r2, w2 = await asyncio.open_connection(host, int(puerto))
        if dial_broker is not None:
            w2.write(f"DIAL {dial_broker}\n".encode())
            await w2.drain()
            # la ruta restante va INMEDIATAMENTE tras el DIAL (sin esperar
            # respuesta: si el peer está offline el broker ya respondió ERR
            # y la conexión se cierra; no hay nada que leer antes de escribir)
            if partes[1:]:
                w2.write((",".join(partes[1:]) + "\n").encode())
                await w2.drain()
            # la conversación con el peer es la estándar del protocolo nodo:
            # reenvío ciego en ambos sentidos hasta que cierren
            await asyncio.gather(pipe(reader, w2), pipe(r2, writer), return_exceptions=True)
            return

        # 3) si quedan saltos, pasar la ruta restante; si es exit, no se envia nada
        if partes[1:]:
            w2.write((",".join(partes[1:]) + "\n").encode())
            await w2.drain()

            # 4) reenvio bidireccional hasta que ambas partes cierren (nodo intermedio)
            await asyncio.gather(pipe(reader, w2), pipe(r2, writer), return_exceptions=True)
        else:
            # ---- modo EXIT: deteccion automatica del cifrado (Fase 8) ----
            if CLAVE_SALTOS:
                magia = await asyncio.wait_for(reader.readexactly(4), timeout=15)
                if cifra.es_magia(magia):
                    print("[HOP] circuito con cifrado en capas (JENC) activo", flush=True)
                    await modo_cifrado_exit(reader, writer, r2, w2)
                    return
                # no es JENC: modo plano con los bytes ya leidos por delante
                w2.write(magia)
                await w2.drain()
            await asyncio.gather(pipe(reader, w2), pipe(r2, writer), return_exceptions=True)
    except Exception as e:
        print(f"[HOP-ERR] {e}", flush=True)
    finally:
        _conexion_suma(-1)
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
