import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "civicpulse.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.core.asgi import get_asgi_application  # noqa: E402

import issues.routing  # noqa: E402
import notifications.routing  # noqa: E402
from civicpulse.ws_auth import JWTAuthMiddleware  # noqa: E402

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(
            URLRouter(issues.routing.websocket_urlpatterns + notifications.routing.websocket_urlpatterns)
        ),
    }
)
