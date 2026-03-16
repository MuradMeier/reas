import pytest
from django.core.management import call_command
from django.utils import timezone
from agency.models import Meeting, Notification


@pytest.mark.django_db
class TestSendMeetingReminders:
    def test_reminder_sent(self, meeting, client_obj, realtor_user):
        # Назначаем ответственного риэлтора на заявку
        meeting.request.assigned_to = realtor_user
        meeting.request.save()

        # Устанавливаем время встречи так, чтобы попасть в интервал напоминания
        meeting.datetime = timezone.now() + timezone.timedelta(hours=meeting.reminder_hours - 0.2)
        meeting.save()

        call_command('send_meeting_reminders')
        meeting.refresh_from_db()

        assert meeting.reminder_sent is True
        assert Notification.objects.filter(type='meeting_reminder').exists()