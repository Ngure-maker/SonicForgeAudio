from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HealthCheckView, PromotionPublicViewSet

router = DefaultRouter()
router.register("promotions", PromotionPublicViewSet, basename="promotions")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("", include(router.urls)),
]
