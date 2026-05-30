"""DeepSeek-v4-pro ile makaleyi belirli bir niş için Türkçe özetler.

Format kuralları (kullanıcının istediği "ilginç, gerçek, değerli veri" testi):
  - 3 satır maks: olay (sayı/oran ile) · bağlam · TR pratik anlamı
  - "AI gelişiyor" tipi boş cümle yasak
  - Her satır mutlaka 1 somut veri içermeli (n, %, $, gün, ay, doz, p-değeri)
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests

log = logging.getLogger(__name__)

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
# Özet için flash (reasoning yok, ucuz/hızlı). Haftalık derin analiz için DEEPSEEK_MODEL_DEEP.
MODEL = os.environ.get("DEEPSEEK_MODEL_SUMMARY") or "deepseek-v4-flash"

SYSTEM_PROMPT = """Sen Türkçe, tıbbi/klinik literatür özetçisisin. Her özet 3 satırdır:
- Satır 1: Olay + 1 somut sayı (n, %, p, OS, doz, ay, $ vb.).
- Satır 2: Bu sonucun klinik veya bilimsel bağlamı (önceki standartla farkı, hangi yola çıkar).
- Satır 3: Türkiye'deki klinik karara/pratiğe somut etkisi (ödeme, ruhsat, reçete, izlem değişikliği).

YASAK: "yapay zeka önemli oluyor", "uzmanlar uyarıyor", "sektör büyüyor" gibi boş ifadeler.
ZORUNLU: her satırda en az 1 somut veri."""

USER_TEMPLATE = """Niş bağlamı: {niche_label}
{niche_description}

Makale:
Başlık: {title}
Dergi: {journal}
Yazarlar: {authors}
Özet: {abstract}

Bu makaleyi yukarıdaki 3-satır kuralına göre özetle. Sadece özeti döndür, başka şey yazma."""


def summarize_for_niche(
    *,
    title: str,
    abstract: str | None,
    journal: str | None,
    authors: list[str] | None,
    niche_label: str,
    niche_description: str,
    api_key: str | None = None,
    max_tokens: int = 700,
) -> str:
    key = api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY yok — .env'i kontrol et.")

    user_msg = USER_TEMPLATE.format(
        niche_label=niche_label,
        niche_description=niche_description,
        title=title,
        journal=journal or "n/a",
        authors=", ".join((authors or [])[:5]) or "n/a",
        abstract=(abstract or "(özet yok)")[:3500],
    )

    payload: dict[str, Any] = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
        "stream": False,
    }
    r = requests.post(
        DEEPSEEK_URL,
        json=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()
