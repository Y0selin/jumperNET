# Facturación de JumperNET (Stripe Checkout, modo pruebas)

La web (`web/`) ya está preparada: pregunta a `GET /billing/config` y, si el
servidor no tiene Stripe, **no finge un cobro**. En ese caso el proceso de pago
registra una *solicitud de activación* con referencia y lo explica en pantalla.

Este directorio contiene el router de referencia y lo que falta para activar
cobros reales. **No está montado**: `servicios/api/main.py` no lo importa, así
que no cambia el comportamiento actual del backend.

## Qué implementa el frontend

| Llamada | Cuándo | Si no existe |
|---|---|---|
| `GET /billing/config` | al abrir el proceso de pago | método «solicitud de activación», sin cobro |
| `GET /billing/elegibilidad` | al abrir el carrito | comprobación local + aviso de que el equipo la valida |
| `POST /billing/checkout` | al confirmar con Stripe activo | no se llama |
| `POST /billing/webhook` | solo servidor | — |

Ningún dato de tarjeta pasa por JumperNET: la tarjeta se escribe en la página
de Stripe. El frontend no pide número, CVV ni claves.

## Qué falta para activarlo (checklist)

1. **Cuenta de Stripe en modo test** y precio recurrente del plan Pro (5 €/mes).
2. **Cupón** `percent_off=10`, `duration=once` para `BIENVENIDA10`.
3. **Claves en el servidor** (nunca en el repositorio ni en el frontend):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_PRO_MENSUAL=price_...
   STRIPE_COUPON_BIENVENIDA10=coupon_...
   APP_BASE_URL=https://y0selin.github.io/jumperNET
   ```
4. **Persistencia** (esto es lo que de verdad impide repetir la promo):
   - `pedidos(ref, id_usuario, plan, ciclo, subtotal, descuento, total, estado, id_evento, creado)`
   - `promos_usadas(id_usuario, codigo, ref_pedido, usado_en)` con `UNIQUE(id_usuario, codigo)`
   - `eventos_stripe(id_evento PRIMARY KEY)` para idempotencia del webhook.
   La elegibilidad del descuento **se comprueba en el servidor**, no en
   `localStorage`.
5. **Montar el router** con las funciones reales del backend:
   ```python
   from billing.stripe_checkout import create_router
   app.include_router(create_router(
       usuario_actual=usuario_actual,
       promo_disponible=promo_disponible,
       registrar_pedido=registrar_pedido,
       activar_plan=activar_plan,
       evento_visto=evento_visto,
   ), prefix="/billing", tags=["billing"])
   ```
6. **Webhook** apuntando a `https://<api>/billing/webhook` y verificado con la
   firma. Sin firma válida se responde 400 y no se activa nada.
7. **Autorización expresa** para pasar de `sk_test_` a `sk_live_`. Mientras no
   exista, todo se queda en pruebas y la web lo dice tal cual.

## Seguridad

- El router rechaza planes distintos de Pro/mensual y códigos que no sean
  `BIENVENIDA10`.
- El descuento se aplica con un cupón de Stripe, no recalculando el precio en
  el cliente.
- La activación del plan solo ocurre desde el webhook firmado.
- Los eventos repetidos se descartan (idempotencia) antes de activar el plan.
