# JumperNET v1.0.0 — navegador con tu circuito integrado

Todos los archivos de esta release son la **misma descarga que ofrece el panel
web** (sección Descargas): el mismo binario, publicado aquí como **segunda vía**
para que no dependas de un solo servidor.

## Archivos de esta release

### jumpernet-navegador-windows-1.0.0.zip (~128 MB)
JumperNET Browser para **Windows** (portátil). Es un Chromium propio (Electron)
que YA viene conectado a tu red: lo abres, escribes tu email y contraseña (los
de la web), pulsas «Conectar», y TODO el tráfico —páginas, WebSockets, fetch—
sale por tu circuito de 3 saltos con la IP del nodo de salida.

- Buscador por defecto: **DuckDuckGo** (como el Tor Browser). Cada pestaña
  nueva abre su propia página de inicio con caja de búsqueda.
- Botón **⌖** / menú → «Nuevo circuito (3 saltos)»: rota el circuito en el
  servidor; el tráfico nuevo sale por otros 3 nodos.
- Instalación: descomprime donde quieras (p. ej. `C:\JumperNET`) y ejecuta
  «JumperNET Browser.exe». Windows SmartScreen dirá «aplicación sin firmar»:
  pulsa «Más información» → «Ejecutar de todas formas».

### JumperNET-1.0.0.AppImage (~110 MB)
JumperNET Browser para **Linux** — el mismo navegador. Instalación:

```bash
chmod +x JumperNET-1.0.0.AppImage
./JumperNET-1.0.0.AppImage
```

(en algunas distros se necesita antes `sudo apt install libfuse2`).

### LEEME-navegador.txt
Instrucciones de uso e instalación de ambos paquetes + detalles técnicos:
cómo responde el 407 del proxy sin ventanas, la partición de sesión
persistente (`persist:jn`) que separa cookies y sesiones de tu Chrome/Firefox,
y dónde guarda la cuenta cada sistema operativo.

## Si prefieres tu navegador de siempre

El panel también ofrece la **extensión** para Chrome/Edge/Brave/Firefox
(sección Descargas de la web, sin release): la ruta ligera con el proxy HTTP
y la autenticación 407 automática.

## Dónde se comprueba que funciona

El panel tiene un botón de comprobación real que muestra la IP por la que
sales; también puedes hacerlo a mano:

```bash
curl --socks5-hostname jumpernet.duckdns.org:1080 \
     --proxy-user 'tu@correo:TU_CLAVE' https://api.ipify.org
```

Debería devolver la IP del nodo de salida, no la tuya.
