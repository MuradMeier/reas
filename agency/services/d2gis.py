# agency/services/d2gis.py
import requests
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

def geocode_city(city_name: str, region_name: str = None):
    """
    Находит город в 2ГИС и возвращает его идентификатор (id) и bounding box.
    """
    url = "https://catalog.api.2gis.com/3.0/items/geocode"
    params = {
        'q': city_name,
        'fields': 'items.point,items.bbox,items.id,items.full_name,items.country,items.region,items.city',
        'key': settings.D2GIS_API_KEY,
    }
    if region_name:
        params['q'] = f"{city_name}, {region_name}"

    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        if data.get('result') and data['result']['items']:
            item = data['result']['items'][0]
            return {
                'id': item.get('id'),
                'bbox': item.get('bbox'),
                'full_name': item.get('full_name'),
                'point': item.get('point'),
            }
    except Exception as e:
        logger.error(f"2GIS geocode error: {e}")
    return None


def fetch_districts_from_2gis(city_name: str, region_name: str = None):
    """
    Получает список районов города через 2ГИС.
    Возвращает список названий районов (строки) или пустой список.
    """
    # Сначала получаем геометку города
    city_info = geocode_city(city_name, region_name)
    if not city_info or not city_info.get('bbox'):
        logger.warning(f"City not found or no bbox: {city_name}")
        return []

    bbox = city_info['bbox']
    # Используем поиск по области, запрос "район"
    url = "https://catalog.api.2gis.com/3.0/items/search"
    params = {
        'q': 'район',
        'fields': 'items.name,items.id,items.point',
        'key': settings.D2GIS_API_KEY,
        'bbox': f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        'page_size': 50,
    }
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        districts = []
        for item in data.get('result', {}).get('items', []):
            name = item.get('name')
            if name and name not in districts:
                districts.append(name)
        return districts
    except Exception as e:
        logger.error(f"2GIS search districts error: {e}")
        return []


def get_districts_for_city(gorod_obj):
    """
    Получает или кэширует районы для города (модель Gorod).
    Возвращает QuerySet районов (Raion), созданных для этого города.
    """
    from agency.models import Raion

    # Пытаемся получить из кэша (на 7 дней)
    cache_key = f"districts_{gorod_obj.id}"
    districts = cache.get(cache_key)
    if districts is not None:
        return Raion.objects.filter(id__in=districts)

    # Ищем в БД уже сохранённые районы для этого города
    existing = Raion.objects.filter(gorod=gorod_obj)
    if existing.exists():
        cache.set(cache_key, list(existing.values_list('id', flat=True)), 60*60*24*7)
        return existing

    # Нет в БД — идём в 2ГИС
    region_name = gorod_obj.region.nazvanie if gorod_obj.region else None
    districts_names = fetch_districts_from_2gis(gorod_obj.nazvanie, region_name)

    created = []
    for name in districts_names:
        raion, _ = Raion.objects.get_or_create(
            nazvanie=name,
            gorod=gorod_obj
        )
        created.append(raion.id)

    cache.set(cache_key, created, 60*60*24*7)
    return Raion.objects.filter(gorod=gorod_obj)


# agency/services/d2gis.py (добавить в конец файла)

