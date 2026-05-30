"""ClinicalTrials.gov API v2 adapter.

API: https://clinicaltrials.gov/api/v2/studies
Docs: https://clinicaltrials.gov/data-api/api
Ücretsiz, key gerekmez, rate limit cömert.

ClinicalTrials için "item":
  - source_id  = NCT-id (NCT0XXXXXXX)
  - title      = official title
  - abstract   = brief summary + condition + phase
  - journal    = "ClinicalTrials.gov · {phase} · {status}"
  - published_at = lastUpdatePostDateStruct.date (en son güncelleme)

Niş sorgusu (`niche.description` veya `niche.pubmed_query`) full-text aranır.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from .base import RawItem, Source

log = logging.getLogger(__name__)

API_URL = "https://clinicaltrials.gov/api/v2/studies"
UA = "Sovereign/1.0"


class ClinicalTrialsSource(Source):
    source_type = "clinicaltrials"

    def __init__(self, request_delay: float = 0.25):
        self.request_delay = request_delay
        self._last_request = 0.0

    def _throttle(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self._last_request = time.time()

    def search(
        self,
        query: str,
        *,
        max_results: int = 50,
        since: datetime | None = None,
    ) -> list[RawItem]:
        if since is None:
            since = datetime.now(timezone.utc) - timedelta(days=7)

        items: list[RawItem] = []
        next_token: str | None = None
        page_size = min(100, max_results)

        while len(items) < max_results:
            # ClinicalTrials.gov v2 "advanced search" sözdizimi:
            # AREA[LastUpdatePostDate]RANGE[YYYY-MM-DD,MAX]
            params: dict[str, Any] = {
                "query.term": query,
                "postFilter.advanced": (
                    f"AREA[LastUpdatePostDate]RANGE[{since.strftime('%Y-%m-%d')},MAX]"
                ),
                "pageSize": page_size,
                "format": "json",
                "countTotal": "true",
            }
            if next_token:
                params["pageToken"] = next_token

            self._throttle()
            r = requests.get(API_URL, params=params, headers={"User-Agent": UA}, timeout=30)
            r.raise_for_status()
            data = r.json()

            for study in data.get("studies", []):
                items.append(self._parse_study(study))
                if len(items) >= max_results:
                    break

            next_token = data.get("nextPageToken")
            if not next_token:
                break

        return items

    @staticmethod
    def _parse_study(study: dict) -> RawItem:
        proto = study.get("protocolSection", {})
        ident = proto.get("identificationModule", {})
        status = proto.get("statusModule", {})
        desc = proto.get("descriptionModule", {})
        design = proto.get("designModule", {})
        cond = proto.get("conditionsModule", {})

        nct_id = ident.get("nctId") or ""
        title = (ident.get("officialTitle") or ident.get("briefTitle") or "").strip()

        # Abstract: brief summary + koşullar + faz
        brief = (desc.get("briefSummary") or "").strip()
        conditions = ", ".join(cond.get("conditions", []) or [])
        phases = ", ".join(design.get("phases", []) or [])
        overall_status = status.get("overallStatus") or ""
        abstract_parts = []
        if brief:
            abstract_parts.append(brief)
        if conditions:
            abstract_parts.append(f"Conditions: {conditions}")
        if phases:
            abstract_parts.append(f"Phase: {phases}")
        if overall_status:
            abstract_parts.append(f"Status: {overall_status}")
        abstract = "\n\n".join(abstract_parts) or None

        # Tarih: en son güncelleme tarihi
        published_at = None
        last_update = status.get("lastUpdatePostDateStruct", {}).get("date")
        if last_update:
            try:
                published_at = datetime.fromisoformat(last_update).replace(tzinfo=timezone.utc)
            except ValueError:
                pass

        # Sponsor
        sponsor = proto.get("sponsorCollaboratorsModule", {}).get("leadSponsor", {}).get("name")
        phase_str = phases or "n/a"
        journal = f"ClinicalTrials.gov · {phase_str} · {overall_status}"

        url = f"https://clinicaltrials.gov/study/{nct_id}"

        return RawItem(
            source_type="clinicaltrials",
            source_id=nct_id,
            title=title,
            abstract=abstract,
            authors=[sponsor] if sponsor else [],
            journal=journal,
            published_at=published_at,
            url=url,
            raw={
                "nct_id": nct_id,
                "phases": design.get("phases"),
                "status": overall_status,
                "conditions": cond.get("conditions"),
            },
        )
