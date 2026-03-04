from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminAuditLogViewSet,
    AdminBrandViewSet,
    AdminCategoryViewSet,
    AdminDashboardView,
    AdminExportOrdersCSV,
    AdminExportUsersCSV,
    AdminOrderViewSet,
    AdminPromotionViewSet,
    AdminProductViewSet,
    AdminReportsView,
    AdminUserViewSet,
)

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-users")
router.register("products", AdminProductViewSet, basename="admin-products")
router.register("categories", AdminCategoryViewSet, basename="admin-categories")
router.register("brands", AdminBrandViewSet, basename="admin-brands")
router.register("orders", AdminOrderViewSet, basename="admin-orders")
router.register("promotions", AdminPromotionViewSet, basename="admin-promotions")
router.register("audit-logs", AdminAuditLogViewSet, basename="admin-audit-logs")

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("reports/", AdminReportsView.as_view(), name="admin-reports"),
    path("reports/export/orders/", AdminExportOrdersCSV.as_view(), name="admin-export-orders"),
    path("reports/export/users/", AdminExportUsersCSV.as_view(), name="admin-export-users"),
    path("", include(router.urls)),
]
