"""Full-text fetcher — open-access makaleler için abstract'ın ötesi.

Strateji öncelik sırası:
  1) PubMed Central (PMC) — PMID → PMC ID → NCBI efetch JATS XML
  2) Europe PMC fullTextXML — PMID ile direkt (PMC'siz OA makaleler için ek kanal)
  3) Unpaywall OA URL — DOI → OA HTML landing page → bs4 body extraction
  4) bioRxiv/medRxiv API JATS XML (preprint sunucuları için)
  5) Generic HTML — orijinal URL → bs4 heuristic body extraction
  6) Fallback: abstract'la devam et

Paywalled içerik için body fetch denenmez (gereksiz başarısız HTTP).
"""
from __future__ import annotations

import logging
import re
import time
from typing import Optional
from xml.etree import ElementTree as ET

import requests

log = logging.getLogger(__name__)
CONTACT_EMAIL = "mehmetdem7878@gmail.com"
UA = f"Sovereign/1.0 (mailto:{CONTACT_EMAIL})"
TIMEOUT = 30

EUROPEPMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest"
UNPAYWALL_BASE = "https://api.unpaywall.org/v2"

# Yaklaşık 4 token / kelime — LLM'e 6K kelime ≈ 24K token verirsek
# DeepSeek-chat 128K context'inde rahat sığar, makaleyi kapsar.
MAX_BODY_WORDS = 6000


def fetch_pmc_fulltext(pmid: str, api_key: str | None = None) -> Optional[str]:
    """PMID → PMC ID dönüşümü dene; PMC varsa JATS XML'den body çek."""
    # 1) ID dönüşümü
    params = {"ids": pmid, "format": "json", "tool": "sovereign", "email": "mehmetdem7878@gmail.com"}
    if api_key:
        params["api_key"] = api_key
    try:
        r = requests.get(
            "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/",
            params=params, headers={"User-Agent": UA}, timeout=TIMEOUT,
        )
        if r.status_code != 200:
            return None
        records = r.json().get("records", [])
        if not records or not records[0].get("pmcid"):
            return None
        pmcid = records[0]["pmcid"]  # "PMC1234567"
    except Exception as e:
        log.warning("PMC ID dönüşüm hatası (PMID %s): %s", pmid, e)
        return None

    # 2) PMC efetch — JATS XML
    fetch_params = {"db": "pmc", "id": pmcid.replace("PMC", ""), "rettype": "full", "retmode": "xml",
                    "tool": "sovereign", "email": "mehmetdem7878@gmail.com"}
    if api_key:
        fetch_params["api_key"] = api_key
    try:
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
            params=fetch_params, headers={"User-Agent": UA}, timeout=TIMEOUT,
        )
        if r.status_code != 200 or len(r.content) < 500:
            return None
        return _extract_text_from_jats(r.content)
    except Exception as e:
        log.warning("PMC efetch hatası (%s): %s", pmcid, e)
        return None


def fetch_europepmc_fulltext(pmid: str) -> Optional[str]:
    """Europe PMC fullTextXML endpoint — PMID veya PMC ID için JATS XML.

    NCBI PMC mirror'ı dışında PMC-listed olmayan OA dergiler (örn. PLOS,
    Frontiers'ın bazı versiyonları) için de fulltext sunabilir; PMC efetch
    başarısız olduğunda ek bir kanaldır.
    """
    if not pmid:
        return None
    url = f"{EUROPEPMC_BASE}/MED/{pmid}/fullTextXML"
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
        if r.status_code != 200 or len(r.content) < 500:
            return None
        return _extract_text_from_jats(r.content)
    except Exception as e:
        log.debug("Europe PMC fullTextXML hata (PMID %s): %s", pmid, e)
        return None


