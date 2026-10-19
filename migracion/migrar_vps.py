#!/usr/bin/env python3
# =====================================================================
#  migrar_vps.py — lleva JumperNET de un VPS a otro con el mínimo dolor
# =====================================================================
# Qué hace (fases, en orden):
#   1. ANALIZAR   : abre el backup (tar.gz), localiza TODAS las referencias
#                   al dominio/IP viejos y te dice qué se reescribirá.
#   2. PREPARAR   : reescribe dominio/IP en el staging (.env, docker-compose,
#                   Caddyfile, docsrc, tests, extension, LEEME, docs…) y
#                   actualiza el DNS de DuckDNS (apunta al VPS nuevo).
#   3. INSTALAR   : copia el staging al VPS nuevo por rsync/ssh, instala
#                   docker si falta, levanta el stack (compose up -d --build)
#                   y repara el WordPress si el dominio cambió.
#   4. VERIFICAR  : comprueba por HTTP/HTTPS que todo responde y te entrega
#                   la lista de pasos MANUALES que nadie puede automatizar.
#
# Solo usa la biblioteca estándar de Python 3.8+ (rsync/ssh en el sistema).
#
# Ejemplos:#   Ejemplo de migración con el MISMO dominio:
#     python3 migrar_vps.py preparar  --backup ../backups/jumpernet-COMPLETO-AAAA.tar.gz --ip-nueva 1.2.3.4
#     python3 migrar_vps.py instalar  --staging /tmp/jn_migra --ssh ubuntu@1.2.3.4
#     python3 migrar_vps.py verificar --dominio jumpernet.duckdns.org --ip-nueva 1.2.3.4
# =====================================================================
import argparse
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
import urllib.parse
from pathlib import Path

PESO_REESCRIBIR = {  # brecha: qué_extensiones se reescriben como texto
    ".env", ".py", ".sh", ".yml", ".yaml", ".md", ".txt", ".json", ".js",
    ".jsx", ".mjs", ".ts", ".html", ".css", ".example", ".cfg", ".conf",
    ".html", ".leeme", ".xml", ".sql", ".Caddyfile", ".service",
}
NOMBRE_CANDIDATOS = ("Caddyfile", "wp-config", ".env")

REPORTE = []


def aviso(txt):
    REPORTE.append(txt)
    print("  • " + txt)


# ---------------------------------------------------------------- helpers
def correr(cmd, cwd=None, check=True, capture=False):
    """Corre un comando de sistema y devuelve la salida (stdout)."""
    print("$ " + " ".join(cmd))
    res = subprocess.run(cmd, cwd=cwd, text=True,
                         capture_output=capture)
    if check and res.returncode != 0:
        if capture and res.stdout:
            print(res.stdout[-2000:])
        if capture and res.stderr:
            print(res.stderr[-2000:])
        sys.exit(f"comando falló ({res.returncode}): {' '.join(cmd)}")
    return (res.stdout or "") if capture else None


def abrir_backup(backup: Path, staging: Path) -> Path:
    if not staging.exists():
        staging.mkdir(parents=True)
        print(f"abriendo {backup} → {staging}…")
        with tarfile.open(backup, "r:gz") as t:
            t.extractall(staging)
    else:
        print(f"(staging ya existía: lo reuso — bórralo si quieres empezar de cero: {staging})")
    # el tar trae jumpernat/ y, en su raíz, los snapshots de las BDs
    carga = next(staging.rglob("docker-compose.yml"))
    raiz = carga.parent
    data = raiz / "data"
    data.mkdir(exist_ok=True)
    for nombre, destino in (("jumpernat.db", data / "jumpernat.db"),
                            ("wordpress.sql", data / "wordpress.sql")):
        src = staging / nombre
        if src.exists() and not destino.exists():
            shutil.move(str(src), str(destino))
            print(f"  snapshot colocado en data/: {destino.name}")
    print(f"  proyecto en: {raiz}")
    return raiz


