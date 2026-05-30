"""OpenAI text-embedding-3-small wrapper.

1536 boyutlu vektör; $0.02 / 1M token (~1000 makale = ~$0.02).
Niş tanımı + makale (başlık+abstract) aynı uzayda kalmak için aynı modeli kullanır.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Iterable

import requests

log = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1/embeddings"
MODEL = os.environ.get("EMBEDDING_MODEL") or "text-embedding-3-small"
MAX_INPUT_TOKENS = 8000  # text-embedding-3-small limit 8191
BATCH_SIZE = 100         # OpenAI tek istekte 2048 input destekler, biz 100 tutuyoruz


def _truncate(text: str, max_chars: int = MAX_INPUT_TOKENS * 4) -> str:
    """Token ~ char/4 yaklaşımı; embedding modeli kesilirse hata atmaz ama biz emin olalım."""
    if not text:
        return " "
    return text[:max_chars]


def embed_batch(texts: list[str], *, api_key: str | None = None) -> list[list[float]]:
    """Tek seferde N metin embed eder. Sırayı korur."""
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY yok — .env'i kontrol et.")
    if not texts:
        return []

    out: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = [_truncate(t) for t in texts[start:start + BATCH_SIZE]]
        r = requests.post(
            OPENAI_URL,
            json={"model": MODEL, "input": batch, "encoding_format": "float"},
            headers={"Authorization": f"Bearer {key}"},
            timeout=60,
        )
        if r.status_code == 429:
            log.warning("OpenAI rate limit, 20s bekleniyor")
            time.sleep(20)
            r = requests.post(
                OPENAI_URL,
                json={"model": MODEL, "input": batch, "encoding_format": "float"},
                headers={"Authorization": f"Bearer {key}"},
                timeout=60,
            )
        r.raise_for_status()
        data = r.json()["data"]
        # OpenAI input sırasını korur (index ile döner) ama yine de sıralayalım
        data.sort(key=lambda x: x["index"])
        out.extend(d["embedding"] for d in data)
    return out


def embed_one(text: str, *, api_key: str | None = None) -> list[float]:
    return embed_batch([text], api_key=api_key)[0]


def cosine(a: list[float], b: list[float]) -> float:
    """Saf Python cosine similarity (vektörler aynı boyutta varsayılır)."""
    dot = sum(x * y for x, y in zip(a, b))
    # text-embedding-3-small zaten unit-norm — yine de güvende kalalım
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb + 1e-12)
