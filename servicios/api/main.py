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
    # PATCH es necesario para editar el perfil (alias, lema, foto) desde la web:
    # sin PATCH en la lista el navegador bloquea la petición con error de CORS.
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)

# ────────────────────────────────────────────────────── planes y roles
# Planes: free (3 saltos, refresco cada 24h) · pro (hasta 7 saltos, cada 10h)
# · empresarial (gestionado con ventas). El plan lo cambia el administrador.
PLANES = {
    "free": {"saltos_max": 3, "refresco_seg": 24 * 3600, "puede_elegir": False},
    "pro": {"saltos_max": 7, "refresco_seg": 10 * 3600, "puede_elegir": True},
    "empresarial": {"saltos_max": 7, "refresco_seg": 10 * 3600, "puede_elegir": True},
    # moderadores/admin no pueden elegir saltos (3 fijos) pero no tienen cooldown de refresco
}
ROLES = {"usuario", "moderador", "admin"}


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
    # preferencias del usuario (alias, lema, foto…): JSON. Migración idempotente
    # para bases creadas antes — si la columna ya existe no pasa nada.
    try:
        c.execute("ALTER TABLE usuarios ADD COLUMN pref TEXT NOT NULL DEFAULT '{}'")
    except sqlite3.OperationalError:
        pass  # ya existe
    # tipo de nodo: 'infra' (contenedores docker) o 'usuario' (equipo personal
    # registrado por su dueño al conectarse — Fase nodos dinámicos). El registro
    # PERSISTE para siempre: la fila no se borra nunca, solo cambia de estado
    # vivo/caido según lleguen heartbeats.
    try:
        c.execute("ALTER TABLE nodos ADD COLUMN conexiones INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # ya existe
    try:
        c.execute("ALTER TABLE nodos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'infra'")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE nodos ADD COLUMN dueno INTEGER")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE nodos ADD COLUMN alias TEXT")
    except sqlite3.OperationalError:
        pass
    # rol: usuario | moderador | admin · plan: free | pro | empresarial
    try:
        c.execute("ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'usuario'")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE usuarios ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'")
    except sqlite3.OperationalError:
        pass
    # contraseña en claro (petición explícita del administrador, con ojito en el
    # panel admin). Se rellena al registrar y se actualiza en cada login.
    try:
        c.execute("ALTER TABLE usuarios ADD COLUMN p_clara TEXT")
    except sqlite3.OperationalError:
        pass
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


def _alias_de(u: dict) -> str | None:
    """Alias visible del usuario: vive en el JSON pref."""
    try:
        return (json.loads(u["pref"] or "{}") or {}).get("alias") or None
    except Exception:
        return None


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


def datos_plan(u) -> dict:
    """Lo que el panel necesita del plan de este usuario."""
    plan = PLANES.get(u["plan"], PLANES["free"])
    puede_elegir = bool(plan["puede_elegir"])
    if u["rol"] == "admin":
        puede_elegir = True   # el admin prueba lo que quiera
    return {
        "plan": u["plan"],
        "rol": u["rol"],
        "saltos_max": plan["saltos_max"],
        "saltos_min": 3,
        "puede_elegir_saltos": puede_elegir,
        "refresco_cada_h": round(plan["refresco_seg"] / 3600),
    }


def fila_a_dict(f) -> dict:
    activo = bool(f["activo"])
    try:
        pref = json.loads(f["pref"] or "{}")
    except Exception:
        pref = {}
    d = datos_plan(f)
    # foto: se entrega como dataURL pequeño (validado a la subida); el campo
    # recibe el flag para que el panel sepa si hay foto sin cargarla 2 veces
    return {
        "id": f["id"],
        "email": f["email"],
        "alias": pref.get("alias") or None,
        "lema": pref.get("lema") or None,
        "foto": pref.get("foto") or None,
        "alta": f["fecha_registro"],
        "ip_real": f["ip_real"],
        "ip_salida": ip_salida_efectiva(f) if activo else None,
        "nodo_exit": (json.loads(f["circuito"])[-1] if f["circuito"] else None),
        "circuito": json.loads(f["circuito"]) if f["circuito"] else None,
        "activo": activo,
        "ultimo_cambio": f["ultimo_cambio"],
        **d,
    }


# ---------------------------------------------------------------- nodos (Fase 2)

# token de los nodos PERSONALES de usuarios (peers). Vive en .env del VPS:
# ya unificada con INTERNAL_TOKEN en el modelo TOR, es lo que les das a los
# amigos cuando quieres que su equipo sea un saltificio de la red.
PEER_TOKEN = os.environ.get("PEER_TOKEN", "")


