"""Router de referencia para cobrar el plan Pro con Stripe Checkout (modo test).

IMPORTANTE
----------
Este archivo NO se importa desde servicios/api/main.py: se deja aquí como
integración preparada para que el equipo la monte cuando tenga las claves.
No cobra nada por sí solo y no guarda datos de tarjeta: la tarjeta se escribe
siempre en la página de Stripe, nunca en JumperNET.

Montaje (en servicios/api/main.py, cuando exista autorización para cobrar):

    from billing.stripe_checkout import create_router
    app.include_router(create_router(
        usuario_actual=usuario_actual,        # devuelve el usuario o lanza 401
        promo_disponible=promo_disponible,    # (id_usuario) -> bool  · backend, no localStorage
        registrar_pedido=registrar_pedido,    # (id_usuario, datos) -> ref
        activar_plan=activar_plan,            # (id_usuario, ref_pago) -> None
        evento_visto=evento_visto,            # (event_id) -> bool · idempotencia real en BD
    ), prefix="/billing", tags=["billing"])

Variables de entorno:
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    STRIPE_PRICE_PRO_MENSUAL=price_...
    STRIPE_COUPON_BIENVENIDA10=coupon_...   # cupón percent_off=10, duration=once
    APP_BASE_URL=https://y0selin.github.io/jumperNET

Si falta la clave, /billing/config responde 200 con activo=false y el frontend
enseña la solicitud de activación en vez de un botón de pago que no cobra.
"""

from __future__ import annotations

import os
from typing import Any, Callable

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field


class Facturacion(BaseModel):
    nombre: str = Field(min_length=3, max_length=120)
    email: str = Field(min_length=5, max_length=180)
    pais: str = Field(min_length=2, max_length=80)
    nif: str | None = Field(default=None, max_length=20)
    direccion: str = Field(min_length=5, max_length=180)
    ciudad: str = Field(min_length=2, max_length=90)
    cp: str = Field(min_length=3, max_length=12)


class Checkout(BaseModel):
    plan: str = "pro"
    ciclo: str = "mensual"
    promo: str | None = None
    facturacion: Facturacion


def create_router(
    *,
    usuario_actual: Callable[[Request], dict[str, Any]],
    promo_disponible: Callable[[int], bool],
    registrar_pedido: Callable[[int, dict[str, Any]], str],
    activar_plan: Callable[[int, str], None],
    evento_visto: Callable[[str], bool],
) -> APIRouter:
    router = APIRouter()

    def _stripe():
        clave = os.getenv("STRIPE_SECRET_KEY", "")
        if not clave:
            return None
        try:
            import stripe  # import perezoso: sin la librería el resto de la API sigue viva
        except ImportError:
            return None
        stripe.api_key = clave
        return stripe

    def _base() -> str:
        return os.getenv("APP_BASE_URL", "https://y0selin.github.io/jumperNET").rstrip("/")

    @router.get("/config")
    def config() -> dict[str, Any]:
        clave = os.getenv("STRIPE_SECRET_KEY", "")
        return {
            "activo": bool(clave),
            "proveedor": "stripe" if clave else None,
            "modo": "test" if clave.startswith("sk_test_") else ("real" if clave else None),
            "motivo": "" if clave else "Stripe todavía no está configurado en el servidor.",
        }

    @router.get("/elegibilidad")
    def elegibilidad(request: Request) -> dict[str, Any]:
        usuario = usuario_actual(request)
        disponible = bool(promo_disponible(int(usuario["id"])))
        return {
            "elegible": disponible,
            "ya_usada": not disponible,
            "motivo": "" if disponible else "La promoción de bienvenida ya se usó en esta cuenta.",
        }

    @router.post("/checkout")
    def checkout(datos: Checkout, request: Request) -> dict[str, str]:
        usuario = usuario_actual(request)
        stripe = _stripe()
        if stripe is None:
            raise HTTPException(503, "El servicio de pagos no está configurado.")
        if datos.plan != "pro" or datos.ciclo != "mensual":
            raise HTTPException(400, "Solo se contrata Pro en modalidad mensual.")
        precio = os.getenv("STRIPE_PRICE_PRO_MENSUAL", "")
        if not precio:
            raise HTTPException(503, "Falta el precio de Pro en la configuración del servidor.")

        descuentos = []
        if datos.promo:
            if datos.promo.upper() != "BIENVENIDA10":
                raise HTTPException(400, "Ese código promocional no está activo.")
            if not promo_disponible(int(usuario["id"])):
                raise HTTPException(409, "La promoción de bienvenida ya se usó en esta cuenta.")
            cupon = os.getenv("STRIPE_COUPON_BIENVENIDA10", "")
            if not cupon:
                raise HTTPException(503, "El cupón de bienvenida no está configurado.")
            descuentos = [{"coupon": cupon}]

        ref = registrar_pedido(int(usuario["id"]), {
            "plan": "pro", "ciclo": "mensual", "promo": datos.promo,
            "facturacion": datos.facturacion.model_dump(),
        })

        try:
            sesion = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": precio, "quantity": 1}],
                customer_email=datos.facturacion.email,
                client_reference_id=ref,
                discounts=descuentos or None,
                subscription_data={"metadata": {"id_usuario": str(usuario["id"]), "ref": ref}},
                metadata={"id_usuario": str(usuario["id"]), "ref": ref},
                success_url=f"{_base()}/#/panel?suscripcion=ok&ref={ref}",
                cancel_url=f"{_base()}/#/pago?cancelado=1",
                allow_promotion_codes=False,
            )
        except Exception as exc:  # noqa: BLE001 - se traduce a un error legible
            raise HTTPException(502, f"No se pudo crear la sesión de pago: {exc}") from exc

        return {"url": sesion.url, "ref": ref}

    @router.post("/webhook")
    async def webhook(
        request: Request,
        stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    ) -> dict[str, bool]:
        stripe = _stripe()
        secreto = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        if stripe is None or not secreto:
            raise HTTPException(503, "Webhook sin configurar.")

        crudo = await request.body()
        try:
            evento = stripe.Webhook.construct_event(crudo, stripe_signature, secreto)
        except Exception as exc:  # firma inválida o cuerpo manipulado
            raise HTTPException(400, "Firma del webhook no válida.") from exc

        if evento_visto(evento["id"]):
            return {"ok": True, "repetido": True}

        if evento["type"] in {"checkout.session.completed", "invoice.paid"}:
            objeto = evento["data"]["object"]
            meta = objeto.get("metadata") or objeto.get("subscription_details", {}).get("metadata", {})
            id_usuario = meta.get("id_usuario")
            if id_usuario:
                activar_plan(int(id_usuario), evento["id"])

        return {"ok": True, "repetido": False}