def es_texto(path: Path) -> bool:
    if path.suffix.lower() in PESO_REESCRIBIR or path.name in NOMBRE_CANDIDATOS:
        return True
    if path.suffix == "":
        # ficheros sin extensión: .env, ip tables… asumir texto; el binario
        # se descarta con el chequeo de bytes NUL
        try:
            bloque = path.open("rb").read(2048)
            return b"\x00" not in bloque
        except Exception:
            return False
    return False


def reescribir(raiz: Path, sustituciones: list[tuple[str, str]]) -> int:
    """Sustituyes strings en TODO texto bajo raiz (sin binarios/node_modules)."""
    total = 0
    excluir = ("node_modules", "__pycache__", ".git", "dist", "salida",
               "backups", ".gitignore", "package-lock.json")
    for p in list(raiz.rglob("*")):
        if p.is_dir() or any(x in str(p) for x in excluir):
            continue
        if not es_texto(p):
            continue
        try:
            texto = p.read_text(encoding="utf-8", errors="strict")
        except Exception:
            continue  # binario o no UTF-8: no se toca
        nuevo = texto
        for viejo, nuevo_s in sustituciones:
            nuevov = nuevo.replace(viejo, nuevo_s)
            if nuevov != nuevo:
                total += 1
                nuevo = nuevov
        if nuevo != texto:
            p.write_text(nuevo, encoding="utf-8")
    return total


def actualizar_duckdns(dominio: str, token: str, ip: str) -> bool:
    dom = dominio.split(".")[0] if dominio.endswith(".duckdns.org") else dominio
    url = ("https://www.duckdns.org/update?" +
           urllib.parse.urlencode({"domains": dom, "token": token, "ip": ip}))
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            ok = r.read().decode().strip() == "OK"
        aviso(f"DuckDNS: {dom}.duckdns.org -> {ip}: {'OK' if ok else 'RECUSADO'}")
        return ok
    except Exception as e:
        aviso(f"DuckDNS falló ({e}) — actualízalo a mano en duckdns.org")
        return False


def ssh_base(ssh: str):
    opt = "-o StrictHostKeyChecking=no -o ConnectTimeout=20"
    return ("ssh", *opt.split(), ssh)


# ---------------------------------------------------------------- fases
def fase_analizar(args):
    staging = Path(args.staging)
    abrir_backup(Path(args.backup), staging)
    raiz = staging / "jumpernat"
    print("\n== referencias al VPS/dominio viejo ==")
    for viejo in ([args.ip_vieja] if args.ip_vieja else []) + \
                 ([args.dominio_viejo] if args.dominio_viejo else []):
        n = correr(["grep", "-rl", viejo, raiz], check=False, capture=True)
        ficheros = [x for x in (n or "").splitlines() if x]
        print(f"  '{viejo}': {len(ficheros)} ficheros (p. ej. {ficheros[:3]})")
    env = raiz / ".env"
    if env.exists():
        print("\n== claves presentes en el .env del backup ==")
        claves = [l.split("=")[0] for l in env.read_text().splitlines()
                  if "=" in l and l.strip() and not l.lstrip().startswith("#")]
        print("  " + ", ".join(claves))
    else:
        aviso("El backup NO trae .env — cópialo a mano al staging antes de instalar")
    print("\nSiguiente paso:  python3 migrar_vps.py preparar …")


