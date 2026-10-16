"""Test de Fase 5 - proxy SOCKS5 autenticado.

Se ejecuta con `docker compose run --rm cliente-test fase5_socks.py`.
Habla SOCKS5 byte a byte (socket puro) para cubrir:

  1. Credenciales validas + circuito activo  -> HTTP 200 de web-destino
  2. Sin usuario/contrasena (solo no-auth)   -> rechazado
  3. Contrasena incorrecta                   -> rechazado
  4. Usuario sin circuito conectado          -> rechazado
  5. Destino IP privada (metadata Oracle)    -> bloqueado
  6. Destino IP privada (red docker)         -> bloqueado
  7. Destino puerto no permitido (8080)      -> bloqueado
  8. Destino permitido por puerto (443)      -> se acepta el SOCKS
"""
import os
import socket
import sys

HOST = ("entrada", 1080)
WEB = "web-destino"

# Credenciales preparadas por el script de provision en el servidor (see README)
USUARIO = os.environ.get("SOCKS_USER", "socksuser")
CLAVE = os.environ.get("SOCKS_PASS", "sup3rguay")
USUARIO_SIN_CIRCUITO = os.environ.get("SOCKS_USER_NO_CIRCUITO", "sockssincir")
CLAVE_SIN_CIRCUITO = os.environ.get("SOCKS_PASS_NO_CIRCUITO", "otraclave123")


def falla(msg):
    print(f"  FALLO: {msg}")
    sys.exit(1)


def ok(msg):
    print(f"  OK   : {msg}")


def conecta():
    s = socket.create_connection(HOST, timeout=10)
    return s


def saluda(s, metodos=b"\x02"):
    """Manda el saludo SOCKS5 con la lista de metodos y devuelve la respuesta."""
    s.sendall(bytes([5, len(metodos)]) + metodos)
    return s.recv(2)


def auth(s, usuario, clave):
    u = usuario.encode()
    p = clave.encode()
    s.sendall(bytes([1, len(u)]) + u + bytes([len(p)]) + p)
    data = b""
    while len(data) < 2:
        trozo = s.recv(2 - len(data))
        if not trozo:
            break
        data += trozo
    return data if len(data) == 2 else b"\x00\x99"


def connect_req(s, destino_host, puerto):
    d = destino_host.encode()
    if ":" not in destino_host and destino_host.count(".") == 3:
        atyp, addr = 1, bytes(int(x) for x in destino_host.split("."))
    else:
        atyp, addr = 3, bytes([len(d)]) + d
    req = bytes([5, 1, 0, atyp]) + addr + puerto.to_bytes(2, "big")
    s.sendall(req)
    resp = b""
    while len(resp) < 4:
        r = s.recv(4 - len(resp))
        if not r:
            break
        resp += r
    if len(resp) < 4:
        return None
    ver, rep, _, atyp_r = resp
    rest = {1: 4, 3: None, 4: 16}[atyp_r]
    if rest is None:
        rest = s.recv(1)[0]
        rest = rest + 2
    else:
        rest = rest + 2
    restante = resp
    while len(restante) < 4 + rest:
        trozo = s.recv(4 + rest - len(restante))
        if not trozo:
            break
        restante += trozo
    return (ver, rep)


def lee_http(s, n=1024):
    s.settimeout(10)
    data = b""
    try:
        while b"\r\n\r\n" not in data:
            trozo = s.recv(n)
            if not trozo:
                break
            data += trozo
        # primera linea del HTTP
        linea = data.split(b"\r\n", 1)[0]
        return linea
    except socket.timeout:
        return b"(timeout sin respuesta HTTP)"


print("=" * 60)
print("FASE 5 / Test del proxy SOCKS5 autenticado en entrada:1080")
print("=" * 60)