def fetch_unpaywall_oa_url(doi: str) -> Optional[str]:
    """DOI → OA versiyonu HTML landing URL'i. PDF link'leri atlanır
    (PDF parsing ek bağımlılık gerektirir; bu sprintta sadece HTML kanalı).

    Unpaywall serbest ve geniş — Sci-Hub'la karıştırma; Unpaywall sadece
    yayıncı veya repo tarafından OA olarak yayınlanmış sürümleri toplar."""
    if not doi:
        return None
    try:
        r = requests.get(
            f"{UNPAYWALL_BASE}/{doi}",
            params={"email": CONTACT_EMAIL},
            headers={"User-Agent": UA},
            timeout=TIMEOUT,
        )
        if r.status_code != 200:
            return None
        data = r.json()
    except Exception as e:
        log.debug("Unpaywall hata (DOI %s): %s", doi, e)
        return None

    def _pick_html(loc: dict) -> Optional[str]:
        # Tercih sırası: landing > generic url. PDF link'leri ve doi.org
        # resolver'ları atla — doi.org redirect zinciri çoğu zaman yayıncı
        # paywall'una gider, bs4 selektörlerimiz bu sayfaları tanımıyor.
        for k in ("url_for_landing_page", "url"):
            u = loc.get(k)
            if not u:
                continue
            ul = u.lower()
            if ul.endswith(".pdf"):
                continue
            if "doi.org/" in ul:
                continue  # resolver — yayıncıya redirect, parse şansı düşük
            if "pubmed.ncbi.nlm.nih.gov" in ul:
                continue  # PubMed abstract sayfası — fulltext yok
            return u
        return None

    best = data.get("best_oa_location") or {}
    u = _pick_html(best)
    if u:
        return u
    for loc in (data.get("oa_locations") or []):
        u = _pick_html(loc)
        if u:
            return u
    return None


def fetch_biorxiv_fulltext(doi: str, server: str = "biorxiv") -> Optional[str]:
    """bioRxiv/medRxiv JATS XML endpoint'i.

    Yapısal gerçek: bioRxiv Cloudflare CAPTCHA arkasında, headless scraping
    her variantta 403 dönüyor (.full.xml, .full, v1.full.xml). medRxiv'de
    bazen geçer. Yine de deniyoruz; medRxiv için ara sıra başarılı, bioRxiv
    için neredeyse hep boşa — ama düşük maliyetli (tek HTTP isteği) ve
    medRxiv'de işe yarayanı kaçırmak istemiyoruz.

    İlerideki çözüm: PDF parsing (pypdf) veya browserless headless service.
    """
    if not doi:
        return None
    url = f"https://www.{server}.org/content/{doi}.full.xml"
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
        if r.status_code != 200 or len(r.content) < 500:
            return None
        return _extract_text_from_jats(r.content)
    except Exception as e:
        log.debug("%s JATS XML hata (%s): %s", server, doi, e)
        return None


def fetch_html_body(url: str) -> Optional[str]:
    """Generic HTML — heuristic body extraction (Nature/npj/Lancet/JAMA için)."""
    if not url:
        return None
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT, allow_redirects=True)
        if r.status_code != 200:
            return None
        return _extract_text_from_html(r.text)
    except Exception as e:
        log.debug("HTML body fetch hata (%s): %s", url, e)
        return None


def _extract_text_from_jats(xml_bytes: bytes) -> str:
    """JATS XML'den makale gövdesini düzleştir."""
    try:
        # Encoding sorunlarını sustur
        text = xml_bytes.decode("utf-8", errors="replace")
        root = ET.fromstring(text)
    except ET.ParseError:
        return ""

    sections = []
    # Tipik JATS yapısı: <article><front>…</front><body><sec>…</sec></body><back>refs</back>
    body_el = root.find(".//body") or root.find(".//{http://jats.nlm.nih.gov}body")
    if body_el is None:
        return ""

    # Önceliği yüksek bölümler: Methods, Results, Discussion
    priority_keys = ("method", "result", "finding", "discuss", "conclus", "analy")
    other_secs = []

    for sec in body_el.iter():
        if sec.tag.split("}")[-1] != "sec":
            continue
        title_el = sec.find("title")
        sec_title = (title_el.text or "").strip().lower() if title_el is not None else ""
        # Sekiz alt-paragraf altındaki <p> ve <list> içeriklerini topla
        paragraphs = []
        for p in sec.iter():
            tag = p.tag.split("}")[-1]
            if tag in ("p", "list-item"):
                pt = "".join(p.itertext()).strip()
                if pt:
                    paragraphs.append(pt)
        if not paragraphs:
            continue
        block = f"## {sec_title.title() or 'Bölüm'}\n\n" + "\n\n".join(paragraphs)
        if any(k in sec_title for k in priority_keys):
            sections.insert(0, block)  # Methods/Results başa
        else:
            other_secs.append(block)

    full = "\n\n".join(sections + other_secs)
    return _trim_body(full)


