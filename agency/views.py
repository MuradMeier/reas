# views.py (полностью переименован на русские термины в транслите)
import os
from datetime import timedelta
from django.db.models.aggregates import Count
from django.db.models.query_utils import Q
from django.http.response import HttpResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.gis.db.models.functions import Distance
from .serializers import *
from .permissions import IsHeadRealtor, IsRealtor
from .services.d2gis import get_districts_for_city, get_mikroraiony_for_city_or_raion
from .utils import generate_description_with_gpt, geocode_address
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.permissions import AllowAny, IsAuthenticated

@api_view(['GET'])
@permission_classes([AllowAny])
def search_object(request):
    city = request.GET.get('city')
    street = request.GET.get('street')
    house_number = request.GET.get('house_number')
    apartment = request.GET.get('apartment')

    # Поиск квартиры (если указана квартира)
    if apartment:
        flat = Kvartira.objects.filter(
            mnogoetazhka__gorod_tekst__iexact=city,
            mnogoetazhka__ulitsa__iexact=street,
            mnogoetazhka__nomer_doma__iexact=house_number,
            nomer_kvartiry__iexact=apartment,
            opublikovano=True
        ).first()
        if flat:
            serializer = KvartiraSerializer(flat, context={'request': request})
            data = serializer.data
            data['object_type'] = 'flat'
            return Response(data)

    # Поиск частного дома (без квартиры)
    house = ChastnyiDom.objects.filter(
        gorod_tekst__iexact=city,
        ulitsa__iexact=street,
        nomer_doma__iexact=house_number,
        opublikovano=True
    ).first()
    if house:
        serializer = ChastnyiDomSerializer(house, context={'request': request})
        data = serializer.data
        data['object_type'] = 'house'
        return Response(data)

    # Поиск участка (если передан house_number как номер участка)
    land = ZemelnyiUchastok.objects.filter(
        gorod_tekst__iexact=city,
        ulitsa__iexact=street,
        nomer_uchastka__iexact=house_number,
        opublikovano=True
    ).first()
    if land:
        serializer = ZemelnyiUchastokSerializer(land, context={'request': request})
        data = serializer.data
        data['object_type'] = 'land'
        return Response(data)

    return Response({'found': False})

