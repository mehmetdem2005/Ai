"""Supabase'den bültenleri çekip statik siteyi (dist/) üretir. Vercel build'inde çalışır.

Build sırasında index.html'deki placeholder'ları (SUPABASE_URL, SUPABASE_ANON_KEY,
ADMIN_PANEL_URL) Vercel env'inden gelen değerlerle değiştirir."""
import json
import os
import pathlib

import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ADMIN_PANEL_URL = os.environ.get("ADMIN_PANEL_URL", "https://sovereign-admin.vercel.app")

HERE = pathlib.Path(__file__).parent
DIST = HERE / "dist"
DIST.mkdir(parents=True, exist_ok=True)

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

# Placeholder değiştirme: index.html'e SUPABASE_URL, ANON_KEY, admin panel URL'i göm.
PLACEHOLDERS = {
    "__SUPABASE_URL__": URL,
    "__SUPABASE_ANON_KEY__": ANON_KEY,
    "__ADMIN_PANEL_URL__": ADMIN_PANEL_URL,
}

for static_file in ("index.html", "yonetim.html", "admin.js"):
    src = (HERE / static_file).read_text(encoding="utf-8")
    for placeholder, value in PLACEHOLDERS.items():
        src = src.replace(placeholder, value)
    (DIST / static_file).write_text(src, encoding="utf-8")

print(f"{len(rows)} bülten + statik dosyalar dist/ içine yazıldı.")
if not ANON_KEY:
    print("⚠️  SUPABASE_ANON_KEY env yok — giriş/admin butonları çalışmaz.")
