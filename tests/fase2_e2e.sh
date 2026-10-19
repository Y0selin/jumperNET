#!/bin/bash
# Prueba end-to-end de la Fase 2: obtiene un circuito de la API y ejecuta
# una peticion HTTP a traves de el. Evidencia para docs/pruebas/.
set -e
# raíz del proyecto desde la localización del script (funciona bajo sudo,
# donde ~/ deja de ser la home del VPS y /root/jumpernat no existe)
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

C=$(curl -s -X POST http://127.0.0.1:8000/circuito)
J=$(echo "$C" | python3 -c 'import json,sys;c=json.load(sys.stdin);print(",".join(c["saltos"]))')
N1=$(echo "$C" | python3 -c 'import json,sys;print(json.load(sys.stdin)["saltos"][0])')
R=$(echo "$C" | python3 -c 'import json,sys;print(json.load(sys.stdin)["ruta_restante"])')
EX=$(echo "$C" | python3 -c 'import json,sys;print(json.load(sys.stdin)["exit"])')

echo "circuito elegido por la API: $J (exit: $EX)"
echo "respuesta de web-destino:"
docker compose run --rm cliente-test salto_manual.py "$N1:9000" "$R" http://web-destino/ 2>&1 | grep 'IP de origen'

echo "IPs internas actuales de los nodos:"
for n in nodo1 nodo2 nodo3 nodo4 nodo5 nodo6; do
  ip=$(docker inspect "jumpernat-$n-1" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
  echo "  $n = $ip"
done
echo "Para verificar: la IP que ve web-destino debe coincidir con la IP de '$EX'."
