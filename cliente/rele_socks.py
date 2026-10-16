#!/usr/bin/env python3
"""Rele LOCAL de JumperNAT: un SOCKS5 sin credenciales en 127.0.0.1 que reenvia
cada conexion al SOCKS5 del VPS, autenticandose el solo (RFC 1929 usuario/clave).

¿Por que existe? Chrome no admite credenciales SOCKS y Firefox te las pregunta
en cada conexion: los navegadores no pueden apuntar directamente a
jumpernet.duckdns.org:1080. Con este rele:

  tu navegador -> SOCKS5 sin clave en 127.0.0.1 -> SOCKS5 + clave en el VPS

La clave nunca sale de tu maquina (va solo dentro del handshake con el proxy
remoto) y el rele SOLO escucha en 127.0.0.1: no queda abierto a tu red local.

El DNS tambien viaja por el circuito: el rele reenvia los nombres de dominio
tal cual (ATYP=3) y quien resuelve es el nodo de salida del VPS.

Uso:
  python3 rele_socks.py --usuario tu@correo --clave 'tuClave'
  (por defecto escucha 127.0.0.1:7777 y remoto jumpernet.duckdns.org:1080)
"""
import argparse
import select
import socket
import struct
import sys
import threading

DESCONECTO_POR_SEGUNDOS = 300.0  # sin trafico ni abierto-> cerrar


def _leer_exacto(s: socket.socket, n: int) -> bytes:
    datos = b""
    while len(datos) < n:
        trozo = s.recv(n - len(datos))
        if not trozo:
            raise ConnectionError("la otra parte cerro la conexion")
        datos += trozo
    return datos


def _destino_texto(atyp: int, addr: bytes) -> str:
    if atyp == 1:
        return socket.inet_ntoa(addr)
    if atyp == 3:
        return addr.decode("idna")
    if atyp == 4:
        return socket.inet_ntop(socket.AF_INET6, addr)
    return f"atyp-{atyp}"


def conectar_remoto(args, atyp: int, addr: bytes, puerto: int) -> socket.socket:
    """Abre el SOCKS5 remoto, se autentica y hace CONNECT al mismo destino."""
    remoto = socket.create_connection((args.remoto_host, args.remoto_puerto), timeout=20)
    try:
        remoto.sendall(b"\x05\x01\x02")  # VER 5, 1 metodo: usuario/clave
        ver, metodo = _leer_exacto(remoto, 2)
        if ver != 5 or metodo != 2:
            raise RuntimeError("el proxy remoto no acepta usuario/clave")
        u, c = args.usuario.encode(), args.clave.encode()
        remoto.sendall(b"\x01" + bytes([len(u)]) + u + bytes([len(c)]) + c)
        ver, estado = _leer_exacto(remoto, 2)
        if ver != 1 or estado != 0:
            raise RuntimeError("credenciales rechazadas por el proxy remoto")
        # mismo destino que pidio el cliente (los dominios NO se resuelven aqui)
        if atyp == 1:
            pedir = b"\x05\x01\x00\x01" + addr + struct.pack(">H", puerto)
        elif atyp == 3:
            pedir = b"\x05\x01\x00\x03" + bytes([len(addr)]) + addr + struct.pack(">H", puerto)
        else:
            pedir = b"\x05\x01\x00\x04" + addr + struct.pack(">H", puerto)
        remoto.sendall(pedir)
        ver, rep, _, atyp_r = _leer_exacto(remoto, 4)
        if ver != 5 or rep != 0:
            raise RuntimeError(f"CONNECT denegado por el proxy remoto (codigo {rep})")
        # descartar BND.ADDR/BND.PORT de la respuesta
        if atyp_r == 1:
            _leer_exacto(remoto, 4 + 2)
        elif atyp_r == 3:
            _leer_exacto(remoto, _leer_exacto(remoto, 1)[0] + 2)
        else:
            _leer_exacto(remoto, 16 + 2)
    except Exception:
        remoto.close()
        raise
    return remoto