def init_db(request):
    # Проверка секретного токена
    secret_token = os.environ.get('INIT_DB_TOKEN')
    provided_token = request.GET.get('token')
    if not secret_token or provided_token != secret_token:
        return HttpResponse('Forbidden', status=403)

    from django.contrib.auth import get_user_model
    from agency.models import (
        TipSanuzla, BalkonLogdiaTip, TipKommunikatsii, TipVodosnabzheniya,
        TipKanalizatsii, MestopolozhenieSanuzla, Tekhnika, Mebel,
        Region, Gorod, Raion, Mikroraion, MetroStantsiya,
        ZemelnyiUchastok, Mnogoetazhka, ChastnyiDom, Kvartira, Komnata,
        Arenda, Prodazha, Klient, Zayavka, SobytieZayavki, Vstrecha,
        TokenPodtverzhdeniyaVstrechi, Uvedomlenie, UvedomlenieKlienta,
        RegionSettings
    )
    User = get_user_model()

    # 1. Удаляем все данные (включая мягко удалённые)
    TokenPodtverzhdeniyaVstrechi.objects.all().delete()
    UvedomlenieKlienta.objects.all().delete()
    Uvedomlenie.objects.all().delete()
    SobytieZayavki.objects.all().delete()
    Vstrecha.all_objects.all().delete()
    Zayavka.all_objects.all().delete()
    Arenda.all_objects.all().delete()
    Prodazha.all_objects.all().delete()
    Klient.all_objects.all().delete()
    Komnata.all_objects.all().delete()
    Kvartira.all_objects.all().delete()
    ChastnyiDom.all_objects.all().delete()
    Mnogoetazhka.all_objects.all().delete()
    ZemelnyiUchastok.all_objects.all().delete()

    # 2. Удаляем всех пользователей, кроме admin
    admin_user = User.objects.filter(username='admin').first()
    if admin_user:
        User.objects.exclude(pk=admin_user.pk).delete()
    else:
        superusers = User.objects.filter(is_superuser=True)
        if superusers.exists():
            User.objects.exclude(pk=superusers.first().pk).delete()
        else:
            User.objects.all().delete()

    # 3. Удаляем географические справочники (кроме регионов – мы их пересоздадим)
    MetroStantsiya.objects.all().delete()
    Mikroraion.objects.all().delete()
    Raion.objects.all().delete()
    Gorod.objects.all().delete()
    Region.objects.all().delete()  # удаляем старые регионы

    # 4. Создаём справочники (типы санузлов, техника и т.д.) – они не удаляются
    def create_reference_data():
        # ... (та же функция, что и раньше, создаёт справочники, если пусто)
        if TipSanuzla.objects.count() == 0:
            for name in ['Раздельный', 'Совмещенный', 'Гостевой']:
                TipSanuzla.objects.get_or_create(nazvanie=name)
        # ... и так далее
    create_reference_data()

    # 5. Создаём все регионы Российской Федерации
    REGIONS_LIST = [
        # Республики
        "Республика Адыгея", "Республика Алтай", "Республика Башкортостан", "Республика Бурятия",
        "Республика Дагестан", "Республика Ингушетия", "Кабардино-Балкарская Республика",
        "Республика Калмыкия", "Карачаево-Черкесская Республика", "Республика Карелия",
        "Республика Коми", "Республика Крым", "Республика Марий Эл", "Республика Мордовия",
        "Республика Саха (Якутия)", "Республика Северная Осетия — Алания", "Республика Татарстан",
        "Республика Тыва", "Удмуртская Республика", "Республика Хакасия", "Чеченская Республика",
        "Чувашская Республика",
        # Края
        "Алтайский край", "Забайкальский край", "Камчатский край", "Краснодарский край",
        "Красноярский край", "Пермский край", "Приморский край", "Ставропольский край",
        "Хабаровский край",
        # Области
        "Амурская область", "Архангельская область", "Астраханская область", "Белгородская область",
        "Брянская область", "Владимирская область", "Волгоградская область", "Вологодская область",
        "Воронежская область", "Ивановская область", "Иркутская область", "Калининградская область",
        "Калужская область", "Кемеровская область", "Кировская область", "Костромская область",
        "Курганская область", "Курская область", "Ленинградская область", "Липецкая область",
        "Магаданская область", "Московская область", "Мурманская область", "Нижегородская область",
        "Новгородская область", "Новосибирская область", "Омская область", "Оренбургская область",
        "Орловская область", "Пензенская область", "Псковская область", "Ростовская область",
        "Рязанская область", "Самарская область", "Саратовская область", "Сахалинская область",
        "Свердловская область", "Смоленская область", "Тамбовская область", "Тверская область",
        "Томская область", "Тульская область", "Тюменская область", "Ульяновская область",
        "Челябинская область", "Ярославская область",
        # Города федерального значения
        "Москва", "Санкт-Петербург", "Севастополь",
        # Автономная область
        "Еврейская автономная область",
        # Автономные округа
        "Ненецкий автономный округ", "Ханты-Мансийский автономный округ — Югра",
        "Чукотский автономный округ", "Ямало-Ненецкий автономный округ"
    ]

    def fetch_region_codes(region_name):
        """Получает kladr_id и fias_id для региона через DaData"""
        api_key = os.environ.get('DADATA_API_KEY')
        if not api_key:
            return None, None
        try:
            import requests
            response = requests.post(
                'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': f'Token {api_key}'
                },
                json={
                    'query': region_name,
                    'count': 1,
                    'from_bound': {'value': 'region'},
                    'to_bound': {'value': 'region'}
                },
                timeout=5
            )
            data = response.json()
            if data['suggestions']:
                suggestion = data['suggestions'][0]['data']
                kladr_id = suggestion.get('region_kladr_id')
                fias_id = suggestion.get('region_fias_id')
                if kladr_id and len(kladr_id) >= 2:
                    kladr_id = kladr_id[:2]  # берём первые два символа
                return kladr_id, fias_id
        except Exception as e:
            print(f"Ошибка получения кодов для {region_name}: {e}")
        return None, None

    for idx, region_name in enumerate(REGIONS_LIST, start=1):
        # Пытаемся получить коды из DaData
        kladr_id, fias_id = fetch_region_codes(region_name)
        region, created = Region.objects.get_or_create(
            nazvanie=region_name,
            defaults={
                'poryadok': idx,
                'kladr_id': kladr_id,
                'fias_id': fias_id
            }
        )
        if not created:
            # Если регион уже существует, но коды пустые — обновим
            if not region.kladr_id and kladr_id:
                region.kladr_id = kladr_id
                region.fias_id = fias_id
                region.save(update_fields=['kladr_id', 'fias_id'])

    return HttpResponse("База данных очищена. Созданы все регионы РФ и справочники. Города, районы, микрорайоны и метро не добавлены – они будут создаваться через DaData при добавлении объектов.")


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

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsAuthenticated, IsRealtor]
        return [permission() for permission in permission_classes]


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

