from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order
from .serializers import CreateOrderSerializer, OrderSerializer
from .services import cancel_order, create_order_from_cart


class OrderHistoryView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product", "items__variant")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product", "items__variant")


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = create_order_from_cart(
            request.user,
            shipping_address_id=serializer.validated_data["shipping_address_id"],
            billing_address_id=serializer.validated_data.get("billing_address_id"),
        )
        return Response(OrderSerializer(order).data)


class CancelOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id: int):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        cancel_order(order)
        return Response(OrderSerializer(order).data)


class InvoiceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id: int):
        order = get_object_or_404(Order.objects.prefetch_related("items__product", "items__variant"), id=order_id, user=request.user)
        lines = [
            f"Invoice: {order.invoice_number}",
            f"Order ID: {order.id}",
            f"Status: {order.status}",
            f"Payment Status: {order.payment_status}",
            "Items:",
        ]
        for item in order.items.all():
            variant = f" ({item.variant.name}:{item.variant.value})" if item.variant_id else ""
            lines.append(f"- {item.product.name}{variant} x{item.quantity} = {item.line_total}")
        lines.append(f"Total: {order.total_amount}")

        response = HttpResponse("\n".join(lines), content_type="text/plain")
        response["Content-Disposition"] = f'attachment; filename="{order.invoice_number}.txt"'
        return response
