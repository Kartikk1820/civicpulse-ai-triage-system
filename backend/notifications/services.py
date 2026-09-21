from .models import Badge, UserBadge


def award_badges(user):
    """Grants any badge the user newly qualifies for based on their current points."""
    earned_ids = set(UserBadge.objects.filter(user=user).values_list("badge_id", flat=True))
    newly_earned = []
    for badge in Badge.objects.filter(points_required__lte=user.points).exclude(id__in=earned_ids):
        UserBadge.objects.create(user=user, badge=badge)
        newly_earned.append(badge)
    return newly_earned
