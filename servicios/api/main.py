"""API de control de JumperNAT - Fase 2.

Plano de control (HTTP JSON) que:
  - recibe heartbeats de los nodos y lleva su estado vivo/caido en SQLite
  - elige al azar 3 nodos vivos y distintos entre si para formar un circuito

En la Fase 3 se le anaden usuarios, JWT y circuitos por usuario.
"""
import os
import random
import sqlite3
import time

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

DB = os.environ.get("DB_PATH", "/data/jumpernat.db")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")
UMBRAL_CAIDO = int(os.environ.get("UMBRAL_CAIDO_SEG", "35"))
N_SALTOS = 3

app = FastAPI(title="JumperNAT API", docs_url=None, redoc_url=None)


def conex():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    # Registro de nodos: nombre logico, direccion interna y heartbeat
    c.execute(
        """CREATE TABLE IF NOT EXISTS nodos(
            nombre TEXT PRIMARY KEY,
            direccion TEXT NOT NULL,
            ultimo_heartbeat REAL NOT NULL,
            estado TEXT NOT NULL DEFAULT 'vivo'
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


class Heartbeat(BaseModel):
    nombre: str
    direccion: str


@app.post("/nodos/heartbeat")
def heartbeat(hb: Heartbeat, x_interno: str | None = Header(default=None)):
    # Los heartbeats solo deberian llegar desde la red interna; el token
    # interno es una barrera adicional (la API no se publica en el host).
    if INTERNAL_TOKEN and x_interno != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="token interno no valido")
    if not hb.nombre or not hb.direccion:
        raise HTTPException(status_code=422, detail="nombre y direccion requeridos")
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
    """Lista de nodos registrados con su estado (para pruebas y panel admin)."""
    refrescar_estados()
    c = conex()
    filas = c.execute("SELECT nombre, direccion, estado FROM nodos ORDER BY nombre").fetchall()
    return [
        {"nombre": f["nombre"], "direccion": f["direccion"], "estado": f["estado"]}
        for f in filas
    ]


@app.post("/circuito")
def circuito():
    """Elige 3 nodos VIVOS y distintos entre si al azar.

    Devuelve: saltos (orden de la cadena), ruta_restante (lo que el cliente
    de entrada debe enviar al PRIMER nodo despues de conectarse) y exit.
    El destino final lo anade la entrada, no la API.
    """
    refrescar_estados()
    c = conex()
    vivos = [f["nombre"] for f in c.execute("SELECT nombre FROM nodos WHERE estado='vivo'").fetchall()]
    if len(vivos) < N_SALTOS:
        raise HTTPException(status_code=503, detail=f"no hay suficientes nodos vivos ({len(vivos)})")
    saltos = random.sample(vivos, N_SALTOS)
    direcciones = {
        f["nombre"]: f["direccion"]
        for f in c.execute("SELECT nombre, direccion FROM nodos").fetchall()
    }
    ruta_restante = ",".join(direcciones[n] for n in saltos[1:])
    return {
        "saltos": saltos,
        "ruta_restante": ruta_restante,
        "exit": saltos[-1],
    }