def _extract_text_from_html(html: str) -> str:
    """BeautifulSoup ile nested-div safe body extraction.
    Yayıncı şablonları: Nature/npj, NEJM, JAMA, Lancet, BMJ.
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        log.warning("beautifulsoup4 yok — HTML body extraction devre dışı")
        return ""

    soup = BeautifulSoup(html, "html.parser")

    # Gürültüyü at — script/style/nav/footer/aside
    for tag in soup(["script", "style", "nav", "footer", "header", "aside",
                     "noscript", "form", "button"]):
        tag.decompose()

    # Tercih sırası — yayıncı bazlı en spesifik selektör en başta;
    # en sondaki seçiciler geniş "OA yayıncı" şablonlarını yakalar.
    candidates = [
        # Nature / npj (Springer-Nature)
        {"name": "div", "class_": "c-article-body"},
        # NEJM
        {"name": "section", "class_": "article-body"},
        # JAMA Network
        {"name": "div", "class_": "article-full-text"},
        # Lancet (Elsevier ScienceDirect)
        {"name": "div", "class_": "article-body"},
        # BMJ
        {"name": "div", "class_": "article-fulltext"},
        # PMC HTML
        {"name": "div", "class_": "article"},
        # PLOS, Frontiers, eLife — Article container'ları
        {"name": "div", "class_": "article-text"},
        {"name": "div", "class_": "JournalFullText"},
        {"name": "div", "class_": "fulltext-view"},
        # BMC / SpringerOpen
        {"name": "main", "id": "main-content"},
        # MDPI
        {"name": "div", "class_": "html-body"},
        # Wiley Online Library
        {"name": "section", "class_": "article-section__full"},
        # Taylor & Francis
        {"name": "div", "class_": "hlFld-Fulltext"},
        # ARIA role tabanlı son seçenek
        {"name": "main", "role": "main"},
        # Generic son çare
        {"name": "article"},
        {"name": "main"},
    ]

    body_el = None
    for sel in candidates:
        # role/id gibi attr-bazlı seçimleri attrs sözlüğüne yerleştir
        kw = {}
        attrs = {}
        for k, v in sel.items():
            if k in ("name", "class_"):
                kw[k] = v
            else:
                attrs[k] = v
        if attrs:
            kw["attrs"] = attrs
        body_el = soup.find(**kw)
        if body_el:
            txt = body_el.get_text(" ", strip=True)
            if len(txt) >= 800:  # minimum body uzunluğu
                break
            body_el = None

    if not body_el:
        return ""

    # Referans listesi/teşekkür gürültüsünü at
    for ref in body_el.select("[class*='references'], [class*='acknowledg'], "
                              "[class*='author-info'], [class*='ethics'], "
                              "[class*='supplementary'], [class*='additional-info'], "
                              "[id*='Bib'], [data-track-action='references']"):
        ref.decompose()

    text = body_el.get_text(" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return _trim_body(text)


def _trim_body(text: str) -> str:
    """Token bütçesine sığsın — kelime sayısına göre kırp."""
    if not text:
        return ""
    words = text.split()
    if len(words) > MAX_BODY_WORDS:
        words = words[:MAX_BODY_WORDS]
    return " ".join(words)


def fetch_for_item(*, source_type: str, source_id: str, doi: str | None, url: str | None,
                   ncbi_api_key: str | None = None) -> Optional[str]:
    """Item için en uygun yöntemi dene; bulamazsa None.

    Sıralama isabet sırasına göre — her seviye bir öncekinin çıktı veremediği
    durumlarda devreye girer. Loglardan görüldü: PMC-only akış 5 makaleden
    1'inde fulltext üretiyordu. Europe PMC + Unpaywall bu oranı ciddi artırır.
    """
    body: str | None = None

    # 1) PubMed item → NCBI PMC efetch (en yüksek kaliteli JATS)
    if source_type == "pubmed" and source_id:
        body = fetch_pmc_fulltext(source_id, api_key=ncbi_api_key)
        time.sleep(0.12)  # NCBI rate limit dostu (10 rps API key'li, 3 rps'siz)

    # 2) PubMed item PMC'de yoksa → Europe PMC fullTextXML
    if not body and source_type == "pubmed" and source_id:
        body = fetch_europepmc_fulltext(source_id)
        time.sleep(0.1)

    # 3) Preprint item'lar için doğrudan JATS endpoint
    if not body and source_type in ("biorxiv", "medrxiv") and doi:
        body = fetch_biorxiv_fulltext(doi, server=source_type)

    # 4) DOI varsa Unpaywall ile OA URL keşfi → HTML body extraction
    #    Yayıncı paywall'lı olsa bile self-archived bir versiyon olabilir.
    if not body and doi:
        oa_url = fetch_unpaywall_oa_url(doi)
        if oa_url:
            body = fetch_html_body(oa_url)

    # 5) Son çare: orijinal kaynak URL'i (yayıncı sayfası — çoğunlukla paywall'lı
    #    ama bazı OA dergiler veya self-hosted preprintler işe yarar).
    if not body and url:
        body = fetch_html_body(url)

    return body or None
