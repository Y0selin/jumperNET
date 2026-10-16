#!/bin/bash
# Empaqueta la extension JumperNAT para los dos navegadores desde un solo
# codigo fuente:
#   dist/chrome/      -> carpeta lista para "Cargar sin comprimir" (Chrome/Edge/Brave)
#   dist/firefox.xpi  -> paquete firmable (Firefox; forzoso firmarlo en AMO
#                        para instalarlo de forma permanente: addons.mozilla.org)
#   dist/firefox/     -> carpeta para "Cargar complemento temporal" (about:debugging)
# Uso:  bash empaqueta.sh
set -e
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

# ─── Chrome (MV3): manifest-chrome.json pasa a ser el manifest.json ────
# config.json es OPCIONAL: si existe (credenciales prellenadas para desplegar
# sin teclado), se copia a las dos entregas y la extension lo importa solo.
FICHEROS="background.js popup.html popup.js icono.png icono128.png manifest-chrome.json"
[ -f config.json ] && FICHEROS="$FICHEROS config.json"
mkdir -p dist/chrome
for f in $FICHEROS; do cp "$f" dist/chrome/; done
mv dist/chrome/manifest-chrome.json dist/chrome/manifest.json

# ─── Firefox (MV2): manifest.json ya es el de firefox; carpeta + xpi ───
FICHEROS_FF="$FICHEROS manifest.json"
mkdir -p dist/firefox
for f in $FICHEROS_FF; do cp "$f" dist/firefox/; done
rm -f dist/firefox/manifest-chrome.json

if command -v zip >/dev/null 2>&1; then
  (cd dist/firefox && zip -q -r ../firefox.xpi .)
  echo "generado dist/firefox.xpi"
else
  echo "(aviso: sin 'zip'; en Windows usa PowerShell: Compress-Archive dist/firefox/* firefox.zip; y renombra a .xpi)"
fi

echo "listo:  dist/chrome/ (cargar sin comprimir)  y  dist/firefox/  [xpi]"