def _relae(cli: socket.socket, remoto: socket.socket):
    """Bombea los datos de ambos lados hasta que uno se agote o quede mudo."""
    ultimo_trafico = _ahora()
    try:
        remoto.settimeout(None)
        cli.settimeout(None)
        while True:
            r, _, _ = select.select([cli, remoto], [], [], DESCONECTO_POR_SEGUNDOS)
            if not r:
                if _ahora() - ultimo_trafico > DESCONECTO_POR_SEGUNDOS:
                    break
                continue
            for s in r:
                datos = s.recv(65536)
                if not datos:
                    return
                (cli if s is remoto else remoto).sendall(datos)
                ultimo_trafico = _ahora()
    except OSError:
        pass
    finally:
        for s in (cli, remoto):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def _ahora() -> float:
    import time

    return time.monotonic()


def atender(cli: socket.socket, args):
    destino_txt = "?"
    try:
        cli.settimeout(15)
        ver, nmeth = _leer_exacto(cli, 2)
        if ver != 5:
            raise RuntimeError("el cliente no habla SOCKS5")
        metodos = _leer_exacto(cli, nmeth)
        if 0 not in metodos:  # requiere metodo sin autenticacion: solo esto damos
            cli.sendall(b"\x05\xff")
            return
        cli.sendall(b"\x05\x00")
        ver, cmd, _, atyp = _leer_exacto(cli, 4)
        if atyp == 1:
            addr = _leer_exacto(cli, 4)
        elif atyp == 3:
            addr = _leer_exacto(cli, _leer_exacto(cli, 1)[0])
        elif atyp == 4:
            addr = _leer_exacto(cli, 16)
        else:
            raise RuntimeError(f"tipo de direccion {atyp} no soportado")
        puerto = struct.unpack(">H", _leer_exacto(cli, 2))[0]
        destino_txt = f"{_destino_texto(atyp, addr)}:{puerto}"
        if cmd != 1:  # solo CONNECT; UDP ASSOCIATE/BIND no hace falta para web
            cli.sendall(b"\x05\x07\x00\x01" + b"\x00" * 6)
            if not args.silencio:
                print(f"[rele] comando {cmd} denegado ({destino_txt})", flush=True)
            return
        try:
            remoto = conectar_remoto(args, atyp, addr, puerto)
        except Exception as e:
            if not args.silencio:
                print(f"[rele] FALLO {destino_txt}: {e}", flush=True)
            try:
                cli.sendall(b"\x05\x05\x00\x01" + b"\x00" * 6)  # conexion rechazada
            except OSError:
                pass
            return
        cli.sendall(b"\x05\x00\x00\x01" + b"\x00" * 6)
        if not args.silencio:
            print(f"[rele] {destino_txt} conectado", flush=True)
        _relae(cli, remoto)
    except Exception as e:
        if not args.silencio:
            print(f"[rele] error con el cliente: {e}", flush=True)
    finally:
        try:
            cli.close()
        except OSError:
            pass


def main():
    ap = argparse.ArgumentParser(description="Rele local de JumperNAT (SOCKS5 -> SOCKS5 con credenciales)")
    ap.add_argument("--usuario", required=True)
    ap.add_argument("--clave", required=True)
    ap.add_argument("--escucha", default="127.0.0.1:7777")
    ap.add_argument("--remoto", default="jumpernet.duckdns.org:1080")
    ap.add_argument("--silencio", action="store_true", help="no registrar cada conexion")
    args = ap.parse_args()

    host, _, puerto = args.escucha.partition(":")
    r_host, _, r_puerto = args.remoto.partition(":")
    args.remoto_host, args.remoto_puerto = r_host, int(r_puerto or "1080")
    if host not in ("127.0.0.1", "localhost"):
        print(f"AVISO: escuchando en {host}; SOLO 127.0.0.1 es seguro (no expongas el rele)", file=sys.stderr)

    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((host, int(puerto or "7777")))
    srv.listen(128)
    if not args.silencio:
        print(f"[rele] escuchando en {host}:{int(puerto or '7777')} -> {args.remoto} "
              f"(usuario {args.usuario})", flush=True)
    while True:
        cli, _ = srv.accept()
        threading.Thread(target=atender, args=(cli, args), daemon=True).start()


if __name__ == "__main__":
    main()
