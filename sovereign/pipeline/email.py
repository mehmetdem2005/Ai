"""Brief email delivery — SMTP üzerinden HTML + plain-text.

Yapısal karar: Gmail SMTP (App Password) ile başlıyoruz — kullanıcının zaten
Gmail'i var, 2-step verification + App Password 1-2 dakika, free. İleride
Resend/SendGrid'e geçilirse sadece SMTP_HOST/PORT env değişir, kod aynı kalır.

Env zorunluluğu:
  SMTP_HOST    smtp.gmail.com
  SMTP_PORT    587
  SMTP_USER    kullanıcı_adresi
  SMTP_PASS    Gmail App Password (16 karakter, boşluksuz)
  EMAIL_FROM   "Sovereign Pro <kullanıcı_adresi>"  (opsiyonel, default SMTP_USER)
  FRONTEND_URL https://sovereign-roan.vercel.app  (opsiyonel)

Eksik env durumunda gönderim sessizce atlanır (log.warning + return False) —
cron yine brief üretmeye devam eder.
"""
from __future__ import annotations

import logging
import os
import smtplib
import ssl
from datetime import date
from email.message import EmailMessage
from typing import Any

from ..db import SupabaseClient

log = logging.getLogger(__name__)

DEFAULT_FRONTEND = "https://sovereign-roan.vercel.app"

TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
             "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]


