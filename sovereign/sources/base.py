"""Source ABC + ortak veri modeli.

Tüm kaynak adapter'ları `Source` ABC'sinden türer ve `RawItem` döner.
Pipeline `RawItem`'leri tek tip schema'ya normalize edip Supabase'e yazar."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Iterable


@dataclass
class RawItem:
    """Tek bir makale/preprint/trial — kaynak-agnostik."""
    source_type: str          # 'pubmed' | 'medrxiv' | 'biorxiv' | 'arxiv' | 'clinicaltrials' | 'openfda'
    source_id: str            # PMID, DOI, NCT-id, arXiv-id
    title: str
    abstract: str | None = None
    authors: list[str] = field(default_factory=list)
    journal: str | None = None
    published_at: datetime | None = None
    doi: str | None = None
    url: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    def to_db_dict(self) -> dict[str, Any]:
        return {
            "source_type": self.source_type,
            "source_id": self.source_id,
            "doi": self.doi,
            "title": self.title,
            "abstract": self.abstract,
            "authors": self.authors or None,
            "journal": self.journal,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "url": self.url,
            "raw": self.raw or None,
        }

    def embedding_text(self) -> str:
        """Embedding'e verilecek tek metin — başlık + özet."""
        return f"{self.title}\n\n{self.abstract or ''}".strip()


class Source(ABC):
    """Tek bir kaynak (PubMed, medRxiv, arXiv vb.) için soyut arayüz."""

    source_type: str  # alt sınıfta override edilir

    @abstractmethod
    def search(
        self,
        query: str,
        *,
        max_results: int = 50,
        since: datetime | None = None,
    ) -> Iterable[RawItem]:
        """Sorgu ile makaleleri getir. `since` verilmezse son 24 saat."""
        ...
