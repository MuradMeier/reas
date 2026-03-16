import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from agency.models import LandPlot, Request, Meeting, MeetingConfirmationToken
from conftest import *


@pytest.mark.django_db
class TestLandPlotViewSet:
    def test_list_landplots(self, api_client, land_plot):
        url = reverse('landplot-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED  # было 403

    def test_list_authenticated(self, api_client, realtor_user, land_plot):
        api_client.force_authenticate(user=realtor_user)
        url = reverse('landplot-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_by_distance(self, api_client, realtor_user, land_plot):
        api_client.force_authenticate(user=realtor_user)
        url = reverse('landplot-by-distance')
        response = api_client.get(url, {'lat': 55.75, 'lon': 37.61})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestRequestViewSet:
    def test_create_anonymous(self, api_client):
        url = reverse('request-list')
        data = {
            'first_name': 'Анна',
            'last_name': 'Смирнова',
            'phone': '+79998887766',
            'email': 'anna@example.com',
            'client_comment': 'Хочу купить'
        }
        response = api_client.post(url, data)

        # Отладка
        if response.status_code != 201:
            print("Response data:", response.data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Request.objects.count() == 1

    def test_create_duplicate(self, api_client, request_obj):
        url = reverse('request-list')
        data = {
            'first_name': 'Анна',
            'last_name': 'Смирнова',
            'phone': request_obj.client.phone,
            'client_comment': 'Обновлённый комментарий'
        }
        response = api_client.post(url, data)

        if response.status_code != 201:
            print("Response data:", response.data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Request.objects.count() == 1
        updated = Request.objects.first()
        assert updated.client_comment == 'Обновлённый комментарий'

    def test_list_authenticated(self, api_client, realtor_user, request_obj):
        api_client.force_authenticate(user=realtor_user)
        url = reverse('request-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_list_head_realtor_sees_spam(self, api_client, head_realtor_user, request_spam):
        api_client.force_authenticate(user=head_realtor_user)
        url = reverse('request-list')
        response = api_client.get(url)
        assert len(response.data['results']) == 1

    def test_list_realtor_hides_spam(self, api_client, realtor_user, request_spam):
        api_client.force_authenticate(user=realtor_user)
        url = reverse('request-list')
        response = api_client.get(url)
        assert len(response.data['results']) == 0


@pytest.mark.django_db
class TestMeetingConfirmation:
    def test_get_info(self, api_client, meeting):
        token = MeetingConfirmationToken.objects.create(meeting=meeting)
        url = reverse('meeting-confirm-detail', args=[token.token])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == meeting.id

    def test_confirm(self, api_client, meeting):
        token = MeetingConfirmationToken.objects.create(meeting=meeting)
        url = reverse('meeting-confirm-detail', args=[token.token])
        response = api_client.post(url, {'action': 'confirm'})
        assert response.status_code == status.HTTP_200_OK
        meeting.refresh_from_db()
        assert meeting.client_confirmed is True
        assert meeting.request.events.filter(event_type='meeting_done').exists()


@pytest.mark.django_db
class TestNotificationViewSet:
    def test_list_notifications(self, api_client, head_realtor_user, notification):
        api_client.force_authenticate(user=head_realtor_user)
        url = reverse('notification-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_mark_read(self, api_client, head_realtor_user, notification):
        api_client.force_authenticate(user=head_realtor_user)
        url = reverse('notification-mark-read', args=[notification.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.is_read is True


@pytest.mark.django_db
class TestUserViewSet:
    def test_list_users_forbidden_for_realtor(self, api_client, realtor_user):
        api_client.force_authenticate(user=realtor_user)
        url = reverse('user-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_users_allowed_for_head(self, api_client, head_realtor_user):
        api_client.force_authenticate(user=head_realtor_user)
        url = reverse('user-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestDashboardViewSet:
    def test_requests_by_status(self, api_client, head_realtor_user, request_obj):
        api_client.force_authenticate(user=head_realtor_user)
        url = reverse('dashboard-requests-by-status')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert any(item['status'] == 'new' for item in response.data)


@pytest.mark.django_db
class TestAIDescriptionViewSet:
    def test_generate_description(self, api_client, realtor_user, flat, mocker):
        api_client.force_authenticate(user=realtor_user)
        mock_gpt = mocker.patch('agency.views.generate_description_with_gpt')
        mock_gpt.return_value = 'Красивая квартира'
        url = reverse('aidescription-generate', args=['flat', flat.id])
        response = api_client.post(url, {'purpose': 'sale'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['description'] == 'Красивая квартира'