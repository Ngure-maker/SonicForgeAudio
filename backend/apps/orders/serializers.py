from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_label = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "variant", "variant_label", "quantity", "unit_price", "line_total")

    def get_variant_label(self, obj):
        if not obj.variant_id:
            return None
        return f"{obj.variant.name}: {obj.variant.value}"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "invoice_number",
            "total_amount",
            "status",
            "payment_status",
            "payment_reference",
            "items",
            "shipping_address",
            "billing_address",
            "created_at",
        )


class CreateOrderSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField()
    billing_address_id = serializers.IntegerField(required=False, allow_null=True)
