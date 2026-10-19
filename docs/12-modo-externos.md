# Fase 9 avanzada — modo `externos`, validación real y auto-reparación

Continuación de [11-nodos-personales.md](11-nodos-personales.md). Aquí queda
documentado el trabajo que cierra la Fase 9: el **modo `externos`** (saltar solo
por equipos de usuarios), la **validación con hechos** de los nodos y la
**auto-reparación de circuitos** con saltos caídos. Todo con su prueba en
`tests/run_all.sh`.

## 1. Modo `externos`: probar con hechos que internet ve la IP del peer

Antes los circuitos solo saltaban por los contenedores docker del VPS. El modo
`externos` existe para demostrar que el mecanismo funciona **entre dispositivos
reales**: el circuito salta SOLO por los nodos de tipo `usuario` (los
`peer_*`) y sale a internet con la IP pública del nodo externo.

- `POST /connect {"modo":"externos"}` — se guarda en la fila del usuario para
  que `/rotate` respete el mismo modo.
- El pool se filtra a `tipo='usuario'` con dirección saltable **y**  sondeo TCP fresco (`TTL_OK` ≥ 45 s). Los contenedores docker quedan fuera SIEMPRE.: si aún hay pocos peers externos, se admite un circuito más
  corto (mínimo 1 salto) para poder probar el mecanismo igualmente.
- IPI de salida: si el exit es un peer con IP pública anunciada, esa es la
  que ve internet; `ip_salida`/`exit_ip` lo muestran y `/comprobar` lo confirma.
- El sorteo excluye SIEMPRE el propio `peer_u<id>` del usuario (tu equipo no
  puede ser salto de tu propio circuito).
- Endpoint de prueba: `POST /circuito?saltos=N&modo=externos` (no muta cuenta).

## 2. Validación de vida con hechos (el "vivo/caído va mal", arreglado)

El heartbeat solo demuestra que el equipo está encendido, no que su servicio de
reenvío responda. El validador (`validar_nodos()` en `servicios/api/main.py`):

- hilo de fondo (daemon, único) cada `INTERVALO_VALIDAR` (15 s);
- sondeo **TCP connect real** a cada nodo con puerto real, CONCURRENTES (el
  coste es ~un timeout, no N x timeout);
- anota `lat_ms` (latencia) y `ult_ok` (última vez que conectó) por fila;
- un nodo es saltable solo si tiene puerto real y `ult_ok` fresco;
- si el circuito necesita un nodo "frío", lo sondea AHÍ mismo antes de
  rechazarlo (sin 503 injusto);
- `/nodos` enseña `ms`, `responde`, `sin_ok_s`, `saltable`, `tipo`, `alias`.

Corrige además la carrera de lectura de `ult_ok` que a veces dejaba
`responde/saltable` inconsistentes justo tras el sondeo.

## 3. AUTO-reparación: circuito guardado con hop muerto sigue funcionando

Antes un hop muerto rompía el túnel en silencio y Chrome acababa mostrando tu
IP real. Ahora `socks_auth` (entrada) repare el circuito: descarta el hop
muerto, reconstruye la ruta con el resto de los saltos y sigue sirviendo; la BD
queda limpia (sin el hop muerto). Probado en 9.3: se envenena el circuito
guardado con `peer_muerto` y SOCKS5 (1080) y HTTP (1081) responden con la IP
del circuito reparado.

## 4. Cooldown por plan (documentado para no tropezar dos veces)

- `free`: refresco 1 vez al día (24 h).
- `pro`/`empresarial`: cada 10 h.
- rol `admin`/`moderador`: sin cooldown (gestión y pruebas).
- `/rotate` responde `429` con las horas restantes; las pruebas ponen a la
  cuenta de pruebas en rol `moderador` para empujar rotaciones.

## 5. Pruebas (la suite completa: 16 pasos)

- 9.1 tokens de peer (PEER_TOKEN válido / INTERNAL_TOKEN / incorrecto → 401)
- 9.2 peer real entra al pool + salto e2e hasta `web-destino`
- 9.3 auto-reparación con hop muerto (SOCKS5 y HTTP)
- 10.1 batería `fase9_externos.py` + peer REAL `peer_ext1` + circuito solo
  peers + petición atraviesa + circuito sin infra
- NOTA DE TESTS: los listeners "accept-and-drop" de `fase9_externos.py`
  (`peer_prueba`, `peer_prueba_ext`) se limpian de la BD al comenzar el 10.2:
  si quedan frescas, el sorteo externo los elige y la petición muere en un
  listener que no reenvía (`Empty reply`).

## 6. Comandos rápidos

```bash
# ver la red con el estado REAL
curl -s http://127.0.0.1:8000/nodos | python3 -m json.tool
# conectar en modo externos
curl -sS -X POST https://jumpernet.duckdns.org/api/connect \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"modo":"externos"}' | python3 -m json.tool
```

Ver del lado del WordPress: artículo "Nodos externos: tu equipo como salto
real (Fase 9)" en `jumpernet.duckdns.org/docs/nodos-externos-fase9/`.
