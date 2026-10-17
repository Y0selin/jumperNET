"""API de control de JumperNAT - Fase 3.

Plano de control (HTTP JSON) que incluye:
  - registro de nodos con heartbeat (Fase 2)
  - eleccion aleatoria de circuitos de 3 nodos vivos (Fase 2)
  - cuentas de usuario (Fase 3): registro, login con JWT, panel /me,
    connect / disconnect / rotate / delete, con contrasenas en argon2,
    rate limiting en login/registro y limite de usuarios.
  - endpoint interno para el proxy SOCKS5 (Fase 5): valida credenciales
    y devuelve el circuito, pero SOLO desde la red interna.

Seguridad:
  - Las contrasenas se guardan con argon2 (nunca en claro).
  - El token JWT se firma con JWT_SECRET (en .env, fuera de git) y caduca.
  - La IP real solo se toma de X-Forwarded-For cuando la peticion llega
    desde un proxy de confianza (Caddy); la API no esta publicada a internet.
  - No se guarda historico de circuitos ni destinos: solo el estado actual
    del usuario (regla 4 del proyecto).
"""
import json
import os
import random
import re
import socket
import sqlite3
import struct
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt
import uvicorn
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB = os.environ.get("DB_PATH", "/data/jumpernat.db")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_SEGUNDOS = int(os.environ.get("JWT_SEGUNDOS", "7200"))
MAX_USUARIOS = int(os.environ.get("MAX_USUARIOS", "500"))
UMBRAL_CAIDO = int(os.environ.get("UMBRAL_CAIDO_SEG", "35"))
# Proxy SOCKS5 de entrada, por la red interna (para comprobar el circuito de
# extremo a extremo desde la propia API: https no, HTTP plano al puerto 80).
SOCKS_ENTRADA = os.environ.get("SOCKS_ENTRADA", "entrada:1080")
# Redes desde las que SI nos fiamos de X-Forwarded-For (Caddy corre en docker)
PROXIES_CONFIANZA = os.environ.get("PROXIES_CONFIANZA", "172.16.0.0/12,10.0.0.0/8").split(",")

N_SALTOS = 3
# argon2 con memoria moderada (16 MiB): por defecto pide 64 MiB y dentro de
# un contenedor con mem_limit pequeño el kernel lo mata (OOM del cgroup).
# Con time_cost=2 y 16 MiB sigue siendo fuerte para un proyecto educativo.
hasher = PasswordHasher(time_cost=2, memory_cost=16384, parallelism=2)

app = FastAPI(title="JumperNAT API", docs_url=None, redoc_url=None)

# CORS: solo los origenes permitidos (la web de GitHub Pages). Cualquier
# otro origen no recibira cabeceras CORS y el navegador bloqueara la peticion.
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "https://y0selin.github.io").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)


# ---------------------------------------------------------------- base de datos

def conex():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute(
        """CREATE TABLE IF NOT EXISTS nodos(
            nombre TEXT PRIMARY KEY,
            direccion TEXT NOT NULL,
            ultimo_heartbeat REAL NOT NULL,
            estado TEXT NOT NULL DEFAULT 'vivo'
        )"""
    )
    c.execute(
        """CREATE TABLE IF NOT EXISTS usuarios(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            ip_real TEXT,
            ip_salida TEXT,
            circuito TEXT,
            activo INTEGER NOT NULL DEFAULT 0,
            fecha_registro REAL NOT NULL,
            ultimo_cambio REAL,
            intentos_fallidos INTEGER NOT NULL DEFAULT 0,
            bloqueado_hasta REAL NOT NULL DEFAULT 0
        )"""
    )
    # preferencias del usuario (alias, lema…): JSON. Migración idempotente para
    # bases creadas antes — si la columna ya existe no pasa nada.
    try:
        c.execute("ALTER TABLE usuarios ADD COLUMN pref TEXT NOT NULL DEFAULT '{}'")
    except sqlite3.OperationalError:
        pass  # ya existe
    return c


def refrescar_estados():
    """Marca como caido todo nodo sin heartbeat reciente (estado derivado)."""
    c = conex()
    c.execute(
        "UPDATE nodos SET estado='caido' WHERE ultimo_heartbeat < ?",
        (time.time() - UMBRAL_CAIDO,),
    )
    c.commit()


