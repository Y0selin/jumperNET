#!/bin/bash
# =====================================================================
#  Backup COMPLETO de JumperNET — fuente, configuraciones, datos y web
# =====================================================================
# Qué guarda:
#   · ~/jumpernat entero del VPS (fuentes, .env con los secretos, docker-
#     compose, docsrc, descargas (binarios), data/ (BD de la API, MariaDB
#     del WordPress, datos de Caddy), backups/, tests, docs)
#   · La web del panel (deploy/web) y el navegador (deploy/navegador)
#     ya viven en el repositorio local; NO están en el VPS.
# Salida:
#   · en el VPS:  ~/backups/jumpernet-COMPLETO-<fecha>.tar.gz
#   · en local:   deploy/backups/jumpernet-COMPLETO-<fecha>.tar.gz (+ md5)
#
# Uso (desde la carpeta deploy del repositorio, con la clave VPS en ../id_rsa):
#   bash backup_completo.sh                 # todo: VPS + descarga local
#   bash backup_completo.sh --solo-remoto   # solo genera el tar en el VPS
# =====================================================================
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAVE="$RAIZ/id_rsa"
VPS_CRED="$RAIZ/credentialsVPS.txt"
FECHA=$(date +%Y%m%d-%H%M%S)

VPS_HOST=$(grep -oP '(?<=^IP: ).*' "$VPS_CRED" | head -1)
VPS_USER=$(grep -oP '(?<=^User: ).*' "$VPS_CRED" | head -1)
SSHKEY="ssh -i $CLAVE -o StrictHostKeyChecking=no -o ConnectTimeout=20"

echo "== 1. Tar completo en el VPS (con snapshot consistente de las BD) =="
$SSHKEY "$VPS_USER@$VPS_HOST" bash -s <<'REMOTE'
set -e
FECHA=$(date +%Y%m%d-%H%M%S)
mkdir -p ~/backups/snapshot-$FECHA
# 1a) SQLite de la API: backup ATOMICO con la API oficial de sqlite3 (servicios
#     en pie; si se copiara el fichero vivo, el tar podria cogerlo a medias)
sudo docker exec jumpernat-api-1 python3 -c "
import os, sqlite3
src = sqlite3.connect(os.environ.get('DB_PATH', '/data/jumpernat.db'))
dst = sqlite3.connect('/data/snapshot.db')
src.backup(dst)
dst.close(); print('sqlite snapshot ok')"
sudo cp ~/jumpernat/data/snapshot.db ~/backups/snapshot-$FECHA/jumpernat.db 2>/dev/null \
  || sudo docker cp jumpernat-api-1:/data/snapshot.db ~/backups/snapshot-$FECHA/jumpernat.db
sudo rm -f ~/jumpernat/data/snapshot.db
# 1b) MariaDB del WordPress: dump completo (servicios en pie)
sudo docker exec jumpernat-wp_db-1 sh -c 'exec mariadb-dump -uroot -p"$MYSQL_ROOT_PASSWORD" wordpress' \
  > ~/backups/snapshot-$FECHA/wordpress.sql 2>/dev/null \
  || sudo docker exec jumpernat-wp_db-1 sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" wordpress' \
     > ~/backups/snapshot-$FECHA/wordpress.sql
[ -s ~/backups/snapshot-$FECHA/wordpress.sql ] || { echo "dump mariadb VACIO"; exit 1; }
# 1c) tar del proyecto SIN las BD vivas (ya estan dentro del snapshot)
#     y sin los .bin rotos de node_modules ya excluidos de antes
sudo tar -czf ~/backups/jumpernet-COMPLETO-$FECHA.tar.gz \
  --exclude='*/node_modules' --exclude='*/__pycache__' --exclude='*/dist' \
  --exclude='*/salida' --exclude='*/backups' \
  --exclude='jumpernat/data/jumpernat.db' --exclude='jumpernat/data/wp_db' \
  -C /home/ubuntu jumpernat \
  -C /home/ubuntu/backups/snapshot-$FECHA . 2>/dev/null || true
sudo rm -rf ~/backups/snapshot-$FECHA
sudo chown ubuntu:ubuntu ~/backups/jumpernet-COMPLETO-$FECHA.tar.gz
md5sum ~/backups/jumpernet-COMPLETO-$FECHA.tar.gz
echo "TAMANO: $(du -h ~/backups/jumpernet-COMPLETO-$FECHA.tar.gz | cut -f1)"
echo "FICHERO: jumpernet-COMPLETO-$FECHA.tar.gz"
REMOTE

if [ "${1:-}" = "--solo-remoto" ]; then
  echo "  (solo-remoto: terminado en el VPS)"
  exit 0
fi

echo "== 2. Descarga al repositorio local =="
mkdir -p "$RAIZ/deploy/backups"
FICHERO=$($SSHKEY "$VPS_USER@$VPS_HOST" "ls -t ~/backups/jumpernet-COMPLETO-*.tar.gz | head -1" | xargs basename)
timeout 590 rsync --partial --progress -e "$SSHKEY" \
  "$VPS_USER@$VPS_HOST:~/backups/$FICHERO" "$RAIZ/deploy/backups/"

echo "== 3. Verificación md5 =="
MD5_REMOTO=$($SSHKEY "$VPS_USER@$VPS_HOST" "md5sum ~/backups/$FICHERO" | cut -d' ' -f1)
MD5_LOCAL=$(md5sum "$RAIZ/deploy/backups/$FICHERO" | cut -d' ' -f1)
if [ "$MD5_REMOTO" = "$MD5_LOCAL" ]; then
  echo "  ✅ md5 coinciden: $MD5_LOCAL"
else
  echo "  ❌ md5 DIFIEREN: remoto=$MD5_REMOTO local=$MD5_LOCAL (ejecuta de nuevo)"
  exit 1
fi
echo "== Backup completo terminado: deploy/backups/$FICHERO =="
