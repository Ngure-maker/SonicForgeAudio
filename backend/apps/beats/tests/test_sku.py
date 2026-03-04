from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.beats.models import Brand, Category, Product, ProductVariant
from apps.beats.utils import SKUGenerationError, generate_sku


class SKUGenerationTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Electronics", slug="electronics")
        self.brand = Brand.objects.create(name="Pioneer")

    def test_generate_sku_default_format(self):
        product = Product(
            name="Laptop Pro",
            category=self.category,
            brand=self.brand,
            price="1200.00",
            stock_quantity=5,
        )
        sku = generate_sku(product)
        self.assertRegex(sku, r"^ELE-LAPT-GEN-\d{4}$")

    def test_product_sku_auto_generated_on_create(self):
        product = Product.objects.create(
            name="Table Lamp",
            category=self.category,
            brand=self.brand,
            price="49.99",
            stock_quantity=10,
        )
        self.assertTrue(product.sku)
        self.assertEqual(product.sku, product.sku.upper())

    def test_variant_sku_auto_generated_when_missing(self):
        product = Product.objects.create(
            name="Shirt",
            category=self.category,
            brand=self.brand,
            price="29.99",
            stock_quantity=20,
        )
        variant = ProductVariant.objects.create(
            product=product,
            name="Size",
            value="XL",
            stock_quantity=5,
            is_active=True,
        )
        self.assertTrue(variant.sku)
        self.assertIn("ELE-SHIR", variant.sku)

    def test_sku_does_not_change_after_name_update(self):
        product = Product.objects.create(
            name="Gaming Console",
            category=self.category,
            brand=self.brand,
            price="399.99",
            stock_quantity=7,
        )
        original_sku = product.sku
        product.name = "Renamed Console"
        product.save()
        product.refresh_from_db()
        self.assertEqual(product.sku, original_sku)

    def test_collision_retries_and_succeeds(self):
        product_1 = Product.objects.create(
            name="Phone",
            category=self.category,
            brand=self.brand,
            price="199.99",
            stock_quantity=4,
            sku="ELE-PHON-GEN-1111",
        )
        self.assertEqual(product_1.sku, "ELE-PHON-GEN-1111")

        product_2 = Product(
            name="Phone",
            category=self.category,
            brand=self.brand,
            price="209.99",
            stock_quantity=2,
        )

        with patch("apps.beats.models.generate_sku", side_effect=["ELE-PHON-GEN-1111", "ELE-PHON-GEN-2222"]):
            product_2.save()

        self.assertEqual(product_2.sku, "ELE-PHON-GEN-2222")

    @override_settings(SKU_MAX_RETRIES=5)
    def test_max_retries_raises_exception(self):
        Product.objects.create(
            name="Headset",
            category=self.category,
            brand=self.brand,
            price="89.99",
            stock_quantity=6,
            sku="ELE-HEAD-GEN-9999",
        )

        failing_product = Product(
            name="Headset",
            category=self.category,
            brand=self.brand,
            price="99.99",
            stock_quantity=6,
        )

        with patch("apps.beats.models.generate_sku", return_value="ELE-HEAD-GEN-9999"):
            with self.assertRaises(SKUGenerationError):
                failing_product.save()

    @override_settings(SKU_INCLUDE_CATEGORY_SEQUENCE=True, SKU_INCLUDE_TIMESTAMP_SUFFIX=True, SKU_TIMESTAMP_FORMAT="%Y%m%d")
    def test_optional_seq_and_timestamp_settings(self):
        product = Product(
            name="Coffee Maker",
            category=self.category,
            brand=self.brand,
            price="149.99",
            stock_quantity=8,
        )
        sku = generate_sku(product)
        self.assertRegex(sku, r"^ELE-COFF-GEN-\d{4}-\d+-\d{8}$")
