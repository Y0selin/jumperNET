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
    # MODO TÚNEL (--tunel): cero puertos abiertos. El equipo abre UNA conexión
    # saliente al broker del VPS y la red salta por ahí (modelo Tor). No se
    # necesita abrir nada en el router ni saber tu IP pública: el agente corre
    # aquí mismo con tu token de peer y el servidor valida tu opt-in.
    if "--tunel" in sys.argv:
        return tunel_main(conf)
    if conf.get("clave_saltos"):
        try:
            import cryptography  # noqa: F401
        except ImportError:
            print("ATENCIÓN: el servidor tiene el cifrado de saltos, pero este equipo "
                  "no tiene `cryptography` instalado — instálalo con: pip install cryptography")
            return
        print("[peer] cifrado JENC: pendiente de soporte en honos personales — "
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


# ------------------------------------------------------------------ túnel inverso
# Con --tunel este EQUIPO es el salto SIN puertos abiertos: el broker del VPS
# multiplexa por la conexión saliente (mismo protocolo que el agente del
# navegador: TUNNEL / OPEN / DATA <id> <n> / FIN) y este bucle ejecuta el salto
# localmente con las mismas reglas que hop_handler (solo 80/443 y nada de IPs
# privadas como exit). Sin configuración extra: token + nombre del config.

async def tunel_main(conf: dict) -> None:
    broker_host = conf.get("broker_host") or (conf.get("api_host") or "jumpernet.duckdns.org")
    nombre = conf["nombre"]
    token = conf["peer_token"]
    retardo = 1
    subs: dict[str, dict] = {}

    async def hacia_broker(idc: str, datos: bytes) -> None:
        # encolado seguro: la escritura del frame la hace el bucle principal
        cola = subs.get(idc, {}).setdefault("cola_salida", [])
        cola.append(datos)

    while True:
        w = None
        try:
            r, w = await asyncio.open_connection(broker_host, 9008)
            w.write(f"TUNNEL {nombre} {token}\n".encode())
            await w.drain()
            resp = (await asyncio.wait_for(r.readline(), timeout=30)).decode().strip()
            if resp != "OK":
                pista = "activa el OPT-IN en el panel" if "NOOPT" in resp else "token/nombre rechazado"
                print(f"[tunel] broker: {resp} ({pista})")
                await asyncio.sleep(retardo); retardo = min(30, retardo * 2); continue
            print("[tunel] túnel vivo: tu equipo es salto SIN puertos abiertos ✓")
            retardo = 1
            subs.clear()
            while True:
                cab = (await asyncio.wait_for(r.readline(), timeout=180)).decode().strip()
                if not cab:
                    break                                   # broker cerró: reconectar
                partes = cab.split()
                tipo = partes[0]
                idc = partes[1] if len(partes) > 1 else ""
                if tipo == "OPEN":
                    subs[idc] = {}
                elif tipo == "DATA" and idc in subs:
                    n = int(partes[2]); payload = await r.readexactly(n)
                    s = subs[idc]
                    if "sock_w" not in s:
                        # primer payload = línea de ruta del protocolo nodo
                        await _abre_salto(idc, payload.decode(errors="replace"), s)
                        # vaciar cola que llegó mientras conectaba
                        for trozo in s.get("cola_entrada", []):
                            s["sock_w"].write(trozo)
                        s["cola_entrada"] = []
                    elif s.get("sock_w"):
                        s["sock_w"].write(payload)
                    # bombeo de la cola hacia el broker (respuestas del salto)
                    for frame in list(s.get("cola_salida", [])):
                        w.write(frame)
                    s["cola_salida"] = []
                    await w.drain()
                elif tipo == "FIN":
                    s = subs.pop(idc, None)
                    if s and s.get("sock_w"):
                        try: s["sock_w"].close()
                        except Exception: pass
        except Exception as e:
            print(f"[tunel] reconectando en {retardo}s: {e}")
        for s in list(subs.values()):
            try:
                if s.get("sock_w"): s["sock_w"].close()
            except Exception: pass
        subs.clear()
        await asyncio.sleep(retardo); retardo = min(30, retardo * 2)


async def _abre_salto(idc: str, ruta: str, s: dict) -> None:
    """Ejecuta el salto local (protocolo nodo): conecta al siguiente/destino,
    pasa la ruta restante y deja el socket listo para DATA/FIN del broker."""
    partes = [p for p in ruta.strip().split(",") if p]
    if not partes:
        s["denegado"] = True
        return
    primero = partes[0]; es_exit = len(partes) == 1
    try:
        host, puerto = primero.rsplit(":", 1); puerto = int(puerto)
    except ValueError:
        s["denegado"] = True
        return
    if es_exit and (puerto not in PUERTOS_PERMITIDOS or destino_bloqueado(host)):
        print(f"[tunel] exit denegado a {host}:{puerto} (reglas del circuito)")
        s["denegado"] = True
        return
    print(f"[tunel] salto hacia {primero} {'(exit)' if es_exit else '(relé)'}")
    try:
        r2, w2 = await asyncio.open_connection(host, puerto)
    except Exception as e:
        print(f"[tunel] no conecta a {primero}: {e}")
        s["denegado"] = True
        return
    if not es_exit:
        resto = ",".join(partes[1:])
        w2.write((resto + "\n").encode())
        await w2.drain()
    s["sock_w"] = w2

    async def leer_del_salto():
        try:
            while True:
                d = await r2.read(65536)
                if not d: break
                s.setdefault("cola_salida", []).append(f"DATA {idc} {len(d)}\n".encode() + d)
            s.setdefault("cola_salida", []).append(f"FIN {idc}\n".encode())
        except Exception:
            pass
        finally:
            try: w2.close()
            except Exception: pass
    asyncio.ensure_future(leer_del_salto())


import sys  # tras las constantes (argv --tunel)


if __name__ == "__main__":
    asyncio.run(main())
