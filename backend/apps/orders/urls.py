from django.urls import path

from .views import CancelOrderView, CreateOrderView, InvoiceView, OrderDetailView, OrderHistoryView

urlpatterns = [
    path("", OrderHistoryView.as_view(), name="orders-history"),
    path("create/", CreateOrderView.as_view(), name="orders-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="orders-detail"),
    path("<int:order_id>/cancel/", CancelOrderView.as_view(), name="orders-cancel"),
    path("<int:order_id>/invoice/", InvoiceView.as_view(), name="orders-invoice"),
]
