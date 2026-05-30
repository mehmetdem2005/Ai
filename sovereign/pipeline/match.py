"""Niş → Items → Brief eşleştirme orchestrator'ı.

Akış (tek bir kullanıcı için):
  1) Kullanıcının aktif nişlerini çek (embedding ile birlikte)
  2) Her niş için Supabase RPC `match_items_for_niche` çağır
     - Son N saatte fetch edilen, vektör uzaklığı eşik üstü top-K item döner
  3) (Niş, item) çiftleri için Türkçe özet üret (DeepSeek)
  4) `briefs` + `brief_items`'a yaz
"""
from __future__ import annotations

import logging
import os
from . import embed, summarize

log = logging.getLogger(__name__)

DEFAULT_THRESHOLD = 0.65
DEFAULT_TOP_K_PER_NICHE = 5
DEFAULT_LOOKBACK_HOURS = 48


def fetch_user_niches(db: SupabaseClient, user_id: str) -> list[dict]:
    return db.select(
        "niches",
        params={
            "user_id": f"eq.{user_id}",
            "is_active": "eq.true",
            "select": "id,label,description,pubmed_query,embedding,threshold",
        },
    )


def fetch_all_active_users(db: SupabaseClient) -> list[dict]:
    """Aktif (en az 1 niş'i olan) kullanıcıları döndürür."""
    profiles = db.select("profiles", params={"select": "id,email,specialty,plan,timezone,locale"})
    out = []
    for p in profiles:
        niches = db.select("niches", params={
            "user_id": f"eq.{p['id']}", "is_active": "eq.true", "select": "id",
        })
        if niches:
            p["niche_count"] = len(niches)
            out.append(p)
    return out


def upsert_items(db: SupabaseClient, raw_items: list[RawItem]) -> dict[str, int]:
    """RawItem'leri items tablosuna yazar (dedup: source_type+source_id unique).
    Embedding'i olmayanlara embedding ekleyip günceller.
    Dönen: {source_type: kaç yeni}."""
    if not raw_items:
        return {}

    # 1) Hangileri yeni — DB'de aynı source_id var mı bak
    by_key = {f"{it.source_type}:{it.source_id}": it for it in raw_items}
    # Supabase'de OR sorgu zor — basit yaklaşım: tek tek source_type bazında IN sorgu
    by_type: dict[str, list[RawItem]] = {}
    for it in raw_items:
        by_type.setdefault(it.source_type, []).append(it)

    existing_ids: set[str] = set()
    for stype, items in by_type.items():
        ids_csv = ",".join(f'"{it.source_id}"' for it in items)
        rows = db.select("items", params={
            "source_type": f"eq.{stype}",
            "source_id": f"in.({ids_csv})",
            "select": "source_type,source_id",
        })
        for r in rows:
            existing_ids.add(f"{r['source_type']}:{r['source_id']}")

    new_items = [it for k, it in by_key.items() if k not in existing_ids]
    if not new_items:
        log.info("upsert_items: yeni içerik yok")
        return {st: 0 for st in by_type}

    # 2) Yeni item'lar için embedding üret
    texts = [it.embedding_text() for it in new_items]
    log.info("Embedding %d yeni içerik için üretiliyor...", len(new_items))
    vecs = embed.embed_batch(texts)

    # 3) DB'ye yaz
    rows = []
    for it, v in zip(new_items, vecs):
        d = it.to_db_dict()
        d["embedding"] = v
        rows.append(d)
    db.upsert("items", rows, on_conflict="source_type,source_id", ignore_duplicates=True)

    counts: dict[str, int] = {}
    for it in new_items:
        counts[it.source_type] = counts.get(it.source_type, 0) + 1
    return counts


def match_niche(
    db: SupabaseClient,
    niche: dict,
    *,
    top_k: int = DEFAULT_TOP_K_PER_NICHE,
    lookback_hours: int = DEFAULT_LOOKBACK_HOURS,
) -> list[dict]:
    """Tek niş için en yakın top_k yeni item'ı döndürür (Supabase RPC)."""
    since = (datetime.now(timezone.utc) - timedelta(hours=lookback_hours)).isoformat()
    threshold = niche.get("threshold") or DEFAULT_THRESHOLD
    return db.rpc("match_items_for_niche", {
        "niche_embedding": niche["embedding"],
        "match_threshold": threshold,
        "match_count": top_k,
        "since": since,
    })


def build_brief_for_user(
    db: SupabaseClient,
    user: dict,
    *,
    top_k: int = DEFAULT_TOP_K_PER_NICHE,
    lookback_hours: int = DEFAULT_LOOKBACK_HOURS,
    today: date | None = None,
) -> dict:
    """Bir kullanıcı için günlük brief'i derler ve DB'ye yazar.
    Dönen: brief row + içeriği özet bilgi."""
    today = today or date.today()
    user_id = user["id"]
    niches = fetch_user_niches(db, user_id)
    if not niches:
        log.info("Kullanıcı %s için aktif niş yok, brief atlandı", user_id)
        return {"user_id": user_id, "item_count": 0, "status": "no_niches"}

    # Tüm niş × match'leri topla (dedup için item_id seti)
    sections: dict[int, list[dict]] = {}
    seen_items: set[int] = set()
    for niche in niches:
        matches = match_niche(db, niche, top_k=top_k, lookback_hours=lookback_hours)
        # Aynı item birden fazla nişte top'taysa en yüksek skorlu olana ata
        filtered = []
        for m in matches:
            if m["id"] in seen_items:
                continue
            seen_items.add(m["id"])
            filtered.append(m)
        if filtered:
            sections[niche["id"]] = filtered

    if not sections:
        log.info("Kullanıcı %s: hiç eşleşme yok", user_id)
        return {"user_id": user_id, "item_count": 0, "status": "no_matches"}

    # Brief row'u oluştur (varsa güncelle)
    existing = db.select("briefs", params={
        "user_id": f"eq.{user_id}",
        "brief_date": f"eq.{today.isoformat()}",
        "select": "id",
    })
    if existing:
        brief_id = existing[0]["id"]
        db.update("briefs", match={"id": brief_id},
                  values={"status": "draft", "item_count": len(seen_items)})
    else:
        row = db.insert("briefs", {
            "user_id": user_id,
            "brief_date": today.isoformat(),
            "status": "draft",
            "item_count": len(seen_items),
        })
        brief_id = row["id"]

    # Top-k seçilen item'lar için tam metin detayını çek (lazy — sadece bu az sayıda)
    # match RPC döndürdüğü item'larda source_type/url/doi var ama tam meta yok.
    all_item_ids = [m["id"] for items in sections.values() for m in items]
    item_extra: dict[int, dict] = {}
    if all_item_ids:
        ids_csv = ",".join(str(i) for i in all_item_ids)
        rows = db.select("items", params={
            "id": f"in.({ids_csv})",
            "select": "id,source_type,source_id,doi,url",
        })
        item_extra = {r["id"]: r for r in rows}

    # Her item için niş bağlamıyla TR özet üret
    niche_map = {n["id"]: n for n in niches}
    brief_items_rows: list[dict] = []
    position = 0
    ncbi_key = os.environ.get("NCBI_API_KEY")
    for niche_id, items in sections.items():
        niche = niche_map[niche_id]
        for m in items:
            # Lazy fulltext fetch — sadece bu top-k için (5-10 makale max)
            meta = item_extra.get(m["id"], {})
            fulltext = None
            try:
                fulltext = ft.fetch_for_item(
                    source_type=meta.get("source_type", m["source_type"]),
                    source_id=meta.get("source_id", ""),
                    doi=meta.get("doi"),
                    url=meta.get("url", m.get("url")),
                    ncbi_api_key=ncbi_key,
                )
                if fulltext:
                    log.info("Fulltext: item %s, %d char", m["id"], len(fulltext))
            except Exception as e:
                log.debug("Fulltext çekilemedi (item %s): %s", m["id"], e)

            summary_tr = ""
            try:
                summary_tr = summarize.summarize_for_niche(
                    title=m["title"],
                    abstract=m.get("abstract"),
                    journal=m.get("journal"),
                    authors=None,
                    niche_label=niche["label"],
                    niche_description=niche["description"],
                    fulltext=fulltext,
                )
            except Exception as e:
                log.warning("Özet hata (item %s): %s", m["id"], e)
                summary_tr = f"(özet üretilemedi: {e})"
            brief_items_rows.append({
                "brief_id": brief_id,
                "item_id": m["id"],
                "niche_id": niche_id,
                "score": m["score"],
                "summary_tr": summary_tr,
                "position": position,
            })
            position += 1

    # Eski brief_items'ı temizle, yenisini ekle (idempotent gün)
    # PostgREST delete: filter user'a göre değil brief_id'ye göre
    db.s.delete(
        f"{db.url}/rest/v1/brief_items",
        params={"brief_id": f"eq.{brief_id}"},
        timeout=20,
    )
    db.upsert("brief_items", brief_items_rows)

    return {
        "user_id": user_id,
        "brief_id": brief_id,
        "item_count": len(seen_items),
        "niche_count": len(sections),
        "status": "draft",
    }
