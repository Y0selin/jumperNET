# Fase 7 — Pruebas integrales (`tests/run_all.sh`)

## Objetivo
Un solo comando que levanta el stack y ejecuta **todas las fases encadenadas**:

```bash
bash ~/jumpernat/tests/run_all.sh
```

Sale con **exit 0** solo si TODAS pasan (útil en CI), con resumen final
OK/FALLO por prueba y los logs detallados en `/tmp/runall_<id>.log`.

## Qué ejecuta

| # | Prueba | Cubre |
|---|---|---|
| 1.1 | Salto manual de 3 nodos hasta `web-destino` | Fase 1 |
| 2.1 | Elección de circuitos por la API + heartbeat de nodos | Fase 2 |
| 2.2 | Petición REAL a través de un circuito de la API (e2e) | Fase 1+2 |
| 3.1 | Ciclo completo de usuario (register/login/me/connect/rotate/disconnect/delete) | Fase 3 |
| 4.1 | HTTPS con Let's Encrypt y `Authorization` obligatorio (`/me` → 401 sin token) | Fase 4 |
| 5.1 | SOCKS5: 8 casos de protocolo (auth, circuito, bloqueos) | Fase 5 |
| 5.2 | SOCKS5 desde internet: salida HTTPS real por el circuito (`example.com`) | Fase 4+5 |
| 5.3 | SOCKS5: destino privado / metadata Oracle denegado | Fase 5 |
| 5.4 | SOCKS5: puerto prohibido (8080) denegado | Fase 5 |

Antes de las pruebas levanta el stack (`docker compose up -d --build`) con
dos esperas anti-carrera:
- `esperar_api`: hasta 60 s a que la API responda en `127.0.0.1:8000`.
- `esperar_nodos`: hasta 60 s a que nodo1..3 acepten TCP:9000 (evita el
  `ConnectionRefused` típico cuando los contenedores se acaban de recrear).

También prepara (idempotente) los usuarios de demostración del SOCKS5
(`socksuser@test.local` conectado y `sockssincir@test.local` sin circuito),
necesarios para los casos 5.x.

## Resultado de la última ejecución

```
  OK    | 1.1 | saltos manuales: 3 reenvíos encadenados hasta web-destino
  OK    | 2.1 | circuitos aleatorios por la API + heartbeat de nodos
  OK    | 2.2 | petición REAL a través de un circuito de la API (e2e)
  OK    | 3.1 | ciclo completo de usuario
  OK    | 4.1 | HTTPS real con Let's Encrypt en jumpernet.duckdns.org
  OK    | 5.1 | proxy SOCKS5: 8 casos de protocolo
  OK    | 5.2 | SOCKS5 desde INTERNET: salida HTTPS real
  OK    | 5.3 | SOCKS5 desde INTERNET: metadata Oracle denegada
  OK    | 5.4 | SOCKS5 desde INTERNET: puerto prohibido denegado
  RESULTADO: ✅ 9/9 PRUEBAS SUPERADAS   (EXIT=0)
```

## Problemas que resolvió esta fase (aprendizajes)
1. `docker compose run` **no** pasa variables del host al contenedor sin
   `-e VAR`: el test 5.1 usaba un usuario por defecto equivocado.
2. El email en el proxy de curl necesita **URL-encoding** (`@` → `%40`)
   en `--socks5-hostname user:pass@host:puerto`.
3. `/me` devuelve **401 sin token**: es el comportamiento correcto y por
   tanto es la aserción del test HTTPS (no un fallo).
4. Bloqueos negativos (`! curl ...`) con variables de shell requieren que
   la función se ejecute en el MISMO proceso de `run_all.sh`: los
   intermedios `bash -c '...'` no heredan variables no exportadas, lo que
   daba falsos tendría curl conectar directo. → funciones definidas en el
   propio script llamadas por `paso`.
5. Los nodos recién recreados no aceptan TCP de inmediato → `esperar_nodos`.

## Archivos
- `tests/run_all.sh` — orquestador (idempotente, CI-friendly)
- tests preexistentes: `salto_manual.py`, `fase2_circuitos.py`, `fase2_e2e.sh`,
  `fase3_usuarios.py`, `fase5_socks.py`
