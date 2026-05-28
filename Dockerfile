# Sovereign BioTech V3 — worker + Streamlit panel için tek imaj.
# Compose her servisi farklı command ile başlatır.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Sistem deps (lxml gibi C-extension'lar için temel araçlar; küçük kalsın).
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Yerel SQLite + log + output dizinleri (volume mount edilecek).
RUN mkdir -p /app/db /app/logs /app/outputs

EXPOSE 8501

# Varsayılan: worker. Compose 'web' servisi command'i Streamlit ile değiştirir.
CMD ["python", "-u", "main.py"]
