# Migración de JumperNET a otro VPS — guía completa

Esta carpeta contiene **todo lo necesario para migrar el proyecto entero a un
VPS nuevo** en el mínimo de pasos manuales posible:

| Fichero | Qué es |
|---|---|
| `migrar_vps.py` | Herramienta Python 3 (solo biblioteca estándar) que prepara, instala y verifica la migración. |
| `../backup_completo.sh` | Backup completo del VPS viejo → `../backups/jumpernet-COMPLETO-<fecha>.tar.gz`, con verificación md5. |
| `../backups/` | Los backups descargados (uno por cada vez que se corre el script). |
| `INFORME-MIGRACION.txt` | Se genera durante la fase `preparar`: los pasos manuales pendientes de tu migración concreta. |

## 1. Conceptos: qué se copia y qué NO

El backup del VPS (`tar.gz` de `~/jumpernat`) incluye:

- **Fuentes y configuraciones**: `servicios/`, `navegador/`, `peer/`, `tests/`,
  `docs/`, `docsrc/`, `docker-compose.yml`, `config/` (Caddyfile, etc.) y
  **el `.env` con todos los secretos** (JWT_SECRET, INTERNAL_TOKEN, PEER_TOKEN,
  CLAVE_SALTOS, DUCKDNS_TOKEN…). Sí: los secretos viajan en el backup porque
  el objetivo es una migración fiel; el tar **nunca va a git**.
- **Datos**: `data/jumpernat.db` (usuarios, nodos, planes, roles), la base de
  MariaDB del WordPress de documentación (`data/wp_db`), los ficheros del
  WordPress en sí (`data/wp`) y los datos de Caddy (certificados renovables).
- **Descargas**: los 5 binarios del navegador en `descargas/` (~600 MB, por eso
  el tar es grande).
- **El tema child del WordPress** y `ventana/` del navegador.

Lo que **NO** se copia (y por qué):

- **Imágenes docker**: se reconstruyen en el VPS nuevo con `--build` (una
  imagen copiada de otro kernel/distribución suele romper permisos; build es
  reproducible y ~4 min).
- **`node_modules` / `__pycache__`**: exclusiones del tar (se regeneran).
- **El panel web de GitHub Pages**: vive en `deploy/web` del REPOSITORIO
  local, no en el VPS. Solo se toca si cambias de DOMINIO (ver §5).
- **Los equipos de tus amigos (peers)**: sus `nodo_personal.py` apuntaban al
  API del VPS viejo; hay que darles el dominio/ip nuevo (ver §6).

## 2. Los 4 comandos de la herramienta

```bash
cd deploy/migracion

# FASE 0 (una vez, en el VPS viejo): genera el backup VERIFICADO
bash ../backup_completo.sh        # tar en el VPS + descarga local + md5

# FASE 1: mira dentro del backup (no cambia nada)
python3 migrar_vps.py analizar --backup ../backups/jumpernet-COMPLETO-2026xxxx.tar.gz

# FASE 2: prepara el staging (copia editable del backup)
python3 migrar_vps.py preparar \
    --backup ../backups/jumpernet-COMPLETO-2026xxxx.tar.gz \
    --ip-nueva 203.0.113.50            # IP del VPS NUEVO
    # [--ip-vieja 129.213.137.20]      # para limpiar la IP vieja de textos/docs
    # [--dominio jumpernet.duckdns.org]# (por defecto, el mismo)
    # [--dominio-viejo viejo.dominio.org --dominio nuevo.dominio.org]  # si cambias de dominio
    # [--token-duckdns XXXX]           # si no, usa el DUCKDNS_TOKEN del .env del backup

# FASE 3: copia al VPS nuevo y levanta el stack (docker se instala solo)
python3 migrar_vps.py instalar --staging /tmp/jn_migra --ssh ubuntu@203.0.113.50

# FASE 4: verifica todo y lista los pasos manuales pendientes
python3 migrar_vps.py verificar --ssh ubuntu@203.0.113.50 \
    --dominio jumpernet.duckdns.org --ip-nueva 203.0.113.50 --docs
```

