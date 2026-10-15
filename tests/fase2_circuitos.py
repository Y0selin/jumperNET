"""Prueba de la Fase 2: circuitos aleatorios de 3 nodos vivos distintos.

Se ejecuta dentro de cliente-test: python fase2_circuitos.py http://api:8000
Comprueba:
  1) Que hay >= 3 nodos vivos registrados por heartbeat
  2) Que POST /circuito devuelve 3 saltos distintos entre si, todos vivos
  3) Que pidiendo varios circuitos aparecen combinaciones distintas
"""
import json
import sys
import time
import urllib.request

API = sys.argv[1] if len(sys.argv) > 1 else "http://api:8000"


def obtener(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.load(r)


def post(url):
    req = urllib.request.Request(url, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)


fallos = []

# 1) esperar a que los heartbeats registren los nodos (segun INTERVALO 10s)
vivos = []
for _ in range(30):
    nodos = obtener(f"{API}/nodos")
    vivos = [n for n in nodos if n["estado"] == "vivo"]
    if len(vivos) >= 3:
        break
    time.sleep(2)
print(f"nodos registrados: {[n['nombre'] for n in vivos]}")
if len(vivos) < 3:
    fallos.append(f"solo {len(vivos)} nodos vivos tras 60s")

# 2) pedir 5 circuitos y validar
vistas = set()
combinaciones = set()
for i in range(5):
    c = post(f"{API}/circuito")
    saltos = c["saltos"]
    print(f"circuito {i+1}: saltos={saltos} ruta_restante={c['ruta_restante']}")
    if len(saltos) != 3:
        fallos.append(f"circuito {i+1}: {len(saltos)} saltos, se esperaban 3")
    if len(set(saltos)) != len(saltos):
        fallos.append(f"circuito {i+1}: saltos repetidos {saltos}")
    vivos_nombres = {n["nombre"] for n in obtener(f"{API}/nodos") if n["estado"] == "vivo"}
    if not set(saltos) <= vivos_nombres:
        fallos.append(f"circuito {i+1}: usa nodos no vivos {set(saltos) - vivos_nombres}")
    combinaciones.add(frozenset(saltos))

if len(combinaciones) < 2:
    fallos.append(f"5 peticiones produjeron solo {len(combinaciones)} combinacion(es)")

if fallos:
    print("FALLO:", "; ".join(fallos))
    sys.exit(1)
print("OK fase2: circuitos validos y aleatorios")
