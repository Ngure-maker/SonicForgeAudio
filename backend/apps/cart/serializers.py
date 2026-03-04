from decimal import Decimal

from rest_framework import serializers

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_label = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product",
            "product_name",
            "variant",
            "variant_label",
            "product_image",
            "quantity",
            "unit_price",
            "line_total",
        )

    def get_variant_label(self, obj):
        if not obj.variant_id:
            return None
        return f"{obj.variant.name}: {obj.variant.value}"

    def get_unit_price(self, obj):
        if obj.variant_id and obj.variant.price is not None:
            return str(obj.variant.price)
        return str(obj.product.discounted_price or obj.product.price)

    def get_line_total(self, obj):
        unit = Decimal(self.get_unit_price(obj))
        return str(unit * obj.quantity)

    def get_product_image(self, obj):
        image = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
        return image.image.url if image else None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "total")

    def get_total(self, obj):
        total = Decimal("0.00")
        for item in obj.items.select_related("product", "variant"):
            unit = item.variant.price if item.variant_id and item.variant.price is not None else (item.product.discounted_price or item.product.price)
            total += unit * item.quantity
        return str(total)


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
