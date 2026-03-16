# permissions.py (переименована)
from rest_framework.permissions import BasePermission

class IsHeadRealtor(BasePermission):
    """
    Разрешение только для главного риэлтора (проверяем группу или флаг).
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name='Главный риэлтор').exists()

class IsRealtor(BasePermission):
    """
    Разрешение для любого риэлтора (включая главного).
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.groups.filter(name='Риэлтор').exists() or
            request.user.groups.filter(name='Главный риэлтор').exists()
        )

class CanViewTrash(BasePermission):
    """
    Доступ к корзине только для главного.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name='Главный риэлтор').exists()