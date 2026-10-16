# Fase 4 — HTTPS, CORS y firewall

## Objetivo
Servir la API por **HTTPS real** con Let's Encrypt en `jumpernet.duckdns.org`, restringir **CORS** a la web de GitHub Pages, y dejar el **firewall del host** (iptables) configurado de forma persistente sin abrir puertos de más.

## Qué se hizo

### 1. Caddy como único publicador de la API
`config/caddy/Caddyfile`:
```
{$DOMINIO} {
    encode gzip
    reverse_proxy api:8000
}
```
- Caddy pide y **renueva automáticamente** el certificado de Let's Encrypt (protocolo ACME). Para el dominio del DuckDNS usó el desafío **TLS-ALPN-01** tras la primera validación HTTP-01.
- La API (FastAPI) sigue sin publicarse directamente: solo Caddy (80/443) expone el plano de control. El tráfico va: internet → Caddy (HTTPS) → `api:8000` por la red interna `red_jumper`.
- Al llegar por Caddy, la API puede confiar en `X-Forwarded-For` para conocer la IP real del usuario (con las restricciones de la Fase 3).

### 2. CORS restringido a la URL de GitHub Pages
En la API (`servicios/api/main.py`) se anadió `CORSMiddleware` configurado por `.env`:
```
CORS_ORIGINS=https://y0selin.github.io
```
- Cabeceras permitidas: `Authorization`, `Content-Type` (lo que la web de Fase 6 necesita).
- Métodos: `GET`, `POST`, `DELETE`.
- **Prueba real**: petición con `Origin: https://y0selin.github.io` recibe `access-control-allow-origin: https://y0selin.github.io`. Petición con `Origin: https://malicioso.example.com` **no** recibe ninguna cabecera CORS (el navegador la bloquea). Quedó plasmado en la evidencia de la fase.

### 3. Firewall del host: iptables con persistencia
- Antes de tocar nada, **copia de seguridad** (regla 7 del proyecto):
  - `backups/iptables-pre-docker-YYYYMMDD.rules` (antes de instalar Docker)
  - `backups/iptables-pre-fase4-YYYYMMDD.rules` (antes de abrir 80/443/1080)
- Se abrieron **solo** los 3 puertos del proyecto (`80`, `443`, `1080`) y se mantuvo intacto SSH (22) y los servicios preexistentes del servidor (Minecraft: 19132/UDP y 25565/TCP). Las reglas quedaron encima del `REJECT` general:
  ```
  1 ACCEPT  tcp dpt:1080
  2 ACCEPT  tcp dpt:443
  3 ACCEPT  tcp dpt:80
  ... (establecidas / icmp / 22 / 19132 / 25565)
  last REJECT all
  ```
- **Persistencia**: `netfilter-persistent` (paquete `iptables-persistent`), reglas guardadas en `/etc/iptables/rules.v4` y `rules.v6`. Sobrevive a reinicios del servidor.

### 4. Security List de Oracle (el usuario lo hizo en la consola)
En Oracle Cloud hay **dos capas de firewall**: la del Gobierno (iptables, ya) y la de red virtual (*Security List*), que se aplica **fuera** del servidor. Se necesitó crear 3 reglas de **Ingress** en la *Default Security List* de la VCN correcta: TCP `80`, `443`, `1080` desde `0.0.0.0/0`.
- **Lección aprendida (documentada para el tribunal)**: al principio las reglas se crearon en otra Security List que no estaba asociada a la subred de la instancia (`10.0.0.0/24`) y se dieron timeouts desde internet pese a iptables. Se diagnosticó midiendo desde fuera los tres puertos (22 OK, 80/443/1080 NOK) y correlación con los logs de Caddy (`challenge failed: Timeout during connect`).
- Puerto `1080` queda pendiente en 2 compartimentos: cuando exista otro servicio publicado (Fase 5) debe estar en la *misma* lista asociada a la instancia, con el mismo formato (source `0.0.0.0/0`, protocolo TCP, destino 1080, Stateful sin marcar).

## Resultado final de capa HTTPS (evidencia en docs/pruebas/fase4-evidencia.txt)
- `docker logs jumpernat-caddy-1`: `certificate obtained successfully — identifier: jumpernet.duckdns.org — issuer: acme-v02.api.letsencrypt.org`
- Peticiones reales desde internet (Kali local):
  - `GET https://jumpernet.duckdns.org/nodos` → **HTTP 200** (datos de nodos)
  - `GET https://jumpernet.duckdns.org/me` sin token → **HTTP 401**
  - `GET http://jumpernet.duckdns.org/` → **HTTP 308** redirigiendo a HTTPS
- Certificado válido y firmado por Let's Encrypt (verificado con `curl -v`).

## Siguiente paso
Fase 5: proxy de entrada SOCKS5 autenticado (contenedor `entrada`) — cuando se abra el puerto 1080 en la Security List que esté aplicando (default list), inmediatamente disponible para el final del trabajo.
