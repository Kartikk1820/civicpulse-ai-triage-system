from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .realtime import ISSUES_GROUP


class IssueConsumer(AsyncJsonWebsocketConsumer):
    """Public feed: broadcasts new issues, status changes, upvotes, and AI suggestions."""

    async def connect(self):
        await self.channel_layer.group_add(ISSUES_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(ISSUES_GROUP, self.channel_name)

    async def issue_event(self, event):
        await self.send_json(event["data"])
