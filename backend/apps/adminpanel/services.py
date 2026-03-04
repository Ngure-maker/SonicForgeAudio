from typing import Any

from .models import AdminAuditLog


def log_admin_action(*, admin, action: str, target_type: str, target_id: Any, details: dict | None = None, ip_address: str | None = None):
    AdminAuditLog.objects.create(
        admin=admin,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details or {},
        ip_address=ip_address,
    )
