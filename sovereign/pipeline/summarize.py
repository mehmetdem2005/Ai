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
# Özet için non-reasoning model: deepseek-chat (deprecation 2026-07-24, sonra v4-pro/flash reasoning_effort=low).
# Reasoning'li modeller (v4-pro, v4-flash) max_tokens budget'ını yiyor → boş content.
MODEL = os.environ.get("DEEPSEEK_MODEL_SUMMARY") or "deepseek-chat"

SYSTEM_PROMPT = """Sen Türkçe, tıbbi/klinik literatür özetçisisin. Her özet ÜÇ paragraftır,
her paragraf bir bilgi katmanı:

(1) BULGU — Makalenin temel sonucu + makaleden alınmış en az 1 somut sayı
    (n, %, HR, OR, OS, PFS, doz, mg/m², p-değeri, ay, $). Sayı yoksa "(somut sayı bildirilmedi)".

(2) BAĞLAM — Hangi literatür açığını dolduruyor; hangi standart-of-care, hangi önceki
    çalışma veya yöntemsel sınırla kıyaslanıyor. Mümkünse karşılaştırma sayısı
    (önceki HR=X.XX vs. mevcut HR=Y.YY).

(3) KLİNİK ANLAM — Hangi karar değişebilir, hangi hasta alt-grubu etkilenir, hangi izlem
    veya ardıl çalışma gerekir. Makalede pratik etki açıkça yoksa "Pratik etki için onay
    veya replikasyon bekleniyor" yaz — UYDURMA.

Biçim:
- Üç paragrafı boş satırla ayır. Başına liste işareti, "1.", "(1)" KOYMA — düz cümleler.
- Toplam 70-110 kelime.

Yasak ifadeler (kullanma): "uzmanlar uyarıyor", "devrim niteliğinde", "çığır açıyor",
"umut vadediyor", "yapay zeka önemli olacak", "sektör büyüyor", "oyun değiştirici".

Kullanıcının takip ettiği konu (label + açıklama) sana verilir. Makaleyi BU konunun
penceresinden özetle — konuyla doğrudan bağı yoksa ilk cümle olarak "Bu makale belirtilen
konuyla yalnızca dolaylı ilişkilidir." yaz, sonra üç paragrafı yine de üret."""

USER_TEMPLATE = """Takip edilen konu: {niche_label}
Konu tanımı:
{niche_description}

Makale:
Başlık: {title}
Dergi: {journal}
Yazarlar: {authors}

{content_header}
{content}

Bu makaleyi yukarıdaki üç-paragraf kuralına göre özetle. {content_instr}
Sadece özeti döndür, başka şey yazma."""


def summarize_for_niche(
    *,
    title: str,
    abstract: str | None,
    journal: str | None,
    authors: list[str] | None,
    niche_label: str,
    niche_description: str,
    fulltext: str | None = None,
    api_key: str | None = None,
    max_tokens: int = 1200,
) -> str:
    key = api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY yok — .env'i kontrol et.")

    # Konu tanımı tam veriliyor — kullanıcının niyeti %20 bağlamla bozulmasın.
    # DeepSeek-chat 128K context; 2000 char tavanı bütçe için yeterli.
    niche_short = (niche_description or "")[:2000]

    # Full text varsa onu kullan (gerçek makale gövdesi); yoksa abstract'a düş.
    if fulltext and len(fulltext) >= 800:
        content = fulltext[:14000]  # ~ 3500 token, DeepSeek-chat 128K context bol
        content_header = "Makalenin tam metni (ana bölümler):"
        content_instr = (
            "Tam metinden somut sayıları, hasta sayılarını, primer/sekonder son noktaları "
            "ve istatistiksel sonuçları (HR/OR/p) çek — abstract'ın yüzeyselliğine takılma."
        )
    else:
        content = (abstract or "(özet yok)")[:2500]
        content_header = "Abstract:"
        content_instr = "Abstract'ta verilen tüm somut sayıları (n, %, HR, p) muhakkak özete dahil et."

    user_msg = USER_TEMPLATE.format(
        niche_label=niche_label,
        niche_description=niche_short,
        title=title,
        journal=journal or "n/a",
        authors=", ".join((authors or [])[:5]) or "n/a",
        content_header=content_header,
        content=content,
        content_instr=content_instr,
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
