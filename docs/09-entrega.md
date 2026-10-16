# Entrega — JumperNAT

## 1. Resumen del sistema

Servicio de anonimato por circuito de 3 saltos con cuentas de usuario:
el cliente hace SOCKS5 y su tráfico fluye  nodo→nodo→nodo→destino sin que
los nodos guarden nada del contenido ni del destino del usuario.

| Capa | Servicio | Detalle |
|---|---|---|
| Web del panel | `index.html` (repo) | `https://y0selin.github.io/jumperNET/` (GitHub Pages) |
| API HTTPS | `caddy` → `api` | `https://jumpernet.duckdns.org` · Let's Encrypt automático · CORS solo GitHub Pages |
| SOCKS5 | `entrada` | `jumpernet.duckdns.org:1080` · RFC 1928 + user/pass RFC 1929 |
| Nodos | `nodo1..nodo6` | reenvío ciego en `red_jumper` (sin publicar al host) |
| API interna | `api` | solo en red docker + binding 127.0.0.1:8000 para debug |

Seguridad aplicada por capas:
contrasenñas con **argon2** (mem controlada 16 MiB), **JWT** 2h,
rate-limit login/registro y bloqueo temporal a los 5 fallos,
**solo 2 servicios publicados** (caddy y entrada), validación del destino
**en la entrada Y en el nodo de salida** (solo 80/443, anti-IP-privadas,
anti-metadata Oracle 169.254.169.254), antirietà-registro y sin histórico
de tráfico/destinos (privacy by design).

## 2. Pruebas

```bash
bash ~/jumpernat/tests/run_all.sh      # 9/9 verde (EXIT=0)
```

## 3. Credenciales y secretos (en el servidor, archivo `~/jumpernat/.env`)

| Secreto | Dónde/ti por qué |
|---|---|
| `INTERNAL_TOKEN` | `.env` — token interno API↔nodos↔entrada (nunca en Git) |
| `JWT_SECRET` | `.env` — firma de los tokens de sesión |
| `DOMINIO` | `.env` — `jumpernet.duckdns.org` |
| `CORS_ORIGINS` | `.env` — `https://y0selin.github.io` |
| Clave SSH GitHub | `~/.ssh/github_ed25519` en el servidor (deploy key del repo) |
| Clave SSH oracle | `/home/kali/Desktop/JumperNET/id_rsa` en tu PC (repositorio local) |
| BD de usuarios | `~/jumpernat/data/jumpernat.db` (SQLite, contraseñas argon2) |
| Certificados TLS | `~/jumpernat/data/caddy` (Caddy los multiplica y renueva solo) |

**Usuarios de demostración para las pruebas** (pediréselo si quieres probar el SOCKS5):
- `socksuser@test.local` / `sup3rguay` — circuito conectado
- `sockssincir@test.local` / `otraclave123` — cuenta sin circuito (rechazada por diseño)

## 4. Cómo se usa SOCKS5

```bash
curl --socks5-hostname "usuario:clave@jumpernet.duckdns.org:1080" https://example.com/
```
El usuario debe estar **conectado** (`Conectar` en la web). Para navegadores:
proxy SOCKS5 host `jumpernet.duckdns.org`, puerto `1080`, con usuario y clave.

## 5. Recuperación desde cero (si el servidor se pierde)

1. **Nueva instancia Oracle** (u otro servidor): Ubuntu LTS con Docker.
2. Instalar Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. **Clave SSH de GitHub** (la misma o nueva): `ssh-keygen`
   → añadir como Deploy key del repo `Y0selin/jumperNET`
   → `GIT_SSH_COMMAND="ssh -i <clave>" git clone git@github.com:Y0selin/jumperNET.git ~/jumpernat`
4. Recrear `.env` (los secretos NO están en Git, por eso hay que reescribirlos):
   ```bash
   cat > ~/jumpernat/.env <<'FIN'
   DOMINIO=jumpernet.duckdns.org
   INTERNAL_TOKEN=<valor-nuevo-o-anterior>
   JWT_SECRET=<valor-nuevo>
   CORS_ORIGINS=https://y0selin.github.io
   JWT_SEGUNDOS=7200
   MAX_USUARIOS=500
   FIN
   ```
   *(valores exactos en `~/jumpernat/.env.example`)*
5. Levantar: `cd ~/jumpernat && docker compose up -d --build`
6. **iptables**: si el backup existe (`backups/iptables-*.rules`), restaurar con
   `netfilter-persistent reload` o re-aplicar reglas 80/443/1080 + persistencia.
7. **Oracle Security List**: Ingress TCP 80/443/1080 desde 0.0.0.0/0 (Documentado en 05-fase4.md).
8. **DNS**: apuntar `jumpernet.duckdns.org` a la nueva IP pública (DuckDNS).
   Caddy tenderá el nuevo certificado al añadir. (Si la IP cambió, Let's Encrypt(create too) re-emitirá solo.)
9. Servir de nuevo `bash ~/jumpernat/tests/run_all.sh` → EXPECTED: 9/9 verdes.
   *(los tests del SOCKS dependen de la existencia de los usuarios demo, que se crean al vuelo)*

## 6. Pendientes / limitaciones

| Ítem | Estado |
|---|---|
| Fase 6: activar **GitHub Pages** (Settings → Pages → main + `/ (root)`) | ⏳ acción pendiente en la web de GitHub |
| Fase 8: cifrado y salto por TCP (opcional) | ⏳ pendiente de decisión (implementación opcional) |
| Migrar nota | la IP del servidor está registrada en duckdns ya |
| Certificado TLS | Let's Encrypt renueva automático (Caddy), sin acción |
| copia de la BD | `~/jumpernat/data/`: salvo manualmente si quieres recuerdar |
