import pytest
import factory
from django.contrib.auth.models import User, Group
from django.contrib.gis.geos import Point
from django.utils import timezone
from factory.django import DjangoModelFactory
from agency.models import (
    LandPlot, Apartment, DetachedHouse, Flat, Room,
    Client, Request, Meeting, Notification,
    TipSanuzla, CommunicationType, WaterSupplyType, SeverageType,
    BathroomLocation, TechnicChoices, FurnitureChoice,
    RentalRealty, SaleRealty, MeetingConfirmationToken
)


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'user{n}')
    password = factory.PostGenerationMethodCall('set_password', 'password')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')


class GroupFactory(DjangoModelFactory):
    class Meta:
        model = Group
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f'group{n}')


class LandPlotFactory(DjangoModelFactory):
    class Meta:
        model = LandPlot
        skip_postgeneration_save = True

    city = "Москва"
    street = "Ленина"
    plot_number = "1"
    land_area = 10
    is_water = True
    is_severage = True
    is_gas = True
    land_type = "ИЖС"
    location = Point(37.62, 55.76, srid=4326)


class ApartmentFactory(DjangoModelFactory):
    class Meta:
        model = Apartment
        skip_postgeneration_save = True

    city = "Москва"
    street = "Тверская"
    house_number = "10"
    year_construction = 2000
    realty_type = "brick"
    floor_in_house = 9
    elevator = True
    location = Point(37.62, 55.76, srid=4326)


class DetachedHouseFactory(DjangoModelFactory):
    class Meta:
        model = DetachedHouse
        skip_postgeneration_save = True

    city = "Москва"
    street = "Лесная"
    house_number = "5"
    year_construction = 2010
    realty_type = "monolith"
    floor_in_house = 2
    distance_to_city_center = 10
    land_area = 15
    home_area = 120
    quantity_rooms = 4
    location = Point(37.62, 55.76, srid=4326)


class FlatFactory(DjangoModelFactory):
    class Meta:
        model = Flat
        skip_postgeneration_save = True

    apartment = factory.SubFactory(ApartmentFactory)
    apartment_number = "42"
    quantity_rooms = 2
    home_area = 55
    floor = 5
    bathroom_quantity = 1
    rooms_type = "separate"
    renovation = "euro"
    location = Point(37.62, 55.76, srid=4326)


class RoomFactory(DjangoModelFactory):
    class Meta:
        model = Room
        skip_postgeneration_save = True

    room_area = 18
    floor = 1
    content_type = None  # будет установлено в тесте
    object_id = None


class ClientFactory(DjangoModelFactory):
    class Meta:
        model = Client
        skip_postgeneration_save = True

    first_name = "Иван"
    last_name = "Иванов"
    phone = factory.Sequence(lambda n: f'+7999{n:06d}')
    email = factory.LazyAttribute(lambda obj: f'{obj.first_name.lower()}.{obj.last_name.lower()}@example.com')
    notification_enabled = True


class RequestFactory(DjangoModelFactory):
    class Meta:
        model = Request
        skip_postgeneration_save = True

    client = factory.SubFactory(ClientFactory)
    status = "new"
    ip_address = "127.0.0.1"
    is_spam = False


class MeetingFactory(DjangoModelFactory):
    class Meta:
        model = Meeting
        skip_postgeneration_save = True

    request = factory.SubFactory(RequestFactory)
    datetime = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=1))
    status = "planned"
    reminder_hours = 24
    created_by = factory.SubFactory(UserFactory)


class NotificationFactory(DjangoModelFactory):
    class Meta:
        model = Notification
        skip_postgeneration_save = True

    recipient = factory.SubFactory(UserFactory)
    type = "test"
    message = "Test notification"


@pytest.fixture
def head_realtor_group(db):
    group = GroupFactory(name='Главный риэлтор')
    return group


@pytest.fixture
def realtor_group(db):
    group = GroupFactory(name='Риэлтор')
    return group


@pytest.fixture
def head_realtor_user(db, head_realtor_group):
    user = UserFactory()
    user.groups.add(head_realtor_group)
    return user


@pytest.fixture
def realtor_user(db, realtor_group):
    user = UserFactory()
    user.groups.add(realtor_group)
    return user


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def land_plot(db):
    return LandPlotFactory()

@pytest.fixture
def apartment(db):
    return ApartmentFactory()

@pytest.fixture
def detached_house(db):
    return DetachedHouseFactory()

@pytest.fixture
def flat(db):
    return FlatFactory()

@pytest.fixture
def client_obj(db):
    return ClientFactory()

@pytest.fixture
def request_obj(db, client_obj):
    return RequestFactory(client=client_obj)

@pytest.fixture
def request_spam(db, client_obj):
    return RequestFactory(client=client_obj, is_spam=True)

@pytest.fixture
def meeting(db, request_obj, realtor_user):
    return MeetingFactory(request=request_obj, created_by=realtor_user)

@pytest.fixture
def notification(db, head_realtor_user):
    return NotificationFactory(recipient=head_realtor_user)

@pytest.fixture
def user(db):
    return UserFactory()