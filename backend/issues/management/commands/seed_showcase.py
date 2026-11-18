"""Seed realistic, good-looking demo data for the Community Feed and admin dashboards.

Generates civic-issue issues across every category, status and priority, spread over
the last ~30 days, each with a category-specific illustration (drawn with Pillow, so
there are no external downloads or licensing concerns), plus upvotes, comments and a
status-history trail.

Idempotent and safe: it only ever touches the demo accounts it owns (see SEED_USERS)
and the issues they report. Real accounts (e.g. the superuser or any human citizen)
are never modified or deleted. Run with:  python manage.py seed_showcase
"""
from __future__ import annotations

import io
import math
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from PIL import Image, ImageDraw, ImageFilter

from issues.models import (
    Category,
    Comment,
    Department,
    Issue,
    IssueImage,
    IssueStatusHistory,
    Upvote,
)

User = get_user_model()

W, H = 1200, 800

# The demo citizens this command owns. Re-running deletes and recreates exactly these.
SEED_USERS = [
    ("aarav_sharma", "Aarav", "Sharma", 85),
    ("priya_verma", "Priya", "Verma", 120),
    ("rohit_mehta", "Rohit", "Mehta", 60),
    ("sana_khan", "Sana", "Khan", 150),
    ("vikram_rao", "Vikram", "Rao", 45),
    ("neha_gupta", "Neha", "Gupta", 95),
    ("arjun_nair", "Arjun", "Nair", 30),
]


# --------------------------------------------------------------------------- #
# Image generation helpers
# --------------------------------------------------------------------------- #
def _hex(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _gradient(top, bottom) -> Image.Image:
    img = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=_lerp(top, bottom, y / H))
    return img


def _vignette(img: Image.Image, strength: float = 0.5) -> Image.Image:
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse(
        [-W * 0.25, -H * 0.25, W * 1.25, H * 1.25], fill=255
    )
    mask = mask.filter(ImageFilter.GaussianBlur(200))
    dark = Image.new("RGB", (W, H), (0, 0, 0))
    return Image.composite(img, Image.blend(img, dark, strength), mask)


def _grain(img: Image.Image, amount: int = 14) -> Image.Image:
    noise = Image.effect_noise((W, H), amount).convert("L")
    return Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.045)


