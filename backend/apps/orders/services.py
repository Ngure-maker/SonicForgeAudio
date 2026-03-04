from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.beats.models import InventoryTransaction
from apps.cart.models import Cart
from apps.orders.models import Order, OrderItem
from apps.users.models import Address


@transaction.atomic
def create_order_from_cart(user, shipping_address_id: int, billing_address_id: int | None = None) -> Order:
    cart, _ = Cart.objects.select_for_update().get_or_create(user=user)
    items = list(cart.items.select_related("product", "variant"))
    if not items:
        raise ValueError("Cart is empty.")

    shipping_address = Address.objects.filter(id=shipping_address_id, user=user).first()
    if not shipping_address:
        raise ValueError("Shipping address not found.")
    billing_address = Address.objects.filter(id=billing_address_id, user=user).first() if billing_address_id else None

    total = Decimal("0.00")
    invoice_number = f"INV-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"

    order = Order.objects.create(
        user=user,
        shipping_address=shipping_address,
        billing_address=billing_address,
        shipping_address_snapshot=_address_to_text(shipping_address),
        billing_address_snapshot=_address_to_text(billing_address) if billing_address else "",
        total_amount=0,
        invoice_number=invoice_number,
    )

    for item in items:
        product = item.product
        variant = item.variant
        qty = item.quantity

        if variant:
            variant = type(variant).objects.select_for_update().get(id=variant.id)
            if variant.stock_quantity < qty:
                raise ValueError(f"Insufficient stock for variant {variant.name}:{variant.value}.")
            unit_price = variant.price if variant.price is not None else (product.discounted_price or product.price)
            variant.stock_quantity -= qty
            variant.save(update_fields=["stock_quantity"])
            InventoryTransaction.objects.create(
                product=product,
                variant=variant,
                quantity_change=-qty,
                transaction_type="order_reserve",
                reference=str(order.id),
            )
        else:
            product = type(product).objects.select_for_update().get(id=product.id)
            if product.stock_quantity < qty:
                raise ValueError(f"Insufficient stock for product {product.name}.")
            unit_price = product.discounted_price or product.price
            product.stock_quantity -= qty
            product.save(update_fields=["stock_quantity"])
            InventoryTransaction.objects.create(
                product=product,
                quantity_change=-qty,
                transaction_type="order_reserve",
                reference=str(order.id),
            )

        line_total = unit_price * qty
        total += line_total
        OrderItem.objects.create(
            order=order,
            product=item.product,
            variant=item.variant,
            quantity=qty,
            unit_price=unit_price,
            line_total=line_total,
        )

    order.total_amount = total
    order.save(update_fields=["total_amount"])
    return order


@transaction.atomic
def fulfill_paid_order(order: Order) -> None:
    if order.payment_status == "paid":
        return
    order.payment_status = "paid"
    order.status = "paid"
    order.save(update_fields=["payment_status", "status"])


@transaction.atomic
def cancel_order(order: Order) -> None:
    if order.status == "cancelled":
        return
    for item in order.items.select_related("product", "variant"):
        if item.variant_id:
            item.variant.stock_quantity += item.quantity
            item.variant.save(update_fields=["stock_quantity"])
            InventoryTransaction.objects.create(
                product=item.product,
                variant=item.variant,
                quantity_change=item.quantity,
                transaction_type="order_release",
                reference=str(order.id),
            )
        else:
            item.product.stock_quantity += item.quantity
            item.product.save(update_fields=["stock_quantity"])
            InventoryTransaction.objects.create(
                product=item.product,
                quantity_change=item.quantity,
                transaction_type="order_release",
                reference=str(order.id),
            )

    order.status = "cancelled"
    order.save(update_fields=["status"])


def _address_to_text(address: Address | None) -> str:
    if not address:
        return ""
    return f"{address.full_name}, {address.phone_number}, {address.line1}, {address.line2}, {address.city}, {address.state}, {address.postal_code}, {address.country}"
