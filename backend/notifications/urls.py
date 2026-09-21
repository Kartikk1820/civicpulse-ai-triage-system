from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BadgeViewSet, MyBadgesView, NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")
router.register("badges", BadgeViewSet, basename="badge")

urlpatterns = [path("my-badges/", MyBadgesView.as_view(), name="my-badges")] + router.urls
