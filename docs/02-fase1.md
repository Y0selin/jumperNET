# Fase 1 — Saltos manuales entre nodos

## Objetivo
Demostrar el mecanismo básico de encadenamiento: una peticion HTTP pasa por nodo1 -> nodo2 -> nodo3 -> web-destino, y el destino ve la IP del ULTIMO nodo, no la del cliente. Ademas, se prueba un orden distinto de nodos.

## Que se hizo

1. Se creo la imagen del nodo (`servicios/nodo/`): un servidor asyncio en Python.
   - Protocolo: al conectarse, el cliente envia UNA linea con los saltos restantes separados por comas (`nodo2:9000,nodo3:9000,web-destino:80`), y despues el flujo de datos (por ejemplo, los bytes de una peticion HTTP).
   - El nodo quita el primer elemento de la ruta, se conecta a el, le pasa el resto como primera linea, y a partir de ahi hace "pipe": reenvia los bytes sin interpretarlos en ambos sentidos con asyncio.gather.
   - Si en la ruta solo queda el destino, ese nodo es el "exit": se conecta al destino y solo reenvia datos.
   - Log por salto: `[HOP] origen=<ip:interno> -> siguiente=<host:puerto> restosaltos=<...>` - solo el vecino anterior y el siguiente interno; nunca el contenido ni el destino final del usuario.

2. Se creo `web-destino` (nginx) que devuelve en su cuerpo un texto con `IP de origen vista por web-destino: $remote_addr`, la IP desde la que llega la conexion.

3. Se creo `cliente-test` (imagen de python, perfil de pruebas, solo se ejecuta cuando se necesita) y un script `tests/salto_manual.py` que inyecta manualmente la ruta.

4. Todo en `docker-compose.yml` con:
   - red dedicada `red_jumper` (bridge interna, no se publica en el host)
   - limites de recursos por contenedor (mem_limit 96m, cpus 0.25) (regla 6)
   - `restart: unless-stopped`

## Comandos de prueba ejecutados (con salida real)

### Prueba A: circuito nodo1 -> nodo2 -> nodo3 -> web-destino
```bash
docker compose run --rm cliente-test salto_manual.py nodo1:9000 "nodo2:9000,nodo3:9000" http://web-destino/
```
Resultado (cuerpo de la respuesta):
```
IP de origen vista por web-destino: 172.18.0.2
```
Ese es el IP de **nodo3** (visto con `docker inspect jumpernat-nodo3-1`), NO la del cliente (172.18.0.6).

### Prueba B: orden distinto (nodo3 como entrada)
```bash
docker compose run --rm cliente-test salto_manual.py nodo3:9000 "nodo1:9000,nodo2:9000" http://web-destino/
```
Resultado: `IP de origen vista por web-destino: 172.18.0.5` (IP de nodo2, que era el exit de esta ruta).
Confirma que cualquier orden de nodos funciona; el primero es la "entrada" y el ultimo el "exit".

### Logs de saltos (prueba A)
```
--- nodo1
[HOP] origen=(172.18.0.6, 36368) -> siguiente=nodo2:9000 restosaltos=nodo3:9000,web-destino:80
--- nodo2
[HOP] origen=(172.18.0.4, 54140) -> siguiente=nodo3:9000 restosaltos=web-destino:80
--- nodo3
[HOP] origen=(172.18.0.5, 51510) -> siguiente=web-destino:80 restosaltos=(exit)
```
Cada nodo SOLO conoce a su vecino anterior y al siguiente. El exit no sabe de donde viene el trafico original, solo que otro nodo le pasa datos.