### 2.1 `analizar` (fase 1)

Abre el tar en el staging (`--staging`, por defecto `/tmp/jn_migra`), sin
modificar nada, y muestra:

- **ficheros** que contienen el dominio/IP viejo (se recomienda pasarle
  `--ip-vieja 129.213.137.20` para ver dónde aparece además del dominio);
- las **claves presentes en el `.env`** del backup (te avisa si el tar no trae
  `.env`, cosa que no debería pasar con backup_completo.sh).

### 2.2 `preparar` (fase 2)

El corazón de la reescritura. Sobre el staging:

1. **Reescribe strings** en todos los ficheros de TEXTO del proyecto
   (`.env, .py, .sh, .yml, .md, .txt, .json, .js, .jsx, .html, .css,
   Caddyfile…`): `IP viejo → IP nueva` y `dominio viejo → dominio nuevo`.
   Los binarios (AppImage, .exe, .zip del navegador, MariaDB…) **nunca**
   se tocan: la herramienta descarta ficheros con bytes NUL o únicamente
   extensiones binarias.
2. **Fija `DOMINIO=` en el `.env`** del staging con el nuevo dominio (lo que
   alimenta `$DOMINIO` del Caddyfile → certificado Let's Encrypt correcto).
3. **Actualiza DuckDNS** con el token del `.env` (o el que pases con
   `--token-duckdns`): `dominio.duckdns.org → IP nueva` vía HTTP oficial.
   Si no hay token, te lo deja marcado como paso manual.
4. Genera `INFORME-MIGRACION.txt` dentro del staging con **tus** pasos
   manuales pendientes (firewall, known_hosts, panel, peers…).

### 2.3 `instalar` (fase 3)

Por ssh al VPS nuevo:

1. `rsync -az` del staging `jumpernat/` → `~/jumpernat/` (incluye `.env`,
   `data/`, `descargas/`, todo).
2. Si no hay docker, lo instala (`curl -fsSL https://get.docker.com | sh`).
3. `docker compose up -d --build`: reconstruye las imágenes ahi mismo
   (API FastAPI, entrada SOCKS5, entrada HTTP, 6 nodos, Caddy, WordPress,
   wp_db). Espera hasta que `127.0.0.1:8000/nodos` responda 200.
4. Si el DOMINIO cambió: **parchea el WordPress en caliente** (`wp option
   update home/siteurl`) para que la `/docs/` sirva con el dominio nuevo.

> Los contenedores van con `restart: unless-stopped`: tras un reinicio del
> VPS el stack vuelve solo.

### 2.4 `verificar` (fase 4)

Comprueba (y te saca un resumen con ✅/⚠):

- por ssh al nuevo VPS: `docker ps` (los 10 contenedores vivos) y API local;
- desde tu máquina: `https://<dominio>/api/nodos` (requiere que el DNS ya
  apunte al VPS nuevo y que el certificado se haya renovado al primer
  intento de Caddy) y, con `--docs`, también `https://<dominio>/docs/`.

## 3. Los pasos manuales (imprescindibles, nadie los puede automatizar)

1. **Firewall / Security List del proveedor nuevo** (Oracle Cloud, Hetzner…):
   abrir entrada TCP **22, 80, 443, 1080, 1081** hacia la IP nueva. En Oracle
   es la *Security List* de la VCN; en otros, `ufw allow` o el panel.
2. **DNS del dominio**: el `preparar` actualiza DuckDNS automáticamente si
   tiene token. Si tu dominio es de otro registrador, crea tú el registro
   `A` → IP nueva y espera la propagación (puede tardar hasta el TTL).
3. **known_hosts**: la primera conexión ssh al host nuevo saltará
   «WARNING: REMOTE HOST IDENTIFICATION CHANGED» si REUTILIZASTE la misma IP
   del VPS viejo (menos frecuente). Limpia la línea vieja:
   `ssh-keygen -R <ip>` en tu máquina.
4. **Panel web (GitHub Pages)** SOLO si cambias de DOMAIN:
   ```bash
   # en deploy/web/src/lib/api.js
   export const API_URL = "https://<dominio-nuevo>";
   # en deploy/web/src/components/Descargas.jsx (DOCS_URL, URL_WIN…)
   # → reconstruir y publicar (git push / gh-pages del repo del panel)
   ```
   Si conservas el dominio, el panel NO hay que tocarlo.
5. **Peers de tus amigos**: cada equipo que corre `nodo_personal.py` (rol de
   salto externo) lleva guardado la URL de la API y el token. Mándales:
   - el **dominio/IP nuevo** para reconectar su peer;
   - **el PEER_TOKEN no cambia** (viaja en el `.env` del backup) — no hay que
     regenerarlo salvo que quieras rotarlo por higiene (entonces edita el
     `.env` nuevo y re-arranca los peers y la API).
6. **Extensión del navegador** de tus usuarios: apunta a
   `<dominio>:1081`. Si el dominio cambia, los usuarios deben reintroducir
   la nueva entrada en el popup (el resto va igual: mismas cuentas).
7. **Binarios del navegador**: ya viajaron en el backup (`descargas/`) y se
   sirven con el dominio nuevo. Nada que hacer.

## 4. Rollback (volver atrás)

El VPS viejo NO se toca en ninguna fase (el backup es de lectura, y `instalar`
solo escribe en el VPS nuevo). Para volver:

1. apunta el DNS del dominio a la IP vieja (o deshaz el paso DuckDNS);
2. el stack viejo sigue levantado tal como estaba;
3. los usuarios no pierden nada (la BD copiada ES la misma: si el trafic
   fluyó en el VPS nuevo durante horas, esos usuarios nuevos no existirán en
   el viejo — valora rsync del `data/jumpernat.db` de vuelta).

## 5. Checklist rápido (misma IP imposible != mismo dominio)

```text
[ ] 1. bash ../backup_completo.sh            (VPS viejo → tar verificado)
[ ] 2. migrar_vps.py analizar --backup …     (revisar informe)
[ ] 3. migrar_vps.py preparar … --ip-nueva … (DNS • reescritura)
[ ] 4. abrir firewall nuevo: 22/80/443/1080/1081
[ ] 5. migrar_vps.py instalar --ssh ubuntu@IP
[ ] 6. migrar_vps.py verificar … --docs
[ ] 7. (si cambió dominio) reconstruir panel + avisar a peers/extension
[ ] 8. curl por SOCKS5 para IP de salida: curl --socks5-hostname DOMINIO:1080 \
       --proxy-user 'tu@correo:clave' https://api.ipify.org
```

## 6. Preguntas frecuentes

**¿El `.env` del backup tiene los mismos secretos?** Sí, y esa es la idea: no
hay que re-registrar nodos ni volver a hashear usuarios. Si prefieres
nuevos secretos generados (`openssl rand -hex 32`), cambia las líneas del
`.env` del staging ANTES de `instalar` (JWT, INTERNAL_TOKEN, PEER_TOKEN,
CLAVE_SALTOS) — los peers que usen PEER_TOKEN viejo se rechazarán (401) hasta
actualizarlos.

**¿La base de datos de usuarios viaja?** Sí: `data/jumpernat.db` (SQLite).
Todas las cuentas, planes, roles y nodos personales se restauran tal cual.

**¿El WordPress de docs queda igual?** Sí: el tar lleva el código completo del
WordPress (`data/wp`) y la base MariaDB (`data/wp_db`). La herramienta solo
toca home/siteurl si han cambiado de dominio.

**¿Caddy re-pide certificado en el VPS nuevo?** Sí: Let's Encrypt revalida el
dominio (HTTP-01). Requiere el DNS ya apuntando; por eso `preparar` actualiza
el DNS ANTES de `instalar`. Si falla 1-2 veces el arranque, Caddy reintenta.

**¿Puedo probar la migración sin apagar nada?** Sí: las fases `analizar` y
`preparar` no tocan ningún VPS (solo tu staging). `instalar` solo escribe en
el VPS nuevo.
