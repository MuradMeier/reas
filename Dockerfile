FROM python:3.10-slim

# Install system dependencies for GDAL, PostGIS, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    binutils \
    && ldconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "mysite.wsgi:application", "--bind", "0.0.0.0:10000"]