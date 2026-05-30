"""Niş embedding senkronizasyonu.

Embedding null veya (label+description+pubmed_query) hash'i değişmiş aktif nişler için
OpenAI embedding üretip `niches.embedding` ve `niches.embedding_hash` kolonlarını günceller.

Bu adım `cli.cmd_daily` öncesinde otomatik çalışır — onboarding'de embedding kolonu hiç
doldurulmadığı için kritiktir. Aksi takdirde match RPC null vektörle hata atar.
"""
from __future__ import annotations

import hashlib
import logging

from ..db import SupabaseClient
from . import embed

log = logging.getLogger(__name__)


def _niche_text(n: dict) -> str:
    parts = [
        (n.get("label") or "").strip(),
        (n.get("description") or "").strip(),
        (n.get("pubmed_query") or "").strip(),
    ]
    return "\n".join(p for p in parts if p)


def _niche_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def sync_niche_embeddings(db: SupabaseClient) -> dict[str, int]:
    """Aktif tüm nişleri tarar, embedding güncellemesi gerekenleri batch'le yeniden embedler."""
    rows = db.select("niches", params={
        "is_active": "eq.true",
        "select": "id,label,description,pubmed_query,embedding,embedding_hash",
    })
    if not rows:
        return {"checked": 0, "updated": 0, "skipped_empty": 0}

    pending: list[tuple[int, str, str]] = []  # (id, text, hash)
    skipped_empty = 0
    for n in rows:
        text = _niche_text(n)
        if not text:
            skipped_empty += 1
            continue
        h = _niche_hash(text)
        if not n.get("embedding") or n.get("embedding_hash") != h:
            pending.append((n["id"], text, h))

    if not pending:
        log.info("Niş embedding sync: %d niş, hepsi güncel", len(rows))
        return {"checked": len(rows), "updated": 0, "skipped_empty": skipped_empty}

    log.info("Niş embedding sync: %d/%d niş yeniden embedlenecek", len(pending), len(rows))
    vecs = embed.embed_batch([p[1] for p in pending])

    for (niche_id, _text, h), v in zip(pending, vecs):
        db.update(
            "niches",
            match={"id": niche_id},
            values={"embedding": v, "embedding_hash": h},
        )

    return {"checked": len(rows), "updated": len(pending), "skipped_empty": skipped_empty}
