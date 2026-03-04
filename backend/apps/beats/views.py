from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from rest_framework import filters, permissions, viewsets

from .models import Brand, Category, Product, ProductReview
from .permissions import IsAdminOrReadOnly, IsReviewOwnerOrReadOnly
from .serializers import BrandSerializer, CategorySerializer, ProductListSerializer, ProductReviewSerializer, ProductSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True).select_related("parent").prefetch_related("children")
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["parent", "slug"]
    search_fields = ["name", "slug"]


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["slug", "is_active"]
    search_fields = ["name", "slug"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "brand").prefetch_related("images", "variants", "reviews")
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "brand", "is_active", "is_featured"]
    search_fields = ["name", "description", "sku", "brand__name"]
    ordering_fields = ["created_at", "price", "name"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        return ProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_authenticated and self.request.user.role == "admin"):
            qs = qs.filter(is_active=True)
        category_slug = self.request.query_params.get("category_slug")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        brand_slug = self.request.query_params.get("brand_slug")
        if brand_slug:
            qs = qs.filter(brand__slug=brand_slug)
        brand = self.request.query_params.get("brand")
        if brand:
            qs = qs.filter(brand_id=brand)
        min_price = self.request.query_params.get("min_price")
        if min_price:
            qs = qs.filter(Q(discounted_price__gte=min_price) | Q(discounted_price__isnull=True, price__gte=min_price))
        max_price = self.request.query_params.get("max_price")
        if max_price:
            qs = qs.filter(Q(discounted_price__lte=max_price) | Q(discounted_price__isnull=True, price__lte=max_price))
        in_stock = self.request.query_params.get("in_stock")
        if in_stock in ["true", "1", "yes"]:
            qs = qs.filter(stock_quantity__gt=0)
        return qs


class ProductReviewViewSet(viewsets.ModelViewSet):
    queryset = ProductReview.objects.select_related("user", "product")
    serializer_class = ProductReviewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product"]

    def get_permissions(self):
        if self.request.method in ["GET", "HEAD", "OPTIONS"]:
            return [permissions.AllowAny()]
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsReviewOwnerOrReadOnly()]
