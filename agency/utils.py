# utils.py (переименована)
from django.contrib.auth.models import Group
from django.core.mail import send_mail
from django.conf import settings
import logging
import requests
from agency.models import Uvedomlenie, User
logger = logging.getLogger(__name__)

def send_email_notification(recipient_email, subject, message, html_message=None):
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        return False

def generate_description_with_gpt(prompt, max_tokens=500):
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    headers = {
        "Authorization": f"Api-Key {settings.YANDEX_GPT_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "modelUri": f"gpt://{settings.YANDEX_FOLDER_ID}/yandexgpt-lite",
        "completionOptions": {
            "stream": False,
            "temperature": 0.6,
            "maxTokens": str(max_tokens)  # Yandex ожидает строку
        },
        "messages": [
            {
                "role": "system",
                "text": "Ты — профессиональный риелтор. Составь красивое и информативное описание для объекта недвижимости."
            },
            {
                "role": "user",
                "text": prompt
            }
        ]
    }
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        result = response.json()
        text = result['result']['alternatives'][0]['message']['text']
        return text.strip()
    except Exception as e:
        logger.error(f"Ошибка при вызове YandexGPT: {e}")
        return None

def otpravit_vneshnee_uvedomlenie(klient, tema, soobshchenie):
    """
    Отправляет уведомление клиенту, если у него включены уведомления.
    Поддерживает email (пока только он). Для SMS нужно добавить интеграцию.
    """
    if not klient.uvedomleniya_vklyucheny:
        return

    if klient.email:
        try:
            send_mail(
                tema,
                soobshchenie,
                settings.DEFAULT_FROM_EMAIL,
                [klient.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send email to {klient.email}: {e}")
    # Здесь можно добавить отправку SMS, если есть номер и интеграция

def sozdat_uvedomlenie(poluchatel, tip, soobshchenie, ssylka=''):
    """
    Создаёт внутрисистемное уведомление.
    """
    Uvedomlenie.objects.create(
        poluchatel=poluchatel,
        tip=tip,
        soobshchenie=soobshchenie,
        ssylka=ssylka
    )

def geocode_address(address):
    """
    Преобразует адрес в координаты (широта, долгота) с помощью Яндекс.Геокодера.
    Возвращает словарь {'lat': ..., 'lon': ...} или None в случае ошибки.
    """
    api_key = settings.YANDEX_GEOCODER_API_KEY
    url = "https://geocode-maps.yandex.ru/1.x/"
    params = {
        'apikey': api_key,
        'geocode': address,
        'format': 'json',
        'results': 1
    }
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        try:
            pos = data['response']['GeoObjectCollection']['featureMember'][0]['GeoObject']['Point']['pos']
            lon, lat = pos.split()
            return {'lat': float(lat), 'lon': float(lon)}
        except (KeyError, IndexError, ValueError) as e:
            logger.error(f"Не удалось распарсить ответ геокодера: {e}")
            return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка запроса к геокодеру: {e}")
        return None

def notify_realtors_about_new_request(request_obj):
    """
    Отправляет внутрисистемное уведомление всем активным пользователям,
    состоящим в группах «Риэлтор» или «Главный риэлтор».
    """
    groups = Group.objects.filter(name__in=['Риэлтор', 'Главный риэлтор'])
    users = User.objects.filter(groups__in=groups, is_active=True).distinct()
    for user in users:
        sozdat_uvedomlenie(
            poluchatel=user,
            tip='new_request',
            soobshchenie=f'Новая заявка #{request_obj.id} от {request_obj.klient}',
            ssylka=f'/admin/requests/{request_obj.id}/change/'  # или фронтенд-ссылка
        )
