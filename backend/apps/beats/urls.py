from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BrandViewSet, CategoryViewSet, ProductReviewViewSet, ProductViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="categories")
router.register("brands", BrandViewSet, basename="brands")
router.register("products", ProductViewSet, basename="products")
router.register("reviews", ProductReviewViewSet, basename="reviews")

urlpatterns = [
    path("", include(router.urls)),
]
