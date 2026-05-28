"""Beehiiv v2 API ile bülteni Draft olarak gönderir.

Anahtar yoksa graceful skip — yayın akışı durmasın, sadece Beehiiv adımı atlanır
(Supabase newsletters + site güncellemesi yine çalışır).
"""
import logging
import os

import requests

BEEHIIV_API_BASE = "https://api.beehiiv.com/v2"

logger = logging.getLogger("Beehiiv")


def create_draft(html_content: str, title: str) -> dict | None:
    """Beehiiv'e draft post oluşturur. Başarıda API cevabı, başarısızlık/anahtarsızlıkta None döner."""
    api_key = os.getenv("BEEHIIV_API_KEY")
    pub_id = os.getenv("BEEHIIV_PUB_ID")
    if not api_key or not pub_id:
        logger.warning("BEEHIIV_API_KEY / BEEHIIV_PUB_ID yok — Beehiiv gönderimi atlandı.")
        return None

    url = f"{BEEHIIV_API_BASE}/publications/{pub_id}/posts"
    payload = {
        "title": title,
        "body_content": html_content,
        "status": "draft",
    }
    try:
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        logger.error(f"Beehiiv bağlantı hatası: {exc}")
        return None

    if resp.status_code >= 300:
        logger.error(f"Beehiiv API hatası {resp.status_code}: {resp.text[:300]}")
        return None

    try:
        data = resp.json()
    except ValueError:
        data = {"raw": resp.text[:300]}

    logger.info(f"📤 Beehiiv'e draft yazıldı: {title[:60]}")
    return data
