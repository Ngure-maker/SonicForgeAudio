from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import IntegrityError, models, transaction
from django.utils.text import slugify

from apps.core.models import TimeStampedModel
from .utils import SKUGenerationError, generate_sku


class Category(TimeStampedModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True, db_index=True)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="children")
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        unique_together = ("parent", "name")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:130] or "category"
            candidate = base
            idx = 2
            while Category.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{idx}"
                idx += 1
            self.slug = candidate
        super().save(*args, **kwargs)


class Brand(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, db_index=True, blank=True)
    logo = models.ImageField(upload_to="brands/logos/", null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:130] or "brand"
            candidate = base
            idx = 2
            while Brand.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{idx}"
                idx += 1
            self.slug = candidate
        super().save(*args, **kwargs)


class Product(TimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discounted_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=80, unique=True, db_index=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="products", null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "created_at"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["brand", "is_active"]),
        ]

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        return self.discounted_price or self.price

    def save(self, *args, **kwargs):
        if self.sku:
            self.sku = self.sku.upper().strip()
            return super().save(*args, **kwargs)

        max_attempts = int(getattr(settings, "SKU_MAX_RETRIES", 5))
        max_attempts = max(max_attempts, 1)
        last_exc = None

        for _ in range(max_attempts):
            self.sku = generate_sku(self)
            try:
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError as exc:
                if "sku" not in str(exc).lower():
                    raise
                last_exc = exc
                self.sku = ""

        raise SKUGenerationError(f"Unable to generate unique product SKU after {max_attempts} attempts.") from last_exc


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/images/")
    alt_text = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "id"]


class ProductVariant(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(max_length=80)
    value = models.CharField(max_length=120)
    sku = models.CharField(max_length=80, unique=True, db_index=True, null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("product", "name", "value")

    def __str__(self):
        return f"{self.product.name} - {self.name}: {self.value}"

    def save(self, *args, **kwargs):
        if self.sku:
            self.sku = self.sku.upper().strip()
            return super().save(*args, **kwargs)

        max_attempts = int(getattr(settings, "SKU_MAX_RETRIES", 5))
        max_attempts = max(max_attempts, 1)
        last_exc = None

        for _ in range(max_attempts):
            self.sku = generate_sku(self.product, variant=self)
            try:
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError as exc:
                if "sku" not in str(exc).lower():
                    raise
                last_exc = exc
                self.sku = ""

        raise SKUGenerationError(f"Unable to generate unique variant SKU after {max_attempts} attempts.") from last_exc


class ProductReview(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_reviews")
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ("product", "user")
        ordering = ["-created_at"]


class InventoryTransaction(TimeStampedModel):
    TRANSACTION_CHOICES = (
        ("order_reserve", "Order Reserve"),
        ("order_release", "Order Release"),
        ("order_confirm", "Order Confirm"),
        ("manual_adjustment", "Manual Adjustment"),
    )

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="inventory_transactions")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True, related_name="inventory_transactions")
    quantity_change = models.IntegerField()
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_CHOICES)
    reference = models.CharField(max_length=120, blank=True)
    note = models.CharField(max_length=255, blank=True)
