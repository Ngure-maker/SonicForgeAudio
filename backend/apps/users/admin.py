from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Address, User, WishlistItem


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Commerce", {"fields": ("role", "is_suspended")}),)
    list_display = ("id", "username", "email", "role", "is_suspended", "is_active")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "address_type", "city", "country", "is_default")
    search_fields = ("user__username", "full_name", "city", "country")


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "product", "created_at")
    search_fields = ("user__username", "product__name")