# ----- per-category scenes (draw on an RGBA overlay) ----------------------- #
def _sc_pothole(ov, accent):
    d = ImageDraw.Draw(ov)
    for _ in range(16):
        x = random.randint(0, W)
        d.line([(x, 0), (x + random.randint(-70, 70), H)], fill=(0, 0, 0, 28), width=2)
    d.rectangle([W // 2 - 18, 0, W // 2 + 18, H], fill=(255, 210, 70, 55))
    cx, cy = 600, 440
    pts = []
    for a in range(0, 360, 18):
        r = 180 + random.randint(-35, 45)
        pts.append((cx + r * math.cos(math.radians(a)) * 1.25, cy + r * math.sin(math.radians(a)) * 0.78))
    d.polygon(pts, fill=(14, 14, 18, 255))
    d.line(pts + [pts[0]], fill=(95, 95, 100, 150), width=5)
    d.ellipse([cx - 95, cy - 25, cx + 70, cy + 45], fill=(55, 68, 92, 120))


def _sc_garbage(ov, accent):
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle([470, 330, 730, 700], 26, fill=(68, 118, 80, 255))
    for x in range(502, 724, 40):
        d.line([(x, 352), (x, 686)], fill=(40, 82, 56, 130), width=5)
    d.rounded_rectangle([470, 330, 730, 700], 26, outline=(38, 78, 54, 255), width=6)
    d.polygon([(446, 332), (754, 332), (776, 300), (424, 300)], fill=(54, 100, 68, 255))
    d.rectangle([568, 262, 632, 302], fill=(54, 100, 68, 255))
    cols = [(188, 176, 92), (156, 126, 84), (96, 158, 116), (206, 186, 126), (150, 150, 160)]
    for i in range(9):
        x = random.randint(486, 714)
        y = random.randint(292, 356)
        rr = random.randint(22, 40)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=cols[i % len(cols)] + (255,))


def _sc_streetlight(ov, accent):
    d = ImageDraw.Draw(ov)
    d.rectangle([558, 250, 590, 724], fill=(42, 44, 58, 255))
    d.rectangle([558, 250, 728, 276], fill=(42, 44, 58, 255))
    d.polygon([(694, 272), (764, 272), (748, 322), (708, 322)], fill=(30, 32, 44, 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r, a in [(170, 36), (120, 56), (78, 92), (44, 170)]:
        gd.ellipse([728 - r, 330 - r, 728 + r, 330 + r], fill=(255, 214, 120, a))
    ov.alpha_composite(glow.filter(ImageFilter.GaussianBlur(20)))


def _sc_water(ov, accent):
    d = ImageDraw.Draw(ov)
    d.ellipse([340, 560, 860, 712], fill=(66, 108, 150, 150))
    d.rectangle([290, 356, 910, 420], fill=(70, 74, 88, 255))
    d.rectangle([290, 356, 910, 374], fill=(112, 118, 134, 255))
    d.ellipse([578, 372, 642, 416], fill=(18, 20, 28, 255))
    for i in range(16):
        x = 610 + (i - 7) * 36
        y = 404 + abs(i - 7) * 20 - 70
        rr = 8 + random.randint(0, 7)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(150, 200, 240, 215))
    d.ellipse([560, 596, 700, 660], fill=(150, 200, 240, 120))


def _sc_construction(ov, accent):
    d = ImageDraw.Draw(ov)
    d.rectangle([426, 384, 616, 700], fill=(120, 110, 132, 255))
    d.rectangle([596, 300, 760, 700], fill=(140, 128, 152, 255))
    for bx, by0 in [(446, 414), (616, 330)]:
        for r in range(4):
            for c in range(3):
                d.rectangle([bx + c * 48, by0 + r * 62, bx + c * 48 + 30, by0 + r * 62 + 38], fill=(58, 56, 72, 255))
    y = (230, 200, 70, 255)
    d.line([(760, 118), (760, 700)], fill=y, width=10)
    d.line([(760, 140), (984, 140)], fill=y, width=10)
    d.line([(760, 140), (560, 140)], fill=y, width=8)
    d.line([(930, 142), (930, 232)], fill=(200, 200, 212, 255), width=4)
    d.rectangle([906, 232, 956, 272], fill=(120, 110, 132, 255))
    for i in range(0, W, 84):
        d.polygon([(i, 702), (i + 42, 702), (i + 84, 762), (i + 42, 762)], fill=(230, 200, 70, 220))


def _sc_tree(ov, accent):
    d = ImageDraw.Draw(ov)
    d.rectangle([0, 624, W, H], fill=(58, 70, 54, 255))
    d.line([(296, 652), (720, 420)], fill=(92, 66, 46, 255), width=48)
    for x, yy, r in [(762, 380, 122), (842, 432, 96), (700, 320, 92), (820, 330, 80)]:
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=(58, 110, 70, 255))
    for x, yy, r in [(762, 380, 70), (842, 432, 54), (700, 320, 50)]:
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=(82, 142, 92, 255))
    d.polygon([(276, 662), (320, 640), (342, 702), (266, 712)], fill=(112, 82, 56, 255))


def _sc_sidewalk(ov, accent):
    d = ImageDraw.Draw(ov)
    for r in range(6):
        yy = 300 + r * 70
        for c in range(7):
            x = 118 + c * 140
            d.rectangle([x, yy, x + 130, yy + 60], fill=(150, 150, 158, 255), outline=(108, 108, 118, 255), width=3)
    pts = [(118, 332)]
    x = 118
    while x < 1086:
        x += random.randint(60, 110)
        pts.append((x, 332 + random.randint(-40, 260)))
    d.line(pts, fill=(24, 24, 30, 255), width=9)


def _sc_graffiti(ov, accent):
    d = ImageDraw.Draw(ov)
    d.rectangle([78, 178, 1122, 682], fill=(150, 140, 128, 255), outline=(108, 98, 88, 255), width=6)
    for yy in range(222, 682, 52):
        d.line([(78, yy), (1122, yy)], fill=(120, 110, 98, 120), width=3)
    cols = [(230, 70, 90), (70, 160, 230), (250, 200, 60), (120, 220, 120), (180, 100, 220)]
    for k in range(6):
        col = cols[k % len(cols)]
        x = random.randint(180, 940)
        yy = random.randint(260, 600)
        pts = [(x, yy)]
        for _ in range(6):
            x += random.randint(-70, 92)
            yy += random.randint(-60, 62)
            pts.append((x, yy))
        d.line(pts, fill=col + (255,), width=random.randint(9, 16), joint="curve")
    for _ in range(140):
        x = random.randint(120, 1080)
        yy = random.randint(220, 660)
        rr = random.randint(1, 4)
        d.ellipse([x - rr, yy - rr, x + rr, yy + rr], fill=random.choice(cols) + (90,))


def _sc_animal(ov, accent):
    d = ImageDraw.Draw(ov)
    d.rectangle([0, 560, W, H], fill=(60, 62, 70, 255))
    d.rectangle([W // 2 - 16, 560, W // 2 + 16, H], fill=(230, 210, 90, 120))
    body = (38, 38, 46, 255)
    d.ellipse([430, 360, 780, 560], fill=body)
    d.rectangle([740, 382, 858, 470], fill=body)
    d.ellipse([800, 368, 902, 470], fill=body)
    d.polygon([(882, 378), (918, 348), (902, 396)], fill=body)
    d.polygon([(832, 378), (868, 348), (856, 400)], fill=body)
    for lx in (470, 560, 680, 752):
        d.rectangle([lx, 540, lx + 22, 690], fill=body)
    d.line([(430, 420), (398, 602)], fill=body, width=12)


def _sc_other(ov, accent):
    d = ImageDraw.Draw(ov)
    cx, cy = 600, 430
    d.polygon([(cx, cy - 210), (cx - 230, cy + 180), (cx + 230, cy + 180)], fill=(235, 195, 70, 255))
    d.line(
        [(cx, cy - 210), (cx - 230, cy + 180), (cx + 230, cy + 180), (cx, cy - 210)],
        fill=(40, 35, 20, 255),
        width=10,
        joint="curve",
    )
    d.rectangle([cx - 20, cy - 100, cx + 20, cy + 58], fill=(40, 35, 20, 255))
    d.ellipse([cx - 22, cy + 90, cx + 22, cy + 134], fill=(40, 35, 20, 255))


_SCENES = {
    "Pothole": _sc_pothole,
    "Garbage/Waste": _sc_garbage,
    "Streetlight": _sc_streetlight,
    "Water Leakage": _sc_water,
    "Illegal Construction": _sc_construction,
    "Fallen Tree/Vegetation": _sc_tree,
    "Damaged Road/Sidewalk": _sc_sidewalk,
    "Graffiti/Vandalism": _sc_graffiti,
    "Stray Animal": _sc_animal,
    "Other": _sc_other,
}


def _make_photo(category_name: str, accent_hex: str, seed: int) -> bytes:
    random.seed(seed)
    accent = _hex(accent_hex)
    top = _lerp(accent, (12, 14, 20), 0.60)
    bottom = _lerp(accent, (6, 7, 12), 0.82)
    base = _gradient(top, bottom).convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    _SCENES.get(category_name, _sc_other)(overlay, accent)
    base.alpha_composite(overlay)
    img = _grain(_vignette(base.convert("RGB")))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=86)
    return buf.getvalue()


def _make_resolved_photo(accent_hex: str, seed: int) -> bytes:
    random.seed(seed + 777)
    img = _gradient((22, 74, 48), (12, 40, 26)).convert("RGBA")
    d = ImageDraw.Draw(img)
    cx, cy = 600, 400
    d.ellipse([cx - 160, cy - 160, cx + 160, cy + 160], outline=(120, 220, 150, 255), width=14)
    d.line([(cx - 80, cy + 6), (cx - 18, cy + 72), (cx + 92, cy - 70)], fill=(140, 235, 165, 255), width=24, joint="curve")
    out = _grain(_vignette(img.convert("RGB")))
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=86)
    return buf.getvalue()


# --------------------------------------------------------------------------- #
# Issue blueprints
# --------------------------------------------------------------------------- #
# (title, category, status, priority, address, lat, lng, upvotes, views, days_ago, ai_severity, ai_summary)
ISSUES = [
    ("Large pothole on NH-44 service road", "Pothole", "in_progress", "high",
     "Service Rd, NH-44, Karnal, Haryana", 29.684512, 76.990431, 24, 312, 9, "high",
     "A deep pothole spanning the lane is forcing two-wheelers to swerve into traffic."),
    ("Overflowing garbage bins at Sector 12 market", "Garbage/Waste", "acknowledged", "high",
     "Sector 12 Market, Kurukshetra, Haryana", 29.966217, 76.878334, 16, 188, 6, "medium",
     "Community bins have not been cleared for days; waste is spilling onto the walkway."),
    ("Streetlight out on College Road for a week", "Streetlight", "resolved", "medium",
     "College Rd, Kurukshetra, Haryana", 29.948701, 76.841220, 9, 142, 6, "medium",
     "A long stretch of College Road is unlit at night, raising safety concerns."),
    ("Water pipeline leak flooding the lane", "Water Leakage", "in_progress", "critical",
     "Model Town, Panipat, Haryana", 29.390842, 76.968553, 31, 405, 4, "high",
     "A burst pipeline is wasting water and flooding the residential lane."),
    ("Construction debris dumped on footpath", "Illegal Construction", "reported", "medium",
     "Mahesh Nagar, Ambala, Haryana", 30.372118, 76.782944, 6, 73, 2, "medium",
     "Building material left on the footpath is blocking pedestrians."),
    ("Fallen tree blocking road after the storm", "Fallen Tree/Vegetation", "resolved", "high",
     "Jagadhri Rd, Yamunanagar, Haryana", 30.129446, 77.288391, 38, 512, 15, "high",
     "An uprooted tree has completely blocked the road following heavy winds."),
    ("Cracked, uneven sidewalk near the school", "Damaged Road/Sidewalk", "acknowledged", "medium",
     "Railway Rd, Karnal, Haryana", 29.691034, 76.994218, 12, 161, 8, "medium",
     "Broken paving slabs outside the school gate are a tripping hazard for children."),
    ("Graffiti covering the underpass wall", "Graffiti/Vandalism", "reported", "low",
     "Railway Underpass, Kurukshetra, Haryana", 29.959883, 76.862540, 4, 58, 1, "low",
     "Extensive spray-paint vandalism across the underpass wall."),
    ("Stray cattle on the highway at night", "Stray Animal", "in_progress", "high",
     "GT Rd, Panipat, Haryana", 29.402715, 76.975310, 19, 243, 5, "high",
     "Cattle wandering onto the unlit highway are a serious collision risk."),
    ("Broken manhole cover — open safety hazard", "Pothole", "reported", "critical",
     "Kunjpura Rd, Karnal, Haryana", 29.701220, 77.012884, 27, 276, 3, "high",
     "An uncovered manhole on a busy road poses an immediate danger to vehicles and pedestrians."),
    ("Blocked storm drain causing waterlogging", "Water Leakage", "acknowledged", "medium",
     "Sector 7, Kurukshetra, Haryana", 29.972640, 76.849117, 14, 131, 7, "medium",
     "A choked storm drain is causing standing water after every rain."),
    ("Illegal hoarding blocking traffic signal", "Other", "reported", "medium",
     "Clock Tower Chowk, Ambala, Haryana", 30.378451, 76.776215, 8, 92, 2, "medium",
     "A large unauthorised hoarding is obscuring the traffic signal at a busy junction."),
]

COMMENTS = [
    "Thanks for reporting — I pass this spot every day, it's badly needed.",
    "Same issue here, hope it gets fixed soon.",
    "This has been a problem for weeks now.",
    "Upvoted. Please prioritise this, it's a safety risk.",
    "Any update from the department on this?",
]


class Command(BaseCommand):
    help = "Seeds realistic showcase issues (with generated photos) for the feed and dashboards."

    def handle(self, *args, **options):
        now = timezone.now()

        # 1) Clean out only the demo data this command owns.
        usernames = [u[0] for u in SEED_USERS]
        removed = User.objects.filter(username__in=usernames).count()
        User.objects.filter(username__in=usernames).delete()  # cascades their issues
        self.stdout.write(f"Cleared {removed} previously-seeded demo user(s).")

        # 2) Recreate demo citizens.
        reporters = []
        for username, first, last, points in SEED_USERS:
            user = User.objects.create_user(
                username=username,
                email=f"{username}@example.com",
                password="DemoPass123!",
                first_name=first,
                last_name=last,
            )
            user.role = User.Role.CITIZEN
            user.points = points
            user.save(update_fields=["role", "points"])
            reporters.append(user)

        categories = {c.name: c for c in Category.objects.all()}
        created = 0

        for idx, row in enumerate(ISSUES):
            (title, cat_name, status, priority, address, lat, lng,
             upvotes, views, days_ago, ai_sev, ai_summary) = row
            category = categories.get(cat_name)
            reporter = reporters[idx % len(reporters)]
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 20))

            issue = Issue.objects.create(
                reporter=reporter,
                title=title,
                description=ai_summary,
                category=category,
                status=status,
                priority=priority,
                latitude=round(lat, 6),
                longitude=round(lng, 6),
                address=address,
                ai_category_suggestion=cat_name,
                ai_severity=ai_sev,
                ai_summary=ai_summary,
                ai_processed=True,
                upvote_count=upvotes,
                view_count=views,
            )
            if category and category.default_department and status != "reported":
                issue.assigned_department = category.default_department
                issue.save(update_fields=["assigned_department"])

            # Backdate created/updated (auto_now fields can't be set on create).
            Issue.objects.filter(pk=issue.pk).update(created_at=created_at, updated_at=created_at)

            # Report photo.
            photo = _make_photo(cat_name, category.color if category else "#90A4AE", seed=idx)
            IssueImage.objects.create(
                issue=issue,
                image=ContentFile(photo, name=f"seed_{idx}_{cat_name.split('/')[0].lower().replace(' ', '_')}.jpg"),
                image_type=IssueImage.ImageType.REPORT,
            )

            # Status-history trail matching the lifecycle.
            flow = ["reported", "acknowledged", "in_progress", "resolved"]
            reached = flow[: flow.index(status) + 1] if status in flow else ["reported", status]
            prev = ""
            step_time = created_at
            for st in reached:
                IssueStatusHistory.objects.create(
                    issue=issue, old_status=prev, new_status=st,
                    changed_by=reporter if st == "reported" else None,
                    note="Issue reported" if st == "reported" else f"Status moved to {st}.",
                )
                prev = st

            if status == "resolved":
                # Clamp so recently-created issues still resolve in the past (keeps the
                # "resolved this week" stat and average-resolution-time realistic).
                resolved_at = min(
                    created_at + timedelta(days=random.randint(3, 9)),
                    now - timedelta(hours=random.randint(8, 36)),
                )
                Issue.objects.filter(pk=issue.pk).update(resolved_at=resolved_at)
                after = _make_resolved_photo(category.color if category else "#90A4AE", seed=idx)
                IssueImage.objects.create(
                    issue=issue,
                    image=ContentFile(after, name=f"seed_{idx}_resolved.jpg"),
                    image_type=IssueImage.ImageType.RESOLUTION,
                )

            # A few upvotes (real rows) + comments for engagement.
            for voter in random.sample(reporters, k=min(len(reporters), max(1, upvotes // 6))):
                Upvote.objects.get_or_create(issue=issue, user=voter)
            for voter in random.sample(reporters, k=random.randint(0, 2)):
                if voter != reporter:
                    Comment.objects.create(issue=issue, user=voter, text=random.choice(COMMENTS))

            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(reporters)} demo citizens and {created} showcase issues with photos."
        ))
