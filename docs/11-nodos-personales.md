# Fase 9 — Nodos personales (peers): tu equipo dentro de la red

Es el modelo de TOR: además de los 6 nodos del servidor, **el equipo de
cualquier usuario puede entrar como salto voluntario** (intermedio o incluso
EXIT). Cuando el exit es un equipo personal, internet ve **la IP pública de
esa persona**, no la del servidor — exactamente lo que hace el exit de TOR.

## Cómo se une un equipo (Windows o Linux)

1. Instala Python 3 (Linux suele traerlo; Windows: python.org).
2. `cd peer && python nodo_personal.py` — pregunta lo básico la primera vez
   (nombre `peer_xxx`, puerto, URL de la API, **token de peer** y, si el
   servidor tiene el cifrado de saltos, la CLAVE_SALTOS).
3. **Abre el puerto del nodo en tu router** (reenvío TCP hacia tu máquina).
   Es el precio de ser relay online (igual que un nodo de TOR).
4. Dile el nombre elegido al dueño de la red: en cuanto el heartbeat confirme
   que está vivo, su equipo entra al pool de saltos aleatorios y puede salir
   en cualquier circuito de cualquier usuario.

## Sin abrir puertos: TÚNEL INVERSO (modo Tor completo)

No quieres reenvío de puertos en el router (CGNAT, pereza, o simplemente
cautela): hay una segunda vía — el equipo del usuario se conecta **hacia
fuera** y desde ahí sirve los saltos, como el relay de puente de Tor:

- El agente del navegador JumperNET lo hace solo si activas el opt-in en el
  panel: abre una conexión TCP saliente hacia el broker (9008) y la mantiene
  viva. También puedes hacerlo con el mismo programa sin navegador:
  `python3 peer/nodo_personal.py --tunel`.
- El broker valida el `PEER_TOKEN` y pregunta a la API si ese `peer_u<id>`
  tiene el opt-in aceptado; solo entonces responde `OK` y registra el túnel
  (visible en `/nodos` como dirección `tunel:peer_u<id>` — sin puerto).
- Cuando un nodo de la red necesita reenviar a ese peer, conecta al broker
  (9009) y manda `DIAL peer_u<id>`: el broker multiplexa por el túnel del
  peer (OPEN/DATA/FIN por id) y la conexión del nodo es transparente —
  primera línea de ruta y reenvío ciego, igual que si fuera un socket real.
- Las reglas del salto NO cambian: en modo túnel el peer solo acepta
  conexiones a 80/443 y nunca servirá destinos privados como exit.
- Límites sanos: línea de control ≤ 256 B, máx. 8 sub-conexiones por peer
  (BROKER_MAX_CONEX) y sin persistencia: solo conexiones vivas en RAM.

## Seguridad y qué ve cada parte

- Los peers se registran con un **token de peer** (`PEER_TOKEN` en `.env` del
  VPS), separado del token interno de sistemas: un amigo nunca se entera de
  los secretos de la infraestructura y solo puede registrar nodos cuyo nombre
  empiece por `peer_`.
- La API solo mete en los circuitos nodos **validados con un sondeo TCP real**:
  el latido demuestra que el equipo está encendido; el **juez** del estado es el
  sondeo (`validar_nodos()`), que mide `lat_ms` y anota `ult_ok` cada 15 s.
  Un nodo es *saltable* solo si su servicio respondió dentro de `TTL_OK` (≥45 s).
- Si tu equipo deja de mandar heartbeat (35 s) o su servicio deja de responder
  al sondeo, sale del pool automáticamente.
- El panel lo marca con la etiqueta **personal** en la pestaña Nodos.
- Si el exit es tu equipo, la IP que ve internet es TU IP de casa: mientras
  participa en la red estás aceptando que trafico salga desde tu conexión
  (y que un salto pase por tu equipo). Cuando quieras, cierra el nodo y
  pasarás a "fuera del pool" en 35 s.
- `nodo_personal.py` ya soporta CLAVE_SALTOS (cifrado de saltos) en los nodos
  personales; requiere `cryptography` en el equipo del peer y el programa lo
  avisa y no arranca sin él.
- El **modo `externos`** (Fase 9): circuito que salta SOLO por equipos de
  usuarios — ver [12-modo-externos.md](12-modo-externos.md).

## Pruebas (tests/run_all.sh)

* **9.1** registro de peer con token de PEER: nombre sin `peer_` rechazado
  (401), token correcto aceptado y aparece vivo en `/nodos`.
* **9.2** un peer real (`peer_prueba`, lanzado como nodo del sistema con el
  mismo programa) entra al pool; la sesión de pruebas rota en modo **moderador**
  (sin cooldown de plan) hasta que el circuito lo incluye, y una petición
  atraviesa el salto personal de forma realista hasta `web-destino`.
* **9.3** auto-reparación: se envenena el circuito guardado con un hop muerto
  (`peer_muerto`) y SOCKS5/HTTP siguen funcionando: la entrada descarta el hop
  muerto, sirve la petición y limpia la BD sin que el usuario toque nada.
