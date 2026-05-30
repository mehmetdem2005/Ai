"""PDF indir + metin çıkar.

PyMuPDF (fitz) ile yüksek kaliteli metin çıkarma — cryptography bağımlılığı yok,
saf binary, GitHub Actions ubuntu-latest'te sorunsuz çalışır.

Yayıncı PDF URL pattern'leri:
- Nature/npj: HTML URL + '_reference.pdf'  (DOĞRULANDI canlıda)
- bioRxiv/medRxiv: HTML URL + '.full.pdf'
- arXiv: /abs/X → /pdf/X.pdf
- Generic: HTML body içinde <a href="*.pdf"> ara

Edge case'ler:
- Paywall (Lancet/JAMA/NEJM çoğunlukla) → None döner, çağıran abstract'a düşer
- Çok büyük PDF → 10 MB sınır (stream=True), kalan trim
- OCR-only PDF → fitz metin döndüremez, None
"""
from __future__ import annotations

import logging
import re
from typing import Optional
from urllib.parse import urlparse

import requests

try:
    import fitz  # PyMuPDF
    _HAS_FITZ = True
except ImportError:
    _HAS_FITZ = False

log = logging.getLogger(__name__)

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
MAX_PDF_BYTES = 10 * 1024 * 1024     # 10 MB
PDF_TIMEOUT = 30
MAX_TEXT_WORDS = 8000                # LLM bütçesi: ~32K token, DeepSeek 128K context'te bol


def fetch_pdf(url: str) -> Optional[bytes]:
    """PDF'i indir; HTTP/content-type kontrolü + boyut sınırı."""
    if not url:
        return None
    try:
        with requests.get(url, headers={"User-Agent": UA, "Accept": "application/pdf,*/*"},
                          timeout=PDF_TIMEOUT, allow_redirects=True, stream=True) as r:
            if r.status_code != 200:
                log.debug("PDF %s: HTTP %d", url, r.status_code)
                return None
            ct = r.headers.get("content-type", "").lower()
            if "pdf" not in ct:
                # Bazı CDN'ler content-type'ı yanlış verir; magic bytes kontrolü yapalım
                first_chunk = next(r.iter_content(chunk_size=4), b"")
                if first_chunk[:4] != b"%PDF":
                    log.debug("PDF %s: content-type=%s, magic=%r", url, ct, first_chunk[:8])
                    return None
                buf = bytearray(first_chunk)
            else:
                buf = bytearray()
            for chunk in r.iter_content(chunk_size=64 * 1024):
                buf.extend(chunk)
                if len(buf) > MAX_PDF_BYTES:
                    log.info("PDF %s: %d MB'ı geçti, kırpılıyor", url, MAX_PDF_BYTES // 1024 // 1024)
                    break
            return bytes(buf)
    except Exception as e:
        log.debug("PDF fetch %s: %s", url, e)
        return None


def extract_text(pdf_bytes: bytes) -> str:
    """PyMuPDF ile metin çıkar. Resim-tabanlı PDF için boş döner (OCR yapmaz)."""
    if not _HAS_FITZ:
        log.warning("PyMuPDF yok — PDF extraction devre dışı")
        return ""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        log.debug("PDF parse: %s", e)
        return ""

    parts = []
    for page in doc:
        try:
            parts.append(page.get_text())
        except Exception as e:
            log.debug("Sayfa metin: %s", e)
    doc.close()
    text = "\n\n".join(parts)
    return _clean(text)


def _clean(text: str) -> str:
    """Sayfa başlıkları/altyazıları, fazla beyaz boşluğu, referans listesini temizle."""
    if not text:
        return ""
    # Çoklu boşluk → tek boşluk, satır sonu koru
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    # Referans listesini at — "References" başlığından itibaren her şey gider
    # (LLM için gereksiz token, somut data Methods/Results/Discussion'da)
    for marker in ["\nReferences\n", "\nReferences \n", "\nReferences \n",
                   "\nReference List\n", "\nLiterature Cited\n"]:
        idx = text.find(marker)
        if idx > 0:
            text = text[:idx]
            break

    # Kelime sayısına göre kırp
    words = text.split()
    if len(words) > MAX_TEXT_WORDS:
        words = words[:MAX_TEXT_WORDS]
    return " ".join(words)


# ─────────────────────────────────────────────────────────────────────
# Yayıncı bazlı PDF URL deneme zinciri
# ─────────────────────────────────────────────────────────────────────

def candidate_pdf_urls(html_url: str) -> list[str]:
    """Verilen HTML URL'sinden olası PDF URL'lerini türet."""
    if not html_url:
        return []
    candidates: list[str] = []
    p = urlparse(html_url)
    host = p.hostname or ""

    if "nature.com" in host:
        # Nature/npj: .../articles/X → .../articles/X_reference.pdf (DOĞRULANDI)
        # Yedek: .../articles/X.pdf (idp.nature.com'a redirect olur, HTML döner — işe yaramaz)
        if "/articles/" in p.path and not p.path.endswith("_reference.pdf"):
            base = html_url.rstrip("/")
            if base.endswith(".pdf"):
                base = base[:-4]
            candidates.append(base + "_reference.pdf")

    elif "biorxiv.org" in host or "medrxiv.org" in host:
        # bioRxiv/medRxiv: .../content/X → .../content/X.full.pdf
        base = html_url.rstrip("/")
        if base.endswith(".full"):
            candidates.append(base + ".pdf")
        elif not base.endswith(".pdf"):
            # version suffix yoksa default
            candidates.append(base + ".full.pdf")

    elif "arxiv.org" in host:
        # /abs/X → /pdf/X.pdf
        if "/abs/" in p.path:
            arxiv_id = p.path.rsplit("/abs/", 1)[1].rstrip("/")
            candidates.append(f"https://arxiv.org/pdf/{arxiv_id}.pdf")

    return candidates


def discover_pdf_from_html(html: str, base_url: str) -> Optional[str]:
    """HTML body içinde 'Download PDF' linki ara — diğer yayıncılar için son çare."""
    if not html:
        return None
    # Spesifik download butonu pattern'leri
    patterns = [
        r'<a[^>]*href="([^"]+\.pdf[^"]*)"[^>]*>(?:[^<]*Download[^<]*|[^<]*Full[^<]*PDF[^<]*)',
        r'<a[^>]*data-track-action="(?:download pdf|view pdf)"[^>]*href="([^"]+)"',
        r'<a[^>]*class="[^"]*download[^"]*"[^>]*href="([^"]+\.pdf[^"]*)"',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I)
        if m:
            url = m.group(1)
            # Relative → absolute
            if url.startswith("/"):
                from urllib.parse import urljoin
                url = urljoin(base_url, url)
            # Springer ESM (supplementary) atla — ana makale değil
            if "MOESM" in url or "esm/art" in url:
                continue
            return url
    return None


def try_pdf_for_url(html_url: str) -> Optional[str]:
    """HTML URL → PDF metni (varsa). None → çağıran fallback'e geçer."""
    if not html_url:
        return None
    for pdf_url in candidate_pdf_urls(html_url):
        log.debug("PDF deneme: %s", pdf_url)
        data = fetch_pdf(pdf_url)
        if data:
            text = extract_text(data)
            if text and len(text) >= 2000:  # gerçek makale eşiği
                log.info("PDF %s → %d char extracted", pdf_url, len(text))
                return text
    return None
