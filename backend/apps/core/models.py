from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Promotion(TimeStampedModel):
    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=220, blank=True)
    cta_text = models.CharField(max_length=60, default="Shop Now")
    target_url = models.CharField(max_length=255)
    image = models.ImageField(upload_to="promotions/")
    position = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    open_new_tab = models.BooleanField(default=False)

    class Meta:
        ordering = ["position", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "position"]),
            models.Index(fields=["starts_at", "ends_at"]),
        ]

    def __str__(self):
        return self.title

    @property
    def is_currently_active(self):
        now = timezone.now()
        after_start = self.starts_at is None or self.starts_at <= now
        before_end = self.ends_at is None or self.ends_at >= now
        return self.is_active and after_start and before_end