# ---------------------------------------------------------------- rate limiting
# Limitador sencillo en memoria (ventana deslizante por clave). Para el
# alcance del proyecto es suficiente y no necesita dependencias externas.
_ventanas: dict[str, list[float]] = {}


def limitar(clave: str, maximo: int, ventana_seg: float) -> bool:
    """True si la accion esta autorizada; False si se supero el maximo."""
    ahora = time.time()
    lista = [t for t in _ventanas.get(clave, []) if t > ahora - ventana_seg]
    ok = len(lista) < maximo
    lista.append(ahora)
    _ventanas[clave] = lista
    return ok


# ---------------------------------------------------------------- ip real

def ip_en_red(ip: str, redes: list[str]) -> bool:
    try:
        parte = [int(x) for x in ip.split(".")]
    except Exception:
        return False
    for red in redes:
        red = red.strip()
        if not red or "/" not in red:
            continue
        base_str, bits_str = red.split("/")
        base = [int(x) for x in base_str.split(".")]
        m = int(bits_str) // 8
        if parte[:m] == base[:m]:
            return True
    return False


def ip_real(request: Request) -> str | None:
    """IP real del usuario SOLO si la peticion llega desde un proxy de
    confianza (Caddy). En otro caso se ignora X-Forwarded-For: si alguien
    tuviese acceso directo a la API no podria falsificar su IP.
    """
    peer = request.client.host if request.client else None
    if peer and ip_en_red(peer, PROXIES_CONFIANZA):
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
    return None


# ---------------------------------------------------------------- jwt / auth

def crear_token(id_: int, email: str) -> str:
    payload = {"sub": str(id_), "email": email, "exp": int(time.time()) + JWT_SEGUNDOS}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _auth(token_hdr: str | None) -> dict:
    """Valida el token Bearer y devuelve el usuario. 401 si falta/invalido."""
    if not token_hdr or not token_hdr.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="falta token (Authorization: Bearer)")
    try:
        payload = jwt.decode(token_hdr.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="token invalido o caducado")
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (int(payload["sub"]),)).fetchone()
    if f is None:
        raise HTTPException(status_code=401, detail="usuario inexistente")
    return dict(f)


# ---------------------------------------------------------------- red externa
# La IP publica con la que el servidor (y por tanto el nodo de salida) sale a
# internet. Se mide de verdad contra un servicio "cual es mi IP" y se cachea:
# asi el panel puede enseñar la IP que ve internet al usar el circuito.
_ip_publica = {"valor": None, "medida": 0.0}
SERVICIOS_IP = ("https://api.ipify.org", "http://ifconfig.me/ip", "https://icanhazip.com")


def medir_ip_publica(ttl: float = 600.0) -> str | None:
    """IP publica de salida (cacheada). None si no se pudo medir."""
    ahora = time.time()
    if _ip_publica["valor"] and ahora - _ip_publica["medida"] < ttl:
        return _ip_publica["valor"]
    for url in SERVICIOS_IP:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "jumpernat/1.0"})
            with urllib.request.urlopen(req, timeout=4) as r:
                texto = r.read(64).decode(errors="replace").strip()
            # ifconfig.me devuelve solo la IP; los otros tambien
            if re.fullmatch(r"[0-9a-fA-F:.]{7,45}", texto):
                _ip_publica.update(valor=texto, medida=ahora)
                return texto
        except Exception:
            continue
    return _ip_publica["valor"]


def _es_ipv4(t: str | None) -> bool:
    if not t:
        return False
    partes = t.split(".")
    return len(partes) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in partes)


def ip_salida_efectiva(f) -> str | None:
    """IP que ve internet al usar el circuito.

    En versiones anteriores esta columna guardaba el NOMBRE del nodo de salida
    ("nodo6"), que el panel enseñaba como si fuese una IP. Ahora guarda la IP
    publica real; si la fila es antigua (o no se pudo medir al conectar), la
    medimos y, si hay suerte, la dejamos ya guardada.
    """
    guardada = f["ip_salida"]
    if _es_ipv4(guardada):
        return guardada
    medida = medir_ip_publica()
    if medida and f["activo"]:
        c = conex()
        c.execute("UPDATE usuarios SET ip_salida=? WHERE id=?", (medida, f["id"]))
        c.commit()
    return medida


def fila_a_dict(f) -> dict:
    activo = bool(f["activo"])
    try:
        pref = json.loads(f["pref"] or "{}")
    except Exception:
        pref = {}
    return {
        "id": f["id"],
        "email": f["email"],
        "alias": pref.get("alias") or None,
        "lema": pref.get("lema") or None,
        "alta": f["fecha_registro"],
        "ip_real": f["ip_real"],
        "ip_salida": ip_salida_efectiva(f) if activo else None,
        "nodo_exit": (json.loads(f["circuito"])[-1] if f["circuito"] else None),
        "circuito": json.loads(f["circuito"]) if f["circuito"] else None,
        "activo": activo,
        "ultimo_cambio": f["ultimo_cambio"],
    }


# ---------------------------------------------------------------- nodos (Fase 2)

# token de los nodos PERSONALES de usuarios (peers). Vive en .env del VPS:
# ya unificada con INTERNAL_TOKEN en el modelo TOR, es lo que les das a los
# amigos cuando quieres que su equipo sea un saltificio de la red.
PEER_TOKEN = os.environ.get("PEER_TOKEN", "")

class Heartbeat(BaseModel):
    nombre: str
    direccion: str
    conexiones: int = 0


@app.post("/nodos/heartbeat")
def heartbeat(hb: Heartbeat, x_interno: str | None = Header(default=None)):
    # Dos formas de probarse vivo (Fase 9, nodos personales):
    #   INTERNAL_TOKEN -> los nodos de la infraestructura (docker)
    #   PEER_TOKEN     -> nodos PERSONALES de usuarios que se unen a la red
    #                     (nombre obligatoriamente peer_*); se envian como un
    #                     relay de TOR: su IP se ve como hop y su equipo puede
    #                     ser exit si es el ultimo salto.
    # Nadie necesita INTERNAL_TOKEN para unirse como peer con nombre peer_*.
    token_valido = (
        (INTERNAL_TOKEN and x_interno == INTERNAL_TOKEN)
        or (PEER_TOKEN and x_interno == PEER_TOKEN and hb.nombre.startswith("peer_"))
    )
    if not token_valido:
        raise HTTPException(status_code=401, detail="token no valido")
    refrescar_estados()
    c = conex()
    # columna nueva (Fase 9): numero de conexiones vivas que reenvia el nodo
    try:
        c.execute("ALTER TABLE nodos ADD COLUMN conexiones INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # ya existe
    c.execute(
        """INSERT INTO nodos(nombre, direccion, ultimo_heartbeat, estado, conexiones)
           VALUES(?,?,?,'vivo',?)
           ON CONFLICT(nombre) DO UPDATE SET
             direccion=excluded.direccion,
             ultimo_heartbeat=excluded.ultimo_heartbeat,
             estado='vivo',
             conexiones=excluded.conexiones""",
        (hb.nombre, hb.direccion, time.time(), max(0, hb.conexiones)),
    )
    c.commit()
    return {"ok": True}


# latencia por nodo: se mide con un TCP connect de verdad y se cachea un poco
_ms_nodos: dict[str, tuple[float, int | None]] = {}


def medir_ms(direccion: str) -> int | None:
    """Milisegundos de un TCP connect al nodo (None si no responde)."""
    ahora = time.time()
    cache = _ms_nodos.get(direccion)
    if cache and ahora - cache[0] < 8:
        return cache[1]
    ms = None
    try:
        host, puerto = direccion.rsplit(":", 1)
        t0 = time.perf_counter()
        with socket.create_connection((host, int(puerto)), timeout=0.8):
            ms = round((time.perf_counter() - t0) * 1000)
    except Exception:
        ms = None
    _ms_nodos[direccion] = (ahora, ms)
    return ms


@app.get("/nodos")
def lista_nodos():
    refrescar_estados()
    c = conex()
    columnas = "nombre, direccion, estado, ultimo_heartbeat"
    try:
        filas = c.execute(f"SELECT {columnas}, conexiones FROM nodos ORDER BY nombre").fetchall()
    except sqlite3.OperationalError:
        filas = c.execute(f"SELECT {columnas} FROM nodos ORDER BY nombre").fetchall()
    ahora = time.time()
    # latencias en paralelo para no encadenar 6 timeouts
    medidas: dict[str, int | None] = {}
    hilos = []
    for f in filas:
        t = threading.Thread(target=lambda d=f["direccion"]: medidas.__setitem__(d, medir_ms(d)))
        t.start()
        hilos.append(t)
    for t in hilos:
        t.join(timeout=1.2)
    salida = []
    for f in filas:
        d = dict(f)
        salida.append({
            "nombre": d["nombre"],
            "direccion": d["direccion"],
            "estado": d["estado"],
            "conexiones": d.get("conexiones", 0),
            "ultimo_hb": round(ahora - d["ultimo_heartbeat"], 1),
            "ms": medidas.get(d["direccion"], medir_ms(d["direccion"])),
        })
    return salida


def elegir_circuito() -> dict:
    """Elige 3 nodos vivos y distintos al azar. HTTP 503 si no hay suficientes."""
    refrescar_estados()
    c = conex()
    filas = c.execute("SELECT nombre, direccion FROM nodos WHERE estado='vivo'").fetchall()
    vivos = {f["nombre"]: f["direccion"] for f in filas}
    if len(vivos) < N_SALTOS:
        raise HTTPException(status_code=503, detail=f"no hay suficientes nodos vivos ({len(vivos)})")
    saltos = random.sample(list(vivos), N_SALTOS)
    return {
        "saltos": saltos,
        "ruta_restante": ",".join(vivos[n] for n in saltos[1:]),
        "exit": saltos[-1],
    }


@app.post("/circuito")
def circuito():
    """Endpoint de prueba de la eleccion (Fase 2)."""
    return elegir_circuito()


# ---------------------------------------------------------------- usuarios (Fase 3)

class Registro(BaseModel):
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str


RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


@app.post("/register")
def register(r: Registro, request: Request):
    email = r.email.strip().lower()
    if not RE_EMAIL.match(email):
        raise HTTPException(status_code=422, detail="email no valido")
    if len(r.password) < 8:
        raise HTTPException(status_code=422, detail="la contrasena debe tener al menos 8 caracteres")
    c = conex()
    total = c.execute("SELECT COUNT(*) AS n FROM usuarios").fetchone()["n"]
    if total >= MAX_USUARIOS:
        raise HTTPException(status_code=403, detail="servicio lleno: limite de usuarios alcanzado")
    if c.execute("SELECT 1 FROM usuarios WHERE email=?", (email,)).fetchone():
        raise HTTPException(status_code=409, detail="ese email ya esta registrado")
    # limite de CREADAS efectivas por IP (anti-spam): solo cuenta registros
    # que llegan hasta aqui, no las validaciones rechazadas
    if not limitar(f"reg:{ip_real(request) or request.client.host}", 3, 300):
        raise HTTPException(status_code=429, detail="demasiados registros; espera unos minutos")
    c.execute(
        "INSERT INTO usuarios(email, password_hash, ip_real, fecha_registro) VALUES(?,?,?,?)",
        (email, hasher.hash(r.password), ip_real(request), time.time()),
    )
    c.commit()
    id_nuevo = c.execute("SELECT last_insert_rowid()").fetchone()[0]
    return {"ok": True, "id": id_nuevo, "email": email}


@app.post("/login")
def login(l: Login, request: Request):
    email = l.email.strip().lower()
    if not limitar(f"login:{ip_real(request) or request.client.host}", 5, 60):
        raise HTTPException(status_code=429, detail="demasiados intentos; espera un minuto")
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE email=?", (email,)).fetchone()
    if f is None:
        # respuesta generica para no revelar que emails existen
        raise HTTPException(status_code=401, detail="credenciales no validas")
    if f["bloqueado_hasta"] > time.time():
        raise HTTPException(status_code=429, detail="cuenta bloqueada temporalmente por intentos fallidos")
    try:
        ok = hasher.verify(f["password_hash"], l.password)
    except (VerifyMismatchError, InvalidHashError):
        ok = False
    if not ok:
        fallos = f["intentos_fallidos"] + 1
        bloque = time.time() + 300 if fallos >= 5 else f["bloqueado_hasta"]
        c.execute(
            "UPDATE usuarios SET intentos_fallidos=?, bloqueado_hasta=? WHERE id=?",
            (fallos, bloque, f["id"]),
        )
        c.commit()
        raise HTTPException(status_code=401, detail="credenciales no validas")
    c.execute("UPDATE usuarios SET intentos_fallidos=0 WHERE id=?", (f["id"],))
    c.commit()
    return {"token": crear_token(f["id"], f["email"]), "expira_en": JWT_SEGUNDOS}


@app.get("/me")
def me(
    request: Request,
    token: str | None = Header(default=None, alias="Authorization"),
):
    u = _auth(token)
    c = conex()
    # si la peticion viene por el proxy confianza, refrescamos la ip real
    nueva_ip = ip_real(request)
    if nueva_ip and nueva_ip != u["ip_real"]:
        c.execute("UPDATE usuarios SET ip_real=? WHERE id=?", (nueva_ip, u["id"]))
        c.commit()
        u["ip_real"] = nueva_ip
    return fila_a_dict(u)


class Preferencias(BaseModel):
    alias: str | None = None
    lema: str | None = None


@app.patch("/me")
def editar_me(prefs: Preferencias, token: str | None = Header(default=None, alias="Authorization")):
    """Edita lo editable de tu cuenta: alias visible y lema.

    Se guarda como JSON en la columna pref. Nada de esto afecta al circuito ni
    a las credenciales SOCKS5 (que siguen siendo email + contrasena)."""
    u = _auth(token)
    c = conex()

    def limpiar(t, maximo):
        return t.strip().replace("<", "").replace(">", "")[:maximo]

    datos = {}
    if prefs.alias is not None:
        alias = limpiar(prefs.alias, 24)
        if alias:
            datos["alias"] = alias
    if prefs.lema is not None:
        lema = limpiar(prefs.lema, 80)
        if lema:
            datos["lema"] = lema
    if not datos:
        raise HTTPException(status_code=400, detail="no hay nada que guardar")

    f = c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone()
    try:
        pref = json.loads(f["pref"] or "{}")
    except Exception:
        pref = {}
    pref.update(datos)
    c.execute("UPDATE usuarios SET pref=? WHERE id=?", (json.dumps(pref, ensure_ascii=False), u["id"]))
    c.commit()
    return fila_a_dict(c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone())


@app.post("/connect")
def connect(
    request: Request,
    token: str | None = Header(default=None, alias="Authorization"),
):
    u = _auth(token)
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone()
    if f["activo"]:
        raise HTTPException(status_code=409, detail="ya estas conectado; usa /rotate o /disconnect")
    circ = elegir_circuito()
    c.execute(
        "UPDATE usuarios SET circuito=?, ip_salida=?, activo=1, ip_real=?, ultimo_cambio=? WHERE id=?",
        # ip_salida guarda la IP PUBLICA de salida (la que ve internet por el
        # circuito), no el nombre del nodo: si no se puede medir, se guarda el
        # nombre y ip_salida_efectiva() lo corregira en la siguiente lectura.
        (json.dumps(circ["saltos"]), medir_ip_publica() or circ["exit"], ip_real(request), time.time(), u["id"]),
    )
    c.commit()
    return fila_a_dict(c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone())


@app.post("/disconnect")
def disconnect(token: str | None = Header(default=None, alias="Authorization")):
    u = _auth(token)
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone()
    if not f["activo"]:
        raise HTTPException(status_code=409, detail="no estas conectado")
    c.execute(
        "UPDATE usuarios SET circuito=NULL, ip_salida=NULL, activo=0, ultimo_cambio=? WHERE id=?",
        (time.time(), u["id"]),
    )
    c.commit()
    return fila_a_dict(c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone())


@app.post("/rotate")
def rotate(request: Request, token: str | None = Header(default=None, alias="Authorization")):
    u = _auth(token)
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone()
    if not f["activo"]:
        raise HTTPException(status_code=409, detail="no estas conectado; usa /connect")
    circ = elegir_circuito()
    c.execute(
        "UPDATE usuarios SET circuito=?, ip_salida=?, ultimo_cambio=? WHERE id=?",
        (json.dumps(circ["saltos"]), medir_ip_publica() or circ["exit"], time.time(), u["id"]),
    )
    c.commit()
    return fila_a_dict(c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone())


@app.delete("/me")
def delete_me(token: str | None = Header(default=None, alias="Authorization")):
    u = _auth(token)
    c = conex()
    c.execute("DELETE FROM usuarios WHERE id=?", (u["id"],))
    c.commit()
    return {"ok": True, "borrado": u["email"]}


# ---------------------------------------------------------------- red real (Fase 9)
# Endpoints que responden a la pregunta "¿esto funciona de verdad?":
#   /salida    -> la IP publica con la que salimos a internet (medida, cacheada)
#   /comprobar -> hace una peticion REAL por el circuito SOCKS5 del usuario y
#                 devuelve la IP que ha visto el destino
#   /geo       -> geolocaliza una IP en el servidor (con cache), para que el
#                 mapa no tenga que fiarse del navegador ni inventar posiciones

_ip_geo: dict[str, tuple[float, dict]] = {}
GEO_TTL = 6 * 3600
# si los proveedores externos fallan (limites de uso, picos), reusamos el dato
# viejo hasta 45 dias y no volvemos a machacar la IP detro de 15 min: el mapa
# no se rompe con un mal rato del proveedor (era la causa del "error de API")
GEO_STALE_TTL = 45 * 86400
GEO_FALLO_TTL = 15 * 60
_geo_fallo: dict[str, float] = {}


def _leer_exacto(s: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        trozo = s.recv(n - len(buf))
        if not trozo:
            raise ConnectionError("la conexion se cerro durante el handshake")
        buf += trozo
    return buf


MOTIVOS_SOCKS = {
    1: "fallo general del circuito",
    2: "el circuito denego el destino (politica de salida)",
    3: "red inalcanzable",
    4: "destino inalcanzable",
    5: "conexion rechazada por el destino",
    6: "el circuito tardo demasiado (TTL)",
    7: "comando no soportado",
    8: "tipo de direccion no soportado",
}


def _socks_http_get(entrada: str, usuario: str, clave: str, destino: str, puerto: int, ruta: str = "/") -> str:
    """Peticion HTTP/1.0 a pelo A TRAVES del circuito SOCKS5 autenticado.
    Devuelve el cuerpo como texto. Lanza RuntimeError con el motivo exacto si
    algo falla (sin autenticacion, destino denegado, etc.)."""
    host_p, puerto_p = entrada.rsplit(":", 1)
    s = socket.create_connection((host_p, int(puerto_p)), timeout=8)
    s.settimeout(8)
    try:
        s.sendall(bytes([5, 1, 2]))  # SOCKS5, un solo metodo: usuario/contrasena
        if _leer_exacto(s, 2) != bytes([5, 2]):
            raise RuntimeError("la entrada no acepta autenticacion por usuario/contrasena")
        u, p = usuario.encode(), clave.encode()
        s.sendall(bytes([1, len(u)]) + u + bytes([len(p)]) + p)
        if _leer_exacto(s, 2) != bytes([1, 0]):
            raise RuntimeError("credenciales rechazadas o sin circuito activo")
        h = destino.encode()
        s.sendall(bytes([5, 1, 0, 3, len(h)]) + h + struct.pack("!H", puerto))
        rep = _leer_exacto(s, 4)
        if rep[1] != 0:
            raise RuntimeError(MOTIVOS_SOCKS.get(rep[1], f"el circuito rechazo la peticion (rep={rep[1]})"))
        atyp = rep[3]
        if atyp == 1:
            _leer_exacto(s, 4)
        elif atyp == 4:
            _leer_exacto(s, 16)
        elif atyp == 3:
            _leer_exacto(s, _leer_exacto(s, 1)[0])
        _leer_exacto(s, 2)
        s.sendall(
            f"GET {ruta} HTTP/1.0\r\nHost: {destino}\r\nUser-Agent: jumpernat-comprobacion\r\nConnection: close\r\n\r\n".encode()
        )
        datos = b""
        while len(datos) < 8192:
            trozo = s.recv(4096)
            if not trozo:
                break
            datos += trozo
    finally:
        s.close()
    _, _, cuerpo = datos.partition(b"\r\n\r\n")
    return cuerpo.decode(errors="replace").strip()


class Comprobacion(BaseModel):
    password: str
    destino: str = "api.ipify.org:80"
    ruta: str = "/"


@app.get("/salida")
def salida(token: str | None = Header(default=None, alias="Authorization")):
    """IP publica de salida del servidor (medida de verdad y cacheada)."""
    u = _auth(token)
    circuitos = json.loads(u["circuito"]) if u["circuito"] else []
    return {
        "ip_salida": medir_ip_publica(ttl=60),
        "nodo_exit": circuitos[-1] if circuitos else None,
        "activo": bool(u["activo"]),
    }


@app.post("/comprobar")
def comprobar(cp: Comprobacion, token: str | None = Header(default=None, alias="Authorization")):
    """Comprueba el circuito de extremo a extremo: sale por el SOCKS5 del propio
    usuario y pregunta a un servicio externo que IP ve. Devuelve la IP observada,
    la esperada y si cambia respecto a la IP real del usuario.

    La contrasena se usa SOLO para este handshake (el proxy valida contra argon2
    en la propia API) y no se guarda ni se registra."""
    u = _auth(token)
    if not limitar(f"chk:{u['id']}", 12, 60):
        raise HTTPException(status_code=429, detail="demasiadas comprobaciones; espera un minuto")
    if not u["activo"]:
        raise HTTPException(status_code=409, detail="la red esta apagada: enciendela antes de comprobar")
    host_d, _, puerto_d = cp.destino.partition(":")
    t0 = time.perf_counter()
    try:
        cuerpo = _socks_http_get(SOCKS_ENTRADA, u["email"], cp.password, host_d, int(puerto_d or "80"), cp.ruta or "/")
    except Exception as e:
        return {"ok": False, "error": str(e), "ms": round((time.perf_counter() - t0) * 1000)}
    ms = round((time.perf_counter() - t0) * 1000)
    observada = cuerpo.split()[0] if cuerpo else ""
    if not _es_ipv4(observada):
        return {"ok": False, "error": f"respuesta inesperada del destino: {cuerpo[:80]!r}", "ms": ms}
    esperada = ip_salida_efectiva(dict(u))
    circuitos = json.loads(u["circuito"]) if u["circuito"] else []
    return {
        "ok": True,
        "ip_observada": observada,
        "ip_esperada": esperada,
        "tu_ip": u["ip_real"],
        "usa_el_exit": (observada == esperada) if esperada else None,
        "cambia_tu_ip": (observada != u["ip_real"]) if u["ip_real"] else None,
        "circuito": circuitos,
        "destino": cp.destino,
        "ms": ms,
    }


def _geo_proveedor(ip: str) -> dict | None:
    """Geolocaliza una IP con tres proveedores publicos (sin clave)."""
    try:
        req = urllib.request.Request(f"https://ipwho.is/{ip}", headers={"User-Agent": "jumpernat/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read(4096))
        if d.get("success") and d.get("latitude") is not None:
            return {
                "lat": d["latitude"], "lon": d["longitude"],
                "ciudad": d.get("city"), "region": d.get("region"), "pais": d.get("country"),
                "org": (d.get("connection") or {}).get("org"), "fuente": "ipwho.is",
            }
    except Exception:
        pass
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,lat,lon,city,regionName,country,org,isp"
        req = urllib.request.Request(url, headers={"User-Agent": "jumpernat/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read(4096))
        if d.get("status") == "success":
            return {
                "lat": d["lat"], "lon": d["lon"],
                "ciudad": d.get("city"), "region": d.get("regionName"), "pais": d.get("country"),
                "org": d.get("org") or d.get("isp"), "fuente": "ip-api.com",
            }
    except Exception:
        pass
    # tercer proveedor (ipapi.co): si ipwho.is e ip-api.com fallan a la vez
    # (picos de uso, limites), el mapa sigue teniendo datos
    try:
        req = urllib.request.Request(f"https://ipapi.co/{ip}/json/", headers={"User-Agent": "jumpernat/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read(4096))
        if not d.get("error") and d.get("latitude") is not None:
            return {
                "lat": d["latitude"], "lon": d["longitude"],
                "ciudad": d.get("city"), "region": d.get("region"), "pais": d.get("country_name"),
                "org": d.get("org"), "fuente": "ipapi.co",
            }
    except Exception:
        pass
    return None


@app.get("/geo")
def geo(ip: str | None = None, token: str | None = Header(default=None, alias="Authorization")):
    """Geolocalizacion real (servidor) con cache. Sin `ip`, usa la del que llama.
    Si ningun proveedor responde se devuelve ok=false: el panel entonces dice
    claramente que no se pudo localizar, en vez de inventarse una posicion."""
    u = _auth(token)
    objetivo = (ip or u["ip_real"] or "").strip()
    if not re.fullmatch(r"[0-9a-fA-F:.]{7,45}", objetivo or ""):
        return {"ip": objetivo, "ok": False, "error": "sin IP que localizar"}
    guardado = _ip_geo.get(objetivo)
    ahora = time.time()
    if guardado and ahora - guardado[0] < GEO_TTL:
        return {"ip": objetivo, "ok": True, "cache": True, **guardado[1]}
    ultimo_fallo = _geo_fallo.get(objetivo)
    if ultimo_fallo and ahora - ultimo_fallo < GEO_FALLO_TTL:
        if guardado and ahora - guardado[0] < GEO_STALE_TTL:
            return {"ip": objetivo, "ok": True, "cache": "obsoleta", **guardado[1]}
        return {"ip": objetivo, "ok": False, "error": "la geolocalizacion no responde ahora; reintenta en unos minutos"}
    datos = _geo_proveedor(objetivo)
    if not datos:
        _geo_fallo[objetivo] = ahora
        if guardado and ahora - guardado[0] < GEO_STALE_TTL:
            return {"ip": objetivo, "ok": True, "cache": "obsoleta", **guardado[1]}
        return {"ip": objetivo, "ok": False, "error": "ningun proveedor de geolocalizacion respondio"}
    _ip_geo[objetivo] = (ahora, datos)
    return {"ip": objetivo, "ok": True, "cache": False, **datos}


# ---------------------------------------------------------------- interno (Fase 5)

class CredencialesSocks(BaseModel):
    email: str
    password: str


@app.post("/interno/socks_auth")
def socks_auth(cr: CredencialesSocks, x_interno: str | None = Header(default=None)):
    """Valida las credenciales del proxy SOCKS5 contra las cuentas de la API.

    Solo accesible desde la red interna (con token interno). Devuelve el
    circuito del usuario SOLO si existe y esta conectado (activo=1).
    NUNCA es un proxy abierto: sin credenciales validas, sin circuito.
    """
    if INTERNAL_TOKEN and x_interno != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="token interno no valido")
    email = cr.email.strip().lower()
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE email=?", (email,)).fetchone()
    if f is None:
        raise HTTPException(status_code=401, detail="credenciales no validas")
    try:
        ok = hasher.verify(f["password_hash"], cr.password)
    except (VerifyMismatchError, InvalidHashError):
        ok = False
    if not ok:
        raise HTTPException(status_code=401, detail="credenciales no validas")
    if not f["activo"] or not f["circuito"]:
        raise HTTPException(status_code=403, detail="usuario sin circuito activo; conectate en la web")
    saltos = json.loads(f["circuito"])

    # Auto-reparacion de circuitos con hops muertos (Fase 9b). Un nodo de
    # infraestructura que se reconstruye, o el equipo personal de un amigo que
    # se apaga, no puede dejar a un usuario con un circuito cadaver: si algun
    # salto guardado ya no esta vivo, se elige otro circuito con nodos VIVOS y
    # se guarda en su sitio. Sin esto, el proxy muere en silencio (el navegador
    # ni siquiera muestra error, segun Chrome puede caer a su IP directa).
    refrescar_estados()
    vivos = {r["nombre"] for r in c.execute("SELECT nombre FROM nodos WHERE estado='vivo'")}
    if not all(s in vivos for s in saltos):
        cir = elegir_circuito()
        saltos = cir["saltos"]
        salida = medir_ip_publica() or f["ip_salida"]
        c.execute(
            "UPDATE usuarios SET circuito=?, ip_salida=?, ultimo_cambio=? WHERE id=?",
            (json.dumps(saltos), salida, time.time(), f["id"]),
        )
        c.commit()
        print(f"[socks_auth] circuito reparado para {email}: {saltos}", flush=True)
    return {"id": f["id"], "circuito": saltos, "ip_salida": f["ip_salida"]}


# ---------------------------------------------------------------- arranque

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
