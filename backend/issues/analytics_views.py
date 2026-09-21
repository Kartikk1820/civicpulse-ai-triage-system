from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Issue
from .permissions import IsAdminRole


@api_view(["GET"])
@permission_classes([IsAdminRole])
def summary(request):
    total = Issue.objects.count()
    open_count = Issue.objects.exclude(status__in=["resolved", "closed", "rejected"]).count()
    resolved_this_week = Issue.objects.filter(
        status="resolved", resolved_at__gte=timezone.now() - timedelta(days=7)
    ).count()

    resolved_qs = Issue.objects.filter(status="resolved", resolved_at__isnull=False)
    avg_seconds = None
    if resolved_qs.exists():
        deltas = [(i.resolved_at - i.created_at).total_seconds() for i in resolved_qs]
        avg_seconds = sum(deltas) / len(deltas)

    by_category = list(Issue.objects.values("category__name").annotate(count=Count("id")).order_by("-count"))
    by_status = list(Issue.objects.values("status").annotate(count=Count("id")))

    return Response(
        {
            "total": total,
            "open": open_count,
            "resolved_this_week": resolved_this_week,
            "avg_resolution_hours": round(avg_seconds / 3600, 1) if avg_seconds else None,
            "by_category": by_category,
            "by_status": by_status,
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminRole])
def trends(request):
    days = int(request.query_params.get("days", 30))
    since = timezone.now() - timedelta(days=days)
    data = (
        Issue.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    return Response(list(data))
