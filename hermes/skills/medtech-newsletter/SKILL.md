---
name: medtech-newsletter
title: MedTech & Yapay Zeka Bülten Motoru
description: "Sağlık teknolojisi & YZ RSS kaynaklarını tarar, tekilleştirir, Türkçe analiz üretir ve Supabase'e yazar."
version: 1.0.0
author: mehmetdem2005
license: MIT
dependencies: [requests, feedparser, beautifulsoup4]
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Newsletter, MedTech, Biotech, RSS, Supabase, Türkçe, Curation]
    category: research
    requires_toolsets: [terminal, files]
---

# MedTech & Yapay Zeka Bülten Motoru

Bu beceri, tam Hermes agent'ının sağlık teknolojisi (MedTech) ve yapay zeka
alanındaki haberleri toplayıp **Türkçe** bir yatırımcı bülteni üretmesini ve
Supabase'e yazmasını sağlar. Mekanik işler (RSS çekme, Supabase I/O) için
`terminal` aracı kullanılır; **analiz ve çeviri agent'ın kendi muhakemesiyle** yapılır.

## Ne zaman kullanılır
- Zamanlanmış (cron) günlük/iki kez bülten üretimi.
- "Bülteni şimdi üret" gibi manuel istekler.

## Ön koşullar (Hermes .env / ortam değişkenleri)
- `SUPABASE_URL` — örn. `https://wsiossnmvuoemirsjwaw.supabase.co`
- `SUPABASE_KEY` — Supabase **service_role** anahtarı (RLS'i baypas eder, sunucu tarafı).
- Aktif bir LLM modeli yapılandırılmış olmalı (`hermes model`).

## Windows / kabuk notu
- Windows'ta `terminal` aracı **Git Bash** üzerinden çalışır; aşağıdaki `bash` blokları
  ve `curl` doğrudan kullanılabilir (curl Windows'ta yerleşiktir).
- Python çağrısı: önce `python3`, başarısızsa `python` dene (Hermes venv'i PATH'tedir).
- `feedparser`/`beautifulsoup4` kurulu değilse şu komutla kur:
  `python -m pip install feedparser beautifulsoup4` (gerekirse `uv pip install ...`).
  Kurulamazsa, RSS XML'ini sadece `requests` ile çekip içeriği **kendi muhakemenle**
  ayrıştır (feedparser şart değil; `<item>/<entry>` başlık-link-özet alanlarını sen oku).

## Persona (analiz tonu)
Sen sağlık teknolojileri ve biyoteknolojide kıdemli bir yatırım analisti ve YZ
stratejistisin. Okuyucular: sağlık VC'leri, hastane CIO'ları, sağlık YZ mühendisleri.
Her haber için **neden önemli** olduğunu en fazla 3 cümleyle, ticari/teknolojik
etkiye (Impact) odaklanarak yaz. Çoklu-ajan sistemler, otomasyon, giyilebilir
teknoloji veya yeni algoritmik yaklaşım varsa vurgula. Dil: resmi, veri odaklı, Türkçe.

## Adımlar

### 1) Aktif kaynakları al
`terminal` ile Supabase'den aktif feed'leri çek:
```bash
curl -s "$SUPABASE_URL/rest/v1/feeds?select=name,url&active=eq.true&order=created_at" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY"
```
Boş/erişilemezse şu varsayılanları kullan: Nature Digital Medicine, MIT Tech Review
(Biotech), MobiHealthNews, Fierce Healthcare, TechCrunch Health.

### 2) Her kaynaktan son ~8 haberi çek ve temizle
Gerçek bir User-Agent ile çek (bazı feed'ler `python-urllib`'i 403'ler), HTML'i temizle:
```bash
python3 - <<'PY'
import sys, json, hashlib, requests, feedparser
from bs4 import BeautifulSoup
feeds = json.loads(sys.argv[1]) if len(sys.argv) > 1 else []
out = []
for f in feeds:
    try:
        r = requests.get(f["url"], timeout=20,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; Hermes-Newsletter/1.0)"})
        if r.status_code >= 400: continue
        parsed = feedparser.parse(r.content)
        for e in parsed.entries[:8]:
            link = e.get("link")
            if not link: continue
            summary = BeautifulSoup(e.get("summary", e.get("title","")), "html.parser").get_text(" ", strip=True)[:800]
            out.append({"hash": hashlib.sha256(link.encode()).hexdigest(),
                        "title": e.get("title","(başlıksız)"), "link": link,
                        "summary": summary, "source": f["name"]})
    except Exception as ex:
        print("WARN", f["name"], ex, file=sys.stderr)
print(json.dumps(out, ensure_ascii=False))
PY
```
(Feed listesini bu script'e argüman olarak ver.)

### 3) Tekilleştir (dedup)
- **Kesin (URL):** Adayların `hash` listesini Supabase'de sorgula; zaten var olanları çıkar:
  ```bash
  curl -s "$SUPABASE_URL/rest/v1/articles?select=id_hash&id_hash=in.(HASH1,HASH2,...)" \
    -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY"
  ```
- **Anlamsal (senin yargınla):** Kalan adaylar arasında aynı olayı anlatan yakın-tekrarları
  başlık/özet okuyarak ele; her olaydan yalnızca en güçlü olanı tut. (Embedding API'ye gerek yok —
  bu senin muhakemenle yapılır.)

### 4) Analiz üret (senin LLM'inle)
Tutulan her haber için:
- `title_tr`: başlığın akıcı, doğal **Türkçe** çevirisi.
- `ai_insight`: yukarıdaki personaya göre **en fazla 3 cümlelik** Türkçe etki analizi.

### 5) Bülteni derle (Markdown)
```
# 🧬 Sağlık Teknolojisi & Yapay Zeka Sinyali
**Tarih:** <İstanbul tarihi, ör. 27 Mayıs 2026>

<kısa giriş>

---

### 1. [<title_tr>](<link>)
**Kaynak:** <source>

💡 **Analist Sinyali:**
> <ai_insight>

---
(her haber için tekrarla)
```

### 6) Supabase'e yaz
Önce makaleleri upsert et (başarısız olursa bülten satırı YAZMA — yetim kayıt olmasın):
```bash
# articles upsert (JSON gövdesini sen oluştur: id_hash,title,link,source,summary,ai_insight)
curl -s -X POST "$SUPABASE_URL/rest/v1/articles?on_conflict=id_hash" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d '[{"id_hash":"...","title":"...","link":"...","source":"...","summary":"...","ai_insight":"..."}]'
# newsletter satırı
curl -s -X POST "$SUPABASE_URL/rest/v1/newsletters" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename":"newsletter_<ts>.md","content":"<markdown>","article_count":<n>}'
```
Yazılan bülten otomatik olarak web sitesinde (GitHub Pages) görünür.

### 7) (Opsiyonel) Teslim et
Cron `--deliver` hedefi (Telegram/Discord/Slack) ayarlıysa bültenin kısa bir özetini ilet.
Yeni haber yoksa `[SILENT]` döndür (spam yok).

## Zamanlama (agent modunda cron)
```bash
hermes cron create "0 5,15 * * *" \
  "medtech-newsletter becerisini kullanarak günlük bülteni üret ve Supabase'e yaz." \
  --skill medtech-newsletter \
  --name "MedTech Bülten"
```
(05:00 ve 15:00 UTC = 08:00 ve 18:00 İstanbul.)

## Notlar
- service_role anahtarı güçlüdür; yalnızca güvendiğin VPS'te Hermes .env'inde tut.
- Token maliyetini sınırlamak için feed başına ~8 haberle başla.
- Mevcut deterministik Python pipeline (`main.py once`) hâlâ yedek olarak çalıştırılabilir;
  bu beceri onun agentik karşılığıdır.
