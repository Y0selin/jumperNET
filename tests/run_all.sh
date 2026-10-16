#!/bin/bash
# Pruebas integrales de JumperNAT (Fase 7): ejecuta de forma encadenada las
# pruebas de todas las fases y saca un resumen con exit 0 solo si TODO pasa.
# Uso:  bash tests/run_all.sh        (desde ~/jumpernat en el VPS; y
#       bash tests/ip_publica_real.sh desde tu propia maquina: cambia la IP
#       de verdad al salir por el circuito)
set -u
cd ~/jumpernat || exit 1

FALLOS=0
CONT=0
declare -a RESULTADOS

paso() {
  # paso <numero> <descripcion> <comando...>
  local n="$1" d="$2"; shift 2
  CONT=$((CONT+1))
  echo ""
  echo "=============================================================="
  echo " PRUEBA $n: $d"
  echo "=============================================================="
  if "$@" >/tmp/runall_$n.log 2>&1; then
    RESULTADOS+=("OK    | $n | $d")
    echo "  --> OK (log: /tmp/runall_$n.log)"
  else
    RESULTADOS+=("FALLO | $n | $d")
    FALLOS=$((FALLOS+1))
    echo "  --> FALLO (salida en /tmp/runall_$n.log):"
    tail -5 /tmp/runall_$n.log | sed 's/^/      /'
  fi
}

esperar_api() {
  for i in $(seq 1 30); do
    curl -s -o /dev/null http://127.0.0.1:8000/nodos && return 0
    sleep 2
  done
  return 1
}

