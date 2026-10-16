# Fase 6 — Frontend de gestión en GitHub Pages

## Objetivo
Web para crear cuenta, entrar, **conectar / rotar / desconectar el circuito**
y copiar el comando del proxy SOCKS5. Alojada en **GitHub Pages** y con el
API en `https://jumpernet.duckdns.org`.

## URL
`https://y0selin.github.io/jumperNET/`

## Ficheros
- `index.html` (raíz del repo): SPA **en un solo fichero** (HTML+CSS+JS sin
  frameworks). Necesario porque la fuente de Pages elegida es
  *Deploy from branch: main / carpeta `/ (root)`*.

## Seguridad del cliente
- El **JWT** en `localStorage` y se manda como `Authorization: Bearer`.
- La **contraseña NO se guarda**: solo el token. Al cerrar/recargar, el
  usuario vuelve a entrar con contraseña para volver a ver fuera el
  comando SOCKS con su password (se rellena con `TU_CLAVE` en pantalla).
- Errores de la API se muestran con el detalle que devuelve (401 sesion
  caducada → vuelve a la vista de login automáticamente).

## Interacciones con la API usadas
| llamada | uso |
|---|---|
| `POST /register` | alta de usuario |
| `POST /login` | obtención del JWT |
| `GET /me` | circuito, salida, estado |
| `POST /connect` | crear circuito con 3 saltos aleatorios |
| `POST /rotate` | rotar circuito (nuevos nodos) |
| `POST /disconnect` | desactivar el usuario (ROMPE circuito → el SOCKS5 lo rechaza) |
| `DELETE /me` | eliminar cuenta |

## CORS
Fase 4 ya restringió `CORS_ORIGINS` a `https://y0selin.github.io`: la web
puede llamar a la API; cualquier otro origen web queda bloqueado.

## Habilitación (paso manual en GitHub, un solo click)
Repo on GitHub → **Settings → Pages → Build and deployment → Source:
Deploy from a branch → Branch: main, folder: `/ (root)` → Save**. Tras ~1 min
la URL pública queda activa.

## Comprobación cuando Pages este activo
```bash
curl -s https://y0selin.github.io/jumperNET/ | head -5   # debe devolver el HTML
```
Y en el navegador: registrar usuario → Conectar → copiar/pegar el comando
del proxy en una terminal → HTTP 200.
