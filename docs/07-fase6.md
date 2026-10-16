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
  **canvas de partículas** propio (Aurora) — sin frameworks de UI.
- **Leaflet + OpenStreetMap** para el mapa del viaje.
-Sin dependencias pesadas: react, react-dom, leaflet, vite.

## Estructura
```
web/
  index.html            # raíz del SPA
  package.json          # deps y scripts (dev/build/preview)
  vite.config.js        # base relativa (subruta de Pages)
  src/
    main.jsx            # bootstrap React
    App.jsx             # shell: nav animada, toasts, sesion, tabs
    components/
      Aurora.jsx        # fondo animado de particulas/constelaciones
      Autenticacion.jsx # login/registro + onboarding
      Panel.jsx         # estado, viaje en vivo (mapa+paradas), nodos, JWT ring
      Ajustes.jsx       # DISEÑADOR VISUAL del tema
      Informacion.jsx   # modo principiante / modo avanzado
    lib/
      api.js            # cliente API (token, JWT decode, latencia, geo)
      temas.js          # presets y aplicación de variables CSS
    styles/
      base.css          # todo el diseño bajo variables (--acento-1, --radio…)
      animaciones.css   # catálogo de animaciones (respeta data-anim="off")
```

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
- Línea de paradas animada `TÚ → nodo1 → nodo2 → nodo3 (exit) → destino` con
  pulso en saltos activos y botón «Reproducir viaje» (vuelo animado por el mapa).
- Mapa con tu ubicación real (geolocalización de tu IP vía ipapi.co), el
  servidor (Ashburn) y estelas por salto.
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
- Build local: `vite build` ✓ (42 módulos, 102 KB gzip del JS).
- Production: `https://y0selin.github.io/jumperNET/` sirve los assets del
  build React (HTTP 200) ✓ y **Chrome headless** renderiza el app sin
  errores (login, panel y textos onboarding presentes) ✓.

## CORS
Fase 4 restringe `CORS_ORIGINS` a `https://y0selin.github.io`; verificado
con login/`/me` reales desde el origen de Pages.
