"""Fan-out fetch — tüm kaynaklardan + tüm kullanıcı nişlerinden son N saatte yeni içerikleri çeker.

Mantık:
  - PubMed + ClinicalTrials.gov: niş bazlı sorgu (`pubmed_query` veya `description`)
  - medRxiv + bioRxiv: tarih bazlı (sorgu desteklemez) — global olarak bir kez çekilir
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Iterable

from ..sources import (
    BioRxivSource,
    ClinicalTrialsSource,
    MedRxivSource,
    PubMedSource,
)
from ..sources.base import RawItem

log = logging.getLogger(__name__)


def fetch_for_niche_queries(
    queries: list[str],
    *,
    since: datetime | None = None,
    max_per_source_per_query: int = 25,
) -> list[RawItem]:
    """PubMed + ClinicalTrials sorgu-tabanlı kaynaklardan çek.
    `queries` = aktif kullanıcı nişlerinin pubmed_query/description listesi."""
    if since is None:
        since = datetime.now(timezone.utc) - timedelta(hours=48)

    pm = PubMedSource()
    ct = ClinicalTrialsSource()
    items: list[RawItem] = []
    seen_keys: set[str] = set()

    for q in queries:
        if not q or len(q) < 4:
            continue
        try:
            pm_items = pm.search(q, max_results=max_per_source_per_query, since=since)
            log.info("PubMed «%s»: %d", q[:40], len(pm_items))
            for it in pm_items:
                key = f"{it.source_type}:{it.source_id}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    items.append(it)
        except Exception as e:
            log.warning("PubMed sorgu hata «%s»: %s", q[:40], e)

        try:
            ct_items = ct.search(q, max_results=max_per_source_per_query, since=since)
            log.info("ClinicalTrials «%s»: %d", q[:40], len(ct_items))
            for it in ct_items:
                key = f"{it.source_type}:{it.source_id}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    items.append(it)
        except Exception as e:
            log.warning("ClinicalTrials sorgu hata «%s»: %s", q[:40], e)

    return items


def fetch_preprints(
    *,
    since: datetime | None = None,
    max_per_server: int = 200,
) -> list[RawItem]:
    """medRxiv + bioRxiv — global, sorgu yok (embedding match filtreler)."""
    if since is None:
        since = datetime.now(timezone.utc) - timedelta(hours=24)

    items: list[RawItem] = []
    for src in (MedRxivSource(), BioRxivSource()):
        try:
            batch = src.search("", max_results=max_per_server, since=since)
            log.info("%s: %d preprint", src.server, len(batch))
            items.extend(batch)
        except Exception as e:
            log.warning("%s hata: %s", src.server, e)
    return items
