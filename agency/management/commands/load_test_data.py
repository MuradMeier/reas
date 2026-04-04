import requests

api_key = 'f9649664-4be4-4f08-b6b2-0c2db206322e'
city_name = "Москва"

url = "https://catalog.api.2gis.com/3.0/items/search"
params = {
    'q': city_name,
    'type': 'adm_div.district',
    'fields': 'items.name',
    'key': api_key,
    'page_size': 100,
}
resp = requests.get(url, params=params)
data = resp.json()
districts = [item['name'] for item in data.get('result', {}).get('items', []) if 'name' in item]
print(f"Найдено районов: {len(districts)}")
print(districts[:20])