from django.contrib import admin

from .models import Category, Comment, Department, Issue, IssueImage, IssueStatusHistory, Upvote


class IssueImageInline(admin.TabularInline):
    model = IssueImage
    extra = 0


class IssueStatusHistoryInline(admin.TabularInline):
    model = IssueStatusHistory
    extra = 0
    readonly_fields = ("old_status", "new_status", "changed_by", "note", "changed_at")


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "status", "priority", "upvote_count", "created_at")
    list_filter = ("status", "priority", "category", "assigned_department")
    search_fields = ("title", "description", "address")
    inlines = [IssueImageInline, IssueStatusHistoryInline]


admin.site.register(Department)
admin.site.register(Category)
admin.site.register(Comment)
admin.site.register(Upvote)
