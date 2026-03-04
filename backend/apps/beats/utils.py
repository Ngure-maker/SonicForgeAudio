from __future__ import annotations

import re
import secrets
from datetime import datetime

from django.apps import apps
from django.conf import settings
from django.utils import timezone


class SKUGenerationError(RuntimeError):
    """Raised when a unique SKU cannot be generated within max attempts."""


def _sanitize_segment(value: str, length: int, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", (value or "").upper())
    if not cleaned:
        return fallback[:length]
    return cleaned[:length]


def _variant_code(variant) -> str:
    if not variant:
        return "GEN"
    name_part = _sanitize_segment(getattr(variant, "name", ""), 1, "V")
    value_part = _sanitize_segment(getattr(variant, "value", ""), 3, "GEN")
    code = f"{name_part}{value_part}"
    return _sanitize_segment(code, 4, "GEN")


def _next_category_sequence(product) -> int:
    ProductModel = apps.get_model("beats", "Product")
    qs = ProductModel.objects.filter(category_id=product.category_id)
    if getattr(product, "pk", None):
        qs = qs.exclude(pk=product.pk)
    return qs.count() + 1


def generate_sku(product, variant=None) -> str:
    """
    Generate an SKU in the configured format.

    Default format:
    [CATEGORY]-[PRODUCT]-[VARIANT]-[RANDOM]
    """

    category_name = getattr(getattr(product, "category", None), "name", "")
    product_name = getattr(product, "name", "")

    category_code = _sanitize_segment(category_name, 3, "GEN")
    product_code = _sanitize_segment(product_name.replace(" ", ""), 4, "ITEM")
    variant_code = _variant_code(variant)

    random_digits = int(getattr(settings, "SKU_RANDOM_DIGITS", 4))
    random_max = 10 ** max(random_digits, 1)
    random_part = f"{secrets.randbelow(random_max):0{max(random_digits, 1)}d}"

    include_seq = bool(getattr(settings, "SKU_INCLUDE_CATEGORY_SEQUENCE", False))
    include_ts = bool(getattr(settings, "SKU_INCLUDE_TIMESTAMP_SUFFIX", False))

    seq_value = _next_category_sequence(product) if include_seq else ""

    timestamp_format = getattr(settings, "SKU_TIMESTAMP_FORMAT", "%y%m%d")
    now_value: datetime = timezone.now()
    ts_value = now_value.strftime(timestamp_format) if include_ts else ""

    fmt = getattr(settings, "SKU_FORMAT", "{category}-{product}-{variant}-{random}")
    if include_seq and "{seq}" not in fmt:
        fmt = f"{fmt}-{{seq}}"
    if include_ts and "{ts}" not in fmt:
        fmt = f"{fmt}-{{ts}}"

    sku = fmt.format(
        category=category_code,
        product=product_code,
        variant=variant_code,
        random=random_part,
        seq=seq_value,
        ts=ts_value,
    )

    sku = re.sub(r"[^A-Za-z0-9-]", "", sku.upper())
    sku = re.sub(r"-+", "-", sku).strip("-")
    return sku
