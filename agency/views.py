# views.py (полностью переименован на русские термины в транслите)
import os
from datetime import timedelta
from django.db.models.aggregates import Count
from django.db.models.query_utils import Q
from django.http.response import HttpResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.gis.db.models.functions import Distance
from .serializers import *
from .permissions import IsHeadRealtor, IsRealtor
from .utils import generate_description_with_gpt, geocode_address
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.permissions import AllowAny, IsAuthenticated


def init_db(request):
    # Проверка секретного токена
    secret_token = os.environ.get('INIT_DB_TOKEN')
    provided_token = request.GET.get('token')
    if not secret_token or provided_token != secret_token:
        return HttpResponse('Forbidden', status=403)

    import random
    from datetime import timedelta
    from django.utils import timezone
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Group
    from django.contrib.contenttypes.models import ContentType
    from django.contrib.gis.geos import Point
    from faker import Faker

    # ЗАМЕНИТЕ 'your_app' НА РЕАЛЬНОЕ ИМЯ ВАШЕГО ПРИЛОЖЕНИЯ
    from agency.models import (
        TipSanuzla, BalkonLogdiaTip, TipKommunikatsii, TipVodosnabzheniya,
        TipKanalizatsii, MestopolozhenieSanuzla, Tekhnika, Mebel,
        Region, Gorod, Raion, MetroStantsiya, Mikroraion,
        ZemelnyiUchastok, Mnogoetazhka, ChastnyiDom, Kvartira,
        Arenda, Prodazha, Klient, Zayavka, SobytieZayavki, Vstrecha,
        TokenPodtverzhdeniyaVstrechi, Uvedomlenie, UvedomlenieKlienta,
        RegionSettings
    )

    User = get_user_model()
    fake = Faker('ru_RU')

    # ----------------------------------------------------------------------
    # 1. Группы пользователей
    # ----------------------------------------------------------------------
    head_group, _ = Group.objects.get_or_create(name='Главный риэлтор')
    realtor_group, _ = Group.objects.get_or_create(name='Риэлтор')

    # ----------------------------------------------------------------------
    # 2. Справочники (если пусто, создаём несколько значений)
    # ----------------------------------------------------------------------
    def create_reference_data():
        if TipSanuzla.objects.count() == 0:
            for name in ['Раздельный', 'Совмещенный', 'Гостевой']:
                TipSanuzla.objects.get_or_create(nazvanie=name)

        if BalkonLogdiaTip.objects.count() == 0:
            for name in ['Балкон', 'Лоджия', 'Терраса']:
                BalkonLogdiaTip.objects.get_or_create(nazvanie=name)

        if TipKommunikatsii.objects.count() == 0:
            for name in ['Электричество', 'Газ', 'Водопровод', 'Канализация', 'Отопление']:
                TipKommunikatsii.objects.get_or_create(nazvanie=name)

        if TipVodosnabzheniya.objects.count() == 0:
            for name in ['Центральное', 'Скважина', 'Колодец']:
                TipVodosnabzheniya.objects.get_or_create(nazvanie=name)

        if TipKanalizatsii.objects.count() == 0:
            for name in ['Центральная', 'Септик', 'Выгребная яма']:
                TipKanalizatsii.objects.get_or_create(nazvanie=name)

        if MestopolozhenieSanuzla.objects.count() == 0:
            for name in ['Внутри дома', 'На улице', 'Пристройка']:
                MestopolozhenieSanuzla.objects.get_or_create(nazvanie=name)

        if Tekhnika.objects.count() == 0:
            for name in ['Холодильник', 'Стиральная машина', 'Посудомоечная машина', 'Телевизор', 'Кондиционер']:
                Tekhnika.objects.get_or_create(vybor=name)

        if Mebel.objects.count() == 0:
            for name in ['Кухонный гарнитур', 'Кровать', 'Шкаф', 'Диван', 'Стол']:
                Mebel.objects.get_or_create(vybor=name)

    create_reference_data()

    # ----------------------------------------------------------------------
    # 3. Регионы, города, районы, метро, микрорайоны
    # ----------------------------------------------------------------------
    def create_locations():
        # Регион – Московская область
        region, _ = Region.objects.get_or_create(nazvanie='Московская область', defaults={'poryadok': 1})
        # Города
        city_names = ['Москва', 'Химки', 'Красногорск', 'Мытищи', 'Люберцы']
        cities = []
        for name in city_names:
            city, _ = Gorod.objects.get_or_create(
                nazvanie=name,
                region=region,
                defaults={'est_metro': name == 'Москва'}
            )
            cities.append(city)

        # Районы (случайно для каждого города)
        district_names = ['Центральный', 'Северный', 'Южный', 'Западный', 'Восточный']
        for city in cities:
            for d in district_names:
                Raion.objects.get_or_create(nazvanie=f"{d} район", gorod=city)

        # Станции метро (только для Москвы)
        moscow = Gorod.objects.filter(nazvanie='Москва').first()
        if moscow and MetroStantsiya.objects.filter(gorod=moscow).count() == 0:
            metro_names = ['Парк культуры', 'Красные ворота', 'Сокольники', 'Речной вокзал', 'ВДНХ']
            for m in metro_names:
                MetroStantsiya.objects.get_or_create(
                    nazvanie=m,
                    gorod=moscow,
                    defaults={'koordinaty': Point(37.6 + random.uniform(-0.5, 0.5), 55.7 + random.uniform(-0.3, 0.3))}
                )

        # Микрорайоны (для каждого района создадим пару)
        for raion in Raion.objects.all():
            for i in range(2):
                Mikroraion.objects.get_or_create(
                    nazvanie=f"Микрорайон {fake.city_suffix()}",
                    raion=raion
                )

    create_locations()

    # ----------------------------------------------------------------------
    # 4. Пользователи (админы / риэлторы) – 10
    # ----------------------------------------------------------------------
    users = []
    for i in range(10):
        username = fake.user_name() + str(i)
        email = fake.email()
        first_name = fake.first_name()
        last_name = fake.last_name()
        password = 'password123'
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            is_active=True
        )
        if i < 3:
            user.groups.add(head_group)
        else:
            user.groups.add(realtor_group)
        users.append(user)
        print(f"Создан пользователь: {username} ({'главный' if i < 3 else 'риэлтор'})")

    # ----------------------------------------------------------------------
    # 5. Клиенты – 30
    # ----------------------------------------------------------------------
    clients = []
    for _ in range(30):
        first_name = fake.first_name()
        last_name = fake.last_name()
        patronymic = fake.middle_name() if random.choice([True, False]) else ''
        phone = fake.unique.phone_number()[:20]
        email = fake.email() if random.choice([True, False]) else ''
        comment = fake.sentence() if random.choice([True, False]) else ''
        responsible = random.choice(users) if random.choice([True, False]) else None
        client = Klient.objects.create(
            imya=first_name,
            familiya=last_name,
            otchestvo=patronymic,
            telefon=phone,
            email=email,
            kommentariy=comment,
            otvetstvennyi=responsible,
            uvedomleniya_vklyucheny=random.choice([True, False])
        )
        clients.append(client)
    print(f"Создано {len(clients)} клиентов")

    # ----------------------------------------------------------------------
    # 6. Объекты недвижимости (кроме комнат)
    # ----------------------------------------------------------------------
    # Вспомогательные функции
    def random_coords():
        lon = 37.5 + random.uniform(-1, 1)
        lat = 55.7 + random.uniform(-0.5, 0.5)
        return Point(lon, lat, srid=4326)

    def random_region():
        return Region.objects.order_by('?').first()

    def random_city():
        return Gorod.objects.order_by('?').first()

    def random_raion():
        return Raion.objects.order_by('?').first()

    def random_metro():
        # возвращает список объектов (может быть пустым)
        count = random.randint(0, 2)
        return list(MetroStantsiya.objects.order_by('?')[:count])

    def random_mikroraion():
        if Mikroraion.objects.exists() and random.choice([True, False]):
            return Mikroraion.objects.order_by('?').first()
        return None

    # 6.1 Земельные участки – 10
    landplots = []
    for _ in range(10):
        city = random_city()
        region = city.region if city else random_region()
        # Сначала создаём объект без m2m
        plot = ZemelnyiUchastok.objects.create(
            gorod_tekst=city.nazvanie if city else fake.city(),
            ulitsa=fake.street_name(),
            nomer_uchastka=str(random.randint(1, 100)),
            kadastr_nomer=fake.bothify(text='??:??:??????:###').upper(),
            ploshad_uchastka=random.randint(5, 50),
            voda=random.choice([True, False]),
            kanalizatsiya=random.choice([True, False]),
            gaz=random.choice([True, False]),
            tip_uchastka=random.choice(['ИЖС', 'СНТ']),
            opisanie=fake.text(max_nb_chars=200) if random.choice([True, False]) else '',
            sozdal=random.choice(users),
            region=region,
            gorod=city,
            raion=random_raion() if random.choice([True, False]) else None,
            mikroraion=random_mikroraion(),
            koordinaty=random_coords(),
            opublikovano=random.choice([True, False])
        )
        # Устанавливаем m2m
        plot.metro_stantsii.set(random_metro())
        landplots.append(plot)
    print(f"Создано земельных участков: {len(landplots)}")

    # 6.2 Многоэтажки – 5
    apartments = []
    for _ in range(5):
        city = random_city()
        region = city.region if city else random_region()
        building = Mnogoetazhka.objects.create(
            gorod_tekst=city.nazvanie if city else fake.city(),
            ulitsa=fake.street_name(),
            nomer_doma=str(random.randint(1, 50)),
            korpus=random.choice(['', '1', '2', '3']) if random.choice([True, False]) else '',
            stroenie=random.choice(['', 'стр.1', 'стр.2']) if random.choice([True, False]) else '',
            god_postroiki=random.randint(1970, 2023),
            tip_doma=random.choice(['brick', 'monolith', 'panel']),
            etazhnost=random.randint(5, 25),
            lift=random.choice([True, False]),
            opisanie=fake.text(max_nb_chars=200) if random.choice([True, False]) else '',
            sozdal=random.choice(users),
            region=region,
            gorod=city,
            raion=random_raion() if random.choice([True, False]) else None,
            mikroraion=random_mikroraion(),
            koordinaty=random_coords(),
            opublikovano=random.choice([True, False])
        )
        building.metro_stantsii.set(random_metro())
        apartments.append(building)
    print(f"Создано многоэтажек: {len(apartments)}")

    # 6.3 Частные дома – 10
    houses = []
    for _ in range(10):
        city = random_city()
        region = city.region if city else random_region()
        house = ChastnyiDom.objects.create(
            gorod_tekst=city.nazvanie if city else fake.city(),
            ulitsa=fake.street_name(),
            nomer_doma=str(random.randint(1, 100)),
            korpus='',
            stroenie='',
            god_postroiki=random.randint(1980, 2023),
            tip_doma=random.choice(['brick', 'monolith', 'panel']),
            etazhnost=random.randint(1, 3),
            opisanie=fake.text(max_nb_chars=200) if random.choice([True, False]) else '',
            sozdal=random.choice(users),
            region=region,
            gorod=city,
            raion=random_raion() if random.choice([True, False]) else None,
            mikroraion=random_mikroraion(),
            koordinaty=random_coords(),
            opublikovano=random.choice([True, False]),
            rasstoyanie_do_centra=random.randint(1, 30),
            ploshad_uchastka=random.randint(5, 50),
            zhilaya_ploshad=random.randint(50, 300),
            kolichestvo_komnat=random.randint(2, 6)
        )
        house.metro_stantsii.set(random_metro())
        # M2M поля
        house.mestopolozhenie_sanuzla.set(MestopolozhenieSanuzla.objects.order_by('?')[:random.randint(1, 3)])
        house.kommunikatsii.set(TipKommunikatsii.objects.order_by('?')[:random.randint(2, 5)])
        house.tip_vody.set(TipVodosnabzheniya.objects.order_by('?')[:random.randint(1, 2)])
        house.tip_kanalizatsii.set(TipKanalizatsii.objects.order_by('?')[:random.randint(1, 2)])
        houses.append(house)
    print(f"Создано частных домов: {len(houses)}")

    # 6.4 Квартиры – 20 (привязаны к многоэтажкам)
    flats = []
    for _ in range(20):
        building = random.choice(apartments)
        floor = random.randint(1, building.etazhnost)
        flat = Kvartira.objects.create(
            mnogoetazhka=building,
            nomer_kvartiry=str(random.randint(1, 200)),
            kolichestvo_komnat=random.randint(1, 5),
            zhilaya_ploshad=random.randint(20, 150),
            etazh=floor,
            kolichestvo_sanuzlov=random.randint(1, 2),
            tip_komnat=random.choice(['separate', 'adjective']),
            remont=random.choice(['', 'euro', 'cosmetic', 'capital', 'designer']) if random.choice(
                [True, False]) else '',
            opisanie=fake.text(max_nb_chars=200) if random.choice([True, False]) else '',
            sozdal=random.choice(users),
            region=building.region,
            gorod=building.gorod,
            raion=building.raion,
            mikroraion=building.mikroraion,
            koordinaty=building.koordinaty,
            opublikovano=random.choice([True, False])
        )
        # M2M поля квартиры
        flat.metro_stantsii.set(building.metro_stantsii.all())  # копируем метро дома
        flat.tip_sanuzla.set(TipSanuzla.objects.order_by('?')[:random.randint(1, 2)])
        flat.balkon_ili_loggia.set(BalkonLogdiaTip.objects.order_by('?')[:random.randint(0, 2)])
        flat.tekhnika.set(Tekhnika.objects.order_by('?')[:random.randint(0, 3)])
        flat.mebel.set(Mebel.objects.order_by('?')[:random.randint(0, 3)])
        flats.append(flat)
    print(f"Создано квартир: {len(flats)}")

    # ----------------------------------------------------------------------
    # 7. Предложения аренды и продажи
    # ----------------------------------------------------------------------
    def create_offers():
        # Продажа для некоторых объектов
        all_objs = landplots + houses + flats
        for obj in all_objs:
            if random.random() < 0.5:  # 50% объектов имеют продажу
                Prodazha.objects.create(
                    tsena=random.randint(1000000, 20000000),
                    tip_obekta=ContentType.objects.get_for_model(obj),
                    id_obekta=obj.id
                )
        # Аренда для квартир и домов
        for obj in houses + flats:
            if random.random() < 0.4:
                Arenda.objects.create(
                    tsena=random.randint(20000, 200000),
                    tip_obekta=ContentType.objects.get_for_model(obj),
                    id_obekta=obj.id,
                    kurenie=random.choice([True, False]),
                    deti=random.choice([True, False]),
                    zhivotnye=random.choice([True, False]),
                    spalnyh_mest=random.randint(1, 4)
                )

    create_offers()

    # ----------------------------------------------------------------------
    # 8. Заявки – 100 с разными датами
    # ----------------------------------------------------------------------
    status_choices = [c[0] for c in Zayavka.STATUS_CHOICES]
    purpose_choices = [c[0] for c in Zayavka.PURPOSE_CHOICES]
    property_type_choices = [c[0] for c in Zayavka.PROPERTY_TYPE_CHOICES]

    requests_list = []
    for i in range(100):
        client = random.choice(clients)
        responsible = random.choice(users) if random.choice([True, False]) else None
        days_ago = random.randint(0, 90)
        created_at = timezone.now() - timedelta(days=days_ago)

        # привязка к объекту (около 30%)
        if random.random() < 0.3:
            obj_type = random.choice([ZemelnyiUchastok, Mnogoetazhka, ChastnyiDom, Kvartira])
            obj = obj_type.objects.order_by('?').first()
            if obj:
                tip_nedvizhimosti = ContentType.objects.get_for_model(obj)
                id_nedvizhimosti = obj.id
            else:
                tip_nedvizhimosti = None
                id_nedvizhimosti = None
        else:
            tip_nedvizhimosti = None
            id_nedvizhimosti = None

        extended_data = {}
        if random.choice([True, False]):
            extended_data['rooms'] = random.randint(1, 5)
            extended_data['floor'] = random.randint(1, 10)
        if random.choice([True, False]):
            extended_data['with_furniture'] = random.choice([True, False])

        ip_adres = fake.ipv4() if random.choice([True, False]) else None
        status = random.choice(status_choices)

        zayavka = Zayavka.objects.create(
            klient=client,
            naznachen=responsible,
            status=status,
            purpose=random.choice(purpose_choices),
            property_type=random.choice(property_type_choices),
            extended_data=extended_data if extended_data else None,
            byudzhet_ot=random.randint(1000000, 5000000) if random.choice([True, False]) else None,
            byudzhet_do=random.randint(5000000, 20000000) if random.choice([True, False]) else None,
            kommentariy_klienta=fake.sentence() if random.choice([True, False]) else '',
            ip_adres=ip_adres,
            eto_spam=random.random() < 0.05,
            tip_nedvizhimosti=tip_nedvizhimosti,
            id_nedvizhimosti=id_nedvizhimosti,
            taken_at=created_at if status == 'taken' else None
        )
        Zayavka.objects.filter(pk=zayavka.pk).update(sozdano=created_at)
        requests_list.append(zayavka)
    print(f"Создано заявок: {len(requests_list)}")

    # ----------------------------------------------------------------------
    # 9. Немного событий для заявок и встреч
    # ----------------------------------------------------------------------
    for req in random.sample(requests_list, min(20, len(requests_list))):
        if random.choice([True, False]):
            meeting_time = timezone.now() + timedelta(days=random.randint(1, 30))
            Vstrecha.objects.create(
                zayavka=req,
                data_vremya=meeting_time,
                dlitelnost=timedelta(hours=1),
                mesto=fake.address(),
                status=random.choice(['planned', 'completed', 'cancelled']),
                kommentariy=fake.sentence(),
                sozdal=random.choice(users),
                napominanie_za_chasov=random.randint(1, 48)
            )

    print("Тестовые данные успешно добавлены!")


class TipSanuzlaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TipSanuzla.objects.all()
    serializer_class = TipSanuzlaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class BalkonLogdiaTipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BalkonLogdiaTip.objects.all()
    serializer_class = BalkonLogdiaTipSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class TipKommunikatsiiViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TipKommunikatsii.objects.all()
    serializer_class = TipKommunikatsiiSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class TipVodosnabzheniyaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TipVodosnabzheniya.objects.all()
    serializer_class = TipVodosnabzheniyaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class TipKanalizatsiiViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TipKanalizatsii.objects.all()
    serializer_class = TipKanalizatsiiSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class MestopolozhenieSanuzlaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MestopolozhenieSanuzla.objects.all()
    serializer_class = MestopolozhenieSanuzlaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class TekhnikaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tekhnika.objects.all()
    serializer_class = TekhnikaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class MebelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Mebel.objects.all()
    serializer_class = MebelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None

class RaionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    serializer_class = RaionSerializer
    filterset_fields = ['gorod']
    search_fields = ['nazvanie']

    def get_queryset(self):
        queryset = Raion.objects.all().select_related('gorod')
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(gorod_id=city)
        return queryset


# ----------------------------------------------------------------------
# Пагинация
# ----------------------------------------------------------------------
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PodtverzhdenieVstrechiViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = VstrechaSerializer

    @action(detail=False, methods=['get'], url_path='(?P<token>[^/.]+)')
    def get_info(self, request, token):
        token_obj = get_object_or_404(TokenPodtverzhdeniyaVstrechi, token=token)
        if not token_obj.is_valid():
            return Response({'error': 'Срок действия ссылки истёк'}, status=status.HTTP_410_GONE)
        vstrecha = token_obj.vstrecha
        serializer = self.get_serializer(vstrecha)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='(?P<token>[^/.]+)')
    def confirm_action(self, request, token):
        token_obj = get_object_or_404(TokenPodtverzhdeniyaVstrechi, token=token)
        if not token_obj.is_valid():
            return Response({'error': 'Срок действия ссылки истёк'}, status=status.HTTP_410_GONE)
        vstrecha = token_obj.vstrecha
        user_action = request.data.get('action')
        comment = request.data.get('comment', '')

        if user_action == 'confirm':
            vstrecha.klient_podtverdil = True
            vstrecha.klient_otkazal = False
            vstrecha.zapros_perenosa = None
            vstrecha.save(update_fields=['klient_podtverdil', 'klient_otkazal', 'zapros_perenosa'])
            SobytieZayavki.objects.create(
                zayavka=vstrecha.zayavka,
                tip_sobytiya='meeting_done',
                opisanie=f'Клиент подтвердил встречу. Комментарий: {comment}',
                sozdal=None
            )
            return Response({'status': 'confirmed'})




        elif user_action == 'reject':

            vstrecha.klient_otkazal = True

            vstrecha.klient_podtverdil = False

            vstrecha.zapros_perenosa = None

            vstrecha.save(update_fields=['klient_otkazal', 'klient_podtverdil', 'zapros_perenosa'])

            zayavka = vstrecha.zayavka

            if zayavka and zayavka.status not in ['contract_signed', 'rejected_at_meeting']:
                zayavka.status = 'rejected_at_meeting'

                zayavka.save(update_fields=['status'])

            SobytieZayavki.objects.create(

                zayavka=zayavka,

                tip_sobytiya='rejected',

                opisanie=f'Клиент отказался от встречи. Комментарий: {comment}',

                sozdal=None

            )

            return Response({'status': 'rejected'})

        elif user_action == 'reschedule':
            new_datetime = request.data.get('new_datetime')
            if not new_datetime:
                return Response({'error': 'Укажите новую дату и время'}, status=400)
            vstrecha.zapros_perenosa = {
                'new_datetime': new_datetime,
                'comment': comment,
                'requested_at': timezone.now().isoformat()
            }
            vstrecha.save(update_fields=['zapros_perenosa'])
            SobytieZayavki.objects.create(
                zayavka=vstrecha.zayavka,
                tip_sobytiya='comment',
                opisanie=f'Клиент запросил перенос встречи на {new_datetime}. Комментарий: {comment}',
                sozdal=None
            )
            return Response({'status': 'reschedule_requested'})

        return Response({'error': 'Неверное действие'}, status=400)


