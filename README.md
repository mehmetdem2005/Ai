# 🧬 Sovereign BioTech — Otonom MedTech & AI Bülten Motoru

**Niş:** MedTech & Biyoteknolojide AI / otonom sistemler
**ICP:** Sağlık VC'leri, hastane CIO'ları, sağlık AI mühendisleri
**Stack:** Python + Gemini 2.5 Flash + SQLite + Tenacity + BS4

## 🚀 Kurulum (3 dakika)

```bash
pip install -r requirements.txt
cp .env.example .env
# .env'i aç, Gemini key'i yapıştır: https://aistudio.google.com/apikey
python main.py
```

İlk çalıştırma anında bir batch çalıştırır, `outputs/`'a bülten taslağı düşer. Sonraki batch'ler 08:00 ve 18:00'de otomatik.

## 🏗️ Mimari

| Bileşen | Görev |
|---|---|
| `DataFetcher` | RSS → SHA-256 → batch dedup, HTML temizlik (BS4) |
| `DatabaseManager` | SQLite single-query batch dedup + executemany |
| `AIProcessor` | Gemini 2.5 Flash (OpenAI SDK + base_url), tenacity retry |
| `Publisher` | Markdown bülten |

## 🔑 LLM — Neden Gemini 2.5 Flash

| Model | Free RPD | Bizim ihtiyaç | Uygun mu? |
|---|---|---|---|
| Gemini 2.5 **Pro** | 50-100 | 60-100/gün | ❌ Limite takılır |
| Gemini 2.5 **Flash** | **1500** | 60-100/gün | ✅ 15x marj |
| GPT-4o-mini | 0 (paid) | — | $0.20/ay |

Default Flash. Provider swap için `AIProcessor.__init__`'deki `base_url` ve `model`'i değiştir.

## 📰 Kaynaklar

5 MedTech otorite RSS feed'i `main.py` içinde `SOURCES` listesinde. Niş genişletmek için bu listeye ekle.

## 🛣️ Senin Sıradaki Adımların

1. **Şimdi (30 dk):** Gemini key al → `.env` doldur → `python main.py` → ilk bülteni gör
2. **Bu hafta:** Beehiiv hesabı aç, 2-3 bülten manuel yayınla
3. **Lead magnet:** Geçmiş 30 bültenden PDF rapor derle
4. **Build in public:** LinkedIn + Twitter — her bültenden 3 sinyal paylaş
