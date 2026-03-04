from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.permissions import IsAdmin
from apps.beats.models import Product

from .models import Address, WishlistItem
from .serializers import (
    AddressSerializer,
    RegisterSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    SuspendUserSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
    WishlistItemSerializer,
    build_reset_uid,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


class SuspendUserView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request, user_id: int):
        user = generics.get_object_or_404(User, id=user_id)
        serializer = SuspendUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.is_suspended = serializer.validated_data["is_suspended"]
        user.is_active = not user.is_suspended
        user.save(update_fields=["is_suspended", "is_active"])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        response_payload = {"detail": "If that email exists, a reset link has been generated."}
        if user:
            uid = build_reset_uid(user)
            token = default_token_generator.make_token(user)
            if settings.DEBUG:
                response_payload["reset_preview"] = {
                    "uid": uid,
                    "token": token,
                    "link": f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}",
                }
        return Response(response_payload, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class WishlistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = WishlistItem.objects.filter(user=request.user).select_related("product")
        return Response(WishlistItemSerializer(items, many=True).data)

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        product = get_object_or_404(Product, id=product_id, is_active=True)
        item, _ = WishlistItem.objects.get_or_create(user=request.user, product=product)
        return Response(WishlistItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def delete(self, request, product_id: int):
        item = get_object_or_404(WishlistItem, user=request.user, product_id=product_id)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
