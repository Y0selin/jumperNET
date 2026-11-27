#!/usr/bin/env bash
# Da de alta al equipo fundador como administradores del panel.
#
# Uso:
#   INTERNAL_TOKEN=xxxx ./crear-admins.sh
#   INTERNAL_TOKEN=xxxx ./crear-admins.sh fernando@midominio.com otro@midominio.com
#
# Usa POST /admin/semilla, que crea la cuenta si no existe y la deja con rol
# admin y plan pro; si ya existe, le cambia la contraseña y la promociona.
# Después comprueba que POST /login entra de verdad con esa contraseña.
# El INTERNAL_TOKEN está en el .env del servidor (nunca en este repositorio).
set -euo pipefail

API="${API:-https://jumpernet.duckdns.org}"
CLAVE="${CLAVE:-jumpernet15}"
: "${INTERNAL_TOKEN:?exporta INTERNAL_TOKEN (lo tienes en el .env del servidor)}"

# Cambia estos correos por los que use cada persona para entrar.
if [ "$#" -gt 0 ]; then
  cuentas=("$@")
else
  cuentas=(
    "fernando@jumpernet.es"
    "alex@jumpernet.es"
    "yoselin@jumpernet.es"
    "juno@jumpernet.es"
    "equipo@jumpernet.es"
  )
fi

echo "API: $API · contraseña: $CLAVE · cuentas: ${#cuentas[@]}"
fallos=0

for email in "${cuentas[@]}"; do
  alta=$(curl -sS -m 20 -w $'\n%{http_code}' -X POST "$API/admin/semilla" \
    -H 'Content-Type: application/json' \
    -H "x-interno: $INTERNAL_TOKEN" \
    -d "{\"email\":\"$email\",\"password\":\"$CLAVE\"}")
  codigo=${alta##*$'\n'}
  cuerpo=${alta%$'\n'*}

  if [ "$codigo" != "200" ]; then
    echo "✗ $email · semilla devolvió $codigo · $cuerpo"
    fallos=$((fallos + 1))
    continue
  fi

  entra=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -X POST "$API/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$CLAVE\"}")

  if [ "$entra" = "200" ]; then
    echo "✓ $email · admin · login correcto"
  else
    echo "! $email · creada, pero el login devolvió $entra"
    fallos=$((fallos + 1))
  fi
done

if [ "$fallos" -gt 0 ]; then
  echo "Terminado con $fallos problema(s)."
  exit 1
fi

echo "Listo. Entra con cualquiera de esas cuentas y abre #/panel/admin (llave: jumpernet15)."
