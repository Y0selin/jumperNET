# Fase 2 — Registro de nodos y circuitos aleatorios

## Objetivo
Ampliar la red a 6 nodos y crear el plano de control: una API que mantiene el registro de nodos con *heartbeat* (vivo/caído) y un endpoint que elige **3 nodos distintos entre sí al azar** solo entre los vivos.

## Qué se hizo

### 1. Red de 6 nodos
En `docker-compose.yml` se declaran `nodo1`...`nodo6`, todos con la misma imagen (`jumpernat/nodo`). Cada uno se registra en la API con la variable `NODO_NOMBRE` (compose no admite plantillas en `environment`, así que se declara por nodo).

### 2. Heartbeat: los nodos se declaran vivos
`servicios/nodo/nodo.py` ahora arranca además un hilo de fondo (`hilo_heartbeat`) que cada 10 s (`INTERVALO_HB_SEG`) hace POST a la API:

```
POST http://api:8000/nodos/heartbeat
{"nombre": "nodo3", "direccion": "nodo3:9000"}
```

La API guarda en SQLite (`/data/jumpernat.db`) cada nodo y su último heartbeat. Un nodo se considera **caído** si no tiene heartbeat reciente durante `UMBRAL_CAIDO_SEG=35` (3.5 ciclos perdidos). El "estado" no se guarda como tal: se deriva de si el heartbeat es reciente — así no hay que limpiar estados obsoletos.

Los heartbeats van con la cabecera `X-Interno: ${INTERNAL_TOKEN}` (secreto en `.env`, también compartido con las API). La API no se publica en el host (solo binding `127.0.0.1:8000` para depurar en local), así que nadie externo puede fingir heartbeats.

### 3. La API (`servicios/api/main.py`)
FastAPI con SQLite y estos endpoints (por ahora, Fase 2):

| Endpoint | Función |
|---|---|
| `POST /nodos/heartbeat` | Registra/actualiza el último latido de un nodo |
| `GET /nodos` | Lista de nodos con nombre, dirección y estado (vivo/caído) |
| `POST /circuito` | Elige 3 nodos **vivos y distintos** al azar y devuelve `saltos`, `ruta_restante` y `exit` |

`POST /circuito` descarta los caídos con `refrescar_estados()` antes de elegir, y usa `random.sample` de la lista de vivos (muestreo sin repetición ⇒ 3 distintos entre sí). Si no hay suficientes vivos devuelve `503`.

### 4. Repositorio de la Fase 2
- `servicios/api/` — `main.py` (API), `Dockerfile`, `requirements.txt` (fastapi + uvicorn: compatible ARM).
- `servicios/nodo/nodo.py` — el nodo ahora registra heartbeat con un hilo de fondo.
- `docker-compose.yml` — se añaden `nodo4..nodo6` y `api`.
- `tests/fase2_circuitos.py` — cliente de prueba que llama a la API y comprueba los circuitos generados.
- `.env.example` — documentación de las variables de entorno (sin secretos).

## Comandos de prueba ejecutados (con salida real)

### Nodos registrados por heartbeat
```bash
curl http://127.0.0.1:8000/nodos
```
Salida: los 6 nodos con `estado: "vivo"`.

### 5 circuitos generados por la API (aleatoriedad)
```
circuito 1: saltos=['nodo6', 'nodo4', 'nodo1']
circuito 2: saltos=['nodo1', 'nodo5', 'nodo4']
circuito 3: saltos=['nodo3', 'nodo2', 'nodo4']
circuito 4: saltos=['nodo5', 'nodo3', 'nodo4']
circuito 5: saltos=['nodo1', 'nodo3', 'nodo6']
```
✅ 5 peticiones dan 5 combinaciones distintas, siempre 3 saltos distintos entre sí y todos vivos.

### Circuito aleatorio probado end-to-end
Con los `saltos`/`ruta_restante` devueltos por `POST /circuito` se ejecuta `tests/salto_manual.py <primer_nodo> <ruta_restante> http://web-destino/`: web-destino ve la IP de **nodo3** (el exit de ese circuito, `172.18.0.2`).

### Nodo caído: se para `nodo4`
```bash
docker stop jumpernat-nodo4-1
sleep 40          # se espera el umbral de 35 s sin heartbeat
curl http://127.0.0.1:8000/nodos
```
Salida: `nodo4` aparece con `estado: "caido"`.
```bash
for i in 1 2 3 4; do curl -X POST http://127.0.0.1:8000/circuito; done
```
Ninguno de los 4 circuitos generados contuvo `nodo4` (se usa `random.sample` sobre la lista de vivos).

Se vuelve a arrancar (`docker start jumpernat-nodo4-1`): en el siguiente heartbeat, `nodo4` vuelve a `vivo` y entra en circulación de nuevo sin operaciones manuales.

## Evidencia completa
Todo el registro de la ejecución real se guarda en `docs/pruebas/fase2-evidencia.txt`.

## Por qué así
- El "estado" se **deriva** del heartbeat reciente en vez de almacenarse: evita estados consensuados que envejecen mal.
- `_nombre_heartbeat` es clave primaria: con solo reiniciar un nodo ya se mantiene vivo sin operaciones extra.
- Se usa `random.sample` (muestreo estadístico sin repetición) por ser el mecanismo más simple que garantiza los 3 nodos distintos.
- La API es el "plano de control" separado del "plano de datos" (Fase 1): los nodos reenvían bytes; nadie más sabe nada de esas rutas.
- `UMBRAL_CAIDO_SEG` configurable por `.env` para calibrar la sensibilidad (35 s con heartbeat de 10 s = tolerancia a 3 latidos perdidos), lo que evita marcar caído un nodo transient lento.

## Cómo comprobar que funciona
```bash
ssh ubuntu@129.213.137.20
cd ~/jumpernat
curl http://127.0.0.1:8000/nodos          # lista de nodos + estado
curl -X POST http://127.0.0.1:8000/circuito   # circuito aleatorio de 3 vivos
docker stop jumpernat-nodo5-1 && sleep 40 && curl http://127.0.0.1:8000/nodos   # nodo5 'caído'
```
Deben cumplirse: no hay repetidos en un mismo circuito, no hay nodos caídos en modo POST, y los nodos reaparecen al arrancar de nuevo.
