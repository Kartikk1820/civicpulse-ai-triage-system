from rest_framework import serializers

from .models import (
    Category,
    Comment,
    Department,
    Issue,
    IssueImage,
    IssueStatusHistory,
)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "contact_email"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon", "color", "default_department"]


class IssueImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueImage
        fields = ["id", "image", "image_type", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class IssueStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.username", read_only=True, default=None)

    class Meta:
        model = IssueStatusHistory
        fields = ["id", "old_status", "new_status", "changed_by_name", "note", "changed_at"]


class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "user", "user_name", "text", "created_at"]
        read_only_fields = ["user", "created_at"]


class IssueListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    category_color = serializers.CharField(source="category.color", read_only=True, default=None)
    reporter_name = serializers.CharField(source="reporter.username", read_only=True)
    thumbnail = serializers.SerializerMethodField()
    has_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id",
            "title",
            "category",
            "category_name",
            "category_color",
            "status",
            "priority",
            "latitude",
            "longitude",
            "address",
            "ai_severity",
            "upvote_count",
            "view_count",
            "reporter_name",
            "thumbnail",
            "has_upvoted",
            "created_at",
        ]

    def get_thumbnail(self, obj):
        first_image = obj.images.first()
        if not first_image:
            return None
        request = self.context.get("request")
        url = first_image.image.url
        return request.build_absolute_uri(url) if request else url

    def get_has_upvoted(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request.user, "is_authenticated", False):
            return False
        return obj.upvotes.filter(user=request.user).exists()


class IssueDetailSerializer(IssueListSerializer):
    images = IssueImageSerializer(many=True, read_only=True)
    status_history = IssueStatusHistorySerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    assigned_department_name = serializers.CharField(
        source="assigned_department.name", read_only=True, default=None
    )

    class Meta(IssueListSerializer.Meta):
        fields = IssueListSerializer.Meta.fields + [
            "description",
            "ai_category_suggestion",
            "ai_summary",
            "ai_processed",
            "assigned_department",
            "assigned_department_name",
            "assigned_staff",
            "images",
            "status_history",
            "comments",
            "updated_at",
            "resolved_at",
        ]


class IssueCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(child=serializers.ImageField(), write_only=True, required=False)

    class Meta:
        model = Issue
        fields = ["id", "title", "description", "category", "latitude", "longitude", "address", "images"]

    def to_internal_value(self, data):
        # Leaflet reports coordinates as full-precision floats (e.g. 29.83682060941784),
        # but latitude/longitude are DecimalField(max_digits=9, decimal_places=6). Round to
        # the column's 6-decimal precision (~0.11m) so high-precision map pins don't 400.
        if hasattr(data, "copy"):
            data = data.copy()
            for key in ("latitude", "longitude"):
                value = data.get(key)
                if value not in (None, ""):
                    try:
                        data[key] = f"{float(value):.6f}"
                    except (TypeError, ValueError):
                        pass
        return super().to_internal_value(data)

    def create(self, validated_data):
        images = validated_data.pop("images", [])
        request = self.context["request"]
        issue = Issue.objects.create(reporter=request.user, **validated_data)
        for img in images:
            IssueImage.objects.create(issue=issue, image=img, image_type=IssueImage.ImageType.REPORT)
        IssueStatusHistory.objects.create(
            issue=issue,
            old_status="",
            new_status=Issue.Status.REPORTED,
            changed_by=request.user,
            note="Issue reported",
        )
        return issue


class IssueAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ["status", "priority", "assigned_department", "assigned_staff"]
