# JumperNET — red de anonimización por 3 saltos (proyecto ASIR)

Proyecto final de ASIR: una red de anonimización con **circuito de 3 saltos**, entrada
**SOCKS5 autenticada**, **API de gestión por HTTPS** y nodos en **Docker**.
El usuario crea una cuenta, enciende su red cuando quiere y ve en vivo por dónde
va su tráfico.

| Capa | Servicio | Dirección |
|---|---|---|
| Panel web (React + Vite) | GitHub Pages | **https://y0selin.github.io/jumperNET/** |
| API de gestión (FastAPI) | `caddy` → `api` | **https://jumpernet.duckdns.org** |
| Entrada SOCKS5 | `entrada` | **jumpernet.duckdns.org:1080** (usuario/contraseña = tu cuenta) |
| Nodos | `nodo1..nodo6` | reenvío ciego dentro de `red_jumper` (sin publicar al host) |

---

## Cómo funciona

```
 TÚ ──▶ SOCKS5:1080 ──▶ nodo₁ ──▶ nodo₂ ──▶ nodo₃ (exit) ──▶ internet
        auth (tu cuenta)  └──── ChaCha20-Poly1305 (JENC) ────┘   solo 80/443
```

1. Te autenticas contra la entrada con **tu mismo usuario y contraseña** de la web.
2. La API reparte un **circuito de 3 nodos vivos al azar**; puedes **girarlo** en
   caliente para obtener una ruta nueva.
3. Entre la entrada y el nodo de salida el flujo va **cifrado por capas**
   (ChaCha20-Poly1305, formato `JENC`): los intermedios son **reenvío ciego**.
4. El nodo de salida **resuelve y revalida la IP** del destino y solo permite
   **80/443**, bloqueando rangos privados, loopback y la metadata de Oracle
   (169.254.169.254).

## Panel web

SPA en **React 18 + Vite**, sin frameworks de UI: el diseño entero vive en
variables CSS y se puede reescribir en vivo desde la propia web.

- **Inicio público** — qué es el proyecto, cómo funciona el circuito y un flujo de
  paquetes animado `TÚ → nodo₁ → nodo₂ → nodo₃ → INTERNET`. Fondo de glifos que se
  escriben y se desvanecen sobre malla y halos (canvas propio).
- **Acceso** — tarjeta minimalista de entrar/crear cuenta, con validación en
  español y opción de mostrar la contraseña.
- **Red** — la red **llega apagada**: un **interruptor** la enciende y la apaga
  (nada se conecta al iniciar sesión). Mientras está viva: ruta de paradas con
  pulso, tubería de paquetes, mapa Leaflet con tu ubicación real, nodos del
  circuito y el comando SOCKS5 listo para copiar.
- **Cuenta** — identidad, métricas, sesión con cuenta atrás del JWT, qué se guarda
  y qué no, y **zona de peligro** con confirmación en dos pasos para eliminar la
  cuenta.
- **Info** — modo principiante (analogía y guía en 4 pasos) y modo avanzado
  (endpoints, formato JENC, `/nodos` en crudo, JWT decodificado, inventario de
  seguridad).
- **Ajustes** — diseñador de tema: colores, radios, tipografía, glow, transparencia,
  **velocidad global de las animaciones** (0 = sin animaciones) y CSS libre, con
  6 preestablecidos (Terminal Verde, Grafito Profesional, Neón Nocturno, Océano
  Profundo, Matrix, Luz Blanca), exportar/importar JSON y persistencia en localStorage.

## Estructura

```
.
├── docker-compose.yml        # api + caddy + entrada + nodo1..nodo6 + web-destino
├── index.html                # página estática antigua (histórico)
├── config/
│   ├── caddy/Caddyfile       # TLS automático (Let's Encrypt) y proxy a la API
│   └── web-destino/          # sitio de pruebas para las salidas HTTP
├── servicios/
│   ├── api/                  # FastAPI: cuentas, circuitos, heartbeat, SOCKS auth
│   ├── entrada/              # proxy SOCKS5 (RFC 1928 + 1929) y cifrado JENC
│   └── nodo/                 # salto: reenvío ciego y validación de destino
├── web/                      # panel React + Vite (GitHub Pages)
│   ├── src/components/       # Landing, Red, Cuenta, Info, Ajustes, Piezas…
│   ├── src/styles/           # base.css + animaciones.css (todo bajo variables)
│   └── scripts/e2e.mjs       # test E2E con Chrome headless y mock de la API
├── tests/                    # pruebas por fases + run_all.sh (suite integral)
└── docs/                     # documentación por fases y entrega
```

## Puesta en marcha

**Stack completo (servidor con Docker):**

```bash
cp .env.example .env               # JWT_SECRET, INTERNAL_TOKEN, DOMINIO, CORS_ORIGINS…
docker compose up -d --build
```

**Panel web en local:**

```bash
cd web
npm ci
npm run dev                        # http://localhost:5173
npm run build                      # genera dist/ (es lo que publica Pages)
```

**Prueba SOCKS5 (requiere circuito encendido desde la web):**