# ---------------------------------------------------------------- caso 1: exito
print("\n[1] Usuario con circuito activo -> peticion HTTP a web-destino:80")
try:
    s = conecta()
    if saluda(s) != b"\x05\x02":
        falla("el servidor no ofrecio el metodo userpass (0x02)")
    if auth(s, USUARIO, CLAVE) != b"\x01\x00":
        falla("la autenticacion con credenciales validas fue rechazada")
    codigo = connect_req(s, WEB, 80)
    if codigo != (5, 0):
        falla(f"CONNECT a {WEB}:80 devolvio rep={codigo}, se esperaba 0x00")
    s.sendall(b"GET / HTTP/1.0\r\nHost: web-destino\r\n\r\n")
    linea = lee_http(s)
    s.close()
    if linea.startswith(b"HTTP/1.1 200") or linea.startswith(b"HTTP/1.0 200"):
        ok(f"conexion por el circuito funciona ({linea.decode()})")
    else:
        falla(f"a traves del circuito se obtuvo: {linea!r}")
except (ConnectionError, socket.timeout) as e:
    falla(f"excepcion inesperada en el caso de exito: {type(e).__name__}: {e}")

# ------------------------------------------------------------- caso 2: no-auth
print("\n[2] Cliente sin usuario/contrasena (metodo no-auth 0x00) -> rechazado")
s = conecta()
resp = saluda(s, metodos=b"\x00")
if resp == b"\x05\xff":
    ok("se rechazo el metodo sin autenticacion (0xff, no aceptable)")
else:
    falla(f"se acepto un metodo sin credenciales: {resp!r}")
s.close()

# ------------------------------------------------------------ caso 3: mal pass
print("\n[3] Contrasena incorrecta -> rechazado por el proxy")
s = conecta()
saluda(s)
r = auth(s, USUARIO, "clave-equivocada-123")
if r == b"\x01\x00":
    falla("una contrasena equivocada fue ACEPTADA")
else:
    ok(f"credenciales invalidas rechazadas (resposta={r!r})")
s.close()

# ---------------------------------------------------- caso 4: usuario sin circuito
print("\n[4] Usuario existente con connect=no -> rechazado (sin circuito)")
s = conecta()
saluda(s)
r = auth(s, USUARIO_SIN_CIRCUITO, CLAVE_SIN_CIRCUITO)
if r == b"\x01\x00":
    falla("un usuario sin circuito conectado paso la autenticacion")
else:
    ok("usuario sin circuito rechazado correctamente")
s.close()

# ------------------------------------------- caso 5: IP privada (metadata Oracle)
print("\n[5] Destino con IP de metadata de Oracle 169.254.169.254:80 -> bloqueado")
s = conecta()
saluda(s)
auth(s, USUARIO, CLAVE)
codigo = connect_req(s, "169.254.169.254", 80)
if codigo and codigo[1] != 0:
    ok(f"bloqueado (rep={codigo[1]})")
else:
    falla(f"NO se bloqueo la metadata (rep={codigo})")
s.close()

# --------------------------------------------------- caso 6: IP privada docker
print("\n[6] Destino con IP de la red docker 172.17.0.1:80 -> bloqueado")
s = conecta()
saluda(s)
auth(s, USUARIO, CLAVE)
codigo = connect_req(s, "172.17.0.1", 80)
if codigo and codigo[1] != 0:
    ok(f"bloqueado (rep={codigo[1]})")
else:
    falla(f"NO se bloqueo una IP privada docker (rep={codigo})")
s.close()

# ------------------------------------------------- caso 7: puerto no permitido
print("\n[7] Destino con puerto prohibido web-destino:8080 -> bloqueado")
s = conecta()
saluda(s)
auth(s, USUARIO, CLAVE)
codigo = connect_req(s, WEB, 8080)
if codigo and codigo[1] != 0:
    ok(f"bloqueado (rep={codigo[1]})")
else:
    falla(f"NO se bloqueo el puerto 8080 (rep={codigo})")
s.close()

# ------------------------------------------------- caso 8: destino https:443
print("\n[8] Destino con puerto de la lista blanca (web-destino:443) -> aceptado en SOCKS")
s = conecta()
saluda(s)
auth(s, USUARIO, CLAVE)
codigo = connect_req(s, WEB, 443)
if codigo == (5, 0):
    ok(f"puerto 443 admitido (rep={codigo[1]})")
else:
    falla(f"el puerto 443 (permitido) fue rechazado: rep={codigo}")
s.close()

print("\n" + "=" * 60)
print("TODOS LOS TESTS DE FASE 5 SUPERADOS")
print("=" * 60)
