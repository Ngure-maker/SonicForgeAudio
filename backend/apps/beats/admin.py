from django.contrib import admin

from .models import Brand, Category, InventoryTransaction, Product, ProductImage, ProductReview, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "sku", "category", "brand", "price", "discounted_price", "stock_quantity", "is_active")
    list_filter = ("category", "brand", "is_active", "is_featured")
    search_fields = ("name", "sku")
    inlines = [ProductImageInline, ProductVariantInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "parent", "sort_order", "is_active")
    search_fields = ("name", "slug")


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "is_active")
    search_fields = ("name", "slug")


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "rating", "created_at")


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "variant", "quantity_change", "transaction_type", "created_at")
