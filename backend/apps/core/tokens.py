from django.conf import settings
from django.core import signing


def generate_download_token(payload: dict) -> str:
    return signing.dumps(payload, salt="download-token")


def verify_download_token(token: str) -> dict:
    return signing.loads(
        token,
        salt="download-token",
        max_age=settings.DOWNLOAD_TOKEN_TTL_SECONDS,
    )
