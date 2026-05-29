"""Paylaşılan yayın iş akışı: hem Streamlit (manuel onay) hem worker (auto-fallback)
aynı fonksiyondan geçer (DRY).

Akış:
  items (pending) → Markdown render → HTML çevirisi → Beehiiv draft →
  Supabase newsletters'a kayıt (social_posts ile) → status='published' güncellemesi →
  growth agent ile sosyal post üretimi (UI'da göster / DB'ye yaz).
"""
import contextlib
import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import markdown as md_lib
import requests

import beehiiv_publisher
import growth_agent

ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")
logger = logging.getLogger("PublishWorkflow")


def _trigger_site_rebuild() -> None:
    """Yayın sonrası Vercel deploy hook'unu tetikler → halka açık site taze veriyle
    yeniden derlenir. VERCEL_DEPLOY_HOOK_URL yoksa sessizce atlar."""
    hook = os.getenv("VERCEL_DEPLOY_HOOK_URL")
    if not hook:
        return
    with contextlib.suppress(requests.RequestException):
        requests.post(hook, timeout=15)
        logger.info("🔁 Vercel deploy hook tetiklendi — site tazeleniyor.")


def render_html(markdown_content: str) -> str:
    """Markdown -> HTML (Beehiiv body_content için)."""
    return md_lib.markdown(
        markdown_content,
        extensions=["extra", "sane_lists", "nl2br"],
        output_format="html5",
    )


def publish_newsletter(
    items: list[dict],
    store,
    publisher,
    *,
    title: str | None = None,
    trigger: str = "manual",
) -> dict:
    """Onaylanmış/auto seçilmiş maddeleri tek bültende yayınla.

    items: skor/kategori/insight içeren in-memory dict listesi.
    store: SupabaseStore (save_newsletter + update_articles_status için).
    publisher: Publisher (render + .md yazımı için).
    trigger: 'manual' | 'auto' — sadece log için.

    Dönüş: {count, markdown, html, beehiiv, social_posts, title, trigger}
    """
    if not items:
        return {"count": 0, "error": "Yayınlanacak haber yok."}

    items_sorted = sorted(
        items, key=lambda i: i.get("impact_score") or 0, reverse=True
    )

    # 1. Markdown render + diske yaz (Publisher.publish hem string hem dosya döndürür)
    path, markdown_content = publisher.publish(items_sorted)

    # 2. HTML çevirisi
    html_content = render_html(markdown_content)

    # 3. Başlık (yoksa otomatik tarihli)
    dt = datetime.now(ISTANBUL_TZ)
    default_title = title or (
        f"{os.getenv('NEWSLETTER_TITLE', 'MedTech Sinyali')} — {dt.strftime('%d.%m.%Y')}"
    )

    # 4. Beehiiv'e draft (anahtar yoksa None döner — pipeline durmaz)
    beehiiv_resp = beehiiv_publisher.create_draft(html_content, default_title)

    # 5. Sosyal post üret (LLM otonom format)
    social = growth_agent.generate_social_posts(items_sorted)

    # 6. Supabase newsletters'a yaz (site için + social geçmişi)
    filename = (
        os.path.basename(path) if path else f"newsletter_{dt.strftime('%Y-%m-%d_%H%M')}.md"
    )
    store.save_newsletter(
        filename, markdown_content, len(items_sorted), social_posts=social
    )

    # 7. Articles status: pending -> published
    hashes = [i["hash"] for i in items_sorted]
    store.update_articles_status(hashes, "published")

    # 8. Halka açık siteyi (Vercel) tazele
    _trigger_site_rebuild()

    logger.info(
        f"🚀 [{trigger}] Yayın tamam: {len(items_sorted)} haber. "
        f"Beehiiv: {'✓' if beehiiv_resp else '✗ (anahtar yok ya da hata)'}"
    )

    return {
        "count": len(items_sorted),
        "markdown": markdown_content,
        "html": html_content,
        "beehiiv": beehiiv_resp,
        "social_posts": social,
        "title": default_title,
        "trigger": trigger,
    }
