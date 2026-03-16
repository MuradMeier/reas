from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from agency.models import (
    Region, City, Flat, Apartment, DetachedHouse, LandPlot,
    TipSanuzla, BalconyLoggiaType, TechnicChoices, FurnitureChoice,
    CommunicationType, WaterSupplyType, SeverageType, BathroomLocation
)
import random

class Command(BaseCommand):
    help = 'Загружает тестовые объекты недвижимости'

    def handle(self, *args, **options):
        self.stdout.write('Загрузка тестовых объектов...')

        # Получаем регионы и города
        try:
            moscow_region = Region.objects.get(name='Московская область')
            kaluga_region = Region.objects.get(name='Калужская область')
            moscow = City.objects.get(name='Москва', region=moscow_region)
            podolsk = City.objects.get(name='Подольск', region=moscow_region)
            kaluga = City.objects.get(name='Калуга', region=kaluga_region)
        except Region.DoesNotExist:
            self.stdout.write(self.style.ERROR('Сначала загрузите регионы командой load_test_data'))
            return

        # Создаем дома (Apartment) – многоэтажки
        apt1, created = Apartment.objects.get_or_create(
            city='Москва',
            street='Тверская',
            house_number='10',
            defaults={
                'year_construction': 2005,
                'realty_type': 'brick',
                'floor_in_house': 12,
                'elevator': True,
                'location': Point(37.62, 55.76, srid=4326),
                'region': moscow_region,
                'city_fk': moscow
            }
        )
        apt2, created = Apartment.objects.get_or_create(
            city='Подольск',
            street='Ленина',
            house_number='5',
            defaults={
                'year_construction': 1990,
                'realty_type': 'panel',
                'floor_in_house': 9,
                'elevator': False,
                'location': Point(37.55, 55.43, srid=4326),
                'region': moscow_region,
                'city_fk': podolsk
            }
        )
        self.stdout.write('Созданы дома (Apartment)')

        # Квартиры (Flat)
        flat1, created = Flat.objects.get_or_create(
            apartment=apt1,
            apartment_number='42',
            defaults={
                'quantity_rooms': 2,
                'home_area': 55,
                'floor': 5,
                'bathroom_quantity': 1,
                'rooms_type': 'separate',
                'renovation': 'euro',
                'region': moscow_region,
                'city_fk': moscow,
                'location': Point(37.62, 55.76, srid=4326)
            }
        )
        flat2, created = Flat.objects.get_or_create(
            apartment=apt1,
            apartment_number='43',
            defaults={
                'quantity_rooms': 3,
                'home_area': 75,
                'floor': 7,
                'bathroom_quantity': 1,
                'rooms_type': 'separate',
                'renovation': 'cosmetic',
                'region': moscow_region,
                'city_fk': moscow,
                'location': Point(37.62, 55.76, srid=4326)
            }
        )
        flat3, created = Flat.objects.get_or_create(
            apartment=apt2,
            apartment_number='1',
            defaults={
                'quantity_rooms': 1,
                'home_area': 35,
                'floor': 2,
                'bathroom_quantity': 1,
                'rooms_type': 'adjective',
                'renovation': 'capital',
                'region': moscow_region,
                'city_fk': podolsk,
                'location': Point(37.55, 55.43, srid=4326)
            }
        )
        self.stdout.write('Созданы квартиры (Flat)')

        # Частные дома (DetachedHouse)
        house1, created = DetachedHouse.objects.get_or_create(
            city='Москва',
            street='Лесная',
            house_number='15',
            defaults={
                'year_construction': 2010,
                'realty_type': 'brick',
                'floor_in_house': 2,
                'distance_to_city_center': 5,
                'land_area': 10,
                'home_area': 120,
                'quantity_rooms': 4,
                'region': moscow_region,
                'city_fk': moscow,
                'location': Point(37.60, 55.75, srid=4326)
            }
        )
        house2, created = DetachedHouse.objects.get_or_create(
            city='Калуга',
            street='Полевая',
            house_number='7',
            defaults={
                'year_construction': 2015,
                'realty_type': 'monolith',
                'floor_in_house': 2,
                'distance_to_city_center': 3,
                'land_area': 15,
                'home_area': 150,
                'quantity_rooms': 5,
                'region': kaluga_region,
                'city_fk': kaluga,
                'location': Point(36.26, 54.51, srid=4326)
            }
        )
        self.stdout.write('Созданы частные дома')

        # Участки (LandPlot)
        land1, created = LandPlot.objects.get_or_create(
            city='Москва',
            street='Новорижское шоссе',
            plot_number='100',
            defaults={
                'cadastral_number': '50:01:001:100',
                'land_area': 12,
                'is_water': True,
                'is_severage': False,
                'is_gas': True,
                'land_type': 'ИЖС',
                'region': moscow_region,
                'city_fk': moscow,
                'location': Point(37.30, 55.80, srid=4326)
            }
        )
        land2, created = LandPlot.objects.get_or_create(
            city='Калуга',
            street='Окружная',
            plot_number='25',
            defaults={
                'cadastral_number': '40:02:002:25',
                'land_area': 20,
                'is_water': False,
                'is_severage': True,
                'is_gas': False,
                'land_type': 'СНТ',
                'region': kaluga_region,
                'city_fk': kaluga,
                'location': Point(36.20, 54.55, srid=4326)
            }
        )
        self.stdout.write('Созданы участки')

        self.stdout.write(self.style.SUCCESS('Тестовые объекты успешно загружены'))