def fase_preparar(args):
    staging = Path(args.staging)
    raiz = staging / "jumpernat"
    abrir_backup(Path(args.backup), staging)
    viejas = []
    if args.ip_vieja:
        viejas.append((args.ip_vieja, args.ip_nueva))
    if args.dominio_viejo and args.dominio_viejo != args.dominio:
        viejas.append((args.dominio_viejo, args.dominio))
    # dominio viejo por defecto si no se pasó: el del .env del backup
    env_path = raiz / ".env"
    env = {l.split("=")[0]: l.split("=", 1)[1].strip()
           for l in env_path.read_text().splitlines()
           if "=" in l and l.strip() and not l.lstrip().startswith("#")} if env_path.exists() else {}
    if args.dominio_viejo is None and env.get("DOMINIO"):
        viejas.append((env["DOMINIO"], args.dominio))

    print("\n== reescritura de configuraciones ==")
    n = reescribir(raiz, viejas)
    # .env: fija el dominio nuevo (y el tóken duckdns si vino por CLI)
    if env_path.exists():
        lineas = env_path.read_text().splitlines()
        fuera = []
        visto = set()
        for l in lineas:
            k = l.split("=")[0] if "=" in l else None
            if k == "DOMINIO":
                fuera.append(f"DOMINIO={args.dominio}")
            elif k == "DUCKDNS_TOKEN" and args.token_duckdns:
                fuera.append(f"DUCKDNS_TOKEN={args.token_duckdns}")
            else:
                fuera.append(l)
            visto.add(k)
        env_path.write_text("\n".join(fuera) + "\n")
    print(f"  ficheros reescritos: {n}")
    if args.token_duckdns:
        actualizar_duckdns(args.dominio, args.token_duckdns, args.ip_nueva)
    else:
        tok = env.get("DUCKDNS_TOKEN", "")
        if tok and tok != "placeholder":
            actualizar_duckdns(args.dominio, tok, args.ip_nueva)
        else:
            aviso("sin token DuckDNS: actualiza el DNS A MANO (paso manual) → " + args.ip_nueva)
    print("\n== pasos manuales que la herramienta no puede hacer ==")
    aviso(f"Firewall/Security List del proveedor nuevo: abre 22, 80, 443, 1080(TCP), 1081(TCP) hacia {args.ip_nueva}")
    if args.dominio != (env.get("DOMINIO") or args.dominio):
        pass
    aviso(f"Si cambias el DOMINIO: (1) reconstruye/redespliega el PANEL (deploy/web) con el doble API_URL nuevo; (2) WP será parcheado por 'instalar'; (3) la extensión y los peers (nodo_personal.py) de tus amigos hay que REGENERARLOS con el dominio nuevo.")
    aviso("Tu ~/.ssh/known_hosts guardó la huella del host viejo: la primera conexión con el nuevo dará aviso de «host cambiado» — es normal, borra la línea vieja del fichero")
    print("\nSiguiente paso:  python3 migrar_vps.py instalar …")
    escribir_reporte(staging)


def fase_instalar(args):
    staging = Path(args.staging)
    raiz = staging / "jumpernat"
    ssh = args.ssh
    print("\n== 1. copia del proyecto al nuevo VPS ==")
    correr(["rsync", "-az", "--partial", "-e",
            "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=20",
            f"{raiz}/", f"{ssh}:~/jumpernat/"])
    print("\n== 2. docker + stack ==")
    script = r"""
set -e
if ! command -v docker >/dev/null; then
  echo "= instalando docker..."
  (curl -fsSL https://get.docker.com | sh) >/dev/null 2>&1
fi
cd ~/jumpernat
sudo docker compose up -d --build 2>&1 | tail -4
echo "ESPERA_SALUD"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/nodos || true)
  [ "$code" = "200" ] && { echo "API_LOCAL_OK"; break; }
  sleep 2
done
# restaurar la BD del WordPress si el backup trae su dump y MariaDB está vacía
if [ -f ~/jumpernat/data/wordpress.sql ] && grep -q 'jumpernat-wp_db-1' <(docker ps --format '{{.Names}}'); then
  VACIA=$(docker exec jumpernat-wp_db-1 sh -c 'mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"wordpress\""' 2>/dev/null | tr -d '\r')
  [ "${VACIA:-1}" = "0" ] && {
    echo "= restaurando wordpress.sql en wp_db…"
    docker exec -i jumpernat-wp_db-1 sh -c 'mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" wordpress' < ~/jumpernat/data/wordpress.sql \
      && echo "WP_DB_RESTORE_OK"
  }
fi
# dominio del WordPress si cambió (WP_HOME/WP_SITEURL viven en la BD)
if grep -q "^DOMINIO=" .env 2>/dev/null; then
  DOM=$(grep '^DOMINIO=' .env | cut -d= -f2)
  docker exec jumpernat-wp-1 php /tmp/wp.phar --allow-root --path=/var/www/html/docs option update home "https://$DOM/docs/" 2>/dev/null || true
  docker exec jumpernat-wp-1 php /tmp/wp.phar --allow-root --path=/var/www/html/docs option update siteurl "https://$DOM/docs" 2>/dev/null || true
fi
echo "INSTALAR_OK"
"""
    proc = subprocess.run([*ssh_base(ssh), "bash -s"], input=script,
                          text=True, capture_output=True)
    print((proc.stdout or "")[-1500:])
    if proc.returncode != 0 or "INSTALAR_OK" not in (proc.stdout or ""):
        print((proc.stderr or "")[-1500:])
        sys.exit("la instalación en el VPS nuevo falló (salida arriba)")
    print("\nSiguiente paso:  python3 migrar_vps.py verificar ...")


