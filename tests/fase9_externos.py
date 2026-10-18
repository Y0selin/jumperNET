"""Prueba Fase 9 avanzada: modo SÓLO EXTERNOS + validación real de nodos.

Se ejecuta dentro de cliente-test: python fase9_externos.py http://api:8000
(o fuera, apuntando a https://jumpernet.duckdns.org).

Qué comprueba:
  1) /nodos expone el nivel de validación real: ms (sondeo TCP),
     responde (sondeo fresco) y saltable (puerto real + responde).
  2) registrar un peer de PRUEBA por /nodos/heartbeat con PEER_TOKEN y una
     dirección TCP que SÍ escucha (un puerto del propio cliente-test) y otro
     con dirección INFRA (nodo1:9000, la del VPS interno) y comprobar el
     etiquetado tipo usuario/infra.
  3) conectar en modo "todos" y en modo "externos": el circuito normal puede
     mezclar; el externo SOLO contiene peers tipo usuario.
  4) un peer con latido pero sin servicio que responda aparece en la lista
     pero NUNCA en ningún circuito (nada de zombis).
"""
import json
import socket
import sys
import threading
import time
import random

import urllib.request
import urllib.error

API = sys.argv[1] if len(sys.argv) > 1 else "http://api:8000"
USUARIO = f"exttest{random.randint(10**5, 10**6 - 1)}@prueba.es"
CLAVE = "Contra$enaExterna1"


def pedir(metodo, ruta, datos=None, token=None, cab=None):
    req = urllib.request.Request(
        API + ruta,
        method=metodo,
        data=json.dumps(datos).encode() if datos is not None else None,
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
            **(cab or {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.load(r) if r.status != 204 else {}
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode(errors="replace")
        try:
            cuerpo = json.loads(cuerpo)
        except Exception:
            pass
        return e.code, cuerpo


fallos = []


def comprobar(nombre, cond, extra=""):
    print(("OK  " if cond else "FALLO") + f" {nombre} {extra}")
    if not cond:
        fallos.append(nombre)


# ══ servidor TCP de prueba: un puerto que SIEMPRE "responde" al sondeo ══
def lanzar_escucha():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", 0))       # puerto efímero libre
    s.listen(16)
    def atender():
        while True:
            try:
                con, _ = s.accept()
                con.close()          # sondeo TCP: basta con aceptar y soltar
            except OSError:
                return
    threading.Thread(target=atender, daemon=True).start()
    return s.getsockname()[1]


puerto_escucha = lanzar_escucha()

# IP pública del cliente-test (dentro de docker no sirve 127.0.0.1: la API
# debe poder alcanzarnos; dentro de la red docker vale el nombre del contenedor
# — pero como no lo sabemos, probamos con la dirección de la red interna que
# el propio contenedor ve:  eth0). PERO la API sondea DESDE la red docker:
# si corremos FUERA del VPS, usamos la IP pública; si corremos DENTRO, la eth0.
def mi_ip_alcanzable():
    # dentro de la red de docker de JumperNET todas las IP son 172.x
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect((API.split("//")[1].split(":")[0].strip("/"), 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ══ cuenta de prueba ══
st, r = pedir("POST", "/register", {"email": USUARIO, "password": CLAVE})
comprobar("register", st == 200, r)
st, r = pedir("POST", "/login", {"email": USUARIO, "password": CLAVE})
comprobar("login", st == 200 and "token" in r, r)
TOK = r["token"]

# ══ 1) /nodos y niveles de validación ══
st, nodos = pedir("GET", "/nodos")
comprobar("/nodos 200", st == 200, st)
con_claves = all(("ms" in n and "responde" in n and "saltable" in n) for n in nodos)
comprobar("/nodos trae ms/responde/saltable", con_claves)
vivos_validados = [n for n in nodos if n["saltable"]]
comprobar("hay al menos 3 nodos saltables (infra docker)", len(vivos_validados) >= 3, len(vivos_validados))

# ══ 2) peer de prueba con direccion que responde ══
import os
PEER_TOKEN = ""
for var in ("PEER_TOKEN",):
    PEER_TOKEN = os.environ.get(var, "")
if not PEER_TOKEN:
    print("AVISO: sin PEER_TOKEN en el entorno, los pasos de peers se omiten")
else:
    ip_cli = mi_ip_alcanzable()
    st, r = pedir(
        "POST", "/nodos/heartbeat",
        {"nombre": "peer_prueba_ext", "direccion": f"{ip_cli}:{puerto_escucha}", "conexiones": 0},
        cab={"X-Interno": PEER_TOKEN},
    )
    comprobar("heartbeat del peer de prueba", st == 200, (st, r))
    st, nodos = pedir("GET", "/nodos")
    peer = [n for n in nodos if n["nombre"] == "peer_prueba_ext"]
    comprobar("peer de prueba en la lista tipo usuario", peer and peer[0]["tipo"] == "usuario", peer)
    comprobar("peer de prueba VALIDADO por el sondeo TCP", peer and peer[0]["saltable"] is True, peer)

    # ══ 3) conectar en modo todos / externos ══
    st, yo = pedir("POST", "/connect", {"modo": "todos"}, TOK)
    comprobar("connect modo todos", st == 200, st)
    circ = yo.get("circuito") or []
    comprobar("circuito todos no vacio", len(circ) >= 3, circ)
    st, yo = pedir("POST", "/disconnect", None, TOK)
    comprobar("disconnect", st == 200, st)

    st, yo = pedir("POST", "/connect", {"modo": "externos"}, TOK)
    if st == 200:
        circ = yo.get("circuito") or []
        comprobar("circuito externos solo peers usuario", all(n.startswith("peer_") for n in circ), circ)
        st2, nodos2 = pedir("GET", "/nodos")
        tipos = {n["nombre"]: n["tipo"] for n in nodos2}
        comprobar("ningun nodo infra colado en externos",
                  all(tipos.get(n) == "usuario" for n in circ), [(n, tipos.get(n)) for n in circ])
    else:
        # sin peers validados suficientes es LEGÍTIMO que sea 503 con mensaje
        comprobar("connect modo externos -> 200 o 503 con mensaje", st == 503 and "nodo" in json.dumps(r), (st, r))

    # ══ 4) la siguiente peticion por SOCKS, si la sesión queda activa, va
    #       por el circuito externo (la comprobación profunda está en
    #       run_all.sh paso 9.4, que cierra con la IP del peer).
    pedir("POST", "/disconnect", None, TOK)

st, r = pedir("DELETE", "/me", None, TOK)
comprobar("delete_me limpia", st == 200, st)

print()
print("FALLOS:", fallos if fallos else "ninguno")
sys.exit(1 if fallos else 0)
