from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from agency.models import Region, City, District, MetroStation

class Command(BaseCommand):
    help = 'Загружает тестовые данные для регионов, городов, районов и метро'

    def handle(self, *args, **options):
        self.stdout.write('Загрузка тестовых данных...')

        # Регионы
        moscow_region, _ = Region.objects.get_or_create(name='Московская область', order=1)
        kaluga_region, _ = Region.objects.get_or_create(name='Калужская область', order=2)

        # Города Московской области
        cities_data = [
            ('Москва', moscow_region, True, Point(37.6173, 55.7558)),
            ('Подольск', moscow_region, False, Point(37.5547, 55.4312)),
            ('Химки', moscow_region, False, Point(37.4297, 55.8970)),
            ('Мытищи', moscow_region, False, Point(37.7301, 55.9116)),
            ('Люберцы', moscow_region, False, Point(37.8949, 55.6779)),
            ('Королёв', moscow_region, False, Point(37.8254, 55.9221)),
            ('Балашиха', moscow_region, False, Point(37.9587, 55.7961)),
        ]
        for name, region, has_metro, location in cities_data:
            city, created = City.objects.get_or_create(
                name=name,
                region=region,
                defaults={'has_metro': has_metro, 'location': location}
            )
            if created:
                self.stdout.write(f'Добавлен город: {name}')

        # Города Калужской области
        kaluga_cities = [
            ('Калуга', kaluga_region, False, Point(36.2625, 54.5138)),
            ('Обнинск', kaluga_region, False, Point(36.6103, 55.0944)),
            ('Малоярославец', kaluga_region, False, Point(36.4719, 55.0136)),
        ]
        for name, region, has_metro, location in kaluga_cities:
            city, created = City.objects.get_or_create(
                name=name,
                region=region,
                defaults={'has_metro': has_metro, 'location': location}
            )
            if created:
                self.stdout.write(f'Добавлен город: {name}')

        # Районы (для Москвы и Подольска)
        moscow = City.objects.get(name='Москва', region=moscow_region)
        districts_moscow = [
            ('Центральный', moscow),
            ('Северный', moscow),
            ('Южный', moscow),
            ('Западный', moscow),
            ('Восточный', moscow),
        ]
        for name, city in districts_moscow:
            district, created = District.objects.get_or_create(name=name, city=city)
            if created:
                self.stdout.write(f'Добавлен район: {name} (Москва)')

        podolsk = City.objects.get(name='Подольск', region=moscow_region)
        districts_podolsk = [
            ('Центральный', podolsk),
            ('Южный', podolsk),
        ]
        for name, city in districts_podolsk:
            district, created = District.objects.get_or_create(name=name, city=city)
            if created:
                self.stdout.write(f'Добавлен район: {name} (Подольск)')

        # Станции метро (только для Москвы)
        metro_stations = [
            ('Охотный ряд', moscow, Point(37.6165, 55.7575)),
            ('Площадь Революции', moscow, Point(37.6218, 55.7565)),
            ('Арбатская', moscow, Point(37.6066, 55.7515)),
            ('Библиотека им. Ленина', moscow, Point(37.6099, 55.7510)),
            ('Комсомольская', moscow, Point(37.6564, 55.7750)),
        ]
        for name, city, location in metro_stations:
            station, created = MetroStation.objects.get_or_create(
                name=name,
                city=city,
                defaults={'location': location}
            )
            if created:
                self.stdout.write(f'Добавлена станция метро: {name}')

        self.stdout.write(self.style.SUCCESS('Тестовые данные успешно загружены'))