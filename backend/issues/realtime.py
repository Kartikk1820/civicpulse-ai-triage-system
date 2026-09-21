from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

ISSUES_GROUP = "issues_feed"


def broadcast_issue_event(event, issue_data):
    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        ISSUES_GROUP,
        {"type": "issue.event", "data": {"event": event, "issue": issue_data}},
    )


def push_notification(user_id, payload):
    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        f"notifications_{user_id}",
        {"type": "notification.event", "data": payload},
    )
