"""medRxiv + bioRxiv preprint adapter'ı.

API: https://api.biorxiv.org/details/{server}/{interval}/{cursor}/{format}
  server  = "medrxiv" veya "biorxiv"
  interval = "YYYY-MM-DD/YYYY-MM-DD" veya son N gün için "2024-01-01"
Ücretsiz, key gerekmez.

API tarih aralığıyla TÜM yeni preprint'leri döner — sorgu odaklı değil.
Bu yüzden pipeline: tüm preprint'leri al → embedding → niş ile match.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Iterable

import requests

from .base import RawItem, Source

log = logging.getLogger(__name__)

API_BASE = "https://api.biorxiv.org/details"
UA = "Sovereign/1.0"


class PreprintSource(Source):
    """medRxiv ve bioRxiv ortak adapter — sub-class server'ı belirtir."""

    server: str = "medrxiv"  # alt sınıfta override
    source_type: str = "medrxiv"

    def __init__(self, request_delay: float = 0.5):
        self.request_delay = request_delay
        self._last_request = 0.0

    def _throttle(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self._last_request = time.time()

    def _fetch_page(self, date_range: str, cursor: int) -> dict:
        self._throttle()
        url = f"{API_BASE}/{self.server}/{date_range}/{cursor}/json"
        r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
        r.raise_for_status()
        return r.json()

    def search(
        self,
        query: str = "",  # preprint API'leri sorgu kabul etmez — yoksay
        *,
        max_results: int = 200,
        since: datetime | None = None,
    ) -> list[RawItem]:
        if since is None:
            since = datetime.now(timezone.utc) - timedelta(days=1)
        end = datetime.now(timezone.utc)
        date_range = f"{since.strftime('%Y-%m-%d')}/{end.strftime('%Y-%m-%d')}"

        items: list[RawItem] = []
        cursor = 0
        while len(items) < max_results:
            data = self._fetch_page(date_range, cursor)
            collection = data.get("collection", [])
            if not collection:
                break
            for entry in collection:
                items.append(self._parse_entry(entry))
                if len(items) >= max_results:
                    break
            # bioRxiv API sayfa başına 100 döner; total'i kontrol et
            messages = data.get("messages", [{}])[0]
            total = int(messages.get("total", 0))
            cursor += len(collection)
            if cursor >= total:
                break
        return items

    def _parse_entry(self, entry: dict) -> RawItem:
        doi = entry.get("doi") or ""
        title = (entry.get("title") or "").strip()
        abstract = (entry.get("abstract") or "").strip() or None
        authors_str = entry.get("authors") or ""
        authors = [a.strip() for a in authors_str.split(";") if a.strip()]
        published_at = None
        if entry.get("date"):
            try:
                published_at = datetime.fromisoformat(entry["date"]).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        category = entry.get("category")
        url = f"https://www.{self.server}.org/content/{doi}v{entry.get('version', '1')}"
        return RawItem(
            source_type=self.source_type,
            source_id=doi,
            doi=doi,
            title=title,
            abstract=abstract,
            authors=authors,
            journal=f"{self.server} (preprint, {category})" if category else self.server,
            published_at=published_at,
            url=url,
            raw={"category": category, "version": entry.get("version")},
        )


class MedRxivSource(PreprintSource):
    server = "medrxiv"
    source_type = "medrxiv"


class BioRxivSource(PreprintSource):
    server = "biorxiv"
    source_type = "biorxiv"