def _smtp_configured() -> bool:
    return all(os.environ.get(k) for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"))


def _esc(s: str | None) -> str:
    if not s:
        return ""
    return (str(s)
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


def _fmt_date(d: date) -> str:
    return f"{d.day} {TR_MONTHS[d.month - 1]} {d.year}"


def _render_summary_html(summary_tr: str | None) -> str:
    if not summary_tr:
        return '<p style="color:#888;margin:0">Özet üretilemedi.</p>'
    paragraphs = [p.strip().lstrip("-•* ").strip()
                  for p in summary_tr.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip().lstrip("-•* ").strip()
                      for p in summary_tr.split("\n") if p.strip()]
    return "".join(
        f'<p style="margin:0 0 10px;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#222">{_esc(p)}</p>'
        for p in paragraphs
    )


def _render_html(brief: dict, items: list[dict], niches_map: dict, frontend_url: str) -> str:
    brief_date = brief.get("brief_date")
    if isinstance(brief_date, str):
        from datetime import datetime
        try:
            brief_date = datetime.fromisoformat(brief_date).date()
        except Exception:
            brief_date = date.today()
    elif brief_date is None:
        brief_date = date.today()

    date_str = _fmt_date(brief_date)
    count = len(items)

    # Niş başına grupla, niş etiket sırasına göre
    by_niche: dict[int, list[dict]] = {}
    for bi in items:
        by_niche.setdefault(bi["niche_id"], []).append(bi)

    sections_html = []
    for niche_id, niche_items in by_niche.items():
        niche = niches_map.get(niche_id, {})
        niche_label = niche.get("label", "Konu")
        items_html_parts = []
        for bi in niche_items:
            it = bi.get("items") or {}
            title = it.get("title") or "(başlıksız)"
            journal = it.get("journal") or ""
            score_pct = int(round(float(bi.get("score") or 0) * 100))
            summary_html = _render_summary_html(bi.get("summary_tr"))
            reader_url = f"{frontend_url}/pro/read.html?brief={brief['id']}&item={bi['item_id']}"

            items_html_parts.append(f"""
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;margin-bottom:12px">
              <div style="font-family:'JetBrains Mono',Menlo,monospace;font-size:10.5px;letter-spacing:0.08em;color:#888;margin-bottom:8px;text-transform:uppercase">
                {_esc(it.get("source_type") or "kaynak")} · eşleşme {score_pct}%
              </div>
              <h3 style="margin:0 0 6px;font-size:16px;font-weight:600;line-height:1.35;color:#111">
                <a href="{_esc(reader_url)}" style="color:#111;text-decoration:none;border-bottom:1px solid #0ea5e9">{_esc(title)}</a>
              </h3>
              <div style="font-family:'JetBrains Mono',Menlo,monospace;font-size:11.5px;color:#888;margin-bottom:14px">{_esc(journal)}</div>
              {summary_html}
              <div style="margin-top:14px">
                <a href="{_esc(reader_url)}" style="display:inline-block;padding:8px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500">
                  Sovereign'da aç →
                </a>
              </div>
            </div>
            """)

        sections_html.append(f"""
        <div style="margin-top:24px">
          <div style="font-size:13px;font-weight:600;color:#0c4a6e;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px">
            {_esc(niche_label)} <span style="font-family:'JetBrains Mono',Menlo,monospace;font-size:11px;color:#888;font-weight:400">· {len(niche_items)} makale</span>
          </div>
          {''.join(items_html_parts)}
        </div>
        """)

    dashboard_url = f"{frontend_url}/pro/dashboard.html"
    settings_url = f"{frontend_url}/pro/onboarding.html"

    return f"""<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb">
      <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em">Sovereign<span style="color:#0ea5e9">.</span> <span style="font-family:'JetBrains Mono',Menlo,monospace;font-size:11px;color:#888;letter-spacing:0.12em">PRO</span></div>
      <div style="font-family:'JetBrains Mono',Menlo,monospace;font-size:11px;color:#888;letter-spacing:0.06em">{_esc(date_str.upper())}</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:500;letter-spacing:-0.02em;margin:0 0 6px;color:#111">
      Bugünün brief'i
    </h1>
    <div style="color:#666;font-size:14px;margin-bottom:8px">
      {count} makale · {len(by_niche)} konu
    </div>
    {''.join(sections_html)}

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#888;line-height:1.6">
      Tüm makaleleri ve geçmiş brief'leri görmek için <a href="{_esc(dashboard_url)}" style="color:#0ea5e9">dashboard</a>'a git.<br>
      Bu brief'i şekillendiren konuları <a href="{_esc(settings_url)}" style="color:#0ea5e9">buradan</a> düzenleyebilirsin.
    </div>
  </div>
</body></html>"""


def _render_text(brief: dict, items: list[dict], niches_map: dict, frontend_url: str) -> str:
    """Email client'lar HTML'e düşünce gösterilecek plain-text fallback."""
    brief_date = brief.get("brief_date")
    if isinstance(brief_date, str):
        from datetime import datetime
        try:
            brief_date = datetime.fromisoformat(brief_date).date()
        except Exception:
            brief_date = date.today()
    elif brief_date is None:
        brief_date = date.today()

    lines = [f"Sovereign Pro · Brief {_fmt_date(brief_date)}", "=" * 50, ""]
    by_niche: dict[int, list[dict]] = {}
    for bi in items:
        by_niche.setdefault(bi["niche_id"], []).append(bi)
    for niche_id, niche_items in by_niche.items():
        niche = niches_map.get(niche_id, {})
        lines.append(f"\n── {niche.get('label', 'Konu')} ({len(niche_items)} makale) ──\n")
        for bi in niche_items:
            it = bi.get("items") or {}
            lines.append(f"• {it.get('title') or '(başlıksız)'}")
            lines.append(f"  {it.get('journal') or ''}")
            if bi.get("summary_tr"):
                lines.append("  " + bi["summary_tr"].replace("\n", "\n  "))
            url = f"{frontend_url}/pro/read.html?brief={brief['id']}&item={bi['item_id']}"
            lines.append(f"  → {url}")
            lines.append("")
    lines.append(f"\nDashboard: {frontend_url}/pro/dashboard.html")
    return "\n".join(lines)


def send_brief_email(db: SupabaseClient, user: dict, brief_id: int) -> bool:
    """Tek bir brief'i kullanıcıya HTML+plain mail olarak gönderir.
    Dönen: True başarılı, False atlandı/başarısız (sebep log'da)."""
    if not _smtp_configured():
        log.warning("Email gönderimi atlandı: SMTP_* env'leri set değil")
        return False

    user_email = user.get("email")
    if not user_email:
        log.warning("Email gönderimi atlandı: kullanıcı email'i yok (id=%s)", user.get("id"))
        return False

    # Brief + items + niş bilgilerini çek
    briefs = db.select("briefs", params={"id": f"eq.{brief_id}",
                                          "select": "id,user_id,brief_date,status,item_count"})
    if not briefs:
        log.warning("Brief bulunamadı: id=%s", brief_id)
        return False
    brief = briefs[0]

    items = db.select("brief_items", params={
        "brief_id": f"eq.{brief_id}",
        "select": "item_id,niche_id,score,summary_tr,position,items(source_type,title,journal,url)",
        "order": "position.asc",
    })
    if not items:
        log.info("Brief boş, email gönderilmedi: id=%s", brief_id)
        return False

    niche_ids = sorted({bi["niche_id"] for bi in items})
    niches = db.select("niches", params={
        "id": f"in.({','.join(str(i) for i in niche_ids)})",
        "select": "id,label",
    }) if niche_ids else []
    niches_map = {n["id"]: n for n in niches}

    frontend_url = (os.environ.get("FRONTEND_URL") or DEFAULT_FRONTEND).rstrip("/")
    html = _render_html(brief, items, niches_map, frontend_url)
    text = _render_text(brief, items, niches_map, frontend_url)

    brief_date = brief.get("brief_date") or date.today().isoformat()
    if isinstance(brief_date, str):
        from datetime import datetime
        try:
            brief_date = datetime.fromisoformat(brief_date).date()
        except Exception:
            brief_date = date.today()
    subject = f"Sovereign · Brief {_fmt_date(brief_date)} · {len(items)} makale"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ.get("EMAIL_FROM") or os.environ["SMTP_USER"]
    msg["To"] = user_email
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    smtp_user = os.environ["SMTP_USER"]
    smtp_pass = os.environ["SMTP_PASS"]

    try:
        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=30) as s:
                s.login(smtp_user, smtp_pass)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as s:
                s.ehlo()
                s.starttls(context=ctx)
                s.ehlo()
                s.login(smtp_user, smtp_pass)
                s.send_message(msg)
    except Exception as e:
        log.error("SMTP gönderim hatası (user=%s, brief=%s): %s", user_email, brief_id, e)
        return False

    # Brief status'unu 'sent' yap (idempotent — zaten 'sent' ise dokunma)
    if brief.get("status") != "sent":
        try:
            db.update("briefs", match={"id": brief_id}, values={"status": "sent"})
        except Exception as e:
            log.warning("Brief status update başarısız (id=%s): %s", brief_id, e)

    log.info("✓ Email gönderildi: user=%s, brief=%s, %d item", user_email, brief_id, len(items))
    return True
