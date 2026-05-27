# 🧬 Sovereign — Otonom AI Bülten Motoru

RSS kaynaklarını tarar, anlamsal olarak tekilleştirir, seçili bir LLM ile analiz eder
ve Markdown bülten üretir. İsteğe bağlı olarak Supabase'e kalıcı yazar.

**Stack:** Python + (DeepSeek / Gemini) + embedding tabanlı dedup + SQLite + Supabase (ops.) + Tenacity + BS4

## 🚀 Kurulum

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # .env'i aç, anahtarları doldur
python main.py
```

İlk çalıştırma anında bir batch çalıştırır, `outputs/`'a bülten düşer. Sonraki batch'ler 08:00 ve 18:00'de otomatik.

## 🏗️ Mimari

| Bileşen | Görev |
|---|---|
| `DataFetcher` | RSS → SHA-256 URL dedup, HTML temizlik (BS4) |
| `SemanticDeduper` | Embedding (gemini/openai) + kosinüs benzerliği ile yakın-tekrar eleme |
| `AIProcessor` | Çoklu sağlayıcı LLM (deepseek/gemini), OpenAI-uyumlu endpoint, tenacity retry |
| `DatabaseManager` | SQLite — URL dedup + embedding saklama |
| `Publisher` | Markdown bülten |
| `SupabaseStore` | Opsiyonel REST kalıcılığı (articles + newsletters) |

## 🔑 Sağlayıcı seçimi (`.env`)

**Metin üretimi** — `LLM_PROVIDER=deepseek|gemini`
- `deepseek` (varsayılan): `DEEPSEEK_MODEL=deepseek-reasoner` (R1/düşünme) · `deepseek-v4-pro` (frontier) · `deepseek-chat`
- `gemini`: `GEMINI_MODEL=gemini-2.5-flash` (ücretsiz, yüksek RPD)

> Not: `deepseek-chat`/`deepseek-reasoner` 2026-07-24'te kaldırılacak (v4-flash'a yönleniyor). Kalıcı seçim için `deepseek-v4-pro` / `deepseek-v4-flash`.

**Embedding (dedup)** — `EMBEDDING_PROVIDER=gemini|openai`
- `gemini` (varsayılan, ücretsiz): `gemini-embedding-001`
- `openai`: `text-embedding-3-small` — OpenAI yalnızca embedding için kullanılır, metin üretiminde değil.

`DEDUP_THRESHOLD` (0–1, varsayılan 0.86): bu kosinüs benzerliğinin üzerindekiler tekrar sayılır.

## 📰 Kaynaklar

RSS feed'leri `feeds.json` içinde (`[{"name": ..., "url": ...}]`). Kendi kaynaklarınla değiştir; dosya yoksa yerleşik varsayılanlar kullanılır. Feed başına makale: `MAX_ENTRIES_PER_FEED`.

## ☁️ Supabase (opsiyonel)

`supabase_schema.sql`'i Supabase SQL Editor'da çalıştır, ardından `.env`'e `SUPABASE_URL` ve bir API key (`service_role` veya `anon`) gir. Boşsa sistem yalnızca yerel çalışır.
