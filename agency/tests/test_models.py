import pytest
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from agency.models import (
    LandPlot, Apartment, DetachedHouse, Flat, Room,
    Client, Request, Meeting, Notification, MeetingConfirmationToken
)
from conftest import *


@pytest.mark.django_db
class TestSoftDelete:
    def test_soft_delete(self, land_plot):
        land_plot.delete()
        assert land_plot.is_deleted is True
        assert land_plot.deleted_at is not None
        # Проверяем, что объект исключён из стандартного менеджера
        assert LandPlot.objects.count() == 0
        assert LandPlot.all_objects.filter(is_deleted=True).count() == 1

    def test_restore(self, land_plot):
        land_plot.delete()
        land_plot.restore()
        assert land_plot.is_deleted is False
        assert land_plot.deleted_at is None
        assert LandPlot.objects.count() == 1

    def test_hard_delete(self, land_plot):
        land_plot.delete()
        land_plot.hard_delete()
        assert LandPlot.all_objects.count() == 0


@pytest.mark.django_db
class TestMeetingConfirmationToken:
    def test_token_creation(self, meeting):
        token = MeetingConfirmationToken.objects.create(meeting=meeting)
        assert token.token is not None
        assert token.expires_at > timezone.now()
        assert token.is_valid() is True

    def test_token_expired(self, meeting):
        token = MeetingConfirmationToken.objects.create(meeting=meeting)
        token.expires_at = timezone.now() - timezone.timedelta(days=1)
        token.save()
        assert token.is_valid() is False


@pytest.mark.django_db
class TestNotification:
    def test_notification_creation(self, head_realtor_user):
        notif = Notification.objects.create(
            recipient=head_realtor_user,
            type='test',
            message='Test'
        )
        assert notif.is_read is False
        assert str(notif) == f"Уведомление для {head_realtor_user}: Test"