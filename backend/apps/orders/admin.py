from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "invoice_number", "user", "total_amount", "status", "payment_status", "created_at")
    list_filter = ("status", "payment_status")
    inlines = [OrderItemInline]
