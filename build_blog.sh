#!/bin/bash
# Construye el blog de documentación JumperNET desde ~/docsrc (ficheros HTML).
set -e
cd /home/ubuntu/jumpernat
export WP_DB_HOST=wp_db WP_DB_NAME=wordpress WP_DB_USER=wp
export WP_DB_PASSWORD="$(grep -E '^WP_DB_PASS=' .env | cut -d= -f2)"
CR() { docker run --rm --user root --network red_jumper \
        -e WORDPRESS_DB_HOST -e WORDPRESS_DB_NAME -e WORDPRESS_DB_USER -e WORDPRESS_DB_PASSWORD \
        -v /home/ubuntu/jumpernat/data/wp:/var/www/html -i wordpress:cli wp "$@" --allow-root; }

echo "== limpieza de posts vacíos 5..8 =="
CR post delete 5 --force || true
CR post delete 6 --force || true
CR post delete 7 --force || true
CR post delete 8 --force || true

SUBE() { # $1 fichero, $2 título, $3 slug
  cat "/home/ubuntu/jumpernat/docsrc/$1" | CR post create - \
    --post_title="$2" --post_name="$3" --post_status=publish | tail -1
  echo "  ok: $3"
}

SUBE 01.html "Qué es JumperNET y por qué existe"          que-es-jumpernet
SUBE 02.html "Arquitectura completa de la red"            arquitectura-completa
SUBE 03.html "Seguridad: qué se guarda, qué se cifra, qué se bloquea" seguridad
SUBE 04.html "El cifrado de los saltos: JENC (ChaCha20-Poly1305)" cifrado-de-los-saltos-jenc
SUBE 05.html "Guía: de cero a navegar por el circuito"    guia-primeros-pasos
SUBE 06.html "El navegador JumperNET: diseño interno"     navegador-jumpernet
SUBE 07.html "La extensión del navegador: el vigía anti-secuestro" extension-del-navegador
SUBE 08.html "Problemas y soluciones: el diario de incidencias"    problemas-y-soluciones
SUBE 09.html "Referencia de la API"                       referencia-api
SUBE 10.html "Despliegue y operación"                     despliegue-y-operacion

echo "== página índice (portada) =="
IDP=$(cat /home/ubuntu/jumpernat/docsrc/00-indice.html | CR post create - \
  --post_type=page --post_title="Documentación de JumperNET" \
  --post_name=documentacion --post_status=publish | grep -oE 'post [0-9]+' | grep -oE '[0-9]+')
echo "  página índice id: $IDP"
CR option update show_on_front page >/dev/null
CR option update page_on_front "$IDP" >/dev/null
CR option update blogdescription "Arquitectura, seguridad, incidentes y API de la red de 3 saltos — explicada de lo básico a lo avanzado." >/dev/null

echo "== resumen =="
CR post list --post_type=post --fields=ID,post_name,post_title
