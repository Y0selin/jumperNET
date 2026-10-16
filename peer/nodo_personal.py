#!/usr/bin/env python3
"""Nodo PERSONAL de JumperNAT (Fase 9) — tu equipo como salto de la red.

Es el modelo de TOR: un relay voluntario. Si tu amigo quiere que su ordenador
participe de la red (que.sendan por él saltos, o incluso que sea el EXIT y por
tanto internet vea LA IP DE SU CASA), solo tiene que:

  1) instalar Python 3 (Windows: python.org; Linux: viene de serie),
  2) abrir el puerto del nodo en su ROUTER (reenvío TCP hacia su máquina),
  3) ejecutar este fichero la primera vez (te pregunta lo básico) y
  4) decirle al dueño de la red el nombre que eligió: su equipo entrará al
     pool de saltos en cuanto el heartbeat confirme que está vivo.

Su equipo habla el MISMO protocolo que los nodos del servidor (Fase 1): una
primera línea con la ruta restante y detrás el stream sin interpretar. Nunca
registra el contenido ni el destino final; solo vecino interior y siguiente.

AFORO y politicas: como nodo de SALIDA usa las mismas reglas (solo puertos
80/443, nada de IPs privadas/metadata) y como hop intermedio reenvía ciego.

Configura un fichero peer_config.json a tu lado; si no existe, te pregunta y
lo guarda. Se puede editar a mano despues.

Solo Python estándar (sin dependencias); cifrado JENC de los saltos requiere
`pip install cryptography` cuando el servidor lo tenga activado.
"""
import asyncio
import ipaddress
import json
import os
import socket
import threading
import time
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CONF = AQUI / "peer_config.json"

PUERTOS_PERMITIDOS = {80, 443}
REDES_PROHIBIDAS = [ipaddress.ip_network(n) for n in (
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.168.0.0/16",
    "::1/128", "fc00::/7", "fe80::/10",
)]
CHUNK = 8192

# el estado de cifrado (Fase 8) se separa para no cargar sin necesidad
try:
    from cryptography.hazmut import (
        ChaCha20Poly1305 as _ChaCha,  # por si alguien lo trae del lado cifrado
    )
except Exception:
    pass

# ------------------------------------------------------------------ config

