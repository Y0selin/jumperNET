"""API de control de JumperNAT - Fase 3.

Plano de control (HTTP JSON) que incluye:
  - registro de nodos con heartbeat (Fase 2)
  - eleccion aleatoria de circuitos de 3 nodos vivos (Fase 2)
  - cuentas de usuario (Fase 3): registro, login con JWT, panel /me,
    connect / disconnect / rotate / delete, con contrasenas en argon2,
    rate limiting en login/registro y limite de usuarios.

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
import sqlite3
import time

import jwt
import uvicorn
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel

DB = os.environ.get("DB_PATH", "/data/jumpernat.db")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_SEGUNDOS = int(os.environ.get("JWT_SEGUNDOS", "7200"))
MAX_USUARIOS = int(os.environ.get("MAX_USUARIOS", "500"))
UMBRAL_CAIDO = int(os.environ.get("UMBRAL_CAIDO_SEG", "35"))
# Redes desde las que SI nos fiamos de X-Forwarded-For (Caddy corre en docker)
PROXIES_CONFIANZA = os.environ.get("PROXIES_CONFIANZA", "172.16.0.0/12,10.0.0.0/8").split(",")

N_SALTOS = 3
# argon2 con memoria moderada (16 MiB): por defecto pide 64 MiB y dentro de
# un contenedor con mem_limit pequeño el kernel lo mata (OOM del cgroup).
# Con time_cost=2 y 16 MiB sigue siendo fuerte para un proyecto educativo.
hasher = PasswordHasher(time_cost=2, memory_cost=16384, parallelism=2)

app = FastAPI(title="JumperNAT API", docs_url=None, redoc_url=None)


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


def fila_a_dict(f) -> dict:
    return {
        "id": f["id"],
        "email": f["email"],
        "ip_real": f["ip_real"],
        "ip_salida": f["ip_salida"],
        "circuito": json.loads(f["circuito"]) if f["circuito"] else None,
        "activo": bool(f["activo"]),
        "ultimo_cambio": f["ultimo_cambio"],
    }


# ---------------------------------------------------------------- nodos (Fase 2)

class Heartbeat(BaseModel):
    nombre: str
    direccion: str


@app.post("/nodos/heartbeat")
def heartbeat(hb: Heartbeat, x_interno: str | None = Header(default=None)):
    if INTERNAL_TOKEN and x_interno != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="token interno no valido")
    refrescar_estados()
    c = conex()
    c.execute(
        """INSERT INTO nodos(nombre, direccion, ultimo_heartbeat, estado)
           VALUES(?,?,?,'vivo')
           ON CONFLICT(nombre) DO UPDATE SET
             direccion=excluded.direccion,
             ultimo_heartbeat=excluded.ultimo_heartbeat,
             estado='vivo'""",
        (hb.nombre, hb.direccion, time.time()),
    )
    c.commit()
    return {"ok": True}


@app.get("/nodos")
def lista_nodos():
    refrescar_estados()
    c = conex()
    filas = c.execute("SELECT nombre, direccion, estado FROM nodos ORDER BY nombre").fetchall()
    return [
        {"nombre": f["nombre"], "direccion": f["direccion"], "estado": f["estado"]}
        for f in filas
    ]


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
        (json.dumps(circ["saltos"]), circ["exit"], ip_real(request), time.time(), u["id"]),
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
        (json.dumps(circ["saltos"]), circ["exit"], time.time(), u["id"]),
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


# ---------------------------------------------------------------- arranque

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
