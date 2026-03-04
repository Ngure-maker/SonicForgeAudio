from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers

from .models import Address
from .models import WishlistItem

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_suspended", "is_active", "avatar")


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "email", "avatar")


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            "id",
            "address_type",
            "full_name",
            "phone_number",
            "line1",
            "line2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if validated_data.get("is_default"):
            Address.objects.filter(user=user, address_type=validated_data.get("address_type", "shipping")).update(is_default=False)
        return Address.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("is_default"):
            Address.objects.filter(
                user=instance.user,
                address_type=validated_data.get("address_type", instance.address_type),
            ).exclude(id=instance.id).update(is_default=False)
        return super().update(instance, validated_data)


class SuspendUserSerializer(serializers.Serializer):
    is_suspended = serializers.BooleanField()


class WishlistItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    product_stock = serializers.IntegerField(source="product.stock_quantity", read_only=True)

    class Meta:
        model = WishlistItem
        fields = ("id", "product", "product_name", "product_price", "product_image", "product_stock", "created_at")

    def get_product_price(self, obj):
        return str(obj.product.discounted_price or obj.product.price)

    def get_product_image(self, obj):
        image = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
        return image.image.url if image else None


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=uid)
        except Exception as exc:  # noqa: BLE001
            raise serializers.ValidationError({"uid": "Invalid reset uid."}) from exc

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


def build_reset_uid(user):
    return urlsafe_base64_encode(force_bytes(user.pk))
