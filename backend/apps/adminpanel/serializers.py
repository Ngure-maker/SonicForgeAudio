from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.beats.models import Brand, Category, Product
from apps.beats.serializers import ProductImageSerializer
from apps.orders.models import Order

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_active", "is_suspended", "date_joined")


class UserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["customer", "admin"])


class UserSuspendSerializer(serializers.Serializer):
    is_suspended = serializers.BooleanField()


class ProductAdminSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "price",
            "discounted_price",
            "stock_quantity",
            "sku",
            "category",
            "category_name",
            "brand",
            "brand_name",
            "images",
            "is_active",
            "is_featured",
            "created_at",
        )


class CategoryAdminSerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "parent", "sort_order", "is_active", "products_count")
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
        }


class CategoryReorderSerializer(serializers.Serializer):
    category_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class BrandAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "logo", "is_active")
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
        }


class OrderAdminSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "invoice_number",
            "user",
            "user_username",
            "total_amount",
            "status",
            "payment_status",
            "payment_reference",
            "created_at",
        )


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["pending", "paid", "shipped", "delivered", "cancelled"])
    payment_status = serializers.ChoiceField(choices=["pending", "paid", "failed", "refunded"], required=False)
