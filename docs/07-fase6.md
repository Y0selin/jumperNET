# Fase 6 — Frontend de gestión en GitHub Pages

## Objetivo
Web para crear cuenta, entrar, **conectar / rotar / desconectar el circuito**
y ver **en vivo el viaje de la conexión** (nodos, IPs, mapa). Alojada en
**GitHub Pages** (despliegue automático con GitHub Actions) y con la API en
`https://jumpernet.duckdns.org`.

## URL
`https://y0selin.github.io/jumperNET/`  *(puede tardar ~1 min tras el push:
el workflow `pages.yml` despliega por Actions)*

## Despliegue (GitHub Actions)
Pages está configurado en el repo con fuente **GitHub Actions** (no branch),
así que el despliegue lo hace `.github/workflows/pages.yml`:
1. `on: push` con cambios en `index.html` (o manual con `workflow_dispatch`).
2. Prepara `./_site` con **solo** `index.html` (no publica docs ni código).
3. `upload-pages-artifact` → `deploy-pages@v4`.

## El fichero
- `index.html` (raíz del repo): SPA **en un solo fichero** (HTML+CSS+JS sin
  frameworks; Leaflet por CDN solo para el mapa).

## Qué enseña el panel (v2)
- **Estado de tu circuito**: conectado/desconectado, circuito con 3 saltos,
  nodo de salida, botones Conectar / Rotar / Desconectar.
- **Comando listo del proxy SOCKS5** con tu cuenta (botón copiar).
- **Viaje en vivo**:
  - línea de paradas `TÚ → nodo1 → nodo2 → nodo3 → destino` (con pulso en
    el primer salto activo);
  - **mapa** (Leaflet + OpenStreetMap): tu ubicación real (geolocalización
    de TU IP pública vía ipapi.co, en el navegador), la del servidor
    (Ashburn) y la línea TÚ → servidor → internet;
  - **tarjeta por cada nodo del circuito**: nombre, dirección interna,
    estado (vivo/caído por heartbeat), hacia quién salta y el enlace
    cifrado ChaCha20-Poly1305 (Fase 8);
  - **tu información de sesión**: cuenta, tu IP pública tal como la ve el
    servidor, qué IP ve internet cuando usas el circuito (la del exit),
    circuito actual, estado y último cambio.
- **Nota de honestidad** en el propio panel: los 3 saltos viven en el mismo
  servidor Oracle (Ashburn); la separación es lógica (contenedores a
 islados), no geográfica.

## Seguridad del cliente
- JWT en `localStorage`, mandado como `Authorization: Bearer`.
- La contraseña NO se guarda: solo el token.
- `/me` sin token → 401 → vuelve al login automáticamente.
- La geolocalización de tu IP se pide al navegador a ipapi.co (servicio
  público); el servidor no guarda geolocalización.

## Interacciones con la API usadas
| llamada | uso |
|---|---|
| `POST /register` | alta de usuario |
| `POST /login` | obtención del JWT |
| `GET /me` | circuito, salida, estado, IP real |
| `GET /nodos` | nombre/dirección/estado de cada nodo (público) |
| `POST /connect` | crear circuito con 3 saltos aleatorios |
| `POST /rotate` | rotar circuito (nuevos nodos) |
| `POST /disconnect` | desactivar (rompe el circuito → SOCKS5 lo rechaza) |
| `DELETE /me` | eliminar cuenta |

## CORS
Fase 4 ya restringe `CORS_ORIGINS` a `https://y0selin.github.io`.

## Comprobación
```bash
curl -s https://y0selin.github.io/jumperNET/ | grep -c "JumperNAT"
```
Y en el navegador: entrar → Conectar → ver el viaje del circuito en el mapa
y las tarjetas de nodos → copiar el comando y probarlo en una terminal (200).
