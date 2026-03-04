from rest_framework import serializers


class CreatePaymentIntentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(required=False)
    shipping_address_id = serializers.IntegerField(required=False)
    billing_address_id = serializers.IntegerField(required=False, allow_null=True)
    provider = serializers.ChoiceField(choices=["stripe"], default="stripe")
    currency = serializers.CharField(default="usd")
