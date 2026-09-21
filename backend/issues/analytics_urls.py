from django.urls import path

from .analytics_views import summary, trends

urlpatterns = [
    path("summary/", summary, name="analytics-summary"),
    path("trends/", trends, name="analytics-trends"),
]
