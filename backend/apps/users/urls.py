from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AddressViewSet,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshView,
    RegisterView,
    SuspendUserView,
    UserListView,
    WishlistView,
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="addresses")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="token-refresh"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/", MeView.as_view(), name="me"),
    path("users/", UserListView.as_view(), name="users-list"),
    path("users/<int:user_id>/suspend/", SuspendUserView.as_view(), name="users-suspend"),
    path("wishlist/", WishlistView.as_view(), name="wishlist"),
    path("wishlist/<int:product_id>/", WishlistView.as_view(), name="wishlist-remove"),
    path("", include(router.urls)),
]