def pedir_config() -> dict:
    print("== nodo personal de JumperNAT — configuración ==")
    print("(los valores predeterminados entre corchetes: ENTER para aceptar)\n")
    nombre = input("nombre del peer [peer_" + prefijo_aleatorio() + "]: ").strip() or f"peer_{prefijo_aleatorio()}"
    if not nombre.startswith("peer_"):
        nombre = "peer_" + nombre
    puerto = input("puerto TCP que abrirás en tu router [9000]: ").strip() or "9000"
    api = input("URL de la API [https://jumpernet.duckdns.org]: ").strip() or "https://jumpernet.duckdns.org"
    token = input("token de PEER (te lo da el dueño de la red): ").strip()
    clave = input("CLAVE_SALTOS si el servidor tiene el cifrado de saltos activado [ENTER = vacío]: ").strip()
    conf = {
        "nombre": nombre, "puerto": int(puerto), "api_url": api,
        "peer_token": token, "clave_saltos": clave,
    }
    CONF.write_text(json.dumps(conf, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nconfig guardada en {CONF} (puedes editarlo a mano más tarde)\n")
    return conf

def prefijo_aleatorio() -> str:
    import random
    return str(random.randint(100, 999))


def cargar_config() -> dict:
    if CONF.exists():
        try:
            return json.loads(CONF.read_text(encoding="utf-8"))
        except Exception:
            print("[peer] el peer_config.json está mal formado — vuelve a configurar")
    return pedir_config()


def ip_publica() -> str:
    """Tu IP de salida a internet: la que la entrada usará para alcanzarte."""
    for url in ("https://api.ipify.org", "https://ifconfig.me/ip"):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "jumpernat-peer/1.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                ip = r.read(64).decode(errors="replace").strip()
            if ip and ip.count(".") == 3:
                return ip
        except Exception:
            continue
    raise RuntimeError("no pude averiguar tu IP pública (¿estás sin internet?)")


# ------------------------------------------------------------------ heartbeat

def hilo_heartbeat(conf: dict, listen_port: int, contador) -> None:
    deteccion = f"{ip_publica()}:{listen_port}"
    print(f"[peer] te registraré con direccion {deteccion} "
          "(asegúrate de tener ese puerto abierto en tu ROUTER hacia este equipo)")
    url = conf["api_url"].rstrip("/") + "/nodos/heartbeat"
    while True:
        cuerpo = json.dumps({
            "nombre": conf["nombre"], "direccion": deteccion,
            "conexiones": contador["vivas"],
        }).encode()
        req = urllib.request.Request(url, data=cuerpo, headers={
            "Content-Type": "application/json", "X-Interno": conf["peer_token"],
        })
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                r.read()
        except Exception as e:
            motivo = getattr(e, "code", None)
            if motivo == 401:
                print("\n[peer] token rechazado (401): pídele el TOKEN DE PEER correcto "
                      "al dueño de la red y reinicia.\n")
            else:
                print(f"[peer] heartbeat sin respuesta: {e}", flush=True)
        time.sleep(10)


# ------------------------------------------------------------------ protocolo

async def pipe(reader, writer) -> None:
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


def destino_bloqueado(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        return False
    return any(ip in red for red in REDES_PROHIBIDAS)


async def hop_handler(reader, writer, contador) -> None:
    contador["vivas"] += 1
    try:
        # 1) linea de ruta restante
        linea = await asyncio.wait_for(reader.readline(), timeout=15)
        ruta = linea.decode(errors="replace").strip()
        partes = [p for p in ruta.split(",") if p]
        if not partes:
            writer.close()
            return
        siguiente = partes[0]

        if not ",".join(partes[1:]):
            # ---------- nodo de SALIDA ----------
            host_d, _, puerto_s = siguiente.rpartition(":")
            try:
                puerto_d = int(puerto_s)
            except ValueError:
                writer.close(); return
            if puerto_d not in PUERTOS_PERMITIDOS:
                writer.close(); return
            if host_d.strip().lower() not in ("localhost",):
                try:
                    infos = await asyncio.get_event_loop().getaddrinfo(host_d, puerto_d, type=socket.SOCK_STREAM)
                    ips = {i[4][0] for i in infos}
                except socket.gaierror:
                    writer.close(); return
                if not ips or any(destino_bloqueado(ip) for ip in ips):
                    writer.close(); return
            print(f"[HOP] saliendo de tu equipo -> {host_d}:{puerto_d} (exit)", flush=True)
            r2, w2 = await asyncio.open_connection(host_d, puerto_d)
            await asyncio.gather(pipe(reader, w2), pipe(r2, writer), return_exceptions=True)
            return

        # ---------- nodo intermedio: conectar al siguiente salto ----------
        resto = ",".join(partes[1:])
        host, _, puerto = siguiente.rpartition(":")
        try:
            r2, w2 = await asyncio.open_connection(host, int(puerto or "9000"))
        except Exception as e:
            print(f"[HOP-ERR] no pude conectar al siguiente {host}:{puerto}: {e}", flush=True)
            writer.close(); return
        w2.write((resto + "\n").encode())
        await w2.drain()
        await asyncio.gather(pipe(reader, w2), pipe(r2, writer), return_exceptions=True)
    except Exception as e:
        print(f"[HOP-ERR] {e}", flush=True)
    finally:
        contador["vivas"] = max(0, contador["vivas"] - 1)
        try:
            writer.close()
        except Exception:
            pass


# ------------------------------------------------------------------ arranque

async def main() -> None:
    conf = cargar_config()
    if not conf.get("peer_token"):
        print("falta el token de PEER en la configuración: relanza y te lo pido")
        return
    if conf.get("clave_saltos"):
        try:
            import cryptography  # noqa: F401
        except ImportError:
            print("ATENCIÓN: el servidor tiene el cifrado de saltos, pero este equipo "
                  "no tiene `cryptography` instalado — instálalo con: pip install cryptography")
            return
        print("[peer] cifrado JENC: pendiente de soporte en nodos personales — "
              "pele con el dueño de la red para desactivar CLAVE_SALTOS o instale cryptography")
        return
    contador = {"vivas": 0}
    threading.Thread(target=hilo_heartbeat, args=(conf, conf["puerto"], contador), daemon=True).start()
    servidor = await asyncio.start_server(
        lambda r, w: hop_handler(r, w, contador), "0.0.0.0", conf["puerto"]
    )
    print(f"[peer] nodo personal '{conf['nombre']}' escuchando en 0.0.0.0:{conf['puerto']}")
    async with servidor:
        await servidor.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
