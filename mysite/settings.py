# mysite/settings.py
import os
from pathlib import Path
from datetime import timedelta
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# -------------------- БЕЗОПАСНОСТЬ --------------------
# Секретный ключ – берем из переменных окружения
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key-for-dev')

# DEBUG – должен быть False в продакшене
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Разрешенные хосты – список через запятую из переменной окружения
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# CSRF доверенные источники – для админки и форм
CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'http://localhost:3000',
    'http://localhost:8000',
]

# -------------------- ПРИЛОЖЕНИЯ --------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',  # для PostGIS
    'agency',
    'django_filters',
    'nested_inline',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'model_utils',
    'django_extensions',
]

# -------------------- MIDDLEWARE --------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # должен быть первым
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ДОБАВИТЬ для статики
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# -------------------- БАЗА ДАННЫХ --------------------
# Используем DATABASE_URL из переменных окружения
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            engine='django.contrib.gis.db.backends.postgis'  # важно для PostGIS
        )
    }
else:
    # fallback для локальной разработки
    DATABASES = {
        'default': {
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'NAME': 'realty_db',
            'USER': 'realty_user',
            'PASSWORD': 'realty_password',
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }

D2GIS_API_KEY = 'f9649664-4be4-4f08-b6b2-0c2db206322e'

# -------------------- CORS --------------------
# Разрешенные источники для CORS (фронтенд)

CORS_ALLOWED_ORIGINS_STR = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if CORS_ALLOWED_ORIGINS_STR:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_STR.split(',') if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = []
CORS_ALLOW_CREDENTIALS = True

# Если фронтенд и бэкенд на одном домене, можно раскомментировать:
# CORS_ALLOW_ALL_ORIGINS = False

# -------------------- REST FRAMEWORK --------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# -------------------- JWT --------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,
}

# -------------------- СТАТИЧЕСКИЕ ФАЙЛЫ --------------------
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# -------------------- МЕДИА ФАЙЛЫ (загрузки) --------------------
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# -------------------- ШАБЛОНЫ --------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'mysite.wsgi.application'

# -------------------- АУТЕНТИФИКАЦИЯ --------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -------------------- ИНТЕРНАЦИОНАЛИЗАЦИЯ --------------------
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# -------------------- НАСТРОЙКИ УВЕДОМЛЕНИЙ --------------------
REMINDER_AFTER_CALL_MINUTES = 10
REMINDER_AFTER_MEETING_HOURS = 1

# -------------------- EMAIL --------------------
# Для продакшена тоже лучше через переменные окружения
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', '89605436297@mail.ru')
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.mail.ru'
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '89605436297@mail.ru')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# -------------------- ВНЕШНИЕ СЕРВИСЫ --------------------
YANDEX_GEOCODER_API_KEY = os.environ.get('YANDEX_GEOCODER_API_KEY', '')
YANDEX_GPT_API_KEY = os.environ.get('YANDEX_GPT_API_KEY', '')
YANDEX_FOLDER_ID = os.environ.get('YANDEX_FOLDER_ID', '')

# -------------------- ФРОНТЕНД --------------------
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
ADMIN_URL = os.environ.get('ADMIN_URL', 'http://localhost:3000')

# -------------------- GDAL (для PostGIS) --------------------
#GDAL_LIBRARY_PATH = '/usr/lib/libgdal.so'

ROOT_URLCONF = 'mysite.urls'