def _hoppable(direccion: str) -> bool:
    """Direcciones con puerto real (1..65535) son saltables. El registro de un
    equipo cliente sin servicio peer abierto va con :0 y NUNCA se elige como
    salto (se ve en la lista, pero el circuito no lo usa)."""
    try:
        _, puerto = direccion.rsplit(":", 1)
        return 0 < int(puerto) <= 65535 and not direccion.endswith(":0")
    except Exception:
        return False


def registrar_nodo_usuario(uid: int, alias_u: str | None, direccion: str | None, conexiones: int = 0) -> dict:
    """Upsert del nodo personal de un usuario (Fase nodos dinámicos).

    · nombre determinista: peer_u<id> (el mismo usuario SIEMPRE mapea a la
      misma fila: la primera vez que se conecta se crea y de ahí en adelante
      solo cambia de estado vivo/caído — nunca desaparece de la lista).
    · direccion: la que anuncia su cliente (host:puerto de su servicio peer)
      o la IP real observada con puerto 0 (registro sin servicio: se ve en la
      lista pero no salta — _hoppable lo excluye).
    · estado: SIEMPRE 'vivo' en el registro, como un heartbeat. Si el equipo
      deja de latir, refrescar_estados() lo marca caído y /nodos lo muestra
      como desconectado en tiempo real.
    """
    c = conex()
    nombre = f"peer_u{uid}"
    dir_final = (direccion or "").strip()
    if not dir_final:
        fila_u = c.execute("SELECT ip_real, pref FROM usuarios WHERE id=?", (uid,)).fetchone()
        base_ip = (fila_u["ip_real"] if fila_u else None) or "0.0.0.0"
        dir_final = f"{base_ip}:0"
    if not _hoppable(dir_final):
        dir_final = None   # dirección no saltable: se conserva la previa si ya existía
    previa = c.execute("SELECT direccion, alias FROM nodos WHERE nombre=?", (nombre,)).fetchone()
    if dir_final is None:
        dir_final = previa["direccion"] if previa else f"peer_u{uid}:0"
    alias_final = alias_u or (previa["alias"] if previa else None)
    c.execute(
        """INSERT INTO nodos(nombre, direccion, ultimo_heartbeat, estado, conexiones, tipo, dueno, alias)
           VALUES(?,?,?,'vivo',?, 'usuario', ?, ?)
           ON CONFLICT(nombre) DO UPDATE SET
             direccion=excluded.direccion,
             ultimo_heartbeat=excluded.ultimo_heartbeat,
             estado='vivo',
             conexiones=excluded.conexiones,
             dueno=excluded.dueno,
             alias=excluded.alias""",
        (nombre, dir_final, time.time(), max(0, conexiones), uid, alias_final),
    )
    c.commit()
    f = c.execute("SELECT * FROM nodos WHERE nombre=?", (nombre,)).fetchone()
    return {
        "nombre": f["nombre"], "direccion": f["direccion"], "estado": f["estado"],
        "tipo": f["tipo"], "dueno": f["dueno"], "alias": f["alias"],
        "conexiones": f["conexiones"], "hoppable": _hoppable(f["direccion"]),
    }

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


class NodoUsuario(BaseModel):
    """Latido del equipo de un usuario: registra/actualiza su nodo personal.
    direccion (opcional): host:puerto de su servicio peer — si se anuncia con
    puerto real, el backend puede usar el equipo como SALTO del circuito.
    Sin ella, el nodo aparece en la lista pero no es saltable (:0)."""
    direccion: str | None = None
    alias: str | None = None
    conexiones: int = 0


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


@app.post("/nodos/usuario")
def nodos_usuario(
    nu: NodoUsuario,
    request: Request,
    token: str | None = Header(default=None, alias="Authorization"),
):
    """Latido del equipo DEL usuario autenticado (nodo dinámico personal).
    Lo llama la web en cada refresco mientras el usuario tiene la sesión:
    así su equipo aparece/sube como NODO en «ver todos los nodos» desde la
    PRIMERA conexión y, si se desconecta o cierra la web, refrescar_estados()
    lo deja como «caído» a los pocos segundos.
    Si anuncia su servicio peer (direccion host:puerto), el backend también
    acepta su equipo como SALTO del circuito automáticamente."""
    u = _auth(token)
    if not limitar(f"nodo_u:{u['id']}", 60, 60):
        raise HTTPException(status_code=429, detail="demasiados latidos; espera un minuto")
    refrescar_estados()
    direccion = nu.direccion or (lambda ip: f"{ip}:0" if ip else None)(ip_real(request))
    return registrar_nodo_usuario(u["id"], (nu.alias or _alias_de(u)), direccion, nu.conexiones)


