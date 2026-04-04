# agency/services/d2gis.py
import requests
import logging
import concurrent.futures
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def geocode_city(city_name: str, region_name: str = None):
    """
    Находит город в 2ГИС и возвращает его идентификатор (id), bounding box и координаты.
    """
    url = "https://catalog.api.2gis.com/3.0/items/geocode"
    params = {
        'q': city_name,
        'fields': 'items.point,items.bbox,items.id,items.full_name',
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


def fetch_districts_via_alphabet(city_id: str) -> list:
    """
    Получает список районов города через перебор букв алфавита.
    city_id – ID города из 2ГИС (например, '4504222397630173' для Москвы)
    Возвращает список уникальных названий районов.
    """
    alphabet = [chr(i) for i in range(ord('а'), ord('я')+1)] + ['ё']
    url = "https://catalog.api.2gis.com/3.0/items/search"

    def search_letter(letter):
        params = {
            'q': f'район {letter}',
            'fields': 'items.name',
            'key': settings.D2GIS_API_KEY,
            'city_id': city_id,
            'page_size': 50,
        }
        try:
            resp = requests.get(url, params=params, timeout=3)
            resp.raise_for_status()
            data = resp.json()
            items = data.get('result', {}).get('items', [])
            return [item['name'] for item in items if 'name' in item]
        except Exception as e:
            logger.error(f"2GIS alphabet error for '{letter}': {e}")
            return []

    districts_set = set()
    # Параллельные запросы (10 потоков)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(search_letter, letter): letter for letter in alphabet}
        for future in concurrent.futures.as_completed(futures):
            try:
                names = future.result()
                districts_set.update(names)
            except Exception as e:
                logger.error(f"Failed to process letter {futures[future]}: {e}")

    return sorted(districts_set)


def fetch_districts_from_2gis(city_name: str, region_name: str = None):
    """
    Получает список районов города через 2ГИС (старый метод через bbox, оставлен для совместимости).
    Возвращает список названий районов (строки) или пустой список.
    """
    city_info = geocode_city(city_name, region_name)
    if not city_info or not city_info.get('bbox'):
        return []

    bbox = city_info['bbox']
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
    Возвращает QuerySet районов для города (модель Gorod).
    Сначала проверяет кэш, затем БД, затем при отсутствии пытается загрузить через 2ГИС.
    """
    from agency.models import Raion

    cache_key = f"districts_{gorod_obj.id}"
    districts_ids = cache.get(cache_key)
    if districts_ids is not None:
        return Raion.objects.filter(id__in=districts_ids)

    existing = Raion.objects.filter(gorod=gorod_obj)
    if existing.exists():
        cache.set(cache_key, list(existing.values_list('id', flat=True)), 60*60*24*7)
        return existing

    # Нет в БД — идём в 2ГИС
    region_name = gorod_obj.region.nazvanie if gorod_obj.region else None
    city_info = geocode_city(gorod_obj.nazvanie, region_name)
    if not city_info or not city_info.get('id'):
        # Не удалось получить ID города, возвращаем пустой QuerySet
        return Raion.objects.none()

    city_id = city_info['id']
    district_names = fetch_districts_via_alphabet(city_id)

    created_ids = []
    for name in district_names:
        raion, _ = Raion.objects.get_or_create(nazvanie=name, gorod=gorod_obj)
        created_ids.append(raion.id)

    cache.set(cache_key, created_ids, 60*60*24*7)
    return Raion.objects.filter(gorod=gorod_obj)


def fetch_mikroraiony_from_2gis(city_name: str, region_name: str = None, district_name: str = None):
    """
    Получает список микрорайонов города через 2ГИС.
    Если указан district_name, ищет микрорайоны внутри района.
    Возвращает список названий микрорайонов (строки) или пустой список.
    """
    city_info = geocode_city(city_name, region_name)
    if not city_info or not city_info.get('bbox'):
        return []

    bbox = city_info['bbox']
    url = "https://catalog.api.2gis.com/3.0/items/search"

    if district_name:
        # Попробуем уточнить по району
        params = {
            'q': district_name,
            'fields': 'items.name,items.point,items.bbox',
            'key': settings.D2GIS_API_KEY,
            'bbox': f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
            'page_size': 1,
            'type': 'adm_div.district'
        }
        try:
            resp = requests.get(url, params=params, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if data.get('result') and data['result']['items']:
                district_bbox = data['result']['items'][0].get('bbox')
                if district_bbox:
                    bbox = district_bbox
        except Exception as e:
            logger.error(f"2GIS district bbox error: {e}")

    params = {
        'q': 'микрорайон',
        'fields': 'items.name,items.id,items.point',
        'key': settings.D2GIS_API_KEY,
        'bbox': f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        'page_size': 50,
    }
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        mikros = []
        for item in data.get('result', {}).get('items', []):
            name = item.get('name')
            if name and name not in mikros:
                # Очищаем от лишних слов
                clean_name = name.replace('микрорайон', '').replace('Микрорайон', '').strip()
                if clean_name:
                    name = clean_name
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
    from agency.models import Mikroraion

    if raion_obj:
        cache_key = f"mikros_raion_{raion_obj.id}"
        mikros_ids = cache.get(cache_key)
        if mikros_ids is not None:
            return Mikroraion.objects.filter(id__in=mikros_ids)
        existing = Mikroraion.objects.filter(raion=raion_obj)
        if existing.exists():
            cache.set(cache_key, list(existing.values_list('id', flat=True)), 60*60*24*7)
            return existing
        # Загружаем из 2ГИС
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
        cache.set(cache_key, created_ids, 60*60*24*7)
        return Mikroraion.objects.filter(raion=raion_obj)
    else:
        cache_key = f"mikros_city_{gorod_obj.id}"
        mikros_ids = cache.get(cache_key)
        if mikros_ids is not None:
            return Mikroraion.objects.filter(id__in=mikros_ids)
        existing = Mikroraion.objects.filter(gorod=gorod_obj, raion__isnull=True)
        if existing.exists():
            cache.set(cache_key, list(existing.values_list('id', flat=True)), 60*60*24*7)
            return existing
        # Загружаем из 2ГИС
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
        cache.set(cache_key, created_ids, 60*60*24*7)
    return Mikroraion.objects.filter(gorod=gorod_obj, raion__isnull=True)

def fetch_districts_by_city_name(city_name):
    url = "https://catalog.api.2gis.com/3.0/items/search"
    params = {
        'q': city_name,
        'type': 'adm_div.district',
        'fields': 'items.name',
        'key': "f9649664-4be4-4f08-b6b2-0c2db206322e",
        'page_size': 50,
    }
    resp = requests.get(url, params=params)
    data = resp.json()
    return [item['name'] for item in data.get('result', {}).get('items', [])]

def fetch_districts_via_grid(city_name: str, grid_step: float = 0.05):
    """
    Получает список районов города, используя метод поиска по сетке координат.

    Аргументы:
        city_name: Название города (например, "Москва").
        grid_step: Шаг сетки в градусах. Меньшее значение — точнее, но больше запросов.
                   Значение по умолчанию (0.05) — хороший компромисс.

    Возвращает:
        Список названий районов.
    """
    # Сначала нам нужно найти границы города.
    geocode_url = "https://catalog.api.2gis.com/3.0/items/geocode"
    geocode_params = {
        'q': city_name,
        'fields': 'items.bbox',
        'key': settings.D2GIS_API_KEY,
    }

    try:
        resp = requests.get(geocode_url, params=geocode_params)
        resp.raise_for_status()
        data = resp.json()
        bbox = data.get('result', {}).get('items', [{}])[0].get('bbox')

        if not bbox:
            logger.error(f"Не удалось определить границы города {city_name}")
            return []

        min_lon, min_lat, max_lon, max_lat = bbox
        districts = set()

        # Создаём сетку точек внутри bbox города.
        lat = min_lat
        while lat <= max_lat:
            lon = min_lon
            while lon <= max_lon:
                point = f"{lon},{lat}"
                search_params = {
                    'q': 'район',
                    'point': point,
                    'radius': 5000,  # Радиус 5 км, чтобы искать вокруг точки.
                    'key': settings.D2GIS_API_KEY,
                    'page_size': 10,
                }
                try:
                    search_resp = requests.get("https://catalog.api.2gis.com/3.0/items/search", params=search_params)
                    search_resp.raise_for_status()
                    search_data = search_resp.json()
                    for item in search_data.get('result', {}).get('items', []):
                        district_name = item.get('name')
                        if district_name and 'adm_div' in item and item['type'] == 'adm_div.district':
                            districts.add(district_name)
                except Exception as e:
                    logger.error(f"Ошибка поиска района для точки {point}: {e}")
                lon += grid_step
            lat += grid_step

        logger.info(f"Найдено районов для города {city_name}: {len(districts)}")
        return list(districts)

    except Exception as e:
        logger.error(f"Ошибка при получении районов для {city_name}: {e}")
        return []