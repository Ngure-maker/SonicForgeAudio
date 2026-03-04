import stripe
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttles import PaymentRateThrottle
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer
from apps.orders.services import create_order_from_cart, fulfill_paid_order

from .gateways import get_payment_gateway
from .serializers import CreatePaymentIntentSerializer


class CreatePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PaymentRateThrottle]

    def post(self, request):
        serializer = CreatePaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data.get("order_id")
        if order_id:
            order = get_object_or_404(Order, id=order_id, user=request.user)
        else:
            shipping_address_id = serializer.validated_data.get("shipping_address_id")
            if not shipping_address_id:
                return Response({"detail": "shipping_address_id is required when order_id is not provided."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                order = create_order_from_cart(
                    request.user,
                    shipping_address_id=shipping_address_id,
                    billing_address_id=serializer.validated_data.get("billing_address_id"),
                )
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        amount_cents = int(order.total_amount * 100)
        gateway = get_payment_gateway(serializer.validated_data["provider"])
        result = gateway.create_intent(
            amount_cents=amount_cents,
            currency=serializer.validated_data["currency"],
            metadata={"order_id": order.id, "user_id": request.user.id},
        )
        order.payment_reference = result["id"]
        order.save(update_fields=["payment_reference"])

        return Response({"order": OrderSerializer(order).data, "payment_intent": result})


class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except ValueError:
            return Response({"detail": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            order = get_object_or_404(Order, payment_reference=payment_intent["id"])
            fulfill_paid_order(order)

        if event["type"] == "payment_intent.payment_failed":
            payment_intent = event["data"]["object"]
            order = get_object_or_404(Order, payment_reference=payment_intent["id"])
            order.payment_status = "failed"
            order.status = "pending"
            order.save(update_fields=["payment_status", "status"])

        return Response({"received": True}, status=status.HTTP_200_OK)