def fase_verificar(args):
    ssh = args.ssh if getattr(args, "ssh", None) else None
    dominio = args.dominio
    ip = args.ip_nueva
    fails = []
    print("\n== verificación remota ==")
    if ssh:
        out = subprocess.run([*ssh_base(ssh),
          "docker ps --format '{{.Names}} {{.Status}}' | head -12; "
          "curl -s -o /dev/null -w 'api_local=%{http_code}\\n' http://127.0.0.1:8000/nodos"],
          text=True, capture_output=True)
        print(out.stdout or out.stderr)
        if "api_local=200" not in (out.stdout or ""):
            fails.append("la API no responde en el VPS nuevo (127.0.0.1:8000/nodos)")
    print("\n== verificación desde aquí ==")
    def soc(url, marca):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                ok = r.status == 200
            print(f"  {marca}: {'OK' if ok else r.status}")
            return ok
        except Exception as e:
            print(f"  {marca}: FALLO ({e})")
            return False
    if ip and not soc(f"https://{dominio}/api/nodos", f"https {dominio} (DNS → {ip})"):
        fails.append("HTTPS por dominio — ¿DNS ya apuntó? (das 60 s de propagación)")
    soc("https://" + dominio + "/api/nodos", "API pública")
    if args.docs:
        soc("https://" + dominio + "/docs/", "WordPress de docs")
    print("\n== RESUMEN DE LA MIGRACIÓN ==")
    for l in REPORTE:
        print("  " + l)
    if fails:
        print("\n  ⚠ pendiente:")
        for f in fails:
            print("   - " + f)
        sys.exit(1)
    print("\n  ✅ migración verificada — revisa los PASOS MANUALES de arriba")


def escribir_reporte(staging: Path):
    (staging / "INFORME-MIGRACION.txt").write_text("\n".join(REPORTE) + "\n")


# ---------------------------------------------------------------- CLI
def main():
    p = argparse.ArgumentParser(description="Migración de JumperNET a otro VPS")
    sub = p.add_subparsers(dest="fase", required=True)

    def stl(s):
        s.add_argument("--backup"); s.add_argument("--staging", default="/tmp/jn_migra")
        return s

    a = stl(sub.add_parser("analizar", help="abre el backup y lista qué hay que tocar"))
    a.add_argument("--ip-vieja"); a.add_argument("--dominio-viejo")
    a.set_defaults(fn=fase_analizar)

    b = stl(sub.add_parser("preparar", help="reescribe dominio/IP + DNS duckdns"))
    b.add_argument("--ip-nueva", required=True)
    b.add_argument("--ip-vieja"); b.add_argument("--dominio-viejo")
    b.add_argument("--dominio", default="jumpernet.duckdns.org")
    b.add_argument("--token-duckdns", help="si no lo pasa, usa el del .env del backup")
    b.set_defaults(fn=fase_preparar)

    c = sub.add_parser("instalar", help="copia al VPS nuevo y levanta el stack")
    c.add_argument("--staging", default="/tmp/jn_migra")
    c.add_argument("--ssh", required=True, help="usuario@ip-nueva")
    c.set_defaults(fn=fase_instalar)

    d = sub.add_parser("verificar", help="comprueba que el VPS nuevo sirve todo")
    d.add_argument("--ssh", help="usuario@ip-nueva (opcional pero recomendado)")
    d.add_argument("--dominio", default="jumpernet.duckdns.org")
    d.add_argument("--ip-nueva")
    d.add_argument("--docs", action="store_true", help="también la /docs/")
    d.set_defaults(fn=fase_verificar)

    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
