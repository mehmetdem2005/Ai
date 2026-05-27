"""Supabase'den bültenleri çekip statik siteyi (dist/) üretir. Pages workflow'unda çalışır."""
import json
import os
import pathlib

import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]
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
(DIST / "index.html").write_text((HERE / "index.html").read_text(encoding="utf-8"), encoding="utf-8")
print(f"{len(rows)} bülten dist/ içine yazıldı.")
