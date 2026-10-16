#!/bin/bash
# Prueba REAL del cambio de IP publica, desde INTERNET (tu propia maquina).
#
# Es la comprobacion que de verdad importa: mide tu IP publica directa, la mide
# otra vez a traves del circuito SOCKS5 y comprueba que son DISTINTAS y que la
# segunda es la IP publica del servidor de salida (la misma que anuncia la API
# en /salida, que es lo que enseña el panel web).
#
# Uso:  bash tests/ip_publica_real.sh [usuario] [clave]
#       (por defecto usa el usuario de pruebas que crea tests/run_all.sh)
set -u

USUARIO="${1:-socksuser@test.local}"
CLAVE="${2:-sup3rguay}"
PROXY="jumpernet.duckdns.org:1080"
API="https://jumpernet.duckdns.org"

FALLOS=0
ok() { echo "  OK    · $1"; }
mal() { echo "  FALLO · $1"; FALLOS=$((FALLOS + 1)); }

echo "== cambio de IP real desde $(hostname) =="

directa=$(curl -fsS --max-time 20 https://api.ipify.org) \
  || { echo "no pude medir tu IP directa (¿sin internet?)"; exit 1; }

circuito=$(curl -fsS --max-time 30 --proxy-user "$USUARIO:$CLAVE" \
  --socks5-hostname "$PROXY" https://api.ipify.org) \
  || { echo "el circuito SOCKS5 no respondio (¿red apagada o credenciales malas?)"; exit 1; }

echo "  tu IP directa                 : $directa"
echo "  IP vista por el destino       : $circuito"

[ "$directa" != "$circuito" ] \
  && ok "la IP publica CAMBIA al usar el circuito" \
  || mal "la IP publica no cambio (el circuito no esta saliendo por el exit)"

# La IP que ve el destino tiene que ser la que la API anuncia como ip_salida
TOKEN=$(curl -fsS --max-time 20 -X POST "$API/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$USUARIO\",\"password\":\"$CLAVE\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("token",""))' 2>/dev/null)

if [ -n "$TOKEN" ]; then
  api_ip=$(curl -fsS --max-time 20 "$API/salida" -H "Authorization: Bearer $TOKEN" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("ip_salida",""))' 2>/dev/null)
  echo "  ip_salida que anuncia la API  : $api_ip"
  [ "$circuito" = "$api_ip" ] \
    && ok "el panel enseña la IP real del exit (coincide con la que ve internet)" \
    || mal "la API anuncia $api_ip pero el destino ve $circuito"
else
  echo "  (aviso: no pude hacer login para comprobar /salida)"
fi

if [ "$FALLOS" -eq 0 ]; then
  echo "  RESULTADO: el circuito cambia tu IP publica de verdad ($directa -> $circuito)"
else
  echo "  RESULTADO: $FALLOS comprobaciones fallidas"
fi
exit "$FALLOS"