```bash
curl --socks5-hostname "tu@correo:tu-clave@jumpernet.duckdns.org:1080" https://example.com/
```

## Tu navegador por el circuito, en automático

El SOCKS5 exige usuario/clave y los navegadores no pueden dárselas solos
(Chrome no admite credenciales SOCKS; Firefox pregunta en cada conexión).
`cliente/proxy_local.sh` lo resuelve con un **relé local sin credenciales**
(`cliente/rele_socks.py`, solo Python estándar) que se autentica él:

```bash
cd cliente && bash proxy_local.sh on tu@correo 'tuClave'   # enciende todo: rele+Firefox+Chrome
bash proxy_local.sh firefox            # lanza el Firefox dedicado (tu perfil no se toca)
navegador-jumpernet                    # lanzador universal (Firefox o Chrome/Chromium/Brave)
bash proxy_local.sh prueba             # mide tu IP directa y la que ve internet por el relé
bash proxy_local.sh off                # apaga el relé y deja los navegadores como estaban
```

- Firefox: **perfil dedicado** (`~/.local/share/jumpernet/firefox`) con SOCKS5
  hacia `127.0.0.1:7777` y DNS remoto; tu perfil de siempre queda intacto.
- Chrome/Chromium/Brave: se lanza por el lanzador con perfil aparte
  (`--proxy-server socks5://127.0.0.1` + resólver solo por el proxy).
- La clave vive solo en `~/.local/share/jumpernet/credenciales` (chmod 600) y
  en el handshake con el servidor; el relé **solo escucha en 127.0.0.1**.

## Pruebas

| Suite | Comando | Qué cubre |
|---|---|---|
| Integral (fases 1–8) | `bash tests/run_all.sh` | saltos encadenados, circuitos por API, ciclo de usuario (incluida `/comprobar`, una petición real por el circuito), HTTPS/CORS, SOCKS5 (auth, bloqueos de destino y puerto) y que la salida del circuito sale con la IP pública REAL del servidor (5.5), cifrado JENC. Necesita Docker y el stack levantado. |
| Cambio de IP real | `bash tests/ip_publica_real.sh` (desde TU máquina) | mide tu IP directa y la que ve el destino a través del SOCKS5: comprueba que la IP pública cambia de verdad (`tu-IP -> la-del-exit`) y que el panel anuncia la misma IP de salida. No necesita Docker, solo que tu red esté encendida. |
| Panel web (E2E) | `cd web && npm run test:e2e` | Chrome headless con la API simulada: 72 comprobaciones (inicio, validaciones, registro y login, red apagada por defecto, encender/girar/apagar con el interruptor, Info, Cuenta con baja en dos pasos, responsive a 390 px, presets y cierre de sesión). Requiere `npm run preview` en el puerto 4173. Deja capturas en `web/e2e-out/`. |
| Panel desplegado | `URL_APP=https://y0selin.github.io/jumperNET/ npm run test:e2e` | El mismo recorrido contra el sitio publicado, para cazar fallos que solo aparecen en la subruta de Pages (assets, iconos). |

## Seguridad y privacidad

- Contraseñas con **argon2id** (nunca en claro) y sesiones **JWT HS256 de 2 h**.
- **Rate-limit** en login/registro y bloqueo temporal a los 5 fallos.
- Solo **dos servicios publicados** (Caddy y la entrada SOCKS5); la API vive en la
  red interna de Docker.
- Validación del destino **en la entrada y en el nodo de salida** (80/443,
  anti-IP-privadas, anti-metadata).
- **Sin histórico**: ni la API ni los nodos guardan destinos ni contenido; de cada
  cuenta solo se guarda email, estado del circuito y cuándo cambió.
- Los secretos viven en `.env` (fuera de Git); los de tu copia están en
  `docs/09-entrega.md`.

## Documentación

- [01-fase0.md](docs/01-fase0.md) — preparación y diagnóstico
- [02-fase1.md](docs/02-fase1.md) — saltos manuales entre nodos
- [03-fase2.md](docs/03-fase2.md) — registro de nodos y circuitos aleatorios
- [04-fase3.md](docs/04-fase3.md) — cuentas de usuario
- [05-fase4.md](docs/05-fase4.md) — HTTPS, CORS y firewall
- [06-fase5.md](docs/06-fase5.md) — proxy SOCKS5 autenticado
- [07-fase6.md](docs/07-fase6.md) — frontend React en GitHub Pages
- [08-fase7.md](docs/08-fase7.md) — pruebas integrales
- [09-entrega.md](docs/09-entrega.md) — entrega, credenciales y recuperación
- [10-fase8.md](docs/10-fase8.md) — cifrado en capas (JENC)
- [docs/pruebas/](docs/pruebas/) — evidencias por fase

## Límites honestos

- La salida real a internet es **una sola máquina** (Oracle Cloud, Ashburn): los
  3 saltos son **lógicos** (contenedores aislados), no geográficos.
- Es un proyecto **educativo**: añade saltos y latencia real; no es anonimato de
  grado onion y no está pensado para juegos ni para evadir servicios.
- Solo se permiten destinos en **puertos 80/443**.
