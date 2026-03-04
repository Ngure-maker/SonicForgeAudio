from django.utils import timezone
from rest_framework import serializers

from .models import Promotion


class PromotionSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = (
            "id",
            "title",
            "subtitle",
            "cta_text",
            "target_url",
            "image",
            "image_url",
            "position",
            "is_active",
            "starts_at",
            "ends_at",
            "open_new_tab",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None

    def validate(self, attrs):
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and ends_at and starts_at > ends_at:
            raise serializers.ValidationError({"ends_at": "ends_at must be later than starts_at."})
        return attrs


class PromotionPublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = ("id", "title", "subtitle", "cta_text", "target_url", "image_url", "open_new_tab")

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None


class PromotionQuerySerializer(serializers.Serializer):
    now = serializers.DateTimeField(required=False)

    def validated_now(self):
        return self.validated_data.get("now") or timezone.now()
