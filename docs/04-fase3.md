# Fase 3 — Cuentas de usuario

## Objetivo
Añadir la capa de "cuentas": registro, login con JWT, panel `/me`, y las acciones que conectan al usuario con la red (`connect`, `disconnect`, `rotate`, borrar cuenta). Contraseñas con argon2, rate limiting en login/registro, límite de usuarios e IP real solo si la petición viene de Caddy.

## Qué se hizo

### Endpoints (todo en `servicios/api/main.py`)

| Endpoint | Qué hace | Errores típicos |
|---|---|---|
| `POST /register` | Crea cuenta con email+password (argon2) | 422 email/contrasena, 409 email existe, 403 límite, 429 rate limit |
| `POST /login` | Devuelve JWT firmado (expira en 2h) | 401 credenciales, 429 intentos |
| `GET /me` | Panel: id, email, ip_real, ip_salida, circuito, activo, ultimo_cambio | 401 sin/invalido token |
| `POST /connect` | Asigna un circuito nuevo (3 nodos vivos) y guarda ip_salida (exit) | 409 si ya conectado, 503 sin nodos |
| `POST /disconnect` | Limpia circuito e ip_salida, activo=0 | 409 si no conectado |
| `POST /rotate` | Nuevo circuito (mantiene conectado), ultimo_cambio=ahora | 409 si no conectado |
| `DELETE /me` | Borra la cuenta por completo | 401 sin token |

Base de datos (SQLite, tabla `usuarios`): `id, email (unique), password_hash, ip_real, ip_salida, circuito (JSON con los 3 nodos), activo, fecha_registro, ultimo_cambio, intentos_fallidos, bloqueado_hasta`. **No se guarda historico de circuitos ni destinos visitados** (regla 4): solo el estado actual.

### Decisiones de seguridad
1. **argon2id** para las contrasenas (`argon2-cffi`), configurado con `memory_cost=16 MiB, time_cost=2, parallelism=2` — ver "Problemas encontrados" para saber por qué no es el default.
2. **JWT por cabecera** `Authorization: Bearer <token>`; firma HS256 con `JWT_SECRET` de `.env` (generado con `openssl rand -hex 32`); expiración 2 h (`JWT_SEGUNDOS`).
3. **IP real solo de proxies de confianza:** `X-Forwarded-For` se respeta únicamente si la IP directa de la petición pertenece a `PROXIES_CONFIANZA` (subredes de Docker, donde vive Caddy). Como la API no está publicada a internet, nadie externo puede llegarle directamente para falsificar la cabecera.
4. **Rate limiting en memoria** (ventana deslizante por clave):
   - registro: 3 cuentas por IP / 5 min (solo cuenta registros **efectivos**; validaciones rechazadas no gastan cupo).
   - login: 5 intentos por IP / minuto; además **bloqueo temporal** de la cuenta tras 5 contrasenas fallidas (5 min), reset en login correcto.
   - En login fallido la respuesta es genérica ("credenciales no validas") tanto para email inexistente como contrasena mala: no se revela qué emails existen.
5. **Límite de usuarios**: `MAX_USUARIOS` (500 por defecto) con un `COUNT(*)` en cada registro.

## Problemas encontrados y resueltos (con evidencia)

### 1. La API moría en silencio al hacer /register → OOM del cgroup por argon2
- Síntoma: `RemoteDisconnected` en el cliente, el contenedor reinicia (`RestartCount=3`) sin traceback en logs.
- Diagnóstico: `sudo dmesg` → `Memory cgroup out of memory: Killed process (uvicorn) ... rss ~96 MB`. El hash por defecto de argon2 pide 64 MiB; sumando Python+uvicorn se rebasaba el `mem_limit: 96m`.
- Solución: `mem_limit: 256m` para la API **y** argon2 configurado a 16 MiB (`time_cost=2, memory_cost=16384, parallelism=2`). Comprobación: `docker inspect jumpernat-api-1 --format={{.HostConfig.Memory}}` = `268435456` (256 MiB) y el test ya no muere.
- Nota didáctica: argon2 es el estándar recomendado (ganador de la Password Hashing Competition) *precisamente* porque pide memoria: en un servidor con contenedor pequeño hay que dimensionar el límite de RAM junto con memoria_cost.

### 2. El test daba 429 en "register con email invalido"
- Causa: el limitador contaba TODOS los intentos, incluidos los que fallaban por validación.
- Decisión: un(rate) limite anti-spam debe medir cuentas creadas, no peticiones rechazadas por otra cosa; se movió el limit justamente antes del INSERT. Ahora: 422 por email invalido, 429 solo cuando realmente se trata de crear muchas cuentas.

## Comandos de prueba (salida real en docs/pruebas/fase3-evidencia.txt)
```bash
docker compose run --rm cliente-test fase3_usuarios.py http://api:8000
```
Resultado: **OK** en los 16 pasos del ciclo (register, duplicado 409, ping de contrasena 422, email invalido 422, login mal 401, login bien → token, /me sin token 401, /me token invalido 401, /me, connect con circuito de 3, rotate con ip_salida nueva (nodo1 → nodo2), disconnect, rotate desconectado 409, delete me, /me tras borrar 401).
Rate limiting medido aparte: 7 logins fallidos seguidos → `401 401 401 401 401 429 429`.
Hash en DB: `$argon2id$v=19$m=16384,t=2,p=2$...` (nunca en claro).

## Cómo comprobar que funciona
```bash
cd ~/jumpernat
docker compose run --rm cliente-test fase3_usuarios.py http://api:8000   # OK fase3
curl -s -X POST http://127.0.0.1:8000/login -H "Content-Type: application/json" \
  -d '{"email":"test@prueba.es","password":"malapass1"}'                  # 401
```
Además, al probar `docker compose run --rm cliente-test fase3_usuarios.py` repetido, se puede ver el límite de registro entrando (429) al crear muchas cuentas seguidas.

## Siguiente paso
Fase 4: HTTPS con Caddy, CORS a GitHub Pages, firewall del host (iptables persistente) — requiere que el usuario cree las reglas en la Security List de Oracle (puertos 443 y 80).
