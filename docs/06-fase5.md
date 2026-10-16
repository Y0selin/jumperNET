# Fase 5 — Proxy SOCKS5 autenticado

## Objetivo
Punto de entrada del servicio: un **proxy SOCKS5** autenticado con usuario y
contraseña (las mismas de la cuenta) en el puerto **1080**. Sin credenciales
válidas NO hay circuito: nada de proxy abierto.

## Diseño

```
cliente (curl/browser) --> entrada:1080 (SOCKS5+auth) --> nodo(salto1) --> nodo(salto2)
        --> nodo(exit) --> destino
```

- `servicios/entrada/entrada.py`: servidor **SOCKS5 RFC 1928** con
  autenticación usuario/contraseña **RFC 1929**. Sin dependencias externas
  (stdlib: asyncio, socket, ipaddress, urllib).
- El único método aceptado es `userpass` (0x02); GSSAPI (0x01) y
  SIN AUTENTICACIÓN (0x00) se rechazan siempre con `0xFF`.
- Las credenciales se validan **contra la API** (`POST /interno/socks_auth`),
  que comprueba la contraseña con argon2 y devuelve el circuito
  **solo si el usuario existe y está conectado** (`activo=1`).
- Después la entrada consulta `GET /nodos` para resolver
  nombre→dirección, conecta al primer salto y le envía la ruta restante en
  el protocolo de la Fase 1 (`"nodoX:nodoY,destino\n"`).
- De ahí en adelante todo es TCP transparente: el navegador habla HTTP
  "a través" del circuito.

### Restricción de salida (defensa en profundidad, en DOS capas)
1. **Entrada** (al leer el CONNECT de SOCKS5).
2. **Nodo de salida** (anti-conexión directa al primer salto).

Reglas del destino final:
| Regla | Efecto |
|---|---|
| Solo puertos `80` y `443` (`PUERTOS_PERMITIDOS`) | bloquea puertos genéricos |
| Bloqueo de redes privadas/loopback/docker/CGNAT | anti-SSRF e anti-escaneo |
| Bloqueo de `169.254.0.0/16` | **anti-metadata de Oracle** (`169.254.169.254`) |
| Excepción explícita para `web-destino` (`EXCEPCIONES_PRIVADAS`) | permite las pruebas internas del proyecto |

La lista completa está en `REDES_PROHIBIDAS` de
`servicios/entrada/entrada.py` (en las dos capas).

### Privacidad (reglas 4 y 5)
- `entrada` NO registra destinos ni contenido: solo “…circuito para
  usuario X -> destino” en su log local.
- Los nodos siguen sin interpretar ni registrar el contenido (Fase 1).

## API: endpoint interno nuevo
`POST /interno/socks_auth` (requiere `X-Interno`, red interna):
```json
{ "email": "...", "password": "..." }
   -> 200 { "id": n, "circuito": [...3 nombres...], "ip_salida": "nodo6" }
   -> 401 credenciales no válidas
   -> 403 usuario registrado pero no conectado
```

## docker-compose: servicio `entrada`
```yaml
entrada:
  build: ./servicios/entrada
  ports: ["1080:1080"]        # publicado (junto con caddy, regla 2)
  environment:
    PUERTOS_PERMITIDOS: "80,443"
    EXCEPCIONES_PRIVADAS: web-destino
```
mem_limit `96m` y `cpus 0.25` (regla 6). Publica solo `80`/`443` (caddy) y
`1080` (entrada); la API sigue **sin** publicar en el host.

## Cómo se usa
Con cualquier cliente SOCKS5 autenticado, p. ej.:
```bash
curl --socks5-hostname USUARIO:CLAVE@jumpernet.duckdns.org:1080 http://web-destino/
curl --socks5-hostname USUARIO:CLAVE@jumpernet.duckdns.org:1080 https://example.com/
# o configurándolo en el navegador como proxy SOCKS5
```
(si falla: comprobar que el usuario hizo "Conectar" en la web primero).

De `man curl`: `--socks5-hostname [user:pass@]host:port` (resuelve el nombre
de dominio del host a través del SOCKS5, usando las IP públicas
automáticamente).

## Pruebas
`docker compose run --rm cliente-test fase5_socks.py` (habla SOCKS5 byte a
byte con `socket` puro; No necesita curl):

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Credenciales válidas + circuito conectado → HTTP GET vía 3 saltos | HTTP 200 | ✅ OK |
| 2 | Método sin autenticación (0x00) | rechazado 0xFF | ✅ OK |
| 3 | Contraseña incorrecta | rechazado (0x01,0x01) | ✅ OK |
| 4 | Usuario existente pero `connect=no` | rechazado | ✅ OK |
| 5 | Destino `169.254.169.254:80` (metadata Oracle) | bloqueado | ✅ OK |
| 6 | Destino `172.17.0.1:80` (red docker) | bloqueado | ✅ OK |
| 7 | Destino `web-destino:8080` (puerto no permitido) | bloqueado | ✅ OK |
| 8 | Destino `web-destino:443` (puerto de la lista) | aceptado | ✅ OK |

## Pendiente
- Prueba externa con `curl --socks5-hostname user:pass@jumpernet.duckdns.org:1080 https://example.com/`:
  el puerto `1080` **sigue bloqueado en la Security List de Oracle** (las reglas
  80/443 se arreglaron en la Default Security List, pero la de 1080 quedo en
  la lista aislada). Verificación pendiente del cuello externo; el resto de la
  fase está probada por red interna.

## Archivos
- `servicios/entrada/entrada.py` — proxy SOCKS5 (sin dependencias)
- `servicios/entrada/Dockerfile` — python:3.12-slim, CMD python -u
- `docker-compose.yml` — servicio `entrada` publicado en 1080
- `tests/fase5_socks.py` — test de socket puro byte a byte
- `servicios/nodo/nodo.py` — validación de destino en el nodo de salida (defensa en profundidad)
- `servicios/api/main.py` — endpoint interno `/interno/socks_auth`
