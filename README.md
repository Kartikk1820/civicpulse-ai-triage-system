# CivicPulse

**Crowdsourced Civic Issue Reporting & Resolution System**
Built for Smart India Hackathon 2026 — Problem Statement **SIH26-31** (Theme: Clean & Green Technology)

> Citizens report civic issues — potholes, garbage, broken streetlights, water leaks — with a photo and a map pin. An AI model looks at the photo and figures out what it is and how urgent it is. Everyone can see reports live on a map, upvote the ones that matter to them, and municipal staff track and resolve them — with citizens getting notified the instant something changes.

---

## Table of Contents

1. [For Everyone — What This Project Actually Does](#for-everyone--what-this-project-actually-does)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [Who Uses It](#who-uses-it)
4. [Features, Explained Simply](#features-explained-simply)
5. [What Makes It Different](#what-makes-it-different)
6. [For Developers — Technical Architecture](#for-developers--technical-architecture)
7. [Tech Stack](#tech-stack)
8. [Data Model](#data-model)
9. [API Overview](#api-overview)
10. [Real-Time & Async Flows](#real-time--async-flows)
11. [Repository Layout](#repository-layout)
12. [Quick Start (Docker)](#quick-start-docker)
13. [Local Development (Without Docker)](#local-development-without-docker)
14. [Security Notes](#security-notes)
15. [Roadmap](#roadmap)

---

## For Everyone — What This Project Actually Does

Imagine you're walking to college and you see a pothole that's been there for weeks, or a streetlight that's been broken since last month. Right now, there's no easy way to report that to the municipal corporation and actually see it get fixed. You might call a helpline, or complain on social media, and it disappears into a void.

**CivicPulse turns that into a 30-second action**: open the app, take a photo, and submit. That's it. Behind the scenes:

- An **AI model looks at your photo** and automatically figures out what kind of problem it is (pothole, garbage, streetlight, etc.) and how severe it looks — so you don't even have to fill out a long form.
- Your report **instantly appears on a live map** that everyone can see — so if ten people are annoyed about the same pothole, they can all add their voice to one report instead of creating ten duplicates.
- **Municipal admins** get a dashboard where they can see everything reported, sort it by urgency, assign it to the right department (Roads, Sanitation, Electrical, etc.), and mark it resolved.
- The moment an admin updates the status, **you get notified instantly** — no refreshing, no waiting.
- The more issues you report, the more **points and badges** you earn — turning civic responsibility into something a little bit fun.

It's like a cross between a maps app, a support-ticket system, and a leaderboard — purpose-built for city problems.

## The Problem We're Solving

Local governments in India receive thousands of civic complaints through scattered, inconsistent channels (phone calls, paper forms, social media posts, WhatsApp forwards). This causes:

- **No visibility** — citizens don't know if their complaint was even received, let alone acted on.
- **Duplicate effort** — the same pothole gets reported five different ways by five different people, with no way to consolidate them.
- **No prioritization** — a minor complaint and a genuinely dangerous hazard look identical in a phone log.
- **No accountability trail** — there's no public record of how long an issue took to resolve, or whether it was resolved at all.

CivicPulse fixes this by making the entire lifecycle of a civic complaint — report → verify → assign → resolve — transparent, trackable, and public.

## Who Uses It

| Role | What they do |
|---|---|
| **Citizen** | Reports issues with photos, browses the live map/feed, upvotes issues that affect them, comments, tracks their own reports, earns points and badges |
| **Municipal Admin** | Views all reported issues on a dashboard with analytics, assigns issues to departments, updates status, uploads "resolved" photos, manages categories/departments |

## Features, Explained Simply

### For citizens
- **Report a problem in under a minute** — photo, pin the location on a map (or auto-detect via GPS), short title, submit.
- **AI does the categorizing for you** — no need to know whether a "broken drain cover" counts as "Roads" or "Sanitation"; the AI suggests it, you can always correct it.
- **See what's already been reported near you** — before you submit, the app checks if someone already reported the same pothole within about 100 metres, and lets you just add your upvote instead of creating a duplicate.
- **Live map and feed** — every new report, every status change, every upvote shows up in real time for everyone browsing, no page refresh needed.
- **Track your own reports** — a personal dashboard shows the full status history: Reported → Acknowledged → In Progress → Resolved.
- **Get notified instantly** — the second an admin changes your issue's status, you get a live notification.
- **Earn points and badges** — Bronze/Silver/Gold recognition for active citizens, with a public leaderboard.
- **Dark mode, works on your phone** — fully responsive, with a mobile-friendly bottom navigation bar.

### For municipal admins
- **One dashboard for everything** — total issues, how many are still open, how many got resolved this week, average resolution time.
- **Visual analytics** — charts showing issues by category, by status, and trends over the last 30 days.
- **Sortable, filterable issues table** — with bulk status updates (select 20 issues, mark them all "Acknowledged" in one click).
- **Assign to the right department** — Roads & Infrastructure, Sanitation, Electrical, Water Supply, Parks & Environment.
- **Upload "after" photos** — show the community proof that an issue was actually fixed.
- **Export to CSV** — for offline reporting or handing data to a supervisor.

## What Makes It Different

- **AI-powered triage** — most civic complaint systems make the citizen manually pick a category and severity. CivicPulse's AI vision model (via Groq) looks at the actual photo and does that automatically, cutting report time roughly in half.
- **Duplicate prevention using real geospatial queries** — not just "same category," but genuine distance-based matching using MySQL's native spatial functions, so effort isn't wasted on issues already in the pipeline.
- **True real-time, not polling** — powered by WebSockets (Django Channels), so the map, feed, and notifications update live, the same way a chat app or stock ticker would — not by refreshing every 30 seconds.
- **Gamification that's tied to real outcomes** — points are awarded when an issue's status actually changes, not just for reporting spam, encouraging citizens to report things that matter.
- **Runs anywhere with one command** — the entire system (frontend, backend, database, cache, background workers) is Dockerized. `docker-compose up` and it's running, with zero paid services required.

---

## For Developers — Technical Architecture

```
                      ┌─────────────────────┐
                      │        Nginx         │  ← single entrypoint, port 80
                      │  (reverse proxy +     │
                      │   static file server)│
                      └─────┬────────┬────────┘
                            │        │
                 /api,/admin│        │/ (everything else)
                            │        │
                     ┌──────▼───┐   ┌▼─────────────────┐
                     │  Django  │   │  Angular (static  │
                     │ (Daphne  │   │  build, served    │
                     │  ASGI)   │   │  directly by nginx)│
                     └────┬─────┘   └───────────────────┘
                          │
              ┌───────────┼────────────┐
              │           │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼────────┐
        │  MySQL 8  │ │  Redis   │ │   Celery    │
        │ (data +   │ │ (Channels│ │   Worker    │
        │  spatial  │ │  layer + │ │ (async AI   │
        │  queries) │ │  broker) │ │  requests)  │
        └───────────┘ └──────────┘ └─────┬───────┘
                                          │
                                    ┌─────▼──────┐
                                    │  Groq API   │
                                    │ (vision LLM)│
                                    └─────────────┘
```

**Request flow for reporting an issue:**
1. Citizen submits the form (title, description, category, lat/lng, photo) via the Angular app.
2. Django creates the `Issue` + `IssueImage` rows and returns `201` **immediately** — the AI call never blocks the HTTP response.
3. A Celery task is queued (via Redis) to send the photo to Groq's vision model.
4. When Groq responds (usually 1–3 seconds), the Celery worker updates the issue's `ai_category_suggestion`, `ai_severity`, and `ai_summary` fields.
5. Django Channels broadcasts that update over a WebSocket to everyone currently viewing the issue — the "AI is analyzing…" shimmer on the frontend resolves into the real suggestion, live, with no refresh.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | **Angular 18** (standalone components) + Angular Material | Type-safe, component-driven, enterprise-grade UI framework |
| Maps | **Leaflet** + OpenStreetMap tiles, `leaflet.markercluster`, `leaflet.heat` | Free, no API key, no usage caps |
| Charts | **ng2-charts** (Chart.js) | Admin dashboard analytics |
| Backend | **Django 4.2** + Django REST Framework | Batteries-included, fast to build a secure REST API |
| Real-time | **Django Channels** (ASGI via Daphne) | Native WebSocket support in the Django ecosystem |
| Async tasks | **Celery** + Redis broker | Keeps the AI API call off the request/response cycle |
| Database | **MySQL 8** | Native spatial functions (`ST_Distance_Sphere`) power duplicate detection without needing PostGIS |
| Cache / broker | **Redis** | Dual-purpose: Channels layer + Celery broker |
| AI | **Groq** (vision-capable LLM) | Extremely fast inference, generous free tier, simple JSON-mode API |
| Geocoding | **Nominatim** (OpenStreetMap) | Free reverse geocoding, no API key |
| Auth | **JWT** (`djangorestframework-simplejwt`) | Stateless, works cleanly with a decoupled SPA frontend |
| Infra | **Docker Compose** + **Nginx** | One command boots the entire stack anywhere, zero host dependencies |

## Data Model

Core entities (see `backend/issues/models.py`, `backend/accounts/models.py`, `backend/notifications/models.py`):

- **User** — extends Django's user model with `role` (citizen/admin), `points`, `avatar`
- **Issue** — the central entity: title, description, category, status, priority, lat/lng, address, AI fields (`ai_category_suggestion`, `ai_severity`, `ai_summary`), upvote/view counts, assigned department/staff
- **IssueImage** — report photos and admin-uploaded resolution photos
- **IssueStatusHistory** — full audit trail of every status change, who made it, and when
- **Comment**, **Upvote** — citizen engagement, with a unique constraint preventing double-upvoting
- **Category**, **Department** — admin-managed taxonomy
- **Notification** — per-user, pushed live via WebSocket
- **Badge**, **UserBadge** — gamification, awarded automatically when a points threshold is crossed

## API Overview

All endpoints are under `/api/`. Full list in `backend/issues/urls.py`, `accounts/urls.py`, `notifications/urls.py`.

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register/`, `/login/`, `/refresh/` | JWT auth |
| `GET/POST /api/issues/` | List (filterable by status/category/priority/reporter) / create issues |
| `GET/PATCH /api/issues/{id}/` | Detail view / admin status updates |
| `POST /api/issues/{id}/upvote/` | Toggle upvote |
| `GET/POST /api/issues/{id}/comments/` | Discussion thread |
| `GET /api/issues/nearby_duplicates/?lat=&lng=&category=` | MySQL spatial query for duplicate detection |
| `GET /api/analytics/summary/`, `/trends/` | Admin dashboard data |
| `GET /api/auth/leaderboard/`, `/api/my-badges/` | Gamification |
| `ws://.../ws/issues/` | Public real-time feed (new issues, status changes, AI suggestions, upvotes) |
| `ws://.../ws/notifications/` | Personal notification channel (JWT-authenticated) |

## Real-Time & Async Flows

- **WebSocket auth**: the notification socket is authenticated via a JWT passed as a `?token=` query param, validated by a custom Channels middleware (`civicpulse/ws_auth.py`).
- **Duplicate detection**: raw SQL using MySQL 8's `ST_Distance_Sphere(POINT(lng, lat), POINT(lng, lat))` to find open issues of the same category within ~100m — genuinely fast, no external geospatial extension needed.
- **Gamification**: `notifications/services.py::award_badges()` runs after every point award and automatically grants any badge whose `points_required` threshold has been crossed.

## Repository Layout

```
civicpulse/
├── backend/                 Django project
│   ├── accounts/            Custom User model, JWT auth, leaderboard
│   ├── issues/               Issue/Category/Department models, API, Channels consumer, Celery task
│   ├── notifications/        Notification/Badge models, API, Channels consumer
│   ├── ai/                   Groq API wrapper (services.py)
│   └── civicpulse/           Django settings, ASGI/WSGI, Celery app, URL routing
├── frontend/                 Angular app
│   └── src/app/
│       ├── core/              Services, guards, interceptors, models
│       ├── shared/            Reusable components (map-picker, issue-card, navbar, ...)
│       └── features/          citizen/ (feed, map, report wizard, ...) and admin/ (dashboard, issues table, ...)
├── nginx/                     Reverse proxy config
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start (Docker)

Requires only **Docker** and **Docker Compose** — no Node, Python, or MySQL needs to be installed on your machine.

```bash
cd civicpulse
cp .env.example .env      # edit GROQ_API_KEY later when you have one
docker-compose up --build
```

- App: **http://localhost**
- Django admin: **http://localhost/admin** — seeded superuser `admin` / `ChangeMe123!` (change this before any real deployment)

The app works fully without a Groq key — AI classification just falls back to "Uncategorized" until you add one. Get a free key at https://console.groq.com, put it in `.env` as `GROQ_API_KEY=...`, then `docker-compose restart backend celery_worker`.

## Local Development (Without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## Security Notes

- Change the seeded admin password (`ChangeMe123!`) before any real-world deployment.
- `.env` is git-ignored — never commit real secrets (`GROQ_API_KEY`, `DJANGO_SECRET_KEY`, DB passwords).
- The backend container runs as a non-root user inside Docker.
- JWTs are never sent to third-party APIs (Nominatim) — the Angular HTTP interceptor scopes the Authorization header to same-origin `/api` requests only.

## Roadmap

- SMS/email notifications alongside in-app ones
- Department-level staff accounts (currently department assignment is admin-only)
- Public API rate limiting
- Multi-language support for report descriptions
- PWA support for offline report drafting
