from celery import shared_task

from ai.services import classify_issue_image

from .realtime import broadcast_issue_event


@shared_task
def classify_issue(issue_id):
    from .models import Issue  # local import avoids app-loading order issues
    from .serializers import IssueDetailSerializer

    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return

    first_image = issue.images.first()
    if not first_image:
        return

    result = classify_issue_image(first_image.image.path, issue.description)

    issue.ai_severity = result["severity"].lower()
    issue.ai_summary = result["summary"]
    issue.ai_processed = result["ai_processed"]
    issue.ai_category_suggestion = result["category"]
    issue.save(update_fields=["ai_severity", "ai_summary", "ai_processed", "ai_category_suggestion"])

    serialized = IssueDetailSerializer(issue, context={"request": None}).data
    broadcast_issue_event("ai_suggestion", serialized)
