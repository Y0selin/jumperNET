#!/bin/bash
# JumperNET en tu navegador con UN comando.
#
#   bash proxy_local.sh on <usuario> <clave>   enciende: rele + Firefox + Chrome
#   bash proxy_local.sh off                    apaga y deja los navegadores como estaban
#   bash proxy_local.sh prueba                 mide la IP que ve internet a traves del rele
#   bash proxy_local.sh firefox                abre el Firefox dedicado de JumperNET
#   bash proxy_local.sh chrome                 lanza Chrome/Chromium por el rele (si existe)
#   bash proxy_local.sh estado                 ¿esta el rele vivo?
#
# El SOCKS5 de JumperNET exige usuario/clave y los navegadores no pueden
# decirselo solos (Chrome no admite credenciales SOCKS; Firefox pregunta en
# cada conexion). Este script levanta un RELE local sin clave (rele_socks.py)
# que se autentica el, y deja los navegadores apuntando a 127.0.0.1: la clave
# solo vive en el handshake con el servidor remoto, nunca en los navegadores.
set -u

PUERTO="${JUMPERNET_PUERTO:-7777}"
HOST="127.0.0.1"
REMOTO="jumpernet.duckdns.org:1080"
BASE="$HOME/.local/share/jumpernet"
PIDF="$BASE/rele.pid"
LOGF="$BASE/rele.log"
LANZADOR="$HOME/.local/bin/navegador-jumpernet"
PREF_FIREFOX="$HOME/.mozilla/firefox"
PERFIL_NOMBRE="jumpernet"
AQUI="$(cd "$(dirname "$0")" && pwd)"

ban() { echo "[jumpernet] $*"; }

