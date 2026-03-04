from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class AdminAuditLog(TimeStampedModel):
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="admin_actions")
    action = models.CharField(max_length=120)
    target_type = models.CharField(max_length=60)
    target_id = models.CharField(max_length=60)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} -> {self.target_type}:{self.target_id}"
