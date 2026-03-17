import random
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.geos import Point
from faker import Faker

from your_app.models import (  # замените your_app на имя вашего приложения
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
    print(f"Создан пользователь: {username} ({'главный' if i<3 else 'риэлтор'})")

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
        remont=random.choice(['', 'euro', 'cosmetic', 'capital', 'designer']) if random.choice([True, False]) else '',
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