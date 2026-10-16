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

## Seguridad y qué ve cada parte

- Los peers se registran con un **token de peer** (`PEER_TOKEN` en `.env` del
  VPS), separado del token interno de sistemas: un amigo nunca se entera de
  los secretos de la infraestructura y solo puede registrar nodos cuyo nombre
  empiece por `peer_`.
- La API incluye cualquier nodo con heartbeat reciente en los circuitos
  aleatorios (`elegir_circuito` no distingue: todo vivo, todo seguro).
- Si tu equipo deja de mandar heartbeat (35 s), sale del pool automáticamente.
- El panel lo marca con la etiqueta **personal** en la pestaña Nodos.
- Si el exit es tu equipo, la IP que ve internet es TU IP de casa: mientras
  participa en la red estás aceptando que trafico salga desde tu conexión
  (y que un salto pase por tu equipo). Cuando quieras, cierra el nodo y
  pasarás a "fuera del pool" en 35 s.
- Falta por soportar: CLAVE_SALTOS (cifrado de saltos) dentro de los nodos
  personales requiere `cryptography` en el equipo del peer; el programa lo
  avisa y no arranca si no está instalado.

## Pruebas (tests/run_all.sh)

* **9.1** registro de peer con token de PEER: nombre sin `peer_` rechazado
  (401), token correcto aceptado y aparece vivo en `/nodos`.
* **9.2** un peer real (`peer_prueba`, lanzado como nodo del sistema con el
  mismo programa) entra al pool; se rota una sesión de usuario hasta que el
  circuito lo incluye, y una petición atraviesa el salto personal de
  forma realista hasta `web-destino`.
