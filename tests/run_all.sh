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
# si una tirada anterior dejó el peer de prueba vivo, solo contaminaría el
# pool con un hop inalcanzable: se borra SIEMPRE al comenzar
docker rm -f peer_prueba >/dev/null 2>&1
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
  else
    # si venia activo de otra tirada, su circuito puede referir un hop que ya
    # no existe (peer de prueba borrado): se re-elig e con el pool ACTIVO de
    # ahora para que los tests SOCKS no luchen contra un circuito cadaver
    curl -s -o /dev/null -X POST -H "Authorization: Bearer $T" http://127.0.0.1:8000/disconnect
    curl -s -o /dev/null -X POST -H "Authorization: Bearer $T" http://127.0.0.1:8000/connect
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

entra_http() {
  # como Chrome no deja credenciales SOCKS, la extension del navegador usa la
  # entrada HTTP (1081): mismo circuito, mismo usuario, Basic. Aqui damos los
  # tres casos desde el propio host (por el publish de docker da -- lo mismo
  # que internet si tu Security List abre 1081).
  local ip_directa ip_http
  ip_directa=$(curl -fsS --max-time 15 https://api.ipify.org) || return 1
  # 1) sin credenciales -> 407 con Proxy-Authenticate Basic (se mide con una
  #    peticion http://: en el CONNECT de https curl ni reporta el codigo)
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -x "127.0.0.1:1081" http://example.com/ || true)
  [ "$code" = "407" ] || { echo "  sin auth se esperaba 407, llego $code"; return 1; }
  # 2) con credenciales -> la peticion recorre TODO el circuito y llega con
  #    la IP del exit (igual que por SOCKS5)
  ip_http=$(curl -fsS --max-time 25 \
    -x "${SOCKS_USER/@/%40}:${SOCKS_PASS}@127.0.0.1:1081" https://api.ipify.org) || return 1
  echo "  IP via entrada HTTP : $ip_http  (directa: $ip_directa)"
  [ "$ip_http" = "$ip_directa" ] || return 1
  # 3) destino PRIVADO (metadata Oracle) denegado tambien por la entrada HTTP
  ! curl -fsS -o /dev/null --connect-timeout 12 \
    -x "${SOCKS_USER/@/%40}:${SOCKS_PASS}@127.0.0.1:1081" http://169.254.169.254/
}

paso 5.6 "entrada HTTP (1081): 407 sin clave, circuito con clave y privado denegado" \
  entra_http

paso 8.1 "cifrado en capas JENC: e2e probado con registro y clave real (ChaCha20)" \
  docker compose run --rm -e SOCKS_USER -e SOCKS_PASS -e SOCKS_USER_NC -e SOCKS_PASS_NC -e CLAVE_SALTOS cliente-test fase8_cifrado.py

# ---------------------------------------------------------------- nodos personales (Fase 9)
# El modelo TOR: el equipo de un usuario puede entrar en la red como salto
# voluntario. Ha de registrarse con PEER_TOKEN y un nombre peer_* (jac no
# necesita -- ni debe tener -- el token interno de sistemas).

peer_prueba_tokens() {
  local INTERNO PEER code
  INTERNO=$(sed -n 's/^INTERNAL_TOKEN=//p' .env 2>/dev/null | tr -d "\"'")
  PEER=$(sed -n 's/^PEER_TOKEN=//p' .env 2>/dev/null | tr -d "\"'")
  if [ -z "$PEER" ]; then echo "PEER_TOKEN no esta en .env: saltando los tests de peers"; return 0; fi

  # (a) token de peer con nombre SIN peer_ -> 401
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST 127.0.0.1:8000/nodos/heartbeat \
    -H 'Content-Type: application/json' -H "X-Interno: $PEER" \
    -d '{"nombre":"mal_intento","direccion":"1.2.3.4:9000","conexiones":0}')
  [ "$code" = "401" ] || { echo "  peer con nombre sin peer_ fue aceptado ($code): eso no debe pasar"; return 1; }
  # (b) token de peer CORRECTO + nombre peer_* -> 200 y aparece vivo
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST 127.0.0.1:8000/nodos/heartbeat \
    -H 'Content-Type: application/json' -H "X-Interno: $PEER" \
    -d '{"nombre":"peer_ejemplo","direccion":"93.184.216.34:9000","conexiones":0}')
  [ "$code" = "200" ] || { echo "  peer con token de peer rechazado ($code)"; return 1; }
  curl -s 127.0.0.1:8000/nodos | grep -q '"peer_ejemplo"' || { echo "  peer no aparece en /nodos"; return 1; }
  echo "  peer_ejemplo registrado con PEER_TOKEN y vivo en /nodos"
  return 0
}

