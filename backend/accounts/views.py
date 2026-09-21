from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def leaderboard(request):
    top_users = User.objects.filter(role=User.Role.CITIZEN).order_by("-points")[:20]
    data = [
        {"id": u.id, "username": u.username, "points": u.points, "avatar": u.avatar.url if u.avatar else None}
        for u in top_users
    ]
    return Response(data)
