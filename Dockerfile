FROM python:3.10-slim

# Устанавливаем системные зависимости, включая GDAL
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Указываем переменные окружения (можно переопределить на Render)
ENV PYTHONUNBUFFERED=1 \
    GDAL_LIBRARY_PATH=/usr/lib/libgdal.so

CMD ["gunicorn", "mysite.wsgi:application", "--bind", "0.0.0.0:10000"]