# JumperNET — red de anonimato por saltos (estilo Tor casero)

> Proxy SOCKS5 con cuentas de usuario: tu tráfico entra por el proxy, salta por
> **3 nodos aleatorios** cifrado en cada salto (ChaCha20-Poly1305), y sale a
> internet con la **IP del nodo de salida**. Cada pieza es real: contenedores
> Docker en el servidor, una API con cuentas, un panel web y un navegador propio.
> Todo se puede comprobar a mano con un `curl`.

[![Panel web](https://img.shields.io/badge/panel-y0selin.github.io%2FjumperNET-blueviolet)](https://y0selin.github.io/jumperNET/)
[![Documentación](https://img.shields.io/badge/docs-jumpernet.duckdns.org%2Fdocs-6c5ce7)](https://jumpernet.duckdns.org/docs/)
[![Deploy Pages](https://github.com/Y0selin/jumperNET/actions/workflows/pages.yml/badge.svg)](https://github.com/Y0selin/jumperNET/actions/workflows/pages.yml)

---

## 🧭 ¿Qué es y qué NO es?

**Es** una implementación funcional del modelo Tor en escala de laboratorio:
entrada SOCKS5 (`1080`) + entrada HTTP (`1081`) con las mismas credenciales,
cadena de 3 saltos con reenvío ciego y cifrado entre saltos (la clave
`CLAVE_SALTOS`), verificación real de la IP de salida y una suite de pruebas
que valida cada fase.

**No es** la red pública Tor (los nodos son nuestros), **no** es una VPN
(solo permite 80/443 y no oculta tu conexión del ISP), y **no** es para
velocidad (juegos competitivos no: añade latencia real).

## 🏗️ Arquitectura (una foto del tráfico)

```
 Tú ──▶ SOCKS5 :1080 ──▶ entrada ──▶ nodo₁ ──▶ nodo₂ ──▶ nodo₃ (exit) ──▶ internet
      (auth argon2id)          └─ cifrado ChaCha20-Poly1305 en cada salto ─┘
                                 reenvío ciego: no interpretan, no guardan, solo 80/443
```

- **entrada** (Python): SOCKS5 con las credenciales de la web y proxy HTTP
  (1081) para los navegadores (Chrome no admite SOCKS5 con credenciales).
  Reenvía al primer salto con la ruta restante; bloquea IPs privadas/de cloud
  y la metadata (169.254.169.254).
- **nodos ×N**: reenvío ciego con asyncio. Cada salto recibe una primera línea
  con la ruta restante. El último es el **exit** y habla con internet.
- **Cifrado entre saltos**: si la variable `CLAVE_SALTOS` está definida, el
  stream entre saltos viaja cifrado (ChaCha20-Poly1305); en producción va activo.
- **api** (FastAPI + SQLite): cuentas (argon2id), JWT de 2 h, elección de
  circuito, heartbeats de nodos, rotación, comprobación real del exit
  (`/comprobar`), preferencias de usuario (`PATCH /me`) y límites de tasa.
- **panel web** (React + Vite, GitHub Pages): interruptor de red, mapa real de
  geolocalización (tú ↔ exit), estado de nodos, comprobaciones, credenciales…
  Edición de perfil (alias/lema) con persistencia en la API.
- **navegador dedicado** (Electron): un Chromium que YA viene conectado — la
  primera pestaña es DuckDuckGo por tu circuito; el 407 del proxy se responde
  solo. Vigilante de carga con reintentos y página de diagnóstico propia.
- **extensión** (Chrome/Firefox): conecta con el proxy HTTP, responde la
  autenticación 407 automáticamente y avisa si otra extensión pisa el proxy.

## 📂 Estructura del repo

```
├── deploy/
│   ├── docker-compose.yml        # nodos + entrada + api + caddy + wordpress docs
│   ├── servicios/
│   │   ├── api/main.py           # la API completa (FastAPI + SQLite)
│   │   ├── entrada/entrada.py    # SOCKS5 (1080) + proxy HTTP (1081)
│   │   ├── nodo/nodo.py          # el salto (reenvío ciego + cifrado)
│   │   └── peer/nodo_personal.py # nodo personal de un usuario
│   ├── web/                      # panel React (Vite) + extensión
│   │   ├── src/components/       # Landing, Red, Nodos, Cuenta, Descargas…
│   │   ├── src/lib/api.js        # cliente de la API
│   │   └── scripts/e2e.mjs       # E2E del panel (Playwright)
│   ├── navegador/                # el navegador Electron (main.js + ventana/)
│   ├── wp-theme/                 # tema hijo del WordPress de documentación
│   ├── tests/run_all.sh          # suite integral de las fases 1-10
│   ├── docs/                     # documentación técnica por fases
│   └── index.html                # demo estática independiente
└── README.md
```

## 🚀 Puesta en marcha (tu propio servidor)

```bash
# requisitos: docker + docker compose v2, dominio propio, SSH
git clone git@github.com:Y0selin/jumperNET.git && cd jumperNET/deploy
cat > .env <<'EOF'
DOMINIO=docs.tu-dominio.duckdns.org
INTERNAL_TOKEN=un_secreto_largo
CLAVE_SALTOS=otro_secreto_para_el_cifrado
EOF
docker compose up -d --build       # levanta todo y emite HTTPS con Let's Encrypt
bash tests/run_all.sh              # suite integral: debería salir en verde
```

Probado en ARM64 (OCI Ampere) y en x86_64.

## 🖥️ Cómo usarlo (usuario)

1. **Crea tu cuenta** en el panel: solo email + contraseña.
2. **Pulsa ACTIVAR RED**: la API elige 3 nodos vivos al azar y guarda el circuito.
3. **Conéctate**: con cualquier cliente SOCKS5 (`1080`), con el proxy HTTP
   (`1081`) o con el navegador dedicado.
4. **Compruébalo de verdad**: botón «Comprobar circuito» del panel, o a mano:

```bash
curl --socks5-hostname jumpernet.duckdns.org:1080 \
     --proxy-user 'tu@correo:TU_CLAVE' https://api.ipify.org
# → la IP del nodo de salida, no la tuya
```

Desde el JumperNET Browser no hay comandos: abres, entras, y la primera pestaña
ya es DuckDuckGo por el circuito (con la IP del exit). El botón «⌖» rota los
saltos (estilo Tor: «Nuevo circuito»).

## 🧪 Pruebas (nada de fe ciega)

- `deploy/tests/run_all.sh` — suite integral en el servidor (saltos manuales,
  entrada SOCKS5+HTTP, API, usuarios, cifrado, límites, peers, WordPress…).
- `deploy/tests/ip_publica_real.sh` — la prueba desde TU máquina: tu IP directa
  frente a la IP que ve una web exterior por el circuito.
- `deploy/web/scripts/e2e.mjs` — E2E del panel: login, interruptor de red,
  nodos, mapa, cuenta, descargas…
- Navegador — E2E con CDP sobre el navegador real: login, conexión, búsqueda
  real en DDG por el circuito con la IP real del exit, y recuperación de errores.

## 🗺️ Fases del proyecto (todas implementadas y probadas)

| Fase | Qué hace |
|------|----------|
| 1 | saltos manuales: 3 reenvíos encadenados hasta el destino |
| 2 | API + registro de nodos con heartbeat y estado vivo/caído |
| 3 | usuarios: cuentas argon2id, JWT, elección/rotación de circuito |
| 4 | HTTPS + dominio real con Caddy (emisión automática) |
| 5 | entrada SOCKS5 pública con auth y límites |
| 6 | cifrado en cada salto, verificable |
| 7 | bloqueo de IPs privadas/metadata y límites por cuenta |
| 8 | nodo personal del usuario (peer) con token |
| 9 | WordPress de documentación con su propio tema |
| 10 | navegador dedicado (Electron) con circuito integrado |

## 📦 Descargas

Todo en el panel, sección **Descargas** (visible sin login):

- **Extensión** Chrome/Edge/Brave/Firefox (`extension.zip`).
- **JumperNET Browser** para Windows (portátil + instalador) y Linux (AppImage).
- **También en [GitHub Releases](https://github.com/Y0selin/jumperNET/releases)**
  con las notas de cada archivo (segunda vía de descarga).

## 🔒 Privacidad — en una línea

Se guarda: tu email, el estado de tu circuito y cuándo cambió. **Nada más**.
No hay histórico de webs, ni de destinos, ni cookies de terceros. Los nodos
hacen **reenvío ciego**: no leen ni retienen lo que pasa por ellos.

## 🧯 Problemas frecuentes

- **La IP que se ve no cambia**: revisa que la red esté ACTIVA (panel) y el
  `--proxy-user` correcto; la comprobación del panel da el veredicto exacto.
- **Conexión rechazada en el navegador**: puertos 1080/1081 abiertos en el
  firewall del servidor y `CLAVE_SALTOS` igual en entrada y nodos.
- **SmartScreen en Windows**: la build no está firmada; pulsa «Más información →
  Ejecutar de todas formas». Es la misma app que descargas del panel.
- **El navegador no carga nada**: las primeras cargas reintentan solas y luego
  muestra una página local de diagnóstico con el motivo exacto (`ERR_…`) y un
  botón «Reintentar».

## 🤝 Contribuir / nodo personal

- Nodo personal (peer): levanta `peer/nodo_personal.py` con tu token y el nombre
  que quieras; la red lo trata igual que los otros saltos.
- PRs con test incluidos, por favor: los cambios en el protocolo (salto, cifrado)
  deben pasar `run_all.sh` completa antes de mezclarse.

## ⚖️ Uso responsable

Proyecto educativo y de investigación sobre redes de anonimato. Úsalo para
aprender, para proteger tu privacidad y para auditar el modelo. No para
actividades ilegales: cada cuenta queda asociada a un email y el servidor
registra los errores de uso.
