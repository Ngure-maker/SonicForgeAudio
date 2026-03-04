from django.db.models import Avg
from rest_framework import serializers

from .models import Brand, Category, Product, ProductImage, ProductReview, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "parent", "sort_order", "is_active", "products_count", "children")

    def get_children(self, obj):
        return CategorySerializer(obj.children.filter(is_active=True), many=True).data

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class BrandSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "logo", "is_active", "products_count")

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "is_primary")


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ("id", "name", "value", "sku", "price", "stock_quantity", "is_active")


class ProductReviewSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ProductReview
        fields = ("id", "product", "user", "user_username", "rating", "comment", "created_at")
        read_only_fields = ("id", "user", "created_at")

    def create(self, validated_data):
        return ProductReview.objects.create(user=self.context["request"].user, **validated_data)


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, required=False)
    variants = ProductVariantSerializer(many=True, required=False)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()

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
            "brand",
            "is_active",
            "is_featured",
            "images",
            "variants",
            "reviews",
            "average_rating",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_average_rating(self, obj):
        rating = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(float(rating), 2) if rating else None

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        discounted = attrs.get("discounted_price", getattr(self.instance, "discounted_price", None))
        if discounted is not None and price is not None and discounted > price:
            raise serializers.ValidationError({"discounted_price": "discounted_price cannot exceed price."})
        return attrs

    def create(self, validated_data):
        images_data = validated_data.pop("images", [])
        variants_data = validated_data.pop("variants", [])
        product = Product.objects.create(**validated_data)
        for image_data in images_data:
            ProductImage.objects.create(product=product, **image_data)
        for variant_data in variants_data:
            ProductVariant.objects.create(product=product, **variant_data)
        return product

    def update(self, instance, validated_data):
        images_data = validated_data.pop("images", None)
        variants_data = validated_data.pop("variants", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if images_data is not None:
            instance.images.all().delete()
            for image_data in images_data:
                ProductImage.objects.create(product=instance, **image_data)

        if variants_data is not None:
            instance.variants.all().delete()
            for variant_data in variants_data:
                ProductVariant.objects.create(product=instance, **variant_data)

        return instance


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    brand_slug = serializers.CharField(source="brand.slug", read_only=True)
    primary_image = serializers.SerializerMethodField()

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
            "brand_slug",
            "primary_image",
            "is_active",
            "created_at",
        )

    def get_primary_image(self, obj):
        image = obj.images.filter(is_primary=True).first() or obj.images.first()
        return image.image.url if image else None
