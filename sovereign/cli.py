"""Sovereign V2 CLI.

Komutlar:
  python -m sovereign.cli embed-niches   # Aktif nişlerin embedding'lerini senkronize et
  python -m sovereign.cli fetch          # Tüm aktif kullanıcı nişleri için kaynak tara
  python -m sovereign.cli brief --all    # Her aktif kullanıcı için brief üret
  python -m sovereign.cli brief --user X # Tek kullanıcı için brief üret
  python -m sovereign.cli daily          # embed-niches + fetch + brief --all (cron için)
"""
from __future__ import annotations

import argparse
import logging
import os
import pathlib
import sys
from datetime import datetime, timedelta, timezone

# .env varsa yükle (yerel geliştirme); CI'de env vars secrets'tan gelir.
_env_file = pathlib.Path(__file__).resolve().parent.parent.joinpath(".env")
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from .db import SupabaseClient
from .pipeline import email as email_mod, embed_niches, fetch, match

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("sovereign")


def cmd_embed_niches(args: argparse.Namespace) -> int:
    db = SupabaseClient()
    res = embed_niches.sync_niche_embeddings(db)
    log.info("Niş embedding sync: %s", res)
    return 0


def cmd_fetch(args: argparse.Namespace) -> int:
    db = SupabaseClient()
    users = match.fetch_all_active_users(db)
    log.info("%d aktif kullanıcı, nişler çekiliyor", len(users))
    queries: list[str] = []
    for u in users:
        nis = match.fetch_user_niches(db, u["id"])
        for n in nis:
            q = (n.get("pubmed_query") or n.get("description") or "").strip()
            if q:
                queries.append(q[:300])
    queries = list(dict.fromkeys(queries))  # dedup
    log.info("Toplam %d eşsiz sorgu", len(queries))

    since = datetime.now(timezone.utc) - timedelta(hours=args.lookback_hours)
    items = fetch.fetch_for_niche_queries(queries, since=since,
                                          max_per_source_per_query=args.per_source)
    log.info("Sorgu kaynaklarından %d item", len(items))

    pre = fetch.fetch_preprints(since=since, max_per_server=args.per_server)
    log.info("Preprint sunucularından %d item", len(pre))
    items.extend(pre)

    counts = match.upsert_items(db, items)
    log.info("DB'ye yazılan yeni item'lar: %s", counts)
    return 0


def cmd_brief(args: argparse.Namespace) -> int:
    db = SupabaseClient()
    if args.user:
        users = db.select("profiles", params={"id": f"eq.{args.user}", "select": "id,email,specialty"})
    elif args.all:
        users = match.fetch_all_active_users(db)
    else:
        log.error("--all veya --user X gerekli")
        return 2

    log.info("Brief üretilecek kullanıcı sayısı: %d", len(users))
    sent = 0
    skipped = 0
    for u in users:
        try:
            res = match.build_brief_for_user(db, u, top_k=args.top_k,
                                             lookback_hours=args.lookback_hours)
            log.info("✓ user=%s -> %s", u.get("email") or u["id"], res)
        except Exception as e:
            log.error("✗ user=%s hata: %s", u.get("email") or u["id"], e, exc_info=True)
            continue

        # Email gönderimi — brief boş veya 'no_matches' ise SKIP
        brief_id = res.get("brief_id") if isinstance(res, dict) else None
        item_count = res.get("item_count") if isinstance(res, dict) else 0
        if args.no_email:
            continue
        if not brief_id or not item_count:
            skipped += 1
            continue
        ok = email_mod.send_brief_email(db, u, brief_id)
        if ok:
            sent += 1
        else:
            skipped += 1
    if not args.no_email:
        log.info("Email özeti: %d gönderildi, %d atlandı (boş brief veya SMTP yok)", sent, skipped)
    return 0


def cmd_daily(args: argparse.Namespace) -> int:
    """embed-niches + fetch + brief --all (cron için).
    embed-niches her sabah ilk adım — yeni niş eklenmiş veya düzenlenmişse
    embedding'i güncel kalsın."""
    rc = cmd_embed_niches(args)
    if rc != 0:
        return rc
    rc = cmd_fetch(args)
    if rc != 0:
        return rc
    args.all = True
    args.user = None
    # daily akışında --no-email default False (mail gönderim açık)
    if not hasattr(args, "no_email"):
        args.no_email = False
    return cmd_brief(args)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="sovereign")
    sub = p.add_subparsers(dest="cmd", required=True)

    pe = sub.add_parser("embed-niches", help="Aktif nişlerin embedding'lerini senkronize et")
    pe.set_defaults(func=cmd_embed_niches)

    pf = sub.add_parser("fetch", help="Kaynakları tara, items DB'sine yeni içerik ekle")
    pf.add_argument("--lookback-hours", type=int, default=48)
    pf.add_argument("--per-source", type=int, default=25, help="Sorgu başına max sonuç (PubMed/CT)")
    pf.add_argument("--per-server", type=int, default=200, help="Preprint sunucu başına max")
    pf.set_defaults(func=cmd_fetch)

    pb = sub.add_parser("brief", help="Kullanıcı(lar) için brief üret + email gönder")
    pb.add_argument("--all", action="store_true")
    pb.add_argument("--user")
    pb.add_argument("--top-k", type=int, default=5)
    pb.add_argument("--lookback-hours", type=int, default=48)
    pb.add_argument("--no-email", action="store_true", help="Email gönderimini atla (sadece DB'ye yaz)")
    pb.set_defaults(func=cmd_brief)

    pd = sub.add_parser("daily", help="embed-niches + fetch + brief --all + email (cron)")
    pd.add_argument("--lookback-hours", type=int, default=48)
    pd.add_argument("--per-source", type=int, default=25)
    pd.add_argument("--per-server", type=int, default=200)
    pd.add_argument("--top-k", type=int, default=5)
    pd.add_argument("--no-email", action="store_true", help="Email gönderimini atla")
    pd.set_defaults(func=cmd_daily)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
