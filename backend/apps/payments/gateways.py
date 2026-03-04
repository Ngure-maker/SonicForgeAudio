from abc import ABC, abstractmethod

import stripe
from django.conf import settings


class PaymentGateway(ABC):
    @abstractmethod
    def create_intent(self, amount_cents: int, currency: str, metadata: dict) -> dict:
        raise NotImplementedError


class StripeGateway(PaymentGateway):
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_intent(self, amount_cents: int, currency: str, metadata: dict) -> dict:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata=metadata,
            automatic_payment_methods={"enabled": True},
        )
        return {"id": intent.id, "client_secret": intent.client_secret}


class MpesaGateway(PaymentGateway):
    def create_intent(self, amount_cents: int, currency: str, metadata: dict) -> dict:
        raise NotImplementedError("Daraja gateway placeholder.")


def get_payment_gateway(provider: str = "stripe") -> PaymentGateway:
    if provider == "stripe":
        return StripeGateway()
    if provider == "mpesa":
        return MpesaGateway()
    raise ValueError("Unsupported payment provider")
