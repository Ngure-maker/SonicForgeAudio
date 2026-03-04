from django.contrib import admin

from .models import AdminAuditLog


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "admin", "action", "target_type", "target_id", "created_at")
    list_filter = ("action", "target_type")
    search_fields = ("admin__username", "target_id")