@api_view(['GET'])
@permission_classes([AllowAny])
def district_autocomplete(request):
    """
    Автодополнение районов по выбранному городу.
    Параметры:
        city_id (int) - ID города в вашей БД
        query (str) - часть названия района (опционально, для фильтрации)
    """
    city_id = request.GET.get('city_id')
    if not city_id:
        return Response({'error': 'city_id required'}, status=400)

    try:
        gorod = Gorod.objects.get(id=city_id)
    except Gorod.DoesNotExist:
        return Response({'error': 'City not found'}, status=404)

    # Получаем все районы для города (с кэшированием и подгрузкой из 2ГИС)
    districts_qs = get_districts_for_city(gorod)

    # Опциональная фильтрация по вводу пользователя
    query = request.GET.get('query', '').strip()
    if query:
        districts_qs = districts_qs.filter(nazvanie__icontains=query)

    # Сортируем по названию
    districts_qs = districts_qs.order_by('nazvanie')[:20]

    data = [{'id': d.id, 'name': d.nazvanie} for d in districts_qs]
    return Response(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def mikroraion_autocomplete(request):
    """
    Автодополнение микрорайонов.
    Параметры:
        city_id (int) - ID города (обязателен)
        raion_id (int) - ID района (опционально, если указан – микрорайоны только в этом районе)
        query (str) - часть названия микрорайона (опционально)
    """
    city_id = request.GET.get('city_id')
    if not city_id:
        return Response({'error': 'city_id required'}, status=400)

    try:
        gorod = Gorod.objects.get(id=city_id)
    except Gorod.DoesNotExist:
        return Response({'error': 'City not found'}, status=404)

    raion_id = request.GET.get('raion_id')
    raion_obj = None
    if raion_id:
        try:
            raion_obj = Raion.objects.get(id=raion_id, gorod=gorod)
        except Raion.DoesNotExist:
            return Response({'error': 'District not found in this city'}, status=404)

    # Получаем микрорайоны через сервис (с кэшем)
    qs = get_mikroraiony_for_city_or_raion(gorod, raion_obj)

    # Фильтрация по вводу пользователя
    query = request.GET.get('query', '').strip()
    if query:
        qs = qs.filter(nazvanie__icontains=query)

    qs = qs.order_by('nazvanie')[:20]
    data = [{'id': m.id, 'name': m.nazvanie} for m in qs]
    return Response(data)

@api_view(['GET'])
def get_or_create_city(request):
    region_id = request.GET.get('region_id')
    name = request.GET.get('name')
    if not region_id or not name:
        return Response({'error': 'region_id and name required'}, status=400)
    try:
        region = Region.objects.get(id=region_id)
    except Region.DoesNotExist:
        return Response({'error': 'Region not found'}, status=404)

    city, created = Gorod.objects.get_or_create(
        nazvanie=name,
        region=region,
        defaults={'est_metro': False}
    )
    return Response({'id': city.id, 'created': created})