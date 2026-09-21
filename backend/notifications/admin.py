from django.contrib import admin

from .models import Badge, Notification, UserBadge

admin.site.register(Notification)
admin.site.register(Badge)
admin.site.register(UserBadge)