paso 9.1 "nodos personales: PEER_TOKEN valido (peer_*), token interno o malo rechazados" peer_prueba_tokens

# 9.2: un peer REAL (el mismo programa de nodo) se lanza como 'peer_prueba'
# dentro de la red de docker y se rota la sesion hasta que su circuito lo
# incluyoo; entonces una peticion atraviesa el salto personal y responde
dec_circuito_con_peer() {
  local T PEER isl i
  trap 'docker rm -f peer_prueba >/dev/null 2>&1' RETURN  # pase lo que pase, no queda peer colgado
  PEER=$(sed -n 's/^PEER_TOKEN=//p' .env 2>/dev/null | tr -d "\"'")
  [ -n "$PEER" ] || return 0
  docker rm -f peer_prueba >/dev/null 2>&1
  docker compose run -d --name peer_prueba -e NODO_NOMBRE=peer_prueba nodo1 >/dev/null || { echo "  no pude lanzar el peer de prueba"; return 1; }
  # espera a que peer_ejemplo (registrado en 9.1 con direccion inalcanzable)
  # expire el heartbeat (35 s) y no pueda colarse en los circuitos
  sleep 37
  curl -s 127.0.0.1:8000/nodos | python3 -c 'import json,sys; d={n["nombre"]:n["estado"] for n in json.load(sys.stdin)}; raise SystemExit(0 if d.get("peer_prueba") == "vivo" else 1)' || { echo "  peer_prueba no se registro"; return 1; }
  if ! curl -s 127.0.0.1:8000/nodos | python3 -c 'import json,sys; d={n["nombre"]:n["estado"] for n in json.load(sys.stdin)}; raise SystemExit(0 if d.get("peer_ejemplo") != "vivo" else 1)'; then
    echo "  peer_ejemplo sigue vivo: el heartbeat vencido no se expira"; docker rm -f peer_prueba >/dev/null 2>&1; return 1
  fi
  # usuario de prueba: rota hasta que el circuito incluya el peer
  T=$(curl -s -X POST 127.0.0.1:8000/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SOCKS_USER\",\"password\":\"$SOCKS_PASS\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    isl=$(curl -s -X POST 127.0.0.1:8000/rotate -H "Authorization: Bearer $T")
    echo "$isl" | grep -q 'peer_prueba' && break
  done
  echo "$isl" | grep -q 'peer_prueba' || { echo "  tras 12 rotaciones no salio un circuito con el peer"; return 1; }
  echo "  circuito con el peer personal: $(echo "$isl" | python3 -c 'import json,sys;print(json.load(sys.stdin)["circuito"])')"
  # e2e REAL via web-destino con el peer en la cadena
  curl -fsS --max-time 25 --socks5-hostname \
    "$(python3 -c "print('$SOCKS_USER'.replace('@','%40'))"):$SOCKS_PASS@127.0.0.1:1080" \
    http://web-destino/ | grep -q 'IP de origen vista' || { echo "  la peticion no atraveso el canal con el peer"; return 1; }
  echo "  peticion reenviada a traves del peer personal OK"
  # deja la sesion de prueba con un circuito nuevo SIN el peer (que se borra):
  # si no, los 5.x/8.1 usarian un circuto que referencia un hop muerto
  curl -s -o /dev/null -X POST 127.0.0.1:8000/disconnect -H "Authorization: Bearer $T"
  curl -s -o /dev/null -X POST 127.0.0.1:8000/connect -H "Authorization: Bearer $T"
  echo "  sesion de prueba restaurada con circuito limpio (sin el peer)"
  return 0
}

paso 9.2 "nodos personales: entra al pool + salto e2e con peer_prueba" \
  dec_circuito_con_peer

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
