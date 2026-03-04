import csv

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from rest_framework import filters, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.beats.models import Brand, Category, Product, ProductImage
from apps.core.permissions import IsAdmin
from apps.core.serializers import PromotionSerializer
from apps.core.models import Promotion
from apps.orders.models import Order, OrderItem

from .models import AdminAuditLog
from .serializers import (
    AdminUserSerializer,
    BrandAdminSerializer,
    CategoryAdminSerializer,
    CategoryReorderSerializer,
    OrderAdminSerializer,
    OrderStatusSerializer,
    ProductAdminSerializer,
    UserRoleSerializer,
    UserSuspendSerializer,
)
from .services import log_admin_action

User = get_user_model()


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        total_revenue = Order.objects.filter(payment_status="paid").aggregate(total=Sum("total_amount"))["total"] or 0
        total_sales = OrderItem.objects.count()
        low_stock_qs = Product.objects.filter(is_active=True, stock_quantity__lte=5).order_by("stock_quantity", "name")
        monthly = (
            Order.objects.filter(payment_status="paid")
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(revenue=Sum("total_amount"), orders=Count("id"))
            .order_by("month")
        )
        return Response(
            {
                "total_users": User.objects.count(),
                "total_customers": User.objects.filter(role="customer").count(),
                "total_products": Product.objects.count(),
                "total_orders": Order.objects.count(),
                "total_sales": total_sales,
                "total_revenue": str(total_revenue),
                "monthly_performance": list(monthly),
                "low_stock_count": low_stock_qs.count(),
                "low_stock_products": list(low_stock_qs.values("id", "name", "stock_quantity")[:10]),
                "recent_orders": list(
                    Order.objects.select_related("user").values(
                        "id", "invoice_number", "user__username", "total_amount", "status", "payment_status", "created_at"
                    ).order_by("-created_at")[:10]
                ),
            }
        )


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by("-date_joined")
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "email", "role"]

    @action(detail=True, methods=["patch"], url_path="suspend")
    def suspend(self, request, pk=None):
        user = self.get_object()
        serializer = UserSuspendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.is_suspended = serializer.validated_data["is_suspended"]
        user.is_active = not user.is_suspended
        user.save(update_fields=["is_suspended", "is_active"])
        log_admin_action(admin=request.user, action="user_suspend_toggle", target_type="user", target_id=user.id, details=serializer.validated_data, ip_address=_client_ip(request))
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["patch"], url_path="set-role")
    def set_role(self, request, pk=None):
        user = self.get_object()
        serializer = UserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.role = serializer.validated_data["role"]
        user.save(update_fields=["role"])
        log_admin_action(admin=request.user, action="user_role_changed", target_type="user", target_id=user.id, details=serializer.validated_data, ip_address=_client_ip(request))
        return Response(self.get_serializer(user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        log_admin_action(admin=request.user, action="user_deleted", target_type="user", target_id=user.id, ip_address=_client_ip(request))
        return super().destroy(request, *args, **kwargs)


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = ProductAdminSerializer
    queryset = Product.objects.select_related("category", "brand").order_by("-created_at")
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "sku", "description"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @action(detail=True, methods=["patch"], url_path="inventory")
    def inventory(self, request, pk=None):
        product = self.get_object()
        qty = int(request.data.get("stock_quantity", product.stock_quantity))
        if qty < 0:
            return Response({"detail": "stock_quantity must be non-negative"}, status=status.HTTP_400_BAD_REQUEST)
        product.stock_quantity = qty
        product.save(update_fields=["stock_quantity"])
        log_admin_action(admin=request.user, action="inventory_updated", target_type="product", target_id=product.id, details={"stock_quantity": qty}, ip_address=_client_ip(request))
        return Response(self.get_serializer(product).data)

    @action(detail=True, methods=["post"], url_path="images")
    def upload_images(self, request, pk=None):
        product = self.get_object()
        files = request.FILES.getlist("images")
        if not files:
            return Response({"detail": "No images provided."}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        has_primary = product.images.filter(is_primary=True).exists()
        for idx, image_file in enumerate(files):
            ProductImage.objects.create(
                product=product,
                image=image_file,
                alt_text=product.name,
                is_primary=(not has_primary and idx == 0),
            )
            created_count += 1

        log_admin_action(
            admin=request.user,
            action="product_images_uploaded",
            target_type="product",
            target_id=product.id,
            details={"uploaded_count": created_count},
            ip_address=_client_ip(request),
        )
        return Response(self.get_serializer(product).data, status=status.HTTP_201_CREATED)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = CategoryAdminSerializer
    queryset = Category.objects.annotate(products_count=Count("products")).order_by("sort_order", "name")
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "slug"]

    @action(detail=False, methods=["patch"], url_path="reorder")
    def reorder(self, request):
        serializer = CategoryReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["category_ids"]

        categories = {c.id: c for c in Category.objects.filter(id__in=ids)}
        for idx, category_id in enumerate(ids):
            category = categories.get(category_id)
            if category:
                category.sort_order = idx
                category.save(update_fields=["sort_order"])

        log_admin_action(admin=request.user, action="category_reordered", target_type="category", target_id="bulk", details={"category_ids": ids}, ip_address=_client_ip(request))
        return Response({"detail": "Categories reordered."})


class AdminBrandViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = BrandAdminSerializer
    queryset = Brand.objects.all().order_by("name")
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "slug"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class AdminPromotionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = PromotionSerializer
    queryset = Promotion.objects.all().order_by("position", "-created_at")
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def perform_create(self, serializer):
        promotion = serializer.save()
        log_admin_action(
            admin=self.request.user,
            action="promotion_created",
            target_type="promotion",
            target_id=promotion.id,
            details={"title": promotion.title, "target_url": promotion.target_url},
            ip_address=_client_ip(self.request),
        )

    def perform_update(self, serializer):
        promotion = serializer.save()
        log_admin_action(
            admin=self.request.user,
            action="promotion_updated",
            target_type="promotion",
            target_id=promotion.id,
            details={"title": promotion.title, "target_url": promotion.target_url},
            ip_address=_client_ip(self.request),
        )

    def perform_destroy(self, instance):
        log_admin_action(
            admin=self.request.user,
            action="promotion_deleted",
            target_type="promotion",
            target_id=instance.id,
            details={"title": instance.title},
            ip_address=_client_ip(self.request),
        )
        instance.delete()


class AdminOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = OrderAdminSerializer
    queryset = Order.objects.select_related("user").prefetch_related("items__product", "items__variant").order_by("-created_at")
    filter_backends = [filters.SearchFilter]
    search_fields = ["user__username", "invoice_number", "status", "payment_status"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order.status = serializer.validated_data["status"]
        payment_status = serializer.validated_data.get("payment_status")
        if payment_status:
            order.payment_status = payment_status
            order.save(update_fields=["status", "payment_status"])
        else:
            order.save(update_fields=["status"])

        log_admin_action(admin=request.user, action="order_status_updated", target_type="order", target_id=order.id, details=serializer.validated_data, ip_address=_client_ip(request))
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["get"], url_path="items")
    def items(self, request, pk=None):
        order = self.get_object()
        data = [
            {
                "id": item.id,
                "product": item.product.name,
                "variant": f"{item.variant.name}:{item.variant.value}" if item.variant_id else None,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "line_total": str(item.line_total),
            }
            for item in order.items.all()
        ]
        return Response(data)


class AdminReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        revenue_per_month = (
            Order.objects.filter(payment_status="paid")
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(revenue=Sum("total_amount"))
            .order_by("month")
        )

        revenue_per_category = (
            OrderItem.objects.values("product__category__name")
            .annotate(revenue=Sum("line_total"))
            .order_by("-revenue")
        )

        return Response(
            {
                "revenue_per_month": list(revenue_per_month),
                "revenue_per_category": list(revenue_per_category),
            }
        )


class AdminExportOrdersCSV(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="orders_export.csv"'
        writer = csv.writer(response)
        writer.writerow(["Order ID", "Invoice", "User", "Total", "Status", "Payment Status", "Created At"])

        for order in Order.objects.select_related("user").all().order_by("-created_at"):
            writer.writerow([order.id, order.invoice_number, order.user.username, order.total_amount, order.status, order.payment_status, order.created_at.isoformat()])
        return response


class AdminExportUsersCSV(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="users_export.csv"'
        writer = csv.writer(response)
        writer.writerow(["User ID", "Username", "Email", "Role", "Active", "Suspended", "Joined"])

        for user in User.objects.all().order_by("-date_joined"):
            writer.writerow([user.id, user.username, user.email, user.role, user.is_active, user.is_suspended, user.date_joined.isoformat()])
        return response


class AdminAuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = AdminAuditLog.objects.select_related("admin")
    filter_backends = [filters.SearchFilter]
    search_fields = ["action", "target_type", "target_id", "admin__username"]

    def list(self, request, *args, **kwargs):
        data = [
            {
                "id": log.id,
                "admin": log.admin.username if log.admin else None,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in self.get_queryset()[:100]
        ]
        return Response(data)
