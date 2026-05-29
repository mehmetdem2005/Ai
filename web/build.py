"""Supabase'den bültenleri çekip statik siteyi (dist/) üretir. Vercel build'inde çalışır.

Mimari:
- landing.html → index.html (anasayfa)
- reader.html, admin.html, editorial.html, dashboard.html, abonelik.html,
  ayarlar.html, hakkinda.html (alt sayfalar)
- tokens.css, mobile.css (tasarım sistemi)
- nav.js, i18n.js (navigasyon + 4-dil çeviri)
- auth.js (Supabase Auth + admin buton katmanı)

Placeholder injection: index.html, reader.html ve auth.js içindeki
__SUPABASE_URL__, __SUPABASE_ANON_KEY__, __ADMIN_PANEL_URL__ token'ları
Vercel env'inden enjekte edilir."""
import json
import os
import pathlib
import shutil

import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ADMIN_PANEL_URL = os.environ.get("ADMIN_PANEL_URL", "https://sovereign-admin.vercel.app")

HERE = pathlib.Path(__file__).parent
DIST = HERE / "dist"

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True, exist_ok=True)

# 1. Supabase'den bültenleri çek → data.json
resp = requests.get(
    f"{URL}/rest/v1/newsletters"
    "?select=id,filename,article_count,content,created_at&order=created_at.desc&limit=200",
    headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "User-Agent": "Mozilla/5.0 (compatible; SovereignBio-Pages/1.0)",
    },
    timeout=30,
)
resp.raise_for_status()
rows = resp.json()
(DIST / "data.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")

# 2. Asset'ler (CSS + JS) — değişmeden kopyalanır
ASSETS = ["tokens.css", "mobile.css", "nav.js", "i18n.js"]
for f in ASSETS:
    shutil.copy(HERE / f, DIST / f)

# 3. Placeholder enjeksiyonu — auth.js + her HTML sayfasında çalışır
PLACEHOLDERS = {
    "__SUPABASE_URL__": URL,
    "__SUPABASE_ANON_KEY__": ANON_KEY,
    "__ADMIN_PANEL_URL__": ADMIN_PANEL_URL,
}


def inject(src: str) -> str:
    for k, v in PLACEHOLDERS.items():
        src = src.replace(k, v)
    return src


# auth.js placeholder'ları içeriyor
(DIST / "auth.js").write_text(inject((HERE / "auth.js").read_text(encoding="utf-8")), encoding="utf-8")

# 4. HTML sayfaları
# landing.html → index.html (anasayfa)
PAGE_MAP = {
    "landing.html": "index.html",
    "reader.html": "reader.html",
    "admin.html": "admin.html",
    "editorial.html": "editorial.html",
    "dashboard.html": "dashboard.html",
    "abonelik.html": "abonelik.html",
    "ayarlar.html": "ayarlar.html",
    "hakkinda.html": "hakkinda.html",
}
for src_name, dst_name in PAGE_MAP.items():
    src_file = HERE / src_name
    if not src_file.exists():
        print(f"⚠️ kaynak yok, atlandı: {src_name}")
        continue
    (DIST / dst_name).write_text(inject(src_file.read_text(encoding="utf-8")), encoding="utf-8")

# 5. Legacy yönetim sayfası — geriye dönük link uyumu için
if (HERE / "yonetim.html").exists():
    (DIST / "yonetim.html").write_text(
        inject((HERE / "yonetim.html").read_text(encoding="utf-8")), encoding="utf-8"
    )
if (HERE / "admin.js").exists():
    shutil.copy(HERE / "admin.js", DIST / "admin.js")

print(f"✓ {len(rows)} bülten + {len(PAGE_MAP)} sayfa + {len(ASSETS)} asset → dist/")
if not ANON_KEY:
    print("⚠️  SUPABASE_ANON_KEY env yok — login akışı çalışmaz.")
