"""Mevcut bültenlerin H1'lerini dinamik başlığa çevir.

Eski format: # 🧬 Sağlık Teknolojisi & Yapay Zeka Sinyali
Yeni format: # Sabah Brief'i · 28 Mayıs 2026 (created_at İstanbul saatine göre)

Çalıştırma: SUPABASE_URL ve SUPABASE_KEY env'leri ayarlanmış halde
  python3 scripts/backfill_titles.py [--dry-run]
"""
import os
import re
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]
DRY = "--dry-run" in sys.argv

TR_MONTHS = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
    7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
}
IST = ZoneInfo("Europe/Istanbul")
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def new_title(created_at: str) -> str:
    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00")).astimezone(IST)
    edition = "Sabah" if dt.hour < 12 else "Akşam"
    return f"{edition} Brief'i · {dt.day} {TR_MONTHS[dt.month]} {dt.year}"


def main() -> int:
    r = requests.get(
        f"{URL}/rest/v1/newsletters?select=id,content,created_at&order=id.desc&limit=500",
        headers=HEADERS, timeout=30,
    )
    r.raise_for_status()
    rows = r.json()
    updated = 0
    for row in rows:
        content = row.get("content") or ""
        title = new_title(row["created_at"])
        new_h1 = f"# {title}"
        # İlk satırı bul, # ile başlıyorsa değiştir
        m = re.match(r"^#\s+.+$", content, re.M)
        if not m:
            print(f"  ⚠ id={row['id']}: H1 yok, atlandı")
            continue
        if m.group(0) == new_h1:
            continue  # zaten doğru
        new_content = content.replace(m.group(0), new_h1, 1)
        print(f"  → id={row['id']}: {m.group(0)[:50]}... → {new_h1}")
        if not DRY:
            patch = requests.patch(
                f"{URL}/rest/v1/newsletters?id=eq.{row['id']}",
                headers={**HEADERS, "Prefer": "return=minimal"},
                json={"content": new_content},
                timeout=30,
            )
            patch.raise_for_status()
        updated += 1
    print(f"\n{'(dry-run) ' if DRY else ''}{updated} bülten güncellendi.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
