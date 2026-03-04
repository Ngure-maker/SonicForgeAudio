from rest_framework.throttling import UserRateThrottle


class PaymentRateThrottle(UserRateThrottle):
    scope = "payment"


class DownloadRateThrottle(UserRateThrottle):
    scope = "downloads"
