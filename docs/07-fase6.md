# Fase 6 — Frontend React en GitHub Pages

## Objetivo
Web **React + Vite (Node.js)** para gestionar circuitos: entrar, conectar /
rotar / desconectar, ver el **viaje en vivo** (mapa, nodos, IPs) y
**diseñar la propia página** desde Ajustes. Alojada en GitHub Pages con
despliegue automático por **GitHub Actions** (compila con Node).

## URL
`https://y0selin.github.io/jumperNET/`

## Stack
- **React 18 + Vite** (build con Node 20 en Actions, artefacto estático en Pages).
- Gráficas/animaciones con **CSS puro** (keyframes, glassmorphism) + un
  **canvas de glifos** propio (malla, glifos que se escriben y halos) — sin
  frameworks de UI.
- **Leaflet + OpenStreetMap** para el mapa del viaje.
-Sin dependencias pesadas: react, react-dom, leaflet, vite.

## Estructura
```
web/
  index.html            # raíz del SPA (favicon SVG en línea, fuente Inter)
  package.json          # deps y scripts (dev/build/preview/test:e2e)
  vite.config.js        # base relativa (subruta de Pages)
  scripts/e2e.mjs       # test E2E (Chrome headless + mock de la API)
  src/
    main.jsx            # bootstrap React
    App.jsx             # shell: nav animada, toasts, sesion, tabs
    components/
      GlifosFondo.jsx   # fondo: malla + glifos que se escriben + halos (canvas)
      Landing.jsx       # inicio público: que es, como funciona, CTA
      Autenticacion.jsx # login/registro minimalista (marco animado)
      Red.jsx           # PANEL: interruptor, ruta en vivo (mapa+paradas), nodos
      Cuenta.jsx        # ficha del usuario + zona de peligro (borrado en 2 pasos)
      Ajustes.jsx       # DISEÑADOR VISUAL del tema
      Informacion.jsx   # modo principiante / modo avanzado
      TerminalVivo.jsx  # terminal que se escribe sola (hero)
      Revela.jsx        # aparición al hacer scroll (IntersectionObserver)
      Piezas.jsx        # piezas compartidas: Stat, Tuberia, AnilloJwt, Hecho
    lib/
      api.js            # cliente API (token, JWT decode, latencia, geo)
      temas.js          # presets y aplicación de variables CSS
    styles/
      base.css          # todo el diseño bajo variables (--acento-1, --radio…)
      animaciones.css   # catálogo de animaciones (respeta data-anim="off")
```

## Recorrido del usuario (rediseñado, estilo «terminal» del ejemplo HackNexus)
1. **Inicio público** — fondo de glifos que se escriben y se desvanecen, hero con
   título con degradado en movimiento, texto que se teclea solo, flujo animado
   de paquetes `TÚ → nodo₁ → nodo₂ → nodo₃ → INTERNET`, métricas y explicación
   clara (qué es / qué no es). Las secciones aparecen al hacer scroll.
2. **Acceso** — una sola tarjeta con marco que gira: correo + contraseña,
   ojo para ver/ocultar, validación en español (formato de correo, mínimo 8) y
   sacudida cuando falla. Sin párrafos encima.
3. **Panel de red** — la red llega **APAGADA**: nada se conecta al iniciar sesión.
   Un **interruptor grande** la enciende y la apaga; mientras está viva, la ruta
   de paradas, la tubería de paquetes y el mapa se mueven en tiempo real, y hay
   «Girar circuito» para nuevos nodos al azar.
4. **Cuenta** — identidad, métricas, sesión (anillo JWT), qué se guarda y qué no,
   y **zona de peligro** con confirmación en dos pasos para eliminar la cuenta.

## Animaciones (todas bajo `--vel-anim`)
- El multiplicador del Diseñador (0–2) se aplica vía `--veld` = `calc(1s / max(.25, --vel-anim))`
  dentro de `calc()`: un `var()` unitario suelto en el shorthand de `animation`
  cae en `animation-iteration-count` y **anularía el `infinite`** (bug corregido).
- Con `--vel-anim: 0` el Diseñador marca `data-anim="off"` y se apaga todo;
  `prefers-reduced-motion` también lo apaga.

## Diseñador visual (Ajustes) — lo que el usuario puede cambiar desde la web
- **Colores** (8 variables): fondos, bordes, acentos, textos (color pickers).
- **Forma**: radio de esquinas, tamaño de letra, **fuente** (Inter, mono, serif…).
- **Efectos**: intensidad de glow, transparencia del glass, **velocidad global
  de todas las animaciones** (0 = sin animaciones, accesible).
