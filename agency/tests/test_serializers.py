import pytest
from rest_framework.test import APIRequestFactory
from django.contrib.contenttypes.models import ContentType
from agency.serializers import (
    LandPlotSerializer, ApartmentSerializer, DetachedHouseSerializer,
    FlatSerializer, RequestSerializer, MeetingSerializer, UserSerializer
)
from agency.models import LandPlot, Apartment, DetachedHouse, Flat, Request, Meeting, MeetingConfirmationToken
from conftest import *


@pytest.mark.django_db
class TestLandPlotSerializer:
    def test_create_with_geocoding(self, mocker):
        # Мокаем геокодер
        mock_geocode = mocker.patch('agency.serializers.geocode_address')
        mock_geocode.return_value = {'lat': 55.76, 'lon': 37.62}

        data = {
            'city': 'Москва',
            'street': 'Ленина',
            'plot_number': '10',
            'land_area': 12,
            'is_water': True,
            'is_severage': True,
            'is_gas': True,
            'land_type': 'ИЖС',
            'photos': []
        }
        serializer = LandPlotSerializer(data=data)
        assert serializer.is_valid()
        instance = serializer.save()
        assert instance.location is not None
        assert instance.location.x == 37.62
        assert instance.location.y == 55.76


@pytest.mark.django_db
class TestRequestSerializer:
    def test_create_anonymous(self, rf, mocker):
        factory = APIRequestFactory()
        request = factory.post('/fake-url')
        request.user = mocker.Mock(is_anonymous=True)

        data = {
            'first_name': 'Петр',
            'last_name': 'Петров',
            'phone': '+79991112233',
            'email': 'petr@example.com',
            'client_comment': 'Хочу посмотреть',
            'notification_enabled': True
        }
        serializer = RequestSerializer(data=data, context={'request': request})

        # Добавляем отладку
        if not serializer.is_valid():
            print("Serializer errors:", serializer.errors)
        assert serializer.is_valid()

        instance = serializer.save()
        assert instance.client is not None
        assert instance.client.first_name == 'Петр'
        assert instance.client.notification_enabled is True
        assert instance.ip_address is not None

    def test_create_authenticated(self, realtor_user, client_obj):
        # Авторизованный пользователь должен передать client
        data = {
            'client': client_obj.id,
            'client_comment': 'test'
        }
        serializer = RequestSerializer(data=data, context={'request': None})
        assert serializer.is_valid()
        instance = serializer.save()
        assert instance.client == client_obj
        assert instance.is_spam is False


@pytest.mark.django_db
class TestMeetingSerializer:
    def test_confirmation_url(self, meeting, rf):
        token = MeetingConfirmationToken.objects.create(meeting=meeting)
        request = rf.get('/fake')
        serializer = MeetingSerializer(meeting, context={'request': request})
        assert 'confirmation_url' in serializer.data
        assert token.token in serializer.data['confirmation_url']


@pytest.mark.django_db
class TestUserSerializer:
    def test_create_user_with_groups(self, realtor_group):
        data = {
            'username': 'newuser',
            'password': 'secret',
            'email': 'new@example.com',
            'groups': [realtor_group.id]
        }
        serializer = UserSerializer(data=data)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.groups.filter(id=realtor_group.id).exists()
        assert user.check_password('secret')