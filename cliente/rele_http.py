#!/usr/bin/env python3
"""Rele HTTP LOCAL de JumperNAT (gemelo de rele_socks.py).

La extension del navegador habla proxy HTTP (CONNECT + Basic) y el SOCKS5 del
VPS solo acepta usuario/clave en su protocolo SOCKS. Este rele atiende
127.0.0.1:1081 SIN pedir clave al navegador y, por cada conexion, abre el
SOCKS5 remoto autenticandose EL con tu cuenta. Asi el navegador trabaja y el
usuario nunca toca nada.

Uso:
  python3 rele_http.py --usuario tu@correo --clave 'tuClave'
  (escucha 127.0.0.1:1081 por defecto, mismo puerto que la entrada HTTP)
Sin dependencias externas; SOLO para uso local (no lo expongas a tu red).
"""
import argparse
import select
import socket
import sys
import threading
import time

DESCONECTO_POR_SEGUNDOS = 300.0

from rele_socks import conectar_remoto  # reutiliza el handshake SOCKS remoto


def _relae(cli: socket.socket, remoto: socket.socket):
    ultimo = time.monotonic()
    try:
        remoto.settimeout(None)
        cli.settimeout(None)
        while True:
            r, _, _ = select.select([cli, remoto], [], [], DESCONECTO_POR_SEGUNDOS)
            if not r:
                if time.monotonic() - ultimo > DESCONECTO_POR_SEGUNDOS:
                    break
                continue
            for s in r:
                datos = s.recv(65536)
                if not datos:
                    return
                (cli if s is remoto else remoto).sendall(datos)
                ultimo = time.monotonic()
    except OSError:
        pass
    finally:
        for s in (cli, remoto):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def terminar(cli: socket.socket, respuesta: bytes):
    try:
        cli.sendall(respuesta)
    except OSError:
        pass
    finally:
        try:
            cli.close()
        except OSError:
            pass


def atender(cli: socket.socket, args):
    destino_txt = "?"
    try:
        cli.settimeout(30)
        # ------------------------------ linea de peticion --------------------
        linea = b""
        while not linea.endswith(b"\r\n"):
            trozo = cli.recv(1)
            if not trozo:
                return
            linea += trozo
            if len(linea) > 8192:
                raise RuntimeError("linea de peticion demasiado larga")
        partes = linea.decode("latin-1").split(" ")
        if len(partes) < 2:
            return
        metodo, objetivo = partes[0].upper(), partes[1]
        # ------------------------------ resto de cabeceras -------------------
        resto = b""
        while True:
            trozo = cli.recv(8192)
            if not trozo:
                break
            resto += trozo
            if b"\r\n\r\n" in resto or len(resto) > 65536:
                break
        print(f"[rele-http] {metodo} {objetivo}", flush=True)
        if metodo != "CONNECT":
            terminar(cli, b"HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\n\r\n")
            return
        host, _, pu = objetivo.rpartition(":")
        destino_txt = objetivo
        if not host:
            terminar(cli, b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n")
            return
        puerto = int(pu or "443")
        # dominio tal cual (ATYP=3 TNT): lo resuelve el nodo de salida del circuito
        atyp, addr = 3, host.encode("idna")
        remoto = conectar_remoto(args, atyp, addr, puerto)
        cli.sendall(b"HTTP/1.1 200 Connection established\r\n\r\n")
        _relae(cli, remoto)
    except Exception as e:
        print(f"[rele-http] FALLO {destino_txt}: {e}", flush=True)
        terminar(cli, b"HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n")
    finally:
        try:
            cli.close()
        except OSError:
            pass


def main():
    ap = argparse.ArgumentParser(description="Rele HTTP local de JumperNAT (todo -> SOCKS5 con credenciales)")
    ap.add_argument("--usuario", required=True)
    ap.add_argument("--clave", required=True)
    ap.add_argument("--escucha", default="127.0.0.1:1081")
    ap.add_argument("--remoto", default="jumpernet.duckdns.org:1080")
    args = ap.parse_args()

    host, _, puerto = args.escucha.partition(":")
    r_host, _, r_puerto = args.remoto.partition(":")
    args.remoto_host, args.remoto_puerto = r_host, int(r_puerto or "1080")
    if host not in ("127.0.0.1", "localhost"):
        print(f"AVISO: escuchando en {host}; solo 127.0.0.1 es seguro", file=sys.stderr)

    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((host, int(puerto or "1081")))
    srv.listen(128)
    print(f"[rele-http] a la escucha en {host}:{int(puerto or '1081')} -> {args.remoto} "
          f"(usuario {args.usuario})", flush=True)
    while True:
        cli, _ = srv.accept()
        threading.Thread(target=atender, args=(cli, args), daemon=True).start()


if __name__ == "__main__":
    main()