- **CSS personalizado libre** (textarea avanzado, tiene la última palabra).
- **6 preestablecidos**: Neón Nocturno, Océano Profundo, Matrix, Rubí Rojo,
  Luz Blanca, Solar de Oro.
- **Exportar/importar tema** (JSON) y persistencia en localStorage.
- El sistema entero funciona reescribiendo `css variables` en vivo:
  cambia `--acento-1` y cambiará botones, mapa, aurora y brillos a la vez.

## Información doble (nuevos / avanzados)
- **Modo principiante**: qué es un circuito con la analogía del autobús con
  3 cambios de conductor, guía en 4 pasos, FAQ, seguridad en lenguaje fácil.
- **Modo avanzado**: ficha técnica del plan/control y del data-plane (formato
  de registro JENC con diagrama ASCII), tabla de endpoints, límites docker,
  `/nodos` **en JSON crudo**, **JWT decodificado** en vivo y **anillo de
  cuenta atrás** de expiración, inventario de seguridad, latencia por consulta.

## Panel (viaje en vivo)
- **Interruptor** grande de encendido/apagado: el circuito nunca arranca solo.
- Tira de métricas: estado, saltos, cifrado y dirección IP de salida.
- Línea de paradas animada `TÚ → nodo1 → nodo2 → nodo3 (exit) → INTERNET` con
  pulso en saltos activos, más una **tubería de paquetes** que viaja de extremo
  a extremo (o queda detenida cuando la red está apagada).
- Mapa con tu ubicación real (geolocalización de tu IP vía ipapi.co) y el
  servidor (Ashburn).
- Tarjeta por nodo: dirección interna, estado por heartbeat, hacia quién
  salta, tipo de enlace y si ve o no tu contenido.
- Comando SOCKS5 listo para copiar.
- Nota de honestidad visible: los saltos son lógicos (misma máquina).

## Despliegue (GitHub Actions)
Pages configurado con fuente **GitHub Actions** → `.github/workflows/pages.yml`:
1. `on: push` con cambios en `web/**` (o manual `workflow_dispatch`).
2. `npm ci` + `npm run build` (Node 20, caché de npm).
3. Sube `web/dist` como artefacto de Pages y despliega.

## Seguridad del cliente
- JWT en localStorage; la contraseña nunca se guarda (solo el token).
- 401 → logout automático y aviso de sesión caducada.
- La geolocalización de tu IP la pide el navegador a ipapi.co; el servidor
  no guarda geolocalización ni histórico.

## Verificación
- Build local: `npm run build` ✓ (47 módulos; ~109 KB gzip de JS, ~11,5 KB gzip de CSS).
- **E2E real** con Chrome headless: `npm run test:e2e` (necesita `vite preview`
  en el puerto 4173; con `URL_APP=https://y0selin.github.io/jumperNET/` se puede
  apuntar al despliegue y comprobar el sitio publicado). Inyecta un mock de la API dentro de la página y recorre
  10 bloques: landing y glifos, animaciones vivas, validaciones y registro,
  panel con la red apagada, encender con el interruptor, girar, apagar, Info
  (principiante y avanzado), Cuenta con borrado en dos pasos, responsive a
  390 px sin desbordes, presets del diseñador, salir y borrar la cuenta.
  Deja capturas en `web/e2e-out/`. Termina en verde con **cero errores de
  consola y cero peticiones fallidas**.
- La forma real de `/nodos` (`nombre`, `direccion`, `estado`) se contrastó
  contra la API en producción.
- El test detecta **assets fantasma**: `vite preview` responde el `index.html`
  del SPA a cualquier ruta que falte, así que un asset inexistente se cuela con
  200 y sin error en local. El E2E marca como error cualquier respuesta HTML con
  extensión de asset — así se cazó el 404 de los marcadores de Leaflet, que solo
  se veía en GitHub Pages (subruta). Solución: marcadores `divIcon` propios, sin
  imágenes de Leaflet. El E2E añade la comprobación `.marca-mapa` y, corriendo
  contra el sitio publicado, termina con **cero 404**.
- Production: `https://y0selin.github.io/jumperNET/` sirve los assets del
  build React (HTTP 200) ✓.

## CORS
Fase 4 restringe `CORS_ORIGINS` a `https://y0selin.github.io`; verificado
con login/`/me` reales desde el origen de Pages.
