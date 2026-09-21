from django.db import connection
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from notifications.models import Notification
from notifications.services import award_badges

from .models import Category, Department, Issue, IssueImage, IssueStatusHistory, Upvote
from .permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from .realtime import broadcast_issue_event, push_notification
from .serializers import (
    CategorySerializer,
    CommentSerializer,
    DepartmentSerializer,
    IssueAdminUpdateSerializer,
    IssueCreateSerializer,
    IssueDetailSerializer,
    IssueListSerializer,
)
from .tasks import classify_issue


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class IssuePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 500


class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.select_related("category", "reporter", "assigned_department").prefetch_related(
        "images", "status_history", "comments", "upvotes"
    )
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdmin]
    pagination_class = IssuePagination
    filterset_fields = ["status", "category", "priority", "assigned_department", "reporter"]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ["created_at", "upvote_count"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return IssueCreateSerializer
        if self.action == "retrieve":
            return IssueDetailSerializer
        if self.action in ("partial_update", "update") and getattr(self.request.user, "role", None) == "admin":
            return IssueAdminUpdateSerializer
        return IssueListSerializer

    def perform_create(self, serializer):
        issue = serializer.save()
        classify_issue.delay(issue.id)
        award_badges(issue.reporter)
        broadcast_issue_event("created", IssueListSerializer(issue, context=self.get_serializer_context()).data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Issue.objects.filter(id=instance.id).update(view_count=instance.view_count + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        issue = serializer.save()

        if "status" in serializer.validated_data and old_status != issue.status:
            if issue.status == Issue.Status.RESOLVED:
                issue.resolved_at = timezone.now()
                issue.save(update_fields=["resolved_at"])

            IssueStatusHistory.objects.create(
                issue=issue,
                old_status=old_status,
                new_status=issue.status,
                changed_by=self.request.user,
                note=self.request.data.get("note", ""),
            )

            message = f'Your issue "{issue.title}" is now {issue.get_status_display()}.'
            notification = Notification.objects.create(user=issue.reporter, issue=issue, message=message)
            push_notification(
                issue.reporter_id,
                {
                    "id": notification.id,
                    "message": message,
                    "issue_id": issue.id,
                    "created_at": str(notification.created_at),
                },
            )

            if issue.reporter.role == "citizen":
                issue.reporter.points += 5
                issue.reporter.save(update_fields=["points"])
                award_badges(issue.reporter)

        detail_data = IssueDetailSerializer(issue, context=self.get_serializer_context()).data
        broadcast_issue_event("status_changed", detail_data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def upvote(self, request, pk=None):
        issue = self.get_object()
        upvote, created = Upvote.objects.get_or_create(issue=issue, user=request.user)
        if not created:
            upvote.delete()
            Issue.objects.filter(id=issue.id).update(upvote_count=max(issue.upvote_count - 1, 0))
            voted = False
        else:
            Issue.objects.filter(id=issue.id).update(upvote_count=issue.upvote_count + 1)
            voted = True
        issue.refresh_from_db()
        broadcast_issue_event("upvoted", IssueListSerializer(issue, context=self.get_serializer_context()).data)
        return Response({"upvoted": voted, "upvote_count": issue.upvote_count})

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        issue = self.get_object()
        if request.method == "GET":
            serializer = CommentSerializer(issue.comments.all(), many=True)
            return Response(serializer.data)

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, issue=issue)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def images(self, request, pk=None):
        issue = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)
        image_type = request.data.get("image_type", IssueImage.ImageType.RESOLUTION)
        img = IssueImage.objects.create(issue=issue, image=image, image_type=image_type)
        return Response(
            {"id": img.id, "image": img.image.url, "image_type": img.image_type}, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"])
    def nearby_duplicates(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response(
                {"detail": "lat and lng query params are required."}, status=status.HTTP_400_BAD_REQUEST
            )

        category_id = request.query_params.get("category")
        radius_m = float(request.query_params.get("radius", 100))

        sql = """
            SELECT id, title, status, latitude, longitude, upvote_count,
                   ST_Distance_Sphere(POINT(longitude, latitude), POINT(%s, %s)) AS distance_m
            FROM issues_issue
            WHERE status NOT IN ('resolved', 'closed', 'rejected')
        """
        params = [lng, lat]
        if category_id:
            sql += " AND category_id = %s"
            params.append(category_id)
        sql += " HAVING distance_m <= %s ORDER BY distance_m ASC LIMIT 5"
        params.append(radius_m)

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(results)
