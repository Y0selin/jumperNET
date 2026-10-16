# Extensión del navegador — JumperNAT

La extensión configura **sola** el proxy del navegador (Chrome, Edge, Brave,
Firefox; igual en Windows y Linux) para que TODO tu tráfico salga por tu
circuito JumperNAT: 3 saltos, IP del exit, DNS resuelto por el nodo de salida.
Hace de FoxyProxy, pero sin que escribas ningún ajuste del navegador.

**Por qué un proxy HTTP y no SOCKS5:** Chrome no admite credenciales en SOCKS5
ni de forma manual ni vía extensión, y Firefox no permite a una extensión
responder al handshake SOCKS; el estándar que la extensión SÍ puede responder
es el 407 del proxy HTTP (`Proxy-Authenticate` → `webRequest.onAuthRequired`).
Por eso la red publica la **entrada HTTP en el puerto 1081** (mismas reglas de
seguridad que el SOCKS5 del 1080: tus mismas credenciales, solo 80/443, nada
de IPs privadas/metadata, cifrado JENC de los saltos).

## Instalación (con la extensión preparada en `web/extension/`)

```bash
cd web/extension && bash empaqueta.sh     # genera dist/chrome/ y dist/firefox(+xpi)
```

### Chrome, Edge o Brave (Windows/Linux)
1. Abre `chrome://extensions` (o `edge://extensions`, `brave://extensions`).
2. Activa **Modo de desarrollador** (arriba a la derecha).
3. **Cargar sin comprimir** → elige la carpeta `web/extension/dist/chrome`.
4. En el popup de la extensión: escribe tu email y tu contraseña (los mismos
   de la web) y pulsa **Activar**. Se guarda solo en el navegador.

### Firefox (Windows/Linux)
- Temporal (para probar, se quita al cerrar Firefox): `about:debugging#/runtime/this-firefox`
  → **Cargar complemento temporal** → `web/extension/dist/firefox/manifest.json`.
- Permanente: requiere paquete firmado por AMO: `dist/firefox.xpi`
  + [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
  (subir «for self-distribution»; el navegador lo acepta sin pasar la tienda).
  Pon el usuario y contraseña en el popup y pulsa **Activar**.

> Los navegadores solo permiten instalar extensiones desde sus tiendas o en
> modo desarrollador: ningún panel web puede instalarlas por sí solo. Lo que
> sí hace el panel es **ofrecer la instalación** en cuanto enciendes la red.

## Uso

- El popup muestra el estado y los campos de credenciales (tu cuenta de la web).
- **Activar**: todo el tráfico del navegador sale por el circuito. **Desactivar**:
  vuelve al proxy normal del sistema. **Olvidar**: borra credenciales.
- La red tiene que estar **encendida** (interruptor de la pestaña Red): el
  servidor rechaza a usuarios sin circuito.
- Resolución de DNS: el dominio viaja al nodo de salida y lo resuelve el exit
  (nada de lookups locales en http:// ni en CONNECT).

## Seguridad

- Las credenciales viven en el `storage.local` de la extensión (nunca en la web).
- El bloqueo de destinos es el mismo en la entrada HTTP que en la de SOCKS5:
  si algo intenta salir a una IP privada o a la metadata del cloud, se niega.
- El handshake de autenticación (Basic) es la única parte sin cifrar: por lo
  demás el volumen va HTTPS (CONNECT) o por el circuito JENC.