def fetch_mikroraiony_from_2gis(city_name: str, region_name: str = None, district_name: str = None):
    """
    Получает список микрорайонов города через 2ГИС.
    Если указан district_name, ищет микрорайоны внутри района.
    Возвращает список названий микрорайонов (строки) или пустой список.
    """
    # Сначала получаем геометрию города
    city_info = geocode_city(city_name, region_name)
    if not city_info or not city_info.get('bbox'):
        logger.warning(f"City not found or no bbox: {city_name}")
        return []

    bbox = city_info['bbox']
    url = "https://catalog.api.2gis.com/3.0/items/search"

    # Если передан район, используем его для уточнения (через поиск по точке района)
    if district_name:
        # Попробуем найти геометрию района по названию в пределах города
        params = {
            'q': district_name,
            'fields': 'items.name,items.point,items.bbox',
            'key': settings.D2GIS_API_KEY,
            'bbox': f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
            'page_size': 1,
            'type': 'adm_div.district'  # тип "район"
        }
        try:
            resp = requests.get(url, params=params, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if data.get('result') and data['result']['items']:
                district_bbox = data['result']['items'][0].get('bbox')
                if district_bbox:
                    # Ищем микрорайоны внутри bbox района
                    bbox = district_bbox
        except Exception as e:
            logger.error(f"2GIS district bbox error: {e}")

    # Ищем объекты с типом "микрорайон" (или "locality", "microdistrict")
    params = {
        'q': 'микрорайон',
        'fields': 'items.name,items.id,items.point',
        'key': settings.D2GIS_API_KEY,
        'bbox': f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        'page_size': 50,
        'type': 'adm_div.microdistrict'  # тип микрорайон (может отличаться, иногда 'locality')
    }
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        mikros = []
        for item in data.get('result', {}).get('items', []):
            name = item.get('name')
            # Очищаем от лишних слов, оставляем только название
            if name and 'микрорайон' in name.lower():
                # Убираем слово "микрорайон", оставляем чистое название
                clean_name = name.replace('микрорайон', '').replace('Микрорайон', '').strip()
                if clean_name:
                    name = clean_name
            if name and name not in mikros:
                mikros.append(name)
        return mikros
    except Exception as e:
        logger.error(f"2GIS search microdistricts error: {e}")
        return []


def get_mikroraiony_for_city_or_raion(gorod_obj, raion_obj=None):
    """
    Возвращает QuerySet микрорайонов для города (если raion_obj=None)
    или для района (если raion_obj передан).
    С кэшированием и автоматическим запросом к 2ГИС.
    """
    from agency.models import Mikroraion, Raion

    if raion_obj:
        # Фильтруем по району
        cache_key = f"mikros_raion_{raion_obj.id}"
        mikros = cache.get(cache_key)
        if mikros is not None:
            return Mikroraion.objects.filter(id__in=mikros)

        existing = Mikroraion.objects.filter(raion=raion_obj)
        if existing.exists():
            cache.set(cache_key, list(existing.values_list('id', flat=True)), 60 * 60 * 24 * 7)
            return existing

        # Загружаем из 2ГИС с учётом района
        region_name = gorod_obj.region.nazvanie if gorod_obj.region else None
        names = fetch_mikroraiony_from_2gis(gorod_obj.nazvanie, region_name, raion_obj.nazvanie)
        created_ids = []
        for name in names:
            mik, _ = Mikroraion.objects.get_or_create(
                nazvanie=name,
                raion=raion_obj,
                gorod=gorod_obj
            )
            created_ids.append(mik.id)
        cache.set(cache_key, created_ids, 60 * 60 * 24 * 7)
        return Mikroraion.objects.filter(raion=raion_obj)
    else:
        # Фильтруем по городу (микрорайоны без района)
        cache_key = f"mikros_city_{gorod_obj.id}"
        mikros = cache.get(cache_key)
        if mikros is not None:
            return Mikroraion.objects.filter(id__in=mikros)

        existing = Mikroraion.objects.filter(gorod=gorod_obj, raion__isnull=True)
        if existing.exists():
            cache.set(cache_key, list(existing.values_list('id', flat=True)), 60 * 60 * 24 * 7)
            return existing

        # Загружаем из 2ГИС без района
        region_name = gorod_obj.region.nazvanie if gorod_obj.region else None
        names = fetch_mikroraiony_from_2gis(gorod_obj.nazvanie, region_name)
        created_ids = []
        for name in names:
            mik, _ = Mikroraion.objects.get_or_create(
                nazvanie=name,
                gorod=gorod_obj,
                raion=None
            )
            created_ids.append(mik.id)
        cache.set(cache_key, created_ids, 60 * 60 * 24 * 7)
        return Mikroraion.objects.filter(gorod=gorod_obj, raion__isnull=True)