"""Supabase REST client — minimal, sadece bizim ihtiyacımız.

PostgREST üzerinden tablolara CRUD + RPC çağırır.
Service role key kullanır (RLS'i baypas eder).
"""
from __future__ import annotations

import logging
import os
from typing import Any

import requests

log = logging.getLogger(__name__)


class SupabaseClient:
    def __init__(self, url: str | None = None, key: str | None = None):
        self.url = (url or os.environ["SUPABASE_URL"]).rstrip("/")
        self.key = key or os.environ["SUPABASE_KEY"]
        self.s = requests.Session()
        self.s.headers.update({
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        })

    def select(self, table: str, *, params: dict[str, str] | None = None) -> list[dict]:
        r = self.s.get(f"{self.url}/rest/v1/{table}", params=params or {}, timeout=30)
        r.raise_for_status()
        return r.json()

    def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        *,
        on_conflict: str | None = None,
        ignore_duplicates: bool = False,
    ) -> list[dict]:
        if not rows:
            return []
        params: dict[str, str] = {}
        if on_conflict:
            params["on_conflict"] = on_conflict
        prefer = "resolution=ignore-duplicates" if ignore_duplicates else "resolution=merge-duplicates"
        r = self.s.post(
            f"{self.url}/rest/v1/{table}",
            params=params,
            json=rows,
            headers={"Prefer": f"return=representation,{prefer}"},
            timeout=60,
        )
        r.raise_for_status()
        return r.json()

    def insert(self, table: str, row: dict[str, Any]) -> dict:
        r = self.s.post(
            f"{self.url}/rest/v1/{table}",
            json=row,
            headers={"Prefer": "return=representation"},
            timeout=30,
        )
        r.raise_for_status()
        result = r.json()
        return result[0] if isinstance(result, list) else result

    def update(self, table: str, *, match: dict[str, Any], values: dict[str, Any]) -> list[dict]:
        params = {k: f"eq.{v}" for k, v in match.items()}
        r = self.s.patch(
            f"{self.url}/rest/v1/{table}",
            params=params,
            json=values,
            headers={"Prefer": "return=representation"},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def rpc(self, fn: str, payload: dict[str, Any]) -> Any:
        r = self.s.post(f"{self.url}/rest/v1/rpc/{fn}", json=payload, timeout=30)
        r.raise_for_status()
        return r.json()
