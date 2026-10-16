# Fase 8 — Cifrado en capas de los saltos (JENC)

## Objetivo
Que un observador del cable (o un salto intermedio) **no vea el HTTP del
usuario**: el stream del usuario viaja **cifrado** entre la entrada y el
nodo de salida, con ChaCha20-Poly1305 (AEAD autenticado).

## Flujo

```
cliente --plano(SOCKS5)--> ENTRADA --JENC--> nodo1 --JENC--> nodo2 --JENC--> EXIT --plano--> destino
```

- Los **nodos intermedios siguen siendo reenvío ciego**: no distinguen nada
  (el JENC les entra y les sale como bytes). El protocolo de saltos (Fase 1) no cambia.
- Solo **entrada** (emisor) y **exit** (receptor) entienden JENC.
- La vuelta (respuestas del destino) viaja también cifrada: el exit cifra
  las respuestas y la entrada descifra antes de dárselas al cliente SOCKS.

## Formato del modo cifrado (tras la línea de ruta de la Fase 1)

```
"JENC"                                  (magia, una vez)
[len 4B BE][nonce 12B][ciphertext+tag 16B] * N      (registros)
[len 0 4B]                              (terminador, cierre ordenado)
```

- Clave: `SHA-256(CLAVE_SALTOS)` → 32 B (ChaCha20-Poly1305).
- Troceado: CHUNK de 16 KiB (registros acotados).
- **Detección automática**: el exit lee los 4 primeros bytes tras la ruta;
  si son `JENC` entra en modo cifrado, si no se queda en modo plano
  (compatibilidad total con las pruebas de las Fases 1–2 sin clave).

## Dónde está
- `servicios/_comun/cifra.py` — módulo común (Emisor / Receptor / magia).
- `servicios/entrada/entrada.py` — emisores/receptores según `CLAVE_SALTOS`.
- `servicios/nodo/nodo.py` — en el exit: detecta la magia, descifra hacia
  destino y cifra la vuelta.
- `docker-compose.yml` — `CLAVE_SALTOS: ${CLAVE_SALTOS:-}` en entrada y 6 nodos.
- `.env` — `CLAVE_SALTOS=openssl rand -hex 32` (generada y en uso).

## Limitación (honestidad de diseño)
La clave es compartida por configuración entre entrada y nodos: protege
contra **observadores del cable** y contra lectura superficial del tráfico
entre saltos, pero NO es anonimato estilo onion con claves por salto (los
nodos son confianza del proyecto por diseño). Queda documentado como tal.

## Prueba (integrada en run_all.sh, paso 8.1)

`tests/fase8_cifrado.py` (en el `cliente-test`, con `_comun` montado):

| # | Caso | Resultado |
|---|---|---|
| 1 | Clave deriva 32 B (ChaCha20-Poly1305 inicializada) | ✅ |
| 2 | Registro cifrado con OTRA clave no se descifra (InvalidTag) | ✅ |
| 3 | Circuito real: SOCKS5 + stream JENC → respuesta empieza con `JENC`, descifra a **HTTP 200** de `web-destino` | ✅ |

Resultado global (última ejecución):

```
  OK | 1.1 | saltos manuales (3 reenvíos)
  OK | 2.1 | circuitos por la API + heartbeat
  OK | 2.2 | HTTP real a través de un circuito de la API
  OK | 3.1 | ciclo completo de usuario
  OK | 4.1 | HTTPS con Let's Encrypt (401 esperado sin token)
  OK | 5.1 | SOCKS5: 8 casos de protocolo
  OK | 5.2 | SOCKS5 desde internet: salida HTTPS real
  OK | 5.3 | metadata Oracle denegada
  OK | 5.4 | puerto prohibido denegado
  OK | 8.1 | cifrado en capas JENC end-to-end
  RESULTADO: ✅ 10/10 SUPERADAS (EXIT=0)
```

## Problemas que el desarrollo de Fase 8 destapó (y corrigió)

1. **Doble defina de `environment` en compose**: cada `nodoX` redefinía el
   bloque entero y **pisaba** la `CLAVE_SALTOS` del ancla → nodos sin clave
   → exit plano. Los nodos declaran su `CLAVE_SALTOS` explícita ahora.
2. **Magia JENC sin consumir en la entrada**: la respuesta cifrada del exit
   empieza con `JENC`; si no se consume, el primer prefijo de longitud se
   corrompe (→ respuestas vacías / SSL_ERROR_SYSCALL). Corregido en
   `retransmitir_descifrado`.
3. El build de las imágenes ahora monta/instala `cryptography` y copia el
   módulo `_comun/` (contexto de build ahora es `./servicios`).
