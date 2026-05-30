"""PubMed E-utilities adapter.

API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
Rate limit: 3 req/s (anahtarsız) · 10 req/s (NCBI_API_KEY ile)
Ücretsiz, kayıt opsiyonel.

Akış:
  1) esearch.fcgi  → PMID listesi (sorgu + tarih aralığı)
  2) efetch.fcgi   → her PMID için XML metadata (başlık + abstract + yazarlar)

Sorgu sözdizimi:
  "(immunotherapy[Title/Abstract]) AND (melanoma[MeSH]) AND 2024:2026[DP]"
  Niş.pubmed_query DB'de saklanır; yoksa niche.description'dan üretilir.
"""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Iterable
from xml.etree import ElementTree as ET

import requests

from .base import RawItem, Source

log = logging.getLogger(__name__)

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
UA = "Sovereign/1.0 (https://sovereign-roan.vercel.app; mailto:mehmetdem7878@gmail.com)"


class PubMedSource(Source):
    source_type = "pubmed"

    def __init__(self, api_key: str | None = None, request_delay: float = 0.34):
        # 0.34s ≈ 3 req/s (anahtarsız limit); anahtarla 0.11s yapılabilir
        self.api_key = api_key or os.environ.get("NCBI_API_KEY")
        self.request_delay = 0.11 if self.api_key else request_delay
        self._last_request = 0.0

    def _throttle(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self._last_request = time.time()

    def _params(self, **extra: str) -> dict[str, str]:
        p = {"db": "pubmed", "tool": "sovereign", "email": "mehmetdem7878@gmail.com"}
        if self.api_key:
            p["api_key"] = self.api_key
        p.update(extra)
        return p

    def _esearch(self, query: str, max_results: int, since: datetime) -> list[str]:
        """PMID listesi döndürür. `since`'den sonra crdt (create-date) olanlar."""
        # PubMed crdt formatı: YYYY/MM/DD
        date_str = since.strftime("%Y/%m/%d")
        full_query = f"({query}) AND (\"{date_str}\"[CRDT] : \"3000\"[CRDT])"
        self._throttle()
        r = requests.get(
            f"{EUTILS}/esearch.fcgi",
            params=self._params(
                term=full_query,
                retmax=str(max_results),
                retmode="json",
                sort="date",
            ),
            headers={"User-Agent": UA},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("esearchresult", {}).get("idlist", [])

    def _efetch(self, pmids: list[str]) -> list[RawItem]:
        """PMID listesi → XML metadata → RawItem listesi."""
        if not pmids:
            return []
        self._throttle()
        r = requests.post(
            f"{EUTILS}/efetch.fcgi",
            data=self._params(
                id=",".join(pmids),
                rettype="abstract",
                retmode="xml",
            ),
            headers={"User-Agent": UA},
            timeout=40,
        )
        r.raise_for_status()
        return list(self._parse_pubmed_xml(r.content))

    def _parse_pubmed_xml(self, xml_bytes: bytes) -> Iterable[RawItem]:
        root = ET.fromstring(xml_bytes)
        for art in root.findall(".//PubmedArticle"):
            try:
                yield self._parse_article(art)
            except Exception as e:
                log.warning("PubMed parse hatası: %s", e)

    @staticmethod
    def _parse_article(art: ET.Element) -> RawItem:
        pmid = art.findtext(".//PMID") or ""
        title = (art.findtext(".//ArticleTitle") or "").strip()

        # Abstract çoklu parçalı olabilir (Background/Methods/Results/Conclusion)
        abs_parts = []
        for ab in art.findall(".//Abstract/AbstractText"):
            label = ab.get("Label")
            text = "".join(ab.itertext()).strip()
            abs_parts.append(f"{label}: {text}" if label else text)
        abstract = "\n\n".join(abs_parts) if abs_parts else None

        authors = []
        for a in art.findall(".//Author"):
            last = a.findtext("LastName") or ""
            initials = a.findtext("Initials") or ""
            name = f"{last} {initials}".strip()
            if name:
                authors.append(name)

        journal = (art.findtext(".//Journal/Title") or
                   art.findtext(".//Journal/ISOAbbreviation") or None)

        # Yayın tarihi (en güvenilir: PubDate Year/Month/Day; yoksa MedlineDate)
        published_at = None
        pd = art.find(".//Journal/JournalIssue/PubDate")
        if pd is not None:
            y = pd.findtext("Year")
            m = pd.findtext("Month") or "01"
            d = pd.findtext("Day") or "01"
            if y:
                try:
                    month_map = {
                        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
                        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
                        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
                    }
                    m = month_map.get(m, m)
                    published_at = datetime(int(y), int(m), int(d), tzinfo=timezone.utc)
                except ValueError:
                    pass

        # DOI — ELocationID veya ArticleIdList
        doi = None
        for eid in art.findall(".//ELocationID"):
            if eid.get("EIdType") == "doi":
                doi = eid.text
                break
        if not doi:
            for aid in art.findall(".//ArticleId"):
                if aid.get("IdType") == "doi":
                    doi = aid.text
                    break

        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

        return RawItem(
            source_type="pubmed",
            source_id=pmid,
            doi=doi,
            title=title,
            abstract=abstract,
            authors=authors,
            journal=journal,
            published_at=published_at,
            url=url,
            raw={"pmid": pmid},
        )

    def search(
        self,
        query: str,
        *,
        max_results: int = 50,
        since: datetime | None = None,
    ) -> list[RawItem]:
        if since is None:
            since = datetime.now(timezone.utc) - timedelta(days=1)
        pmids = self._esearch(query, max_results, since)
        if not pmids:
            return []
        # PubMed efetch ID'leri 200'lük batch'lerle işler
        items: list[RawItem] = []
        for i in range(0, len(pmids), 200):
            batch = pmids[i:i + 200]
            items.extend(self._efetch(batch))
        return items
