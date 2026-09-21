from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from issues.models import Category, Department
from notifications.models import Badge

User = get_user_model()

DEPARTMENTS = [
    ("Roads & Infrastructure", "roads@civicpulse.local"),
    ("Sanitation", "sanitation@civicpulse.local"),
    ("Electrical", "electrical@civicpulse.local"),
    ("Water Supply", "water@civicpulse.local"),
    ("Parks & Environment", "parks@civicpulse.local"),
]

CATEGORIES = [
    ("Pothole", "warning", "#E57373", "Roads & Infrastructure"),
    ("Garbage/Waste", "delete", "#81C784", "Sanitation"),
    ("Streetlight", "lightbulb", "#FFD54F", "Electrical"),
    ("Water Leakage", "water_drop", "#64B5F6", "Water Supply"),
    ("Illegal Construction", "domain", "#BA68C8", "Roads & Infrastructure"),
    ("Fallen Tree/Vegetation", "park", "#4DB6AC", "Parks & Environment"),
    ("Damaged Road/Sidewalk", "construction", "#F06292", "Roads & Infrastructure"),
    ("Graffiti/Vandalism", "brush", "#A1887F", "Sanitation"),
    ("Stray Animal", "pets", "#FF8A65", "Sanitation"),
    ("Other", "report_problem", "#90A4AE", None),
]

BADGES = [
    ("First Report", "Submitted your first civic issue", "flag", "bronze", 0),
    ("Active Citizen", "Earned 50 points", "star", "silver", 50),
    ("Civic Champion", "Earned 200 points", "military_tech", "gold", 200),
]


class Command(BaseCommand):
    help = "Seeds departments, categories, badges, and a default admin account for local/demo use."

    def handle(self, *args, **options):
        dept_map = {}
        for name, email in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(name=name, defaults={"contact_email": email})
            dept_map[name] = dept
        self.stdout.write(self.style.SUCCESS(f"Departments ready ({len(dept_map)})"))

        for name, icon, color, dept_name in CATEGORIES:
            Category.objects.get_or_create(
                name=name,
                defaults={
                    "icon": icon,
                    "color": color,
                    "default_department": dept_map.get(dept_name) if dept_name else None,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Categories ready ({len(CATEGORIES)})"))

        for name, description, icon, tier, points in BADGES:
            Badge.objects.get_or_create(
                name=name, defaults={"description": description, "icon": icon, "tier": tier, "points_required": points}
            )
        self.stdout.write(self.style.SUCCESS(f"Badges ready ({len(BADGES)})"))

        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin", email="admin@civicpulse.local", password="ChangeMe123!", role=User.Role.ADMIN
            )
            self.stdout.write(self.style.SUCCESS("Created default admin user (admin / ChangeMe123!)"))
        else:
            self.stdout.write("Admin user already exists, skipping.")