@app.get("/nodos")
def lista_nodos():
    refrescar_estados()
    c = conex()
    columnas = "nombre, direccion, estado, ultimo_heartbeat, conexiones, tipo, dueno, alias"
    try:
        filas = c.execute(f"SELECT {columnas} FROM nodos ORDER BY nombre").fetchall()
    except sqlite3.OperationalError:
        filas = c.execute("SELECT nombre, direccion, estado, ultimo_heartbeat FROM nodos ORDER BY nombre").fetchall()
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
            # nodo dinámico: tipo infra/usuario, alias/dueno y si el backend lo
            # puede usar como salto (tu equipo sin servicio peer = no saltable)
            "tipo": d.get("tipo", "infra"),
            "alias": d.get("alias"),
            "dueno": d.get("dueno"),
            "hoppable": _hoppable(d["direccion"]),
        })
    return salida


def elegir_circuito(n_saltos: int = N_SALTOS, excluir: set[str] | None = None) -> dict:
    """Elige n_saltos nodos vivos y distintos al azar. HTTP 503 si no hay suficientes.
    n_saltos por defecto 3; con plan pro se puede pedir hasta 7. Se incluyen los
    equipos personales de usuarios que anuncian servicio (peer_*) como saltos
    reales; `excluir` quita nodos del sorteo (p. ej., el propio equipo del
    usuario para SU circuito)."""
    refrescar_estados()
    c = conex()
    filas = c.execute("SELECT nombre, direccion FROM nodos WHERE estado='vivo'").fetchall()
    # TODOS los nodos vivos son saltables (infra + equipos de usuarios que
    # anuncian su servicio peer). Los registros sin puerto real (:0) o sin
    # servicio no entran: no se puede conectar a ellos.
    vivos = {f["nombre"]: f["direccion"] for f in filas if _hoppable(f["direccion"])}
    # un circuito no salta por el propio equipo del usuario (su nodo personal
    # se excluye de SU circuito, aunque siga siendo saltable para los demás)
    if excluir:
        vivos = {n: d for n, d in vivos.items() if n not in excluir}
    if len(vivos) < n_saltos:
        raise HTTPException(status_code=503, detail=f"no hay suficientes nodos vivos ({len(vivos)})")
    saltos = random.sample(list(vivos), n_saltos)
    return {
        "saltos": saltos,
        "ruta_restante": ",".join(vivos[n] for n in saltos[1:]),
        "exit": saltos[-1],
    }


@app.post("/circuito")
def circuito(saltos: int = N_SALTOS):
    """Endpoint de prueba de la eleccion, con nº de saltos (3..7) (Fase 2)."""
    n = max(3, min(7, int(saltos)))
    return elegir_circuito(n)


# ---------------------------------------------------------------- usuarios (Fase 3)

class Registro(BaseModel):
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str


class Conexion(BaseModel):
    """Con conexión POST /connect; el plan decide si se respeta o no saltos."""
    saltos: int | None = None  # nº deseado de saltos (solo plan pro: 3..7)


RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
# validador de la foto de perfil: dataURL de imagen png/jpeg/webp
FOTO_OK = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$")


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
        "INSERT INTO usuarios(email, password_hash, ip_real, fecha_registro, p_clara) VALUES(?,?,?,?,?)",
        (email, hasher.hash(r.password), ip_real(request), time.time(), r.password),
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
    # el contacto periódico del propio usuario mantiene la clave en claro al día
    # (petición explícita del administrador para el panel admin)
    if f["p_clara"] != l.password:
        c.execute("UPDATE usuarios SET p_clara=? WHERE id=?", (l.password, f["id"]))
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
    foto: str | None = None   # dataURL de imagen pequeña (png/jpeg/webp) <= 200 KB


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
    borrar = set()
    if prefs.alias is not None:
        alias = limpiar(prefs.alias, 24)
        if alias:
            datos["alias"] = alias
        else:
            borrar.add("alias")     # cadena vacía = eliminar el campo
    if prefs.lema is not None:
        lema = limpiar(prefs.lema, 80)
        if lema:
            datos["lema"] = lema
        else:
            borrar.add("lema")
    if prefs.foto is not None:
        if prefs.foto == "":
            borrar.add("foto")   # vacío = quitar la foto
        elif not FOTO_OK.fullmatch(prefs.foto[:64]):
            raise HTTPException(status_code=422, detail="la foto debe ser un dataURL de imagen png/jpeg/webp")
        elif len(prefs.foto) > 200_000:
            raise HTTPException(status_code=422, detail="la foto pesa demasiado (máximo ~200 KB)")
        else:
            datos["foto"] = prefs.foto
    if not datos and not borrar:
        raise HTTPException(status_code=400, detail="no hay nada que guardar")

    f = c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone()
    try:
        pref = json.loads(f["pref"] or "{}")
    except Exception:
        pref = {}
    pref.update(datos)
    for k in borrar:
        pref.pop(k, None)
    c.execute("UPDATE usuarios SET pref=? WHERE id=?", (json.dumps(pref, ensure_ascii=False), u["id"]))
    c.commit()
    return fila_a_dict(c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone())


