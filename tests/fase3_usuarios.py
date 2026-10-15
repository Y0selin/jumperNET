"""Prueba de la Fase 3: ciclo completo de cuenta de usuario.

Se ejecuta dentro de cliente-test: python fase3_usuarios.py http://api:8000
Comprueba: registro, registro duplicado, login mal, login bien, /me sin token,
token invalido, connect, rotate (exit cambia), disconnect, delete y /me
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
circuito1 = set(r.get("circuito", []))
# rotate
time.sleep(0.2)
st, r = pedir("POST", "/rotate", token=token)
comprobar("rotate -> circuito valido", st == 200 and len(r.get("circuito", [])) == 3, r)
salida2 = r.get("ip_salida")
comprobar("rotate cambia ip_salida", salida2 and salida2 != salida1, f"{salida1} -> {salida2}")
# disconnect
st, r = pedir("POST", "/disconnect", token=token)
comprobar("disconnect -> activo False", st == 200 and r.get("activo") is False, r)
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
