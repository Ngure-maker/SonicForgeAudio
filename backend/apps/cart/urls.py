from django.urls import path

from .views import AddToCartView, CartView, ClearCartView, RemoveCartItemView, UpdateCartItemView

urlpatterns = [
    path("", CartView.as_view(), name="cart-detail"),
    path("items/", AddToCartView.as_view(), name="cart-add-item"),
    path("items/<int:item_id>/", RemoveCartItemView.as_view(), name="cart-remove-item"),
    path("items/<int:item_id>/update/", UpdateCartItemView.as_view(), name="cart-update-item"),
    path("clear/", ClearCartView.as_view(), name="cart-clear"),
]
