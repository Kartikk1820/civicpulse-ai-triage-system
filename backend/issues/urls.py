from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, DepartmentViewSet, IssueViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet)
router.register("categories", CategoryViewSet)
router.register("issues", IssueViewSet)

urlpatterns = router.urls