rele_vivo() {
  [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF" 2>/dev/null)" 2>/dev/null && return 0
  return 1
}

enciende_rele() {
  local usuario="$1" clave="$2"
  if rele_vivo; then
    ban "el rele ya estaba encendido (pid $(cat "$PIDF"))"
    return 0
  fi
  mkdir -p "$BASE"
  ban "encendiendo el rele local en $HOST:$PUERTO -> $REMOTO ..."
  nohup python3 "$AQUI/rele_socks.py" \
    --usuario "$usuario" --clave "$clave" \
    --escucha "$HOST:$PUERTO" --remoto "$REMOTO" \
    >>"$LOGF" 2>&1 &
  echo $! >"$PIDF"
  # espera a que el puerto responda (hasta 5 s)
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if python3 - <<EOF
import socket, sys
try:
    s = socket.create_connection(("$HOST", $PUERTO), timeout=1)
    s.sendall(b"\x05\x01\x00"); r = s.recv(2)
    sys.exit(0 if r == b"\x05\x00" else 1)
except Exception:
    sys.exit(1)
EOF
    then
      ban "rele listo en $HOST:$PUERTO (pid $(cat "$PIDF"), log en $LOGF)"
      return 0
    fi
    sleep 0.5
  done
  echo "--- ultimas lineas del log del rele ---" >&2
  tail -5 "$LOGF" >&2 || true
  muere "el rele no llego a abrir el puerto $PUERTO"
}

apaga_rele() {
  if rele_vivo; then
    kill "$(cat "$PIDF")" 2>/dev/null || true
    ban "rele apagado (pid $(cat "$PIDF"))"
  else
    ban "el rele no estaba encendido"
  fi
  rm -f "$PIDF"
}
# ---------------------------------------------------------------- firefox
perfil_jumpernet() {
  # directorio del perfil dedicado de Firefox: no toca tu perfil normal.
  # Firefox lo inicializa solo la primera vez que se abre con --perfil.
  echo "$BASE/firefox"
}

usuario_pref() {
  # escribe (o reescribe) el user.js del perfil dedicado
  local dir="$1" modo="$2"   # modo: on|off
  [ -n "$dir" ] || return 0
  mkdir -p "$dir"
  {
    echo '# perfil dedicado de JumperNET: SOLO navega por el rele local.'
    echo '# regenerado por proxy_local.sh; lo que pongas aqui sobrevive.'
    echo 'user_pref("browser.shell.checkDefaultBrowser", false);'
    echo 'user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);'
    echo 'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);'
    if [ "$modo" = on ]; then
      echo 'user_pref("network.proxy.type", 1);'
      echo "user_pref(\"network.proxy.socks\", \"$HOST\");"
      echo "user_pref(\"network.proxy.socks_port\", $PUERTO);"
      echo 'user_pref("network.proxy.socks_version", 5);'
      echo 'user_pref("network.proxy.socks_remote_dns", true);'
      echo 'user_pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1, ::1");'
      echo 'user_pref("dns.disablePrefetch", true);'
      echo 'user_pref("network.predictor.enabled", false);'
    else
      echo 'user_pref("network.proxy.type", 0);'
    fi
  } >"$dir/user.js"
}

configura_firefox() {
  local dir modo="$1"
  if ! command -v firefox >/dev/null 2>&1; then
    [ "$modo" = on ] && ban "Firefox no esta instalado: se omite"
    return 0
  fi
  dir="$(perfil_jumpernet)"
  usuario_pref "$dir" "$modo"
  if [ "$modo" = on ]; then
    ban "Firefox listo: perfil dedicado en $dir hacia $HOST:$PUERTO"
    ban "  se abre con: $0 firefox   (o firefox --profile $dir)"
  else
    ban "Firefox dedicado devuelto a 'sin proxy' (le quita el user.js)"
    rm -f "$dir/user.js"
  fi
}

abre_firefox() {
  local dir="$(perfil_jumpernet)"
  [ -f "$dir/user.js" ] || muere "primero enciende el rele: $0 on"
  usuario_pref "$dir" on
  ban "abriendo el Firefox dedicado de JumperNET (tu Firefox normal no se toca)"
  setsid firefox --profile "$dir" --no-remote >/dev/null 2>&1 &
}

# ---------------------------------------------------------------- chrome
binario_chrome() {
  for b in chromium chromium-browser google-chrome google-chrome-stable brave-browser; do
    command -v "$b" >/dev/null 2>&1 && { echo "$b"; return 0; }
  done
  return 1
}

escribe_lanzador() {
  # el lanzador sirve siempre: si el rele esta muerto, lo reenciende con las
  # credenciales guardadas (chmod 600: solo tu usuario puede leerlas).
  mkdir -p "$(dirname "$LANZADOR")"
  cat >"$LANZADOR" <<LANZ
#!/bin/bash
# Lanzador del navegador por el circuito de JumperNET.
# Lo genera proxy_local.sh ('proxy_local.sh on'); se puede editar a mano.
AQUI='$AQUI'
PUERTO=$PUERTO
HOST=$HOST
BASE=$BASE
if ! (exec 3<>"/dev/tcp/127.0.0.1/\$PUERTO") 2>/dev/null; then
  if [ -f "\$BASE/credenciales" ]; then
    exec "\$AQUI/proxy_local.sh" on "\$(head -1 \"\$BASE/credenciales\")" "\$(tail -1 \"\$BASE/credenciales\")"
  else
    echo "[jumpernet] el rele esta apagado: corre \$AQUI/proxy_local.sh on <usuario> <clave>" >&2
    exit 1
  fi
fi
CHROME=""
for b in chromium chromium-browser google-chrome google-chrome-stable brave-browser; do
  command -v "\$b" >/dev/null 2>&1 && { CHROME="\$b"; break; }
done
if [ -z "\$CHROME" ]; then
  exec "\$AQUI/proxy_local.sh" firefox
fi
exec "\$CHROME" --proxy-server="socks5://\$HOST:\$PUERTO" \\
  --host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE 127.0.0.1" \\
  --proxy-bypass-list="<local>,localhost,127.0.0.1,[::1]" \\
  --user-data-dir="\$BASE/chrome"
LANZ
  chmod +x "$LANZADOR"
  ban "lanzador creado: $LANZADOR"
}

abre_chrome() {
  local bin="$(binario_chrome)"
  [ -n "$bin" ] || muere "no hay Chrome/Chromium/Brave en esta maquina (usa: $0 firefox)"
  ban "abriendo $bin por el rele (perfil aparte, tu Chrome normal no se toca)"
  setsid "$bin" --proxy-server="socks5://$HOST:$PUERTO" \
    --host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE 127.0.0.1" \
    --proxy-bypass-list="<local>,localhost,127.0.0.1,[::1]" \
    --user-data-dir="$BASE/chrome" >/dev/null 2>&1 &
}

# ---------------------------------------------------------------- pruebas
prueba() {
  echo "  tu IP directa              : $(curl -fsS --max-time 15 https://api.ipify.org || echo '(sin internet)')"
  echo "  IP por el rele ($HOST:$PUERTO)  : $(curl -fsS --max-time 25 --socks5-hostname "$HOST:$PUERTO" https://api.ipify.org || echo '(el rele no respondio)')"
  echo "  (la segunda debe ser la IP del VPS: 129.213.137.20)"
}

estado() {
  if rele_vivo; then
    ban "rele ENCENDIDO pid $(cat "$PIDF") en $HOST:$PUERTO"
  else
    ban "rele apagado"
  fi
}

muere() { echo "[jumpernet] FALLO: $*" >&2; exit 1; }

# ---------------------------------------------------------------- comandos
caso="${1:-}"
 case "$caso" in
  on)
    USUARIO="${2:-${JUMPERNET_USUARIO:-}}"
    CLAVE="${3:-${JUMPERNET_CLAVE:-}}"
    if [ -z "$USUARIO" ] || [ -z "$CLAVE" ]; then
      read -r -p "[jumpernet] usuario (tu email): " USUARIO
      read -r -s -p "[jumpernet] clave: " CLAVE; echo
    fi
    [ -n "$USUARIO" ] && [ -n "$CLAVE" ] || muere "faltan usuario/clave"
    enciende_rele "$USUARIO" "$CLAVE"
    # deja las credenciales guardadas (600) para el lanzador: solo tu usuario
    mkdir -p "$BASE"
    umask 077
    printf '%s\n%s\n' "$USUARIO" "$CLAVE" >"$BASE/credenciales"
    umask 022
    escribe_lanzador
    configura_firefox on
    prueba
    ban "LISTO. Navegador: '$LANZADOR' (reuses Firefox 'jumpernet' o Chrome aparte)"
    ;;
  off)
    apaga_rele
    configura_firefox off
    ;;
  prueba) prueba ;;
  estado) estado ;;
  firefox) abre_firefox ;;
  chrome)
    rele_vivo || muere "el rele esta apagado: corre primero '$0 on'"
    abre_chrome
    ;;
  *)
    sed -n '2,12p' "$0"
    exit 1
    ;;
esac