esperar_nodos() {
  # evita la carrera de conexiones mientras los contenedores de los nodos
  # se acaban de (re)crear: espera a que nodo1..3 acepten TCP:9000
  for i in $(seq 1 30); do
    if docker compose run --rm --no-deps cliente-test -c "
import socket
malas = []
for n in ('nodo1', 'nodo2', 'nodo3'):
    try:
        s = socket.create_connection((n, 9000), timeout=2); s.close()
    except OSError:
        malas.append(n)
raise SystemExit(1 if malas else 0)" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# ---------------------------------------------------------------- infra
echo ">>> asegurando el stack levantado..."
docker compose up -d --build 2>&1 | tail -2
# Los limites de registro/login (3 registros y 5 logins cada 5 min por IP) viven
# EN MEMORIA de la API: si acabas de correr la suite o pruebas sueltas, los
# contenedores efimeros de docker heredan IP y fase3 no puede registrar. Con la
# API reiniciada, la suite parte de ventanas limpias y es repetible.
docker compose restart api >/dev/null 2>&1
esperar_api || { echo "la API no responde"; exit 1; }
esperar_nodos || { echo "aviso: los nodos tardan en aceptar TCP (se continua igualmente)"; }

SOCKS_USER="socksuser@test.local"
SOCKS_PASS="sup3rguay"
SOCKS_USER_NC="sockssincir@test.local"
SOCKS_PASS_NC="otraclave123"

# usuario de prueba SOCKS con circuito conectado (idempotente)
prepara_socks() {
  curl -s -o /dev/null -X POST 127.0.0.1:8000/register -H "Content-Type: application/json" \
    -d "{\"email\":\"$SOCKS_USER\",\"password\":\"$SOCKS_PASS\"}"
  T=$(curl -s -X POST 127.0.0.1:8000/login -H "Content-Type: application/json" \
    -d "{\"email\":\"$SOCKS_USER\",\"password\":\"$SOCKS_PASS\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])') || return 1
  ACT=$(curl -s -H "Authorization: Bearer $T" http://127.0.0.1:8000/me | python3 -c 'import json,sys;print(1 if json.load(sys.stdin)["activo"] else 0)')
  if [ "$ACT" != "1" ]; then
    curl -s -o /dev/null -X POST -H "Authorization: Bearer $T" http://127.0.0.1:8000/connect || return 1
  fi
  curl -s -o /dev/null -X POST 127.0.0.1:8000/register -H "Content-Type: application/json" \
    -d "{\"email\":\"$SOCKS_USER_NC\",\"password\":\"$SOCKS_PASS_NC\"}"
  return 0
}

# ---------------------------------------------------------------- pruebas
paso 1.1 "saltos manuales: 3 reenvíos encadenados hasta web-destino" \
  docker compose run --rm cliente-test salto_manual.py nodo1:9000 "nodo2:9000,nodo3:9000" http://web-destino/

paso 2.1 "circuits aleatorios por la API + heartbeat de nodos" \
  docker compose run --rm cliente-test fase2_circuitos.py

paso 2.2 "peticion REAL a traves de un circuito de la API (e2e)" \
  bash tests/fase2_e2e.sh

paso 3.1 "ciclo completo de usuario (register/login/me/connect/rotate/disconnect/delete)" \
  docker compose run --rm cliente-test fase3_usuarios.py

# ---------------------------------------------------------------- funciones de red planeadas (sin bash -c)

check_https_401() {
  # /me sin token DEBE devolver 401: prueba que la API responde por HTTPS
  # con Let's Encrypt y que la autenticacion no se salta
  code=$(curl -s -o /dev/null -w "%{http_code}" https://jumpernet.duckdns.org/me)
  [ "$code" = "401" ]
}

deniega_metadata() {
  ! curl -s -o /dev/null --connect-timeout 12 \
    --socks5-hostname "$SOCKS_PROXY" http://169.254.169.254/
}

deniega_puerto8080() {
  ! curl -s -o /dev/null --connect-timeout 12 \
    --socks5-hostname "$SOCKS_PROXY" http://example.com:8080/
}

paso 4.1 "HTTPS real con certificado de Let's Encrypt en jumpernet.duckdns.org" \
  check_https_401

echo ">>> preparando usuarios de prueba del SOCKS5..."
prepara_socks && echo "  (usuarios demo listos)" || echo "  (aviso: no fue posible preparar los usuarios demo)"
export SOCKS_USER SOCKS_PASS SOCKS_USER_NC SOCKS_PASS_NC

paso 5.1 "proxy SOCKS5: 8 casos de protocolo (auth, circuito, bloqueos)" \
  docker compose run --rm -e SOCKS_USER -e SOCKS_PASS -e SOCKS_USER_NC -e SOCKS_PASS_NC \
  cliente-test fase5_socks.py

SOCKS_PROXY="${SOCKS_USER/@/%40}:$SOCKS_PASS@jumpernet.duckdns.org:1080"

paso 5.2 "SOCKS5 desde INTERNET: salida HTTPS real por el circuito" \
  curl -fsS -o /dev/null --connect-timeout 15 \
  --socks5-hostname "$SOCKS_PROXY" https://example.com/

paso 5.3 "SOCKS5 desde INTERNET: destino PRIVADO (metadata Oracle) denegado" \
  deniega_metadata

paso 5.4 "SOCKS5 desde INTERNET: puerto PROHIBIDO (8080) denegado" \
  deniega_puerto8080

coincide_ip_salida() {
  # La peticion que sale por el circuito tiene que llegar a internet con la
  # MISMA IP publica que el propio servidor usa para su trafico directo: una
  # sola maquina, una sola IP. Si no coincide, algo esta reescribiendo el
  # origen (o el exit no es quien deveria ser).
  local directa por_proxy
  directa=$(curl -fsS --max-time 15 https://api.ipify.org) || return 1
  por_proxy=$(curl -fsS --max-time 25 --socks5-hostname "${SOCKS_PROXY}" https://api.ipify.org) || return 1
  echo "  IP del servidor directa : $directa"
  echo "  IP vista por el destino : $por_proxy"
  [ "$por_proxy" = "$directa" ]
}

paso 5.5 "SOCKS5: la salida del circuito es la IP publica REAL del servidor" \
  coincide_ip_salida

paso 8.1 "cifrado en capas JENC: e2e probado con registro y clave real (ChaCha20)" \
  docker compose run --rm -e SOCKS_USER -e SOCKS_PASS -e SOCKS_USER_NC -e SOCKS_PASS_NC -e CLAVE_SALTOS \
  cliente-test fase8_cifrado.py

# ---------------------------------------------------------------- resumen
echo ""
echo "=============================================================="
echo " RESUMEN DE PRUEBAS INTEGRALES"
echo "=============================================================="
for r in "${RESULTADOS[@]}"; do echo "  $r"; done
echo "--------------------------------------------------------------"
if [ "$FALLOS" -eq 0 ]; then
  echo "  RESULTADO: ✅ TODAS LAS PRUEBAS ($CONT/$CONT) SUPERADAS"
else
  echo "  RESULTADO: ❌ $FALLOS de $CONT pruebas FALLO"
fi
exit $FALLOS