# ----------------------------------------------------------------------
# Базовый ViewSet для моделей с мягким удалением
# ----------------------------------------------------------------------
class MyagkoeUdalenieModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRealtor]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def perform_destroy(self, instance):
        if self.request.user.groups.filter(name='Главный риэлтор').exists():
            instance.hard_delete()
        else:
            instance.delete(user=self.request.user)


# ----------------------------------------------------------------------
# Базовый ViewSet для объектов недвижимости с открытым чтением
# ----------------------------------------------------------------------
class NedvizhimostViewSet(MyagkoeUdalenieModelViewSet):
    """
    Базовый ViewSet для недвижимости, где list/retrieve доступны анонимно.
    """

    def get_queryset(self):
        queryset = super().get_queryset()

        # ---- Фильтр по цене (продажа + аренда) ----
        price_min = self.request.query_params.get('price_min')
        price_max = self.request.query_params.get('price_max')
        if price_min or price_max:
            sale_q = Q()
            rent_q = Q()
            if price_min:
                sale_q &= Q(prodazhi__tsena__gte=price_min)
                rent_q &= Q(arendy__tsena__gte=price_min)
            if price_max:
                sale_q &= Q(prodazhi__tsena__lte=price_max)
                rent_q &= Q(arendy__tsena__lte=price_max)
            queryset = queryset.filter(sale_q | rent_q).distinct()

        # ---- Фильтр по площади (универсальный) ----
        area_min = self.request.query_params.get('area_min')
        area_max = self.request.query_params.get('area_max')
        if area_min or area_max:
            model = queryset.model
            # Определяем поле в зависимости от типа объекта
            if hasattr(model, 'zhilaya_ploshad'):
                field = 'zhilaya_ploshad'
            elif hasattr(model, 'ploshad_uchastka'):
                field = 'ploshad_uchastka'
            else:
                field = None  # например, для Mnogoetazhka (нет площади)
            if field:
                filter_kwargs = {}
                if area_min:
                    filter_kwargs[f'{field}__gte'] = area_min
                if area_max:
                    filter_kwargs[f'{field}__lte'] = area_max
                queryset = queryset.filter(**filter_kwargs)

        # ---- Фильтр по комнатам ----
        rooms = self.request.query_params.get('rooms')
        if rooms and rooms != 'any':
            queryset = queryset.filter(kolichestvo_komnat=rooms)

        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsAuthenticated, IsRealtor]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def by_distance(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        address = request.query_params.get('address')

        if address:
            coords = geocode_address(address)
            if not coords:
                return Response({'error': 'Не удалось определить координаты'}, status=400)
            lat = coords['lat']
            lon = coords['lon']
        elif not (lat and lon):
            return Response({'error': 'Укажите lat/lon или address'}, status=400)

        try:
            user_location = Point(float(lon), float(lat), srid=4326)
        except (TypeError, ValueError):
            return Response({'error': 'Некорректные координаты'}, status=400)

        queryset = self.get_queryset().exclude(koordinaty__isnull=True).annotate(
            distance=Distance('koordinaty', user_location)
        ).order_by('distance')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ----------------------------------------------------------------------
# ViewSet'ы для объектов недвижимости (с открытым чтением)
# ----------------------------------------------------------------------
class ZemelnyiUchastokViewSet(NedvizhimostViewSet):
    queryset = ZemelnyiUchastok.objects.all()
    serializer_class = ZemelnyiUchastokSerializer
    filterset_fields = ['gorod_tekst', 'ulitsa', 'ploshad_uchastka', 'sozdal', 'tip_uchastka', 'voda', 'gaz', 'kanalizatsiya', 'region', 'gorod', 'raion', 'mikroraion', 'metro_stantsii', 'opublikovano']
    search_fields = ['gorod_tekst', 'ulitsa', 'nomer_uchastka', 'kadastr_nomer']


class MnogoetazhkaViewSet(NedvizhimostViewSet):
    queryset = Mnogoetazhka.objects.all()
    serializer_class = MnogoetazhkaSerializer
    filterset_fields = ['gorod_tekst', 'ulitsa', 'nomer_doma', 'sozdal', 'tip_doma', 'god_postroiki', 'etazhnost', 'lift', 'region', 'gorod', 'raion', 'mikroraion', 'metro_stantsii', 'opublikovano']
    search_fields = ['gorod_tekst', 'ulitsa', 'nomer_doma']


class ChastnyiDomViewSet(NedvizhimostViewSet):
    queryset = ChastnyiDom.objects.all()
    serializer_class = ChastnyiDomSerializer
    filterset_fields = ['gorod_tekst', 'ulitsa', 'tip_doma', 'god_postroiki', 'rasstoyanie_do_centra',
                        'ploshad_uchastka', 'zhilaya_ploshad', 'sozdal', 'kolichestvo_komnat', 'region', 'gorod', 'raion', 'mikroraion', 'metro_stantsii', 'opublikovano']
    search_fields = ['gorod_tekst', 'ulitsa', 'nomer_doma']


class KvartiraViewSet(NedvizhimostViewSet):
    queryset = Kvartira.objects.all()
    serializer_class = KvartiraSerializer
    filterset_fields = ['mnogoetazhka', 'kolichestvo_komnat', 'sozdal', 'zhilaya_ploshad', 'etazh', 'kolichestvo_sanuzlov',
                        'tip_komnat', 'remont', 'region', 'gorod', 'raion', 'mikroraion', 'metro_stantsii', 'opublikovano']
    search_fields = ['nomer_kvartiry', 'mnogoetazhka__ulitsa', 'mnogoetazhka__nomer_doma', 'mnogoetazhka__gorod_tekst']


# ----------------------------------------------------------------------
# ViewSet'ы для объектов, которые НЕ имеют открытого доступа (только для риэлторов)
# ----------------------------------------------------------------------
class KomnataViewSet(MyagkoeUdalenieModelViewSet):
    queryset = Komnata.objects.all()
    serializer_class = KomnataSerializer
    filterset_fields = ['ploshad_komnaty', 'sozdal', 'etazh', 'opublikovano']
    search_fields = ['opisanie']

    def get_queryset(self):
        qs = super().get_queryset()
        # фильтр по квартире
        kvartira_id = self.request.query_params.get('kvartira_id')
        if kvartira_id:
            qs = qs.filter(tip_obekta=ContentType.objects.get_for_model(Kvartira), id_obekta=kvartira_id)
        dom_id = self.request.query_params.get('dom_id')
        if dom_id:
            qs = qs.filter(tip_obekta=ContentType.objects.get_for_model(ChastnyiDom), id_obekta=dom_id)
        return qs


class RegionSettingsViewSet(viewsets.ModelViewSet):
    queryset = RegionSettings.objects.all()
    serializer_class = RegionSettingsSerializer
    permission_classes = [AllowAny]  # только главный риэлтор

    def get_object(self):
        # Всегда работаем с единственной записью (id=1)
        return RegionSettings.get_settings()

    def list(self, request, *args, **kwargs):
        # Перенаправляем list на retrieve единственной записи
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Запрещаем создание новой записи
        return Response({'detail': 'Используйте PUT/PATCH для обновления'}, status=405)


class ArendaViewSet(MyagkoeUdalenieModelViewSet):
    queryset = Arenda.objects.all()
    serializer_class = ArendaSerializer
    filterset_fields = ['tsena', 'kurenie', 'deti', 'zhivotnye', 'spalnyh_mest']
    search_fields = []


class ProdazhaViewSet(MyagkoeUdalenieModelViewSet):
    queryset = Prodazha.objects.all()
    serializer_class = ProdazhaSerializer
    filterset_fields = ['tsena']
    search_fields = []


class KlientViewSet(MyagkoeUdalenieModelViewSet):
    queryset = Klient.objects.all()
    serializer_class = KlientSerializer
    filterset_fields = ['otvetstvennyi']
    search_fields = ['imya', 'familiya', 'telefon', 'email']


class VstrechaViewSet(MyagkoeUdalenieModelViewSet):
    queryset = Vstrecha.objects.all()
    serializer_class = VstrechaSerializer
    filterset_fields = ['zayavka', 'status', 'sozdal']
    search_fields = ['zayavka__klient__imya', 'zayavka__klient__familiya', 'zayavka__klient__telefon', 'mesto', 'kommentariy']

    def perform_create(self, serializer):
        vstrecha = serializer.save(sozdal=self.request.user)
        token = TokenPodtverzhdeniyaVstrechi.objects.create(vstrecha=vstrecha)

        # Уведомление клиенту (если есть email и разрешены)
        klient = vstrecha.zayavka.klient
        if klient.uvedomleniya_vklyucheny and klient.email:
            remind_time = vstrecha.data_vremya - timedelta(hours=vstrecha.napominanie_za_chasov)
            if remind_time > timezone.now():
                link = f"{settings.FRONTEND_URL}/meeting/confirm/{token.token}/"
                UvedomlenieKlienta.objects.create(
                    klient=klient,
                    soobshchenie=f'Напоминание о встрече по заявке #{vstrecha.zayavka.id} на {vstrecha.data_vremya.strftime("%d.%m.%Y %H:%M")}',
                    ssylka=link,
                    kanal='email',
                    status_otpravki='pending',
                    planirovannoe_vremya=remind_time
                )

        # Уведомление риэлтору (создателю встречи)
        if vstrecha.sozdal and vstrecha.sozdal.email:
            remind_time_realtor = vstrecha.data_vremya - timedelta(hours=vstrecha.napominanie_za_chasov)
            if remind_time_realtor > timezone.now():
                Uvedomlenie.objects.create(
                    poluchatel=vstrecha.sozdal,
                    tip='meeting_reminder',
                    soobshchenie=f'Напоминание о встрече по заявке #{vstrecha.zayavka.id} на {vstrecha.data_vremya.strftime("%d.%m.%Y %H:%M")}',
                    ssylka=f'{settings.ADMIN_URL}/meetings/{vstrecha.id}/',
                    kanal='email',
                    status_otpravki='pending',
                    planirovannoe_vremya=remind_time_realtor
                )

        # Уведомление главным риэлторам (за 2 часа до встречи)
        head_realtors = User.objects.filter(groups__name='Главный риэлтор', is_active=True)
        for head in head_realtors:
            # Исключаем того же пользователя, если он и есть создатель (необязательно, но можно)
            if head == vstrecha.sozdal:
                continue
            if head.email:
                remind_time_head = vstrecha.data_vremya - timedelta(hours=2)
                if remind_time_head > timezone.now():
                    Uvedomlenie.objects.create(
                        poluchatel=head,
                        tip='head_meeting_reminder',
                        soobshchenie=f'Встреча по заявке #{vstrecha.zayavka.id} с клиентом {klient.imya} {klient.familiya} состоится {vstrecha.data_vremya.strftime("%d.%m.%Y %H:%M")}. Риэлтор: {vstrecha.sozdal.get_full_name() or vstrecha.sozdal.username}',
                        ssylka=f'{settings.ADMIN_URL}/meetings/{vstrecha.id}/',
                        kanal='email',
                        status_otpravki='pending',
                        planirovannoe_vremya=remind_time_head
                    )

        # Обновление статуса заявки
        if vstrecha.zayavka and vstrecha.zayavka.status not in ['contract_signed', 'rejected']:
            vstrecha.zayavka.status = 'meeting_scheduled'
            vstrecha.zayavka.save(update_fields=['status'])

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.groups.filter(name='Главный риэлтор').exists():
            return qs
        else:
            # обычный риэлтор видит только свои встречи
            return qs.filter(sozdal=user)

    def perform_update(self, serializer):
        instance = serializer.save()
        new_status = serializer.validated_data.get('status', instance.status)

        allowed_transitions = {
            'new': ['viewed'],
            'viewed': ['call_made', 'contacted'],  # из просмотренной – звонок или контакт
            'call_made': ['contacted', 'no_answer', 'callback', 'rejected_at_call'],
            'no_answer': ['callback', 'rejected_at_call'],  # если не дозвонился
            'callback': ['contacted', 'rejected_at_call'],  # перезвонить позже
            'contacted': ['meeting_scheduled', 'thinking', 'rejected_at_call'],
            'meeting_scheduled': ['pending_result', 'rejected_at_meeting'],
            'pending_result': ['thinking', 'contract_signed', 'rejected_at_meeting'],
            'thinking': ['contract_signed', 'rejected_at_meeting'],
            # финальные статусы: contract_signed, rejected_at_call, rejected_at_meeting
        }
        if new_status and new_status != instance.status:
            # Запрещаем ручную установку call_made
            if new_status == 'call_made' and instance.status not in ['new', 'viewed']:
                raise serializers.ValidationError(
                    {'status': 'Статус "Совершён звонок" может быть установлен только автоматически при показе номера'})
        if 'status' in serializer.validated_data:
            zayavka = instance.zayavka
            if new_status == 'completed':
                # Встреча состоялась – переводим заявку в ожидание результата
                if zayavka and zayavka.status not in ['contract_signed', 'rejected_at_meeting', 'pending_result',
                                                      'thinking']:
                    zayavka.status = 'pending_result'
                    zayavka.save(update_fields=['status'])
                    # Уведомление создателю встречи
                    if instance.sozdal:
                        remind_time = timezone.now() + timedelta(hours=settings.REMINDER_AFTER_MEETING_HOURS)
                        Uvedomlenie.objects.create(
                            poluchatel=instance.sozdal,
                            tip='meeting_result',
                            soobshchenie=f'Необходимо подвести итог встречи по заявке #{zayavka.id}',
                            ssylka=f'{settings.ADMIN_URL}/meetings/{instance.id}/',
                            kanal='email',
                            status_otpravki='pending',
                            planirovannoe_vremya=remind_time
                        )

            elif new_status == 'cancelled':
                # Встреча отменена
                if zayavka and zayavka.status not in ['contract_signed', 'rejected_at_meeting']:
                    zayavka.status = 'rejected_at_meeting'
                    zayavka.save(update_fields=['status'])
                    # Определяем инициатора
                    if instance.klient_otkazal:
                        initiator = 'клиент'
                    else:
                        initiator = f'риэлтор {self.request.user.get_full_name() or self.request.user.username}'
                    SobytieZayavki.objects.create(
                        zayavka=zayavka,
                        tip_sobytiya='rejected',
                        opisanie=f'Встреча отменена ({initiator})',
                        sozdal=self.request.user if not instance.klient_otkazal else None
                    )

# ----------------------------------------------------------------------
# Остальные ViewSet'ы
# ----------------------------------------------------------------------
class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    pagination_class = None


class GorodViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = GorodSerializer
    filterset_fields = ['region']
    search_fields = ['nazvanie']

    def get_queryset(self):
        return Gorod.objects.all().select_related('region')


class MetroStantsiyaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = MetroStantsiyaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # добавить эту строку
    filterset_fields = ['gorod']
    search_fields = ['nazvanie']
    queryset = MetroStantsiya.objects.all()

    def get_queryset(self):
        queryset = MetroStantsiya.objects.all()
        gorod = self.request.query_params.get('gorod')
        if gorod:
            queryset = queryset.filter(gorod_id=gorod)
        return queryset


class SobytieZayavkiViewSet(viewsets.ModelViewSet):
    queryset = SobytieZayavki.objects.all()
    serializer_class = SobytieZayavkiSerializer
    permission_classes = [IsAuthenticated, IsRealtor]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['zayavka', 'tip_sobytiya', 'sozdal']
    search_fields = ['opisanie']

    def perform_create(self, serializer):
        serializer.save(sozdal=self.request.user)


class ZayavkaViewSet(MyagkoeUdalenieModelViewSet):
    queryset = Zayavka.objects.all()
    serializer_class = ZayavkaSerializer
    filterset_fields = ['klient__imya', 'klient__familiya', 'klient__telefon', 'kommentariy_klienta', 'naznachen',]
    search_fields = ['kommentariy_klienta']

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [AllowAny]  # разрешаем создание всем
        else:
            permission_classes = [IsAuthenticated, IsRealtor]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.groups.filter(name='Главный риэлтор').exists():
            return qs
        # обычный риэлтор видит свои заявки и заявки без ответственного
        return qs.filter(Q(naznachen=user) | Q(naznachen__isnull=True))

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Если статус "new", меняем на "viewed" и создаём событие просмотра
        if instance.status == 'new':
            instance.status = 'viewed'
            instance.save(update_fields=['status'])
            SobytieZayavki.objects.create(
                zayavka=instance,
                tip_sobytiya='view',
                opisanie='Просмотр карточки заявки',
                sozdal=request.user if request.user.is_authenticated else None
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        zayavka = self.get_object()
        if zayavka.naznachen is not None:
            return Response({'error': 'Заявка уже взята другим риэлтором'}, status=400)
        if zayavka.status == 'taken':
            return Response({'error': 'Заявка уже в обработке'}, status=400)
        zayavka.naznachen = request.user
        zayavka.status = 'taken'
        zayavka.taken_at = timezone.now()
        zayavka.save(update_fields=['naznachen', 'status', 'taken_at'])
        SobytieZayavki.objects.create(
            zayavka=zayavka,
            tip_sobytiya='comment',  # или можно добавить новый тип 'taken'
            opisanie=f'Риэлтор {request.user.get_full_name() or request.user.username} взял заявку в обработку',
            sozdal=request.user
        )
        return Response({'status': 'taken'})

    @action(detail=True, methods=['post'])
    def mark_call(self, request, pk=None):
        zayavka = self.get_object()
        if zayavka.status in ['new', 'viewed', 'taken']:
            zayavka.status = 'call_made'
            if not zayavka.naznachen:
                zayavka.naznachen = request.user
            zayavka.save(update_fields=['status'])
            SobytieZayavki.objects.create(
                zayavka=zayavka,
                tip_sobytiya='call',
                opisanie='Совершён звонок',
                sozdal=request.user
            )
            # Создаём напоминание риэлтору
            if zayavka.naznachen:
                remind_time = timezone.now() + timedelta(minutes=settings.REMINDER_AFTER_CALL_MINUTES)
                Uvedomlenie.objects.create(
                    poluchatel=zayavka.naznachen,
                    tip='call_result',
                    soobshchenie=f'Необходимо подвести итог звонка по заявке #{zayavka.id}',
                    ssylka=f'{settings.ADMIN_URL}/requests/{zayavka.id}/',  # ссылка на карточку заявки в админке
                    kanal='email',
                    status_otpravki='pending',
                    planirovannoe_vremya=remind_time
                )
            return Response({'status': 'call_made'})
        return Response({'error': 'Нельзя отметить звонок в текущем статусе'}, status=400)

    @action(detail=True, methods=['post'])
    def set_thinking(self, request, pk=None):
        zayavka = self.get_object()
        if zayavka.status not in ['contract_signed', 'rejected_at_meeting']:
            zayavka.status = 'thinking'
            zayavka.save(update_fields=['status'])
            SobytieZayavki.objects.create(
                zayavka=zayavka,
                tip_sobytiya='comment',
                opisanie='Клиент думает (установлено риэлтором)',
                sozdal=request.user
            )
            return Response({'status': 'thinking'})
        return Response({'error': 'Нельзя изменить статус'}, status=400)

    @action(detail=True, methods=['post'], url_path='set-meeting-result')
    def set_meeting_result(self, request, pk=None):
        zayavka = self.get_object()
        result = request.data.get('result')
        if result not in ['contract_signed', 'thinking_after_meeting', 'rejected_at_meeting']:
            return Response({'error': 'Некорректный результат'}, status=400)

        if zayavka.status != 'pending_result':
            return Response({'error': 'Можно установить результат только для заявок в статусе "Ожидание результата"'},
                            status=400)

        zayavka.status = result
        zayavka.save(update_fields=['status'])

        SobytieZayavki.objects.create(
            zayavka=zayavka,
            tip_sobytiya=result if result != 'thinking_after_meeting' else 'comment',
            opisanie=f'Результат встречи: {result}',
            sozdal=request.user
        )
        return Response({'status': zayavka.status})

    @action(detail=True, methods=['post'])
    def set_call_result(self, request, pk=None):
        zayavka = self.get_object()
        result = request.data.get('result')
        # Добавляем 'thinking_after_call'
        if result not in ['contacted', 'no_answer', 'callback', 'rejected_at_call', 'thinking_after_call']:
            return Response({'error': 'Некорректный результат'}, status=400)

        SobytieZayavki.objects.create(
            zayavka=zayavka,
            tip_sobytiya=result,
            opisanie=request.data.get('comment', ''),
            sozdal=request.user
        )

        status_map = {
            'contacted': 'contacted',
            'no_answer': 'no_answer',
            'callback': 'callback',
            'rejected_at_call': 'rejected_at_call',
            'thinking_after_call': 'thinking_after_call',
        }
        zayavka.status = status_map[result]
        zayavka.save(update_fields=['status'])
        return Response({'status': zayavka.status})

    @action(detail=True, methods=['post'])
    def mark_call(self, request, pk=None):
        zayavka = self.get_object()
        if zayavka.status in ['new', 'viewed']:
            zayavka.status = 'call_made'
            zayavka.save(update_fields=['status'])
            SobytieZayavki.objects.create(
                zayavka=zayavka,
                tip_sobytiya='call',
                opisanie='Совершён звонок',
                sozdal=request.user
            )
            return Response({'status': 'call_made'})
        return Response({'error': 'Нельзя отметить звонок в текущем статусе'}, status=400)

    @action(detail=True, methods=['post'])
    def add_event(self, request, pk=None):
        zayavka_obj = self.get_object()
        serializer = SobytieZayavkiSerializer(data=request.data)
        if serializer.is_valid():
            sobytie = serializer.save(zayavka=zayavka_obj, sozdal=request.user)
            current_status = zayavka_obj.status
            new_status = None

            # Не меняем статус, если заявка уже в финальном состоянии
            if current_status not in ['contract_signed', 'rejected']:
                if sobytie.tip_sobytiya == 'view' and current_status == 'new':
                    new_status = 'viewed'
                elif sobytie.tip_sobytiya == 'call' and current_status in ['new', 'viewed']:
                    new_status = 'contacted'
                elif sobytie.tip_sobytiya == 'meeting_scheduled' and current_status in ['new', 'viewed', 'contacted']:
                    new_status = 'meeting_scheduled'
                elif sobytie.tip_sobytiya == 'meeting_done':
                    new_status = 'contract_signed'
                elif sobytie.tip_sobytiya == 'rejected':
                    new_status = 'rejected'
                elif sobytie.tip_sobytiya == 'offer':
                    new_status = 'contract_signed'

            if new_status:
                zayavka_obj.status = new_status
                zayavka_obj.save(update_fields=['status'])

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UvedomlenieViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Uvedomlenie.objects.all()
    serializer_class = UvedomlenieSerializer
    permission_classes = [IsAuthenticated, IsRealtor]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['tip', 'prochitano']
    search_fields = ['soobshchenie']

    def get_queryset(self):
        return Uvedomlenie.objects.filter(poluchatel=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        uvedomlenie = self.get_object()
        uvedomlenie.prochitano = True
        uvedomlenie.save()
        return Response({'status': 'marked as read'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsHeadRealtor]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['is_active', 'groups']
    search_fields = ['username', 'email', 'first_name', 'last_name']

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not user.check_password(old_password):
            return Response({'error': 'Wrong old password'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'status': 'password changed'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class UvedomlenieKlientaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UvedomlenieKlientaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UvedomlenieKlienta.objects.none()


class DashboardViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsHeadRealtor]

    def get_realtor_filter(self):
        """Возвращает Q-объект для фильтрации по риэлтору, если передан параметр realtor_id."""
        realtor_id = self.request.query_params.get('realtor_id')
        if realtor_id and realtor_id != 'all':
            # Для заявок фильтруем по полю naznachen (ответственный)
            return Q(naznachen_id=realtor_id)
        return Q()

    def get_date_filter(self, field_name):
        """Возвращает Q-объект для фильтрации по датам start_date и end_date."""
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        q = Q()
        if start:
            q &= Q(**{f'{field_name}__date__gte': start})
        if end:
            q &= Q(**{f'{field_name}__date__lte': end})
        return q

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Общая сводка: всего заявок, договоров, конверсия, спам."""
        realtor_filter = self.get_realtor_filter()
        date_filter = self.get_date_filter('sozdano')

        qs = Zayavka.objects.filter(realtor_filter & date_filter)
        total_requests = qs.count()
        signed = qs.filter(status='contract_signed').count()
        spam = qs.filter(eto_spam=True).count()

        conversion = (signed / total_requests * 100) if total_requests > 0 else 0

        return Response({
            'total_requests': total_requests,
            'signed': signed,
            'conversion': round(conversion, 2),
            'spam': spam,
        })

    @action(detail=False, methods=['get'])
    def requests_by_status(self, request):
        """Количество заявок по статусам с фильтрацией."""
        realtor_filter = self.get_realtor_filter()
        date_filter = self.get_date_filter('sozdano')
        data = Zayavka.objects.filter(realtor_filter & date_filter) \
                .values('status') \
                .annotate(count=Count('id')) \
                .order_by('status')
        return Response(data)

    @action(detail=False, methods=['get'])
    def realtor_activity(self, request):
        """Активность риэлторов: заявки, встречи, события, сделки."""
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')
        realtors = User.objects.filter(groups__name__in=['Риэлтор', 'Главный риэлтор'])

        result = []
        for realtor in realtors:
            # заявки, где назначен этот риэлтор
            requests_qs = Zayavka.objects.filter(naznachen=realtor)
            meetings_qs = Vstrecha.objects.filter(sozdal=realtor)
            events_qs = SobytieZayavki.objects.filter(sozdal=realtor)

            if start:
                requests_qs = requests_qs.filter(sozdano__date__gte=start)
                meetings_qs = meetings_qs.filter(sozdano__date__gte=start)
                events_qs = events_qs.filter(sozdano__date__gte=start)
            if end:
                requests_qs = requests_qs.filter(sozdano__date__lte=end)
                meetings_qs = meetings_qs.filter(sozdano__date__lte=end)
                events_qs = events_qs.filter(sozdano__date__lte=end)

            signed = requests_qs.filter(status='contract_signed').count()

            result.append({
                'realtor_id': realtor.id,
                'realtor_name': realtor.get_full_name() or realtor.username,
                'requests_assigned': requests_qs.count(),
                'meetings_created': meetings_qs.count(),
                'events_created': events_qs.count(),
                'deals_signed': signed,
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def requests_timeline(self, request):
        """Динамика заявок по дням за последние N дней (параметр days, по умолчанию 30)."""
        realtor_filter = self.get_realtor_filter()
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days-1)

        qs = Zayavka.objects.filter(
            realtor_filter,
            sozdano__date__gte=start_date
        ).extra({'date': "date(sozdano)"}).values('date').annotate(count=Count('id')).order_by('date')

        # заполним все дни
        result = []
        for day in (start_date + timedelta(n) for n in range(days)):
            day_str = day.isoformat()
            count = next((item['count'] for item in qs if str(item['date']) == day_str), 0)
            result.append({'date': day_str, 'count': count})

        return Response(result)

    @action(detail=False, methods=['get'])
    def top_realtors(self, request):
        """Топ риэлторов по сделкам за период."""
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')
        limit = int(request.query_params.get('limit', 5))

        realtors = User.objects.filter(groups__name__in=['Риэлтор', 'Главный риэлтор'])
        data = []
        for realtor in realtors:
            qs = Zayavka.objects.filter(naznachen=realtor, status='contract_signed')
            if start:
                qs = qs.filter(sozdano__date__gte=start)
            if end:
                qs = qs.filter(sozdano__date__lte=end)
            count = qs.count()
            if count > 0:
                data.append({'realtor_id': realtor.id, 'realtor_name': realtor.get_full_name() or realtor.username, 'signed': count})
        data.sort(key=lambda x: x['signed'], reverse=True)
        return Response(data[:limit])


# ----------------------------------------------------------------------
# Корзина (Korzina)
# ----------------------------------------------------------------------
class KorzinaViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsHeadRealtor]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        trash_items = []
        soft_delete_models = [
            ZemelnyiUchastok, Mnogoetazhka, ChastnyiDom, Kvartira, Komnata,
            Arenda, Prodazha, Klient, Zayavka, Vstrecha
        ]
        for model in soft_delete_models:
            qs = model.all_objects.filter(udaleno=True)
            for obj in qs:
                trash_items.append({
                    'id': obj.id,
                    'tip_obekta': ContentType.objects.get_for_model(model).name,
                    'predstavlenie': str(obj),
                    'data_udaleniya': obj.data_udaleniya,
                    'udalil': str(obj.udalil) if obj.udalil else None,
                    'detali': obj
                })
        trash_items.sort(key=lambda x: x['data_udaleniya'], reverse=True)
        return trash_items

    def list(self, request):
        trash_items = self.get_queryset()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(trash_items, request)
        if page is not None:
            serializer = KorzinaSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = KorzinaSerializer(trash_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='restore/(?P<model>[^/.]+)/(?P<pk>[^/.]+)')
    def restore(self, request, model, pk):
        model_class = self._get_model_by_name(model)
        if model_class is None:
            return Response({'error': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            obj = model_class.all_objects.get(id=pk, udaleno=True)
        except model_class.DoesNotExist:
            return Response({'error': 'Object not found'}, status=status.HTTP_404_NOT_FOUND)

        obj.restore(user=request.user)
        return Response({'status': 'restored'})

    @action(detail=False, methods=['post'], url_path='hard-delete/(?P<model>[^/.]+)/(?P<pk>[^/.]+)')
    def hard_delete(self, request, model, pk):
        try:
            model_class = self._get_model_by_name(model)
            if model_class is None:
                return Response({'error': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)
            obj = model_class.all_objects.get(id=pk, udaleno=True)
            obj.hard_delete()
            return Response({'status': 'hard deleted'})
        except model_class.DoesNotExist:
            return Response({'error': 'Object not found'}, status=status.HTTP_404_NOT_FOUND)

    @staticmethod
    def _get_model_by_name(name):
        mapping = {
            'landplot': ZemelnyiUchastok,
            'apartment': Mnogoetazhka,
            'detachedhouse': ChastnyiDom,
            'flat': Kvartira,
            'room': Komnata,
            'rentalrealty': Arenda,
            'salerealty': Prodazha,
            'client': Klient,
            'request': Zayavka,
            'meeting': Vstrecha,
        }
        return mapping.get(name.lower())


# ----------------------------------------------------------------------
# Генерация описаний через ИИ
# ----------------------------------------------------------------------
class AIDescriptionViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsRealtor]

    @action(detail=False, methods=['post'], url_path='generate/(?P<model>[^/.]+)/(?P<pk>[^/.]+)')
    def generate(self, request, model, pk):
        purpose = request.data.get('purpose', 'sale')
        if purpose not in ['sale', 'rent']:
            return Response({'error': 'purpose must be "sale" or "rent"'}, status=400)

        try:
            model_class = self._get_model_by_name(model)
            obj = model_class.objects.get(id=pk, udaleno=False)
        except model_class.DoesNotExist:
            return Response({'error': 'Object not found'}, status=404)

        prompt = self._build_prompt(obj, purpose)
        description = generate_description_with_gpt(prompt)

        if description is None:
            return Response({'error': 'Не удалось сгенерировать описание'}, status=500)

        return Response({'description': description})

    def _build_prompt(self, obj, purpose):
        action = "продажи" if purpose == 'sale' else "аренды"
        if isinstance(obj, Kvartira):
            return (f"Квартира {obj.kolichestvo_komnat}-комнатная, площадь {obj.zhilaya_ploshad} кв.м, "
                    f"этаж {obj.etazh}, ремонт {obj.get_remont_display()}. "
                    f"Адрес: {obj.mnogoetazhka.gorod_tekst}, {obj.mnogoetazhka.ulitsa} {obj.mnogoetazhka.nomer_doma}, "
                    f"кв.{obj.nomer_kvartiry}. Составьте привлекательное описание для {action}.")
        elif isinstance(obj, ChastnyiDom):
            return (f"Частный дом, {obj.kolichestvo_komnat} комнат, площадь {obj.zhilaya_ploshad} кв.м, "
                    f"участок {obj.ploshad_uchastka} соток. Год постройки: {obj.god_postroiki}. "
                    f"Адрес: {obj.gorod_tekst}, {obj.ulitsa} {obj.nomer_doma}. Составьте описание для {action}.")
        elif isinstance(obj, ZemelnyiUchastok):
            return (f"Земельный участок площадью {obj.ploshad_uchastka} соток, категория {obj.tip_uchastka}. "
                    f"Коммуникации: вода {'есть' if obj.voda else 'нет'}, газ {'есть' if obj.gaz else 'нет'}, "
                    f"канализация {'есть' if obj.kanalizatsiya else 'нет'}. Адрес: {obj.gorod}, {obj.ulitsa}. "
                    f"Составьте описание для {action}.")
        return f"Составьте описание для объекта недвижимости: {obj}"

    @staticmethod
    def _get_model_by_name(name):
        mapping = {
            'landplot': ZemelnyiUchastok,
            'apartment': Mnogoetazhka,
            'detachedhouse': ChastnyiDom,
            'flat': Kvartira,
            'room': Komnata,
        }
        return mapping.get(name.lower())
class MikroraionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = MikroraionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['raion']
    search_fields = ['nazvanie']
    queryset = Mikroraion.objects.all()