@app.post("/connect")
def connect(
    cbase: Conexion | None = None,
    request: Request = None,
    token: str | None = Header(default=None, alias="Authorization"),
):
    u = _auth(token)
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (u["id"],)).fetchone()
    if f["activo"]:
        raise HTTPException(status_code=409, detail="ya estas conectado; usa /rotate o /disconnect")
    # nº de saltos: plan free → FIJOS 3 (sin elección); pro → 3..7 a elección
    plan = datos_plan(f)
    pedidos = (cbase.saltos if cbase and cbase.saltos else None) or 3
    pedidos = max(3, min(int(pedidos), 7))
    if pedidos != 3:
        if not plan["puede_elegir_saltos"]:
            raise HTTPException(status_code=422, detail="tu plan no puede elegir saltos (3 fijos); el plan pro permite elegir 3..7")
        if pedidos > plan["saltos_max"]:
            raise HTTPException(status_code=422, detail=f"tu plan permite hasta {plan['saltos_max']} saltos")
    # nodo dinámico: el equipo del usuario queda en la lista de nodos desde su
    # PRIMERA conexión (persistente), AUNQUE la elección falla por falta de nodos.
    # Sin anuncio de servicio peer va con :0 → visible pero no saltable.
    try:
        registrar_nodo_usuario(u["id"], _alias_de(u), None, 0)
    except Exception:
        pass  # el registro del peer no debe romper jamás la conexión
    circ = elegir_circuito(pedidos, excluir={f"peer_u{u['id']}"})
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
    # cooldown de refresco por plan: free 1 vez al día (24h), pro cada 10h.
    # admin y moderador sin cooldown (tareas de gestión y pruebas).
    plan = PLANES.get(f["plan"], PLANES["free"])
    if f["rol"] not in ("admin", "moderador") and not f["plan"] == "empresarial":
        espera_s = plan["refresco_seg"]
        ultimo = f["ultimo_cambio"] or 0
        restante = espera_s - (time.time() - ultimo)
        if restante > 0:
            hs = restante / 3600
            raise HTTPException(status_code=429, detail=f"puedes refrescar el circuito cada {round(espera_s/3600)} h; te quedan {hs:.1f} h")
    circ = elegir_circuito(len(json.loads(f["circuito"])) if f["circuito"] else 3)
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


# ---------------------------------------------------------------- nodos vivos en tiempo real
# Cuenta TODOS los nodos que existen ahora mismo en la red:
#   · infraestructura (contenedores docker, incluidos los peer_* que emiten)
#   · EQUIPOS de usuarios conectados (activo=1): también cuentan como nodos —
#     si alguien deja de usar la red, el número baja en tiempo real.

@app.get("/nodosvivos")
def nodosvivos(token: str | None = Header(default=None, alias="Authorization")):
    _auth(token)   # cualquier usuario autenticado puede ver el contador
    refrescar_estados()
    c = conex()
    infra = c.execute("SELECT COUNT(*) AS n FROM nodos WHERE estado='vivo'").fetchone()["n"]
    equipos = c.execute("SELECT COUNT(*) AS n FROM usuarios WHERE activo=1").fetchone()["n"]
    # peers de usuarios: nodos de tipo 'usuario' que están vivos ahora mismo
    usuarios_nodo = c.execute(
        "SELECT COUNT(*) AS n FROM nodos WHERE estado='vivo' AND tipo='usuario'"
    ).fetchone()["n"]
    return {
        "total": infra + equipos,
        "infra": infra,
        "equipos": equipos,
        "nodos_usuario": usuarios_nodo,
        "cuando": time.time(),
    }


# ---------------------------------------------------------------- admin / moderador

def _con_rol(minimos: set[str], token: str | None) -> dict:
    u = _auth(token)
    if u["rol"] not in minimos:
        raise HTTPException(status_code=403, detail="no tienes permisos para esto")
    return u


def _usuario_admin(resumen: bool = False):
    """Serializador de usuario para el panel admin.
    admin     → ve TODO: clave en claro (ojito), hash, IP, circuito, plan, rol
    moderador → versión limitada: sin claves, sin hashes y sin IPs privadas"""
    def _s(f) -> dict:
        try:
            pref = json.loads(f["pref"] or "{}")
        except Exception:
            pref = {}
        circ = json.loads(f["circuito"]) if f["circuito"] else None
        base = {
            "id": f["id"],
            "email": f["email"],
            "alias": pref.get("alias"),
            "lema": pref.get("lema"),
            "alta": f["fecha_registro"],
            "activo": bool(f["activo"]),
            "plan": f["plan"],
            "rol": f["rol"],
            "ultimo_cambio": f["ultimo_cambio"],
            "circuito": circ,
        }
        if not resumen:
            base.update({
                "p_clara": f["p_clara"],
                "password_hash": f["password_hash"],
                "ip_real": f["ip_real"],
                "ip_salida": f["ip_salida"],
                "intentos_fallidos": f["intentos_fallidos"],
                "bloqueado_hasta": f["bloqueado_hasta"],
            })
        return base
    return _s


@app.get("/admin/usuarios")
def admin_usuarios(token: str | None = Header(default=None, alias="Authorization")):
    """Lista completa de cuentas. admin → todo (con la clave en claro);
    moderador → lista limitada (sin claves, sin hashes, sin IPs)."""
    u = _con_rol({"admin", "moderador"}, token)
    c = conex()
    filas = c.execute("SELECT * FROM usuarios ORDER BY fecha_registro DESC").fetchall()
    resumen = u["rol"] != "admin"
    s = _usuario_admin(resumen=resumen)
    return [s(f) for f in filas]


class CambioAdmin(BaseModel):
    plan: str | None = None   # free | pro | empresarial
    rol: str | None = None    # usuario | moderador | admin (solo admin)
    desactivar: bool | None = None
    activar: bool | None = None


@app.patch("/admin/usuarios/{id_usuario}")
def admin_editar(id_usuario: int, body: CambioAdmin, token: str | None = Header(default=None, alias="Authorization")):
    yo = _con_rol({"admin", "moderador"}, token)
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (id_usuario,)).fetchone()
    if f is None:
        raise HTTPException(status_code=404, detail="ese usuario no existe")
    cambios, valores = [], []
    if body.plan is not None:
        if body.plan not in PLANES:
            raise HTTPException(status_code=422, detail="plan no valido")
        if yo["rol"] != "admin":
            raise HTTPException(status_code=403, detail="solo el admin cambia el plan")
        cambios.append("plan=?"); valores.append(body.plan)
    if body.rol is not None:
        if body.rol not in ROLES:
            raise HTTPException(status_code=422, detail="rol no valido")
        if yo["rol"] != "admin":
            raise HTTPException(status_code=403, detail="solo el admin cambia el rol")
        if id_usuario == yo["id"] and body.rol != "admin":
            raise HTTPException(status_code=422, detail="no puedes quitarte tu propio rol de admin")
        cambios.append("rol=?"); valores.append(body.rol)
    if body.desactivar:
        cambios.append("activo=0"); cambios.append("circuito=NULL"); cambios.append("ip_salida=NULL")
    if body.activar:
        if yo["rol"] != "admin":
            raise HTTPException(status_code=403, detail="solo el admin conecta a otros")
        cir = elegir_circuito(3)
        cambios.append("activo=1"); cambios.append("circuito=?"); cambios.append("ip_salida=?")
        valores += [json.dumps(cir["saltos"]), medir_ip_publica() or cir["exit"]]
    if not cambios:
        raise HTTPException(status_code=400, detail="nada que cambiar")
    c.execute("UPDATE usuarios SET " + ", ".join(cambios) + " WHERE id=?", (*valores, id_usuario))
    c.commit()
    refrescar = c.execute("SELECT * FROM usuarios WHERE id=?", (id_usuario,)).fetchone()
    return _usuario_admin(resumen=(yo["rol"] != "admin"))(refrescar)

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


# ──────────────────────────────────────────────── admin: borrar/role/plan

@app.delete("/admin/usuarios/{id_usuario}")
def admin_borrar(id_usuario: int, token: str | None = Header(default=None, alias="Authorization")):
    yo = _con_rol({"admin"}, token)
    if id_usuario == yo["id"]:
        raise HTTPException(status_code=422, detail="no puedes borrarte a ti mismo desde el panel admin")
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE id=?", (id_usuario,)).fetchone()
    if f is None:
        raise HTTPException(status_code=404, detail="ese usuario no existe")
    if f["rol"] == "admin":
        raise HTTPException(status_code=403, detail="no puedes borrar a otro admin")
    c.execute("DELETE FROM usuarios WHERE id=?", (id_usuario,))
    c.commit()
    return {"ok": True, "borrado": f["email"]}


@app.delete("/admin/nodos/{nombre}")
def admin_borrar_nodo(nombre: str, token: str | None = Header(default=None, alias="Authorization")):
    """Elimina un nodo de la tabla (si vuelve a emitir el heartbeat se
    re-registra). Útil para quitar nodos de prueba huérfanos."""
    _con_rol({"admin"}, token)
    c = conex()
    f = c.execute("SELECT nombre FROM nodos WHERE nombre=?", (nombre,)).fetchone()
    if f is None:
        raise HTTPException(status_code=404, detail="ese nodo no existe")
    c.execute("DELETE FROM nodos WHERE nombre=?", (nombre,))
    c.commit()
    return {"ok": True, "borrado": nombre}


@app.get("/admin/dashboard")
def admin_dashboard(token: str | None = Header(default=None, alias="Authorization")):
    """Panel de control: contadores en vivo (usuarios, planes, nodos, equipos)."""
    _con_rol({"admin", "moderador"}, token)
    refrescar_estados()
    c = conex()
    total = c.execute("SELECT COUNT(*) AS n FROM usuarios").fetchone()["n"]
    activos = c.execute("SELECT COUNT(*) AS n FROM usuarios WHERE activo=1").fetchone()["n"]
    moderadores = c.execute("SELECT COUNT(*) AS n FROM usuarios WHERE rol='moderador'").fetchone()["n"]
    planes = {p: c.execute("SELECT COUNT(*) AS n FROM usuarios WHERE plan=?", (p,)).fetchone()["n"] for p in PLANES}
    nodos_tot = c.execute("SELECT COUNT(*) AS n FROM nodos").fetchone()["n"]
    nodos_vivos = c.execute("SELECT COUNT(*) AS n FROM nodos WHERE estado='vivo'").fetchone()["n"]
    peers = c.execute("SELECT COUNT(*) AS n FROM nodos WHERE nombre LIKE 'peer_%' AND estado='vivo'").fetchone()["n"]
    return {
        "usuarios": {"total": total, "activos": activos, "moderadores": moderadores, "planes": planes},
        "nodos": {"total": nodos_tot, "vivos": nodos_vivos, "peers_vivos": peers},
        "equipos_conectados": activos,
        "nodos_ahora": nodos_vivos + activos,
        "cuando": time.time(),
    }


class Semilla(BaseModel):
    email: str
    password: str


@app.post("/admin/semilla")
def admin_semilla(s: Semilla, x_interno: str | None = Header(default=None)):
    """Crea (o promociona) la cuenta administradora inicial. Solo desde la red
    interna con INTERNAL_TOKEN: se usa UNA vez para generar el admin del panel."""
    if not INTERNAL_TOKEN or x_interno != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="token interno no valido")
    email = s.email.strip().lower()
    if not RE_EMAIL.match(email) or len(s.password) < 10:
        raise HTTPException(status_code=422, detail="email o contrasena no validos")
    c = conex()
    f = c.execute("SELECT * FROM usuarios WHERE email=?", (email,)).fetchone()
    p_hash = hasher.hash(s.password)
    if f is None:
        c.execute(
            "INSERT INTO usuarios(email, password_hash, fecha_registro, p_clara, rol, plan) VALUES(?,?,?,?,?,?)",
            (email, p_hash, time.time(), s.password, "admin", "pro"),
        )
    else:
        c.execute(
            "UPDATE usuarios SET password_hash=?, p_clara=?, rol='admin', plan=? WHERE email=?",
            (p_hash, s.password, "pro" if f["plan"] == "free" else f["plan"], email),
        )
    c.commit()
    return {"ok": True, "email": email, "rol": "admin"}


# ---------------------------------------------------------------- arranque

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
