"""Prueba de la Fase 3: ciclo completo de cuenta de usuario.

Se ejecuta dentro de cliente-test: python fase3_usuarios.py http://api:8000
Comprueba: registro, registro duplicado, login mal, login bien, /me sin token,
token invalido, connect, /salida, /comprobar (peticion REAL por el circuito),
rotate (cambian los saltos; la IP de salida NO puede cambiar porque los 6 nodos
viven en el mismo servidor, con una sola IP publica), disconnect, delete y /me
despues de borrar -> 401.
"""
import json
import random
import sys
import time
import urllib.request
import urllib.error

API = sys.argv[1] if len(sys.argv) > 1 else "http://api:8000"
USUARIO = f"fase3test{random.randint(1000,9999)}@prueba.es"
CLAVE = "Contra$enaDePrueba123"


def pedir(metodo, ruta, datos=None, token=None, especiales=False):
    req = urllib.request.Request(
        API + ruta,
        method=metodo,
        data=json.dumps(datos).encode() if datos is not None else None,
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
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


# registro
st, r = pedir("POST", "/register", {"email": USUARIO, "password": CLAVE})
comprobar("register", st == 200, r)
# duplicado
st, r = pedir("POST", "/register", {"email": USUARIO, "password": CLAVE})
comprobar("register duplicado -> 409", st == 409, r)
# password corta
st, r = pedir("POST", "/register", {"email": "x1@prueba.es", "password": "corta"})
comprobar("register password corta -> 422", st == 422, r)
# email invalido
st, r = pedir("POST", "/register", {"email": "no-es-un-email", "password": "larga1234"})
comprobar("register email invalido -> 422", st == 422, r)

# login mal
st, r = pedir("POST", "/login", {"email": USUARIO, "password": "incorrecta"})
comprobar("login password mala -> 401", st == 401, r)

# login bien
st, r = pedir("POST", "/login", {"email": USUARIO, "password": CLAVE})
comprobar("login -> token", st == 200 and "token" in r, r)
token = r.get("token", "")

# /me sin token
st, r = pedir("GET", "/me")
comprobar("/me sin token -> 401", st == 401, r)
# /me token invalido
st, r = pedir("GET", "/me", token="garbage.token.valor")
comprobar("/me token invalido -> 401", st == 401, r)
# /me con token
st, r = pedir("GET", "/me", token=token)
comprobar("/me -> datos", st == 200 and r.get("activo") is False, r)

# connect
st, r = pedir("POST", "/connect", token=token)
comprobar("connect -> circuito de 3", st == 200 and len(r.get("circuito", [])) == 3, r)
salida1 = r.get("ip_salida")
circuito1 = r.get("circuito", [])


def es_ipv4_publica(t):
    """IPv4 de internet: ni privada, ni loopback, ni link-local, ni CGNAT."""
    if not isinstance(t, str) or t.count(".") != 3:
        return False
    try:
        a, b, c, d = (int(p) for p in t.split("."))
    except ValueError:
        return False
    if not all(0 <= n <= 255 for n in (a, b, c, d)):
        return False
    return not (a in (0, 10, 127) or (a == 172 and 16 <= b <= 31)
                or (a == 192 and b == 168) or (a == 169 and b == 254)
                or (a == 100 and 64 <= b <= 127))


# La IP de salida ya no se inventa: es la IP PUBLICA REAL del nodo de salida,
# medida por el servidor (antes se guardaba el nombre del nodo, "nodo6", y el
# panel lo pintaba como si fuese una IP).
comprobar("connect devuelve una IP de salida publica real", es_ipv4_publica(salida1), f"ip_salida={salida1}")

# /salida mide la IP publica por su cuenta (sin pasar por el circuito)
st, r = pedir("GET", "/salida", token=token)
comprobar("/salida coincide con la IP de salida del circuito",
          st == 200 and r.get("ip_salida") == salida1, f"{r.get('ip_salida')} vs {salida1}")

# /comprobar: peticion REAL por el circuito (entrada -> nodos -> exit -> destino
# externo). Comprueba de verdad que el trafico sale y con que IP lo ve el mundo.
st, r = pedir("POST", "/comprobar", {"password": CLAVE}, token=token)
comprobar("/comprobar: el destino externo ve la IP del exit",
          st == 200 and r.get("ok") is True and r.get("ip_observada") == salida1
          and r.get("usa_el_exit") is True,
          f"observada={r.get('ip_observada')} esperada={salida1} ms={r.get('ms')}")
# ip_real (y por tanto cambia_tu_ip) solo se rellena cuando la API ve una IP
# PUBLICA del cliente; desde dentro de la red de docker el cliente es privado y
# no se guarda. En produccion (navegador del usuario) hay IP publica y
# cambia_tu_ip es True: ahi es donde se comprueba de verdad el cambio de IP.
comprobar("/comprobar: la IP observada no es la del cliente (o el cliente es interno)",
          r.get("cambia_tu_ip") is True
          or (r.get("tu_ip") is None and r.get("cambia_tu_ip") is None),
          f"tu_ip={r.get('tu_ip')} cambia_tu_ip={r.get('cambia_tu_ip')}")
st, r = pedir("POST", "/comprobar", {"password": "clave-que-no-es"}, token=token)
comprobar("/comprobar con clave mala -> ok False (el proxy valida en serio)",
          st == 200 and r.get("ok") is False, r)

# rotate
# rotate saca un circuito ALEATORIO (orden incluido): puede coincidir el orden
# exacto con el anterior por pura casualidad (con 6 nodos, 1 de cada 120). Se
# compara el circuito ordenado y se reintenta un par de veces por si colisiona.
time.sleep(0.2)
st, r = pedir("POST", "/rotate", token=token)
comprobar("rotate -> circuito valido", st == 200 and len(r.get("circuito", [])) == 3, r)
circuito2 = r.get("circuito", [])
intentos_r = 0
while circuito2 == circuito1 and intentos_r < 3:
    time.sleep(0.2)
    st, r = pedir("POST", "/rotate", token=token)
    circuito2 = r.get("circuito", [])
    intentos_r += 1
comprobar("rotate entrega OTRO circuito (cambia el orden de los saltos)",
          circuito2 != circuito1, f"{circuito1} -> {circuito2}")
comprobar("rotate mantiene la IP publica del servidor (misma IP, otros nodos)",
          r.get("ip_salida") == salida1, f"{salida1} -> {r.get('ip_salida')}")
st, r = pedir("POST", "/comprobar", {"password": CLAVE}, token=token)
comprobar("/comprobar: el circuito NUEVO tambien sale a internet con la IP del servidor",
          st == 200 and r.get("ok") is True and r.get("ip_observada") == salida1
          and r.get("circuito", []) == circuito2,
          f"observada={r.get('ip_observada')} circuito={r.get('circuito')}")
# disconnect
st, r = pedir("POST", "/disconnect", token=token)
comprobar("disconnect -> activo False", st == 200 and r.get("activo") is False, r)
st, r = pedir("POST", "/comprobar", {"password": CLAVE}, token=token)
comprobar("/comprobar con la red apagada -> 409", st == 409, r)
# rotate sin sesion
st, r = pedir("POST", "/rotate", token=token)
comprobar("rotate desconectado -> 409", st == 409, r)
# delete
st, r = pedir("DELETE", "/me", token=token)
comprobar("delete me", st == 200, r)
# /me tras borrar
st, r = pedir("GET", "/me", token=token)
comprobar("/me tras borrar -> 401", st == 401, r)

if fallos:
    print("FALLO:", "; ".join(fallos))
    sys.exit(1)
print("OK fase3: ciclo completo de usuario funciona")
