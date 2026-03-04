from django.urls import path

from .views import CreatePaymentIntentView, StripeWebhookView

urlpatterns = [
    path("intent/", CreatePaymentIntentView.as_view(), name="payments-intent"),
    path("stripe/webhook/", StripeWebhookView.as_view(), name="payments-stripe-webhook"),
]
