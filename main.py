"""
Sovereign BioTech — Otonom Bülten Motoru
========================================
RSS → SQLite (URL dedup) → embedding tabanlı anlamsal dedup → LLM analizi
→ Markdown bülten (+ opsiyonel Supabase kalıcılığı).

Sağlayıcılar .env üzerinden seçilir:
  - Metin üretimi (LLM): deepseek | gemini
  - Embedding (anlamsal dedup): gemini | openai

Yasal: sadece public RSS, sıfır cold mail.
"""

import contextlib
import os
import re
import sys
import json
import time
import logging
import sqlite3
import hashlib
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
import feedparser
from bs4 import BeautifulSoup
import schedule
from dotenv import load_dotenv
from openai import (
    OpenAI,
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

# ==========================================
# 1. ORTAM VE LOGLAMA
# ==========================================
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
DB_DIR = os.path.join(BASE_DIR, "db")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

for directory in (LOG_DIR, DB_DIR, OUTPUT_DIR):
    os.makedirs(directory, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(name)s] - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(LOG_DIR, f"system_{datetime.now().strftime('%Y%m%d')}.log"),
            encoding="utf-8",
        ),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("SovereignBio")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

# Sadece geçici hatalarda yeniden dene; 401/400/404 gibi kalıcı hatalarda anında bırak.
TRANSIENT_LLM_ERRORS = (RateLimitError, APITimeoutError, APIConnectionError, InternalServerError)

# Metin üretimi sağlayıcıları (hepsi OpenAI-uyumlu endpoint)
LLM_PROVIDERS = {
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "key_env": "DEEPSEEK_API_KEY",
        # deepseek-v4-pro (frontier) | deepseek-reasoner (R1/düşünme) | deepseek-chat
        "default_model": "deepseek-reasoner",
    },
    "gemini": {
        "base_url": GEMINI_BASE_URL,
        "key_env": "GEMINI_API_KEY",
        "default_model": "gemini-2.5-flash",
    },
}

# Embedding sağlayıcıları (anlamsal dedup için)
EMBED_PROVIDERS = {
    "gemini": {
        "base_url": GEMINI_BASE_URL,
        "key_env": "GEMINI_API_KEY",
        "default_model": "gemini-embedding-001",
    },
    "openai": {
        "base_url": None,  # OpenAI varsayılan endpoint
        "key_env": "OPENAI_API_KEY",
        "default_model": "text-embedding-3-small",
    },
}

DEFAULT_SOURCES = [
    {"name": "Nature Digital Medicine", "url": "https://www.nature.com/npjdigitalmed.rss"},
    {"name": "MIT Tech Review (Biotech)", "url": "https://www.technologyreview.com/topic/biotechnology/feed"},
    {"name": "MobiHealthNews", "url": "https://www.mobihealthnews.com/feed"},
    {"name": "Fierce Healthcare", "url": "https://www.fiercehealthcare.com/rss/xml"},
    {"name": "TechCrunch Health", "url": "https://techcrunch.com/tag/health/feed/"},
]

DEFAULT_SYSTEM_PROMPT = """Sen, sağlık teknolojileri (MedTech) ve Biyoteknoloji alanında uzmanlaşmış kıdemli bir yatırım analistisin. Okuyucuların: sağlık sektörüne yatırım yapan VC'ler, hastane CIO'ları ve sağlık odaklı AI geliştiren mühendisler.

Görevlerin:
1. Haberi oku ve hedef kitle için teknolojik/ticari etkisine göre 1 ile 10 arası bir IMPACT SCORE (Etki Puanı) ver.
2. Haber başlığının akıcı, doğal bir Türkçe çevirisini yap.
3. Bu etkinin NEDENİNİ maksimum 3 cümle ile analiz et (insight) — "ne oldu" değil, "ticari/teknolojik etkisi ne" sorusuna odaklan.

KATI KURALLAR:
- ASLA madde imi (bullet point) veya alt başlık kullanma.
- Haberin orijinal metninde geçmiyorsa, sırf süslemek için "çoklu ajan (multi-agent)", "otomasyon" gibi kelimeleri ZORLA KULLANMA. Orijinal kal.
- Dil: resmi, veri odaklı, net Türkçe.
- Çıktıyı SADECE geçerli bir JSON objesi olarak ver; JSON dışında hiçbir metin, açıklama veya kod çiti (```), ekleme.
- Şema: {"score": <1-10 tamsayı>, "title_tr": "<Türkçe başlık>", "insight": "<en fazla 3 cümle analiz>"}"""

SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT") or DEFAULT_SYSTEM_PROMPT
NEWSLETTER_TITLE = os.getenv("NEWSLETTER_TITLE", "🧬 Sağlık Teknolojisi & Yapay Zeka Sinyali")

# V2/V3 ayarları — "hardcode prangası yok" prensibi:
#   0 = sınırsız (LLM/skor karar verir); pozitif değer = sert üst sınır.
MAX_NEW_PER_SOURCE = int(os.getenv("MAX_NEW_PER_SOURCE", "0"))  # kaynak başına taze haber kotası
MIN_IMPACT_SCORE = int(os.getenv("MIN_IMPACT_SCORE", "7"))      # bu puanın altı bültene girmez
MAX_PUBLISHED = int(os.getenv("MAX_PUBLISHED", "0"))            # bültene giren maksimum (0=sınırsız)

# Analizi başarısız olan maddeler kalıcılaştırılmaz; sonraki turda yeniden denenir.
ANALYSIS_FAILED = "__ANALYSIS_FAILED__"

# Runner'lar UTC; bülten İstanbul saatine göre tarihlensin.
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")
TR_MONTHS = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
    7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
}


def now_ist() -> datetime:
    return datetime.now(ISTANBUL_TZ)


def _feeds_from_supabase() -> list[dict] | None:
    """Yönetim arayüzünden eklenen kaynaklar Supabase 'feeds' tablosunda tutulur."""
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_KEY", "")
    if not (url and key):
        return None
    try:
        resp = requests.get(
            f"{url}/rest/v1/feeds?select=name,url&active=eq.true&order=created_at",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=20,
        )
        if resp.status_code < 300:
            rows = [{"name": r["name"], "url": r["url"]} for r in resp.json() if r.get("url")]
            return rows or None
        logger.warning(f"Supabase feeds okunamadı ({resp.status_code}) — feeds.json'a düşülüyor.")
    except requests.RequestException as exc:
        logger.warning(f"Supabase feeds bağlantı hatası ({exc}) — feeds.json'a düşülüyor.")
    return None


def load_feeds() -> list[dict]:
    # Öncelik: Supabase (arayüzden yönetilir) → feeds.json → yerleşik varsayılanlar.
    supabase_feeds = _feeds_from_supabase()
    if supabase_feeds:
        return supabase_feeds
    path = os.path.join(BASE_DIR, "feeds.json")
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                feeds = json.load(f)
            if isinstance(feeds, list) and feeds:
                return feeds
            logger.warning("feeds.json boş/geçersiz — varsayılan kaynaklar kullanılıyor.")
        except (OSError, json.JSONDecodeError) as exc:
            logger.error(f"feeds.json okunamadı ({exc}) — varsayılan kaynaklar kullanılıyor.")
    return DEFAULT_SOURCES


def cosine_similarity(a: list[float], b: list[float]) -> float:
    # Farklı boyut = farklı embedding modeli; kıyaslama anlamsız, benzer sayma.
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def apply_source_quota(items: list[dict], limit: int) -> list[dict]:
    """Her kaynaktan en fazla `limit` öğe tut (giriş sırası = tazelik korunur).

    Amaç: çok haber basan kaynakların (TechCrunch, Fierce) az ama öz basan
    kaynakları (Nature) havuzdan dışlamasını engellemek.
    """
    if limit <= 0:
        return items
    counts: dict[str, int] = {}
    out: list[dict] = []
    for item in items:
        src = item.get("source", "")
        if counts.get(src, 0) >= limit:
            continue
        counts[src] = counts.get(src, 0) + 1
        out.append(item)
    return out


def select_for_publication(items: list[dict], min_score: int, limit: int) -> list[dict]:
    """Skoru >= min_score olanları büyükten küçüğe sırala; en yüksek `limit` öğeyi döndür.

    limit <= 0 → sınırsız (skor barajını geçen herkes). Hardcode prangası kaldırma kuralı.
    """
    qualified = [
        i for i in items
        if isinstance(i.get("impact_score"), (int, float)) and i["impact_score"] >= min_score
    ]
    qualified.sort(key=lambda i: i["impact_score"], reverse=True)
    if limit <= 0:
        return qualified
    return qualified[:limit]


# ==========================================
# 2. ÇEKİRDEK BİLEŞENLER
# ==========================================
class DatabaseManager:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS processed_items (
                    id_hash TEXT PRIMARY KEY,
                    title TEXT,
                    link TEXT,
                    source TEXT,
                    embedding TEXT,
                    impact_score REAL,
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cols = {row[1] for row in conn.execute("PRAGMA table_info(processed_items)")}
            if "embedding" not in cols:
                conn.execute("ALTER TABLE processed_items ADD COLUMN embedding TEXT")
            if "impact_score" not in cols:
                conn.execute("ALTER TABLE processed_items ADD COLUMN impact_score REAL")

    def filter_new_hashes(self, hash_list: list[str]) -> set[str]:
        if not hash_list:
            return set()
        # placeholders yalnızca "?,?,..."; değerler parametreyle geçer (enjeksiyon yok).
        placeholders = ",".join("?" for _ in hash_list)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                f"SELECT id_hash FROM processed_items WHERE id_hash IN ({placeholders})",  # noqa: S608  # nosec B608
                tuple(hash_list),
            )
            existing = {row[0] for row in cursor.fetchall()}
        return set(hash_list) - existing

    def get_recent_embeddings(self, limit: int = 500) -> list[list[float]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT embedding FROM processed_items "
                "WHERE embedding IS NOT NULL ORDER BY processed_at DESC LIMIT ?",
                (limit,),
            )
            vectors = []
            for (raw,) in cursor.fetchall():
                try:
                    vectors.append(json.loads(raw))
                except (TypeError, json.JSONDecodeError):
                    continue
        return vectors

    def save_items_batch(self, items: list[dict]) -> int:
        if not items:
            return 0
        tuples = [
            (
                i["hash"],
                i["title"],
                i["link"],
                i["source"],
                json.dumps(i["embedding"]) if i.get("embedding") else None,
                i.get("impact_score"),
            )
            for i in items
        ]
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.executemany(
                "INSERT OR IGNORE INTO processed_items "
                "(id_hash, title, link, source, embedding, impact_score) VALUES (?, ?, ?, ?, ?, ?)",
                tuples,
            )
            return cursor.rowcount


class DataFetcher:
    def __init__(self, sources: list[dict]) -> None:
        self.sources = sources
        self.max_entries = int(os.getenv("MAX_ENTRIES_PER_FEED", "10"))
        self.logger = logging.getLogger("Fetcher")

    def clean_html(self, html: str) -> str:
        if not html:
            return ""
        return BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True)

    def fetch(self) -> list[dict]:
        all_entries: list[dict] = []
        seen_in_batch: set[str] = set()  # Aynı runda crossposted içerik koruması

        for src in self.sources:
            self.logger.info(f"📡 Tarama: {src['name']}")
            try:
                # feedparser'ın kendi fetch'i timeout'suz; requests ile sınırla + gerçek UA
                # (bazı feed'ler python-urllib UA'sını 403'ler).
                resp = requests.get(
                    src["url"],
                    timeout=20,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; SovereignBio/1.0; +RSS)"},
                )
                if resp.status_code >= 400:
                    self.logger.error(f"RSS HTTP {resp.status_code} ({src['name']}) — atlandı.")
                    continue
                feed = feedparser.parse(resp.content)
                if feed.bozo:
                    self.logger.warning(f"{src['name']} feed uyarısı: {feed.bozo_exception}")
                for entry in feed.entries[: self.max_entries]:
                    link = entry.get("link")
                    if not link:
                        continue
                    url_hash = hashlib.sha256(link.encode("utf-8")).hexdigest()
                    if url_hash in seen_in_batch:
                        continue
                    seen_in_batch.add(url_hash)

                    title = entry.get("title", "(başlıksız)")
                    raw_summary = entry.get("summary", title)
                    summary = self.clean_html(raw_summary)[:800]

                    all_entries.append(
                        {
                            "hash": url_hash,
                            "title": title,
                            "link": link,
                            "summary": summary,
                            "source": src["name"],
                        }
                    )
            except Exception as exc:
                self.logger.error(f"RSS hatası ({src['name']}): {exc}")

        self.logger.info(f"📊 {len(all_entries)} aday makale tarandı (batch dedup sonrası).")
        return all_entries


class SemanticDeduper:
    """OpenAI-uyumlu embedding API ile anlamsal (yakın-tekrar) dedup. Sağlayıcı .env'den."""

    def __init__(self) -> None:
        self.logger = logging.getLogger("Deduper")
        self.provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
        self.threshold = float(os.getenv("DEDUP_THRESHOLD", "0.86"))
        cfg = EMBED_PROVIDERS.get(self.provider)
        self.is_active = False
        if cfg is None:
            self.logger.warning(f"Bilinmeyen embedding sağlayıcı '{self.provider}' — dedup atlandı.")
            return
        key = os.getenv(cfg["key_env"])
        self.model = os.getenv("EMBEDDING_MODEL") or cfg["default_model"]
        if not key:
            self.logger.warning(
                f"⚠️ {cfg['key_env']} yok — anlamsal dedup atlandı (sadece URL dedup)."
            )
            return
        self.client = OpenAI(api_key=key, base_url=cfg["base_url"]) if cfg["base_url"] else OpenAI(api_key=key)
        self.is_active = True

    def _embed(self, texts: list[str]) -> list[list[float] | None]:
        try:
            resp = self.client.embeddings.create(model=self.model, input=texts)
            return [d.embedding for d in resp.data]
        except Exception as exc:
            self.logger.warning(f"Toplu embedding başarısız ({exc}); tek tek deneniyor.")
            out: list[list[float] | None] = []
            for text in texts:
                try:
                    resp = self.client.embeddings.create(model=self.model, input=text)
                    out.append(resp.data[0].embedding)
                except Exception as exc2:
                    self.logger.error(f"Embedding hatası: {exc2}")
                    out.append(None)
            return out

    def deduplicate(
        self, items: list[dict], history_vectors: list[list[float]]
    ) -> tuple[list[dict], list[dict]]:
        """(kept, dropped) döner. kept öğelerine 'embedding' eklenir."""
        if not self.is_active or not items:
            return items, []

        self.logger.info(f"🧬 {len(items)} makale anlamsal dedup ({self.provider}/{self.model})...")
        vectors = self._embed([f"{i['title']} {i['summary']}" for i in items])

        kept: list[dict] = []
        dropped: list[dict] = []
        reference_vectors = list(history_vectors)
        for item, vec in zip(items, vectors, strict=True):
            if vec is None:
                kept.append(item)  # embedding alınamadıysa elemeyelim
                continue
            if any(cosine_similarity(vec, ref) >= self.threshold for ref in reference_vectors):
                self.logger.info(f"♻️ Benzer içerik atlandı: {item['title'][:60]}")
                dropped.append(item)
                continue
            item["embedding"] = vec
            kept.append(item)
            reference_vectors.append(vec)

        self.logger.info(f"🧬 Dedup sonrası {len(kept)} özgün, {len(dropped)} tekrar.")
        return kept, dropped


class AIProcessor:
    """Çoklu sağlayıcı LLM (OpenAI-uyumlu endpoint). Sağlayıcı/model .env'den."""

    def __init__(self) -> None:
        self.logger = logging.getLogger("AI_Engine")
        self.provider = os.getenv("LLM_PROVIDER", "deepseek").lower()
        cfg = LLM_PROVIDERS.get(self.provider)
        if cfg is None:
            self.logger.warning(f"Bilinmeyen LLM sağlayıcı '{self.provider}' — deepseek'e düşülüyor.")
            self.provider, cfg = "deepseek", LLM_PROVIDERS["deepseek"]
        self.model = os.getenv(f"{self.provider.upper()}_MODEL") or cfg["default_model"]
        api_key = os.getenv(cfg["key_env"])
        self.is_active = bool(api_key)
        self.client = OpenAI(api_key=api_key or "dummy", base_url=cfg["base_url"])
        if not self.is_active:
            self.logger.warning(f"⚠️ {cfg['key_env']} yok — mock modunda.")

    @retry(
        retry=retry_if_exception_type(TRANSIENT_LLM_ERRORS),
        wait=wait_exponential(multiplier=2, min=2, max=10),
        stop=stop_after_attempt(3),
    )
    def _call_llm(self, prompt: str) -> str:
        if not self.is_active:
            return '{"score": 8, "title_tr": "", "insight": "[MOCK] API anahtarı yok. Bu bir taslak analist notudur."}'
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        return (response.choices[0].message.content or "").strip()

    @staticmethod
    def _parse_analysis(raw: str, fallback_title: str) -> dict | None:
        """LLM'in JSON çıktısından {score, title_tr, insight} ayıkla.

        Çevredeki metni/kod çitlerini yok sayıp ilk JSON objesini alır.
        Geçersiz JSON veya eksik/bozuk alan → None (madde analiz başarısız sayılır).
        """
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(data, dict):
            return None
        score = data.get("score")
        insight = data.get("insight")
        if not isinstance(score, (int, float)) or isinstance(score, bool):
            return None
        if not isinstance(insight, str) or not insight.strip():
            return None
        score = max(1, min(10, int(round(score))))
        title_tr = str(data.get("title_tr") or "").strip() or fallback_title
        return {"score": score, "title_tr": title_tr, "insight": insight.strip()}

    def process(self, items: list[dict]) -> list[dict]:
        if not items:
            return []
        mode = f"{self.provider}/{self.model}" if self.is_active else "mock"
        self.logger.info(f"🧠 {len(items)} makale {mode} ile analiz + skorlanıyor...")
        for item in items:
            prompt = (
                f"Haber başlığı: {item['title']}\n"
                f"Özet: {item['summary']}\n\n"
                "Yukarıdaki kurallara göre SADECE bir JSON objesi döndür."
            )
            try:
                raw = self._call_llm(prompt)
                parsed = self._parse_analysis(raw, item["title"])
                if parsed is None:
                    self.logger.warning(f"JSON çözümlenemedi ({item['title'][:40]}) — atlandı.")
                    item["ai_insight"] = ANALYSIS_FAILED
                    continue
                item["impact_score"] = parsed["score"]
                item["title_tr"] = parsed["title_tr"]
                item["ai_insight"] = parsed["insight"]
            except Exception as exc:
                self.logger.error(f"Analiz hatası ({item['title'][:40]}): {exc}")
                item["ai_insight"] = ANALYSIS_FAILED
        return items


class Publisher:
    def __init__(self) -> None:
        self.logger = logging.getLogger("Publisher")

    def render(self, items: list[dict]) -> str:
        dt = now_ist()
        readable = f"{dt.day} {TR_MONTHS[dt.month]} {dt.year}"
        lines = [
            f"# {NEWSLETTER_TITLE}",
            f"**Tarih:** {readable}",
            "",
            "Sektördeki gürültüyü filtreliyor, otonom yapay zeka mimarimizle "
            "sadece sinyali veriyoruz:",
            "",
            "---",
            "",
        ]
        for idx, item in enumerate(items, 1):
            heading = item.get("title_tr") or item["title"]
            lines.append(f"### {idx}. [{heading}]({item['link']})")
            meta = f"**Kaynak:** {item['source']}"
            score = item.get("impact_score")
            if score is not None:
                meta += f"  ·  📊 **Sinyal Gücü:** {int(score)}/10"
            lines.append(meta)
            lines.append("")
            lines.append(f"💡 **Analist Sinyali:**\n> {item['ai_insight']}")
            lines.append("")
            lines.append("---")
            lines.append("")
        return "\n".join(lines)

    def publish(self, items: list[dict]) -> tuple[str | None, str]:
        if not items:
            return None, ""
        content = self.render(items)
        timestamp = now_ist().strftime("%Y-%m-%d_%H%M")
        path = os.path.join(OUTPUT_DIR, f"newsletter_{timestamp}.md")
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
        except OSError as exc:
            self.logger.error(f"Bülten yazılamadı: {exc}")
            return None, content
        self.logger.info(f"📝 Draft bülten: {path}")
        return path, content


class SupabaseStore:
    """Supabase REST (PostgREST) ile kalıcılık. SUPABASE_URL + SUPABASE_KEY varsa aktif."""

    def __init__(self) -> None:
        self.logger = logging.getLogger("Supabase")
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_KEY", "")
        self.is_active = bool(self.url and self.key)
        if not self.is_active:
            self.logger.info("ℹ️ Supabase yapılandırılmadı — sadece yerel kayıt.")

    def _headers(self, upsert: bool = False) -> dict:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if upsert:
            headers["Prefer"] = "resolution=merge-duplicates"
        return headers

    def existing_hashes(self, hashes: list[str]) -> set[str]:
        """Verilen hash'lerden Supabase'de zaten kayıtlı olanları döner (kalıcı dedup)."""
        if not self.is_active or not hashes:
            return set()
        found: set[str] = set()
        # URL uzunluk sınırı için 100'lük gruplar
        for i in range(0, len(hashes), 100):
            chunk = hashes[i : i + 100]
            in_list = ",".join(chunk)
            try:
                resp = requests.get(
                    f"{self.url}/rest/v1/articles?select=id_hash&id_hash=in.({in_list})",
                    headers=self._headers(),
                    timeout=30,
                )
                if resp.status_code < 300:
                    found.update(row["id_hash"] for row in resp.json())
                else:
                    self.logger.error(f"Supabase existing_hashes hatası {resp.status_code}: {resp.text[:200]}")
            except requests.RequestException as exc:
                self.logger.error(f"Supabase existing_hashes bağlantı hatası: {exc}")
        return found

    def recent_embeddings(self, limit: int = 500) -> list[list[float]]:
        if not self.is_active:
            return []
        try:
            resp = requests.get(
                f"{self.url}/rest/v1/articles"
                f"?select=embedding&embedding=not.is.null&order=processed_at.desc&limit={limit}",
                headers=self._headers(),
                timeout=30,
            )
            if resp.status_code < 300:
                return [row["embedding"] for row in resp.json() if row.get("embedding")]
            self.logger.error(f"Supabase recent_embeddings hatası {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            self.logger.error(f"Supabase recent_embeddings bağlantı hatası: {exc}")
        return []

    def save_articles(self, items: list[dict]) -> bool:
        """Başarılıysa True döner; bülten kaydı bu sonuca göre koşullanır."""
        if not self.is_active:
            return False
        if not items:
            return True
        rows = [
            {
                "id_hash": i["hash"],
                "title": i["title"],
                "title_tr": i.get("title_tr"),
                "link": i["link"],
                "source": i["source"],
                "summary": i.get("summary"),
                "ai_insight": i.get("ai_insight"),
                "impact_score": i.get("impact_score"),
                "category": i.get("category"),
                "status": i.get("status", "pending"),
                "embedding": i.get("embedding"),
            }
            for i in items
        ]
        result = self._upsert_articles(rows)
        if result is True:
            return True
        # V3 sütunları (impact_score/status/category/title_tr) eksikse — sütunları atıp tekrar dene.
        # Migration çalıştırılmadan da pipeline durmasın; site/bülten newsletters.content'ten gösterir.
        if result == "missing_v3_column":
            self.logger.warning(
                "Supabase 'articles' tablosunda V3 sütunları eksik — V3 alanları atılarak "
                "kaydediliyor. Tam HITL/kategori işlevi için supabase_schema.sql migration'ını çalıştır."
            )
            for row in rows:
                for k in ("impact_score", "status", "category", "title_tr"):
                    row.pop(k, None)
            return self._upsert_articles(rows) is True
        return False

    _V3_COLUMNS = ("impact_score", "title_tr", "category", "status")

    def _upsert_articles(self, rows: list[dict]):
        """True=başarılı; 'missing_v3_column'=V3 sütunlarından biri yok; False=diğer hata."""
        try:
            resp = requests.post(
                f"{self.url}/rest/v1/articles?on_conflict=id_hash",
                headers=self._headers(upsert=True),
                json=rows,
                timeout=30,
            )
            if resp.status_code < 300:
                self.logger.info(f"☁️ Supabase: {len(rows)} makale yazıldı.")
                return True
            body = resp.text[:300]
            if any(col in body for col in self._V3_COLUMNS):
                return "missing_v3_column"
            self.logger.error(f"Supabase articles hatası {resp.status_code}: {body}")
            return False
        except requests.RequestException as exc:
            self.logger.error(f"Supabase articles bağlantı hatası: {exc}")
            return False

    def save_newsletter(
        self,
        filename: str | None,
        content: str,
        article_count: int,
        *,
        social_posts: dict | None = None,
    ) -> None:
        if not self.is_active:
            return
        body: dict = {
            "filename": filename,
            "content": content,
            "article_count": article_count,
        }
        if social_posts is not None:
            body["social_posts"] = social_posts
        try:
            resp = requests.post(
                f"{self.url}/rest/v1/newsletters",
                headers=self._headers(),
                json=body,
                timeout=30,
            )
            if resp.status_code >= 300:
                # social_posts sütunu eksikse atıp tekrar dene (migration yapılmadıysa)
                if social_posts is not None and "social_posts" in resp.text:
                    self.logger.warning(
                        "newsletters.social_posts sütunu yok — social atılarak kaydediliyor."
                    )
                    body.pop("social_posts", None)
                    resp2 = requests.post(
                        f"{self.url}/rest/v1/newsletters",
                        headers=self._headers(),
                        json=body,
                        timeout=30,
                    )
                    if resp2.status_code >= 300:
                        self.logger.error(
                            f"Supabase newsletters retry hatası {resp2.status_code}: {resp2.text[:200]}"
                        )
                    return
                self.logger.error(
                    f"Supabase newsletters hatası {resp.status_code}: {resp.text[:200]}"
                )
        except requests.RequestException as exc:
            self.logger.error(f"Supabase newsletters bağlantı hatası: {exc}")

    # === V3 HITL/Auto-publish destekleri ===

    def get_pending_items(self) -> list[dict]:
        """Streamlit kokpiti: status='pending' makaleler (yüksek skor önde)."""
        if not self.is_active:
            return []
        try:
            resp = requests.get(
                f"{self.url}/rest/v1/articles"
                "?status=eq.pending"
                "&select=id_hash,title,title_tr,link,source,summary,ai_insight,"
                "impact_score,category,processed_at"
                "&order=impact_score.desc.nullslast,processed_at.desc",
                headers=self._headers(),
                timeout=30,
            )
            if resp.status_code < 300:
                return resp.json()
            self.logger.error(f"get_pending_items {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            self.logger.error(f"get_pending_items bağlantı hatası: {exc}")
        return []

    def update_articles_status(self, hashes: list[str], status: str) -> bool:
        """Verilen hash'lerin status'unu toplu günceller (pending → published/rejected)."""
        if not self.is_active or not hashes:
            return True
        in_list = ",".join(hashes)
        try:
            resp = requests.patch(
                f"{self.url}/rest/v1/articles?id_hash=in.({in_list})",
                headers=self._headers(),
                json={"status": status},
                timeout=30,
            )
            if resp.status_code < 300:
                self.logger.info(f"Status -> '{status}': {len(hashes)} makale güncellendi.")
                return True
            self.logger.error(f"update_articles_status {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            self.logger.error(f"update_articles_status bağlantı hatası: {exc}")
        return False

    def oldest_pending_age_hours(self) -> float | None:
        """En eski pending makalenin yaşı (saat). Pending yoksa None."""
        if not self.is_active:
            return None
        try:
            resp = requests.get(
                f"{self.url}/rest/v1/articles"
                "?status=eq.pending&select=processed_at&order=processed_at.asc&limit=1",
                headers=self._headers(),
                timeout=20,
            )
            if resp.status_code < 300:
                rows = resp.json()
                if not rows:
                    return None
                from datetime import UTC, datetime as _dt
                ts = rows[0]["processed_at"].replace("Z", "+00:00")
                oldest = _dt.fromisoformat(ts)
                return (_dt.now(UTC) - oldest).total_seconds() / 3600
            self.logger.error(f"oldest_pending_age {resp.status_code}: {resp.text[:200]}")
        except (requests.RequestException, ValueError, KeyError) as exc:
            self.logger.error(f"oldest_pending_age hatası: {exc}")
        return None


# ==========================================
# 3. ORKESTRATÖR
# ==========================================
def run_pipeline() -> None:
    logger.info("=" * 60)
    logger.info("🚀 SOVEREIGN BÜLTEN DÖNGÜSÜ BAŞLADI")
    logger.info("=" * 60)

    db = DatabaseManager(os.path.join(DB_DIR, "data_warehouse.sqlite"))
    fetcher = DataFetcher(load_feeds())
    deduper = SemanticDeduper()
    processor = AIProcessor()
    publisher = Publisher()
    store = SupabaseStore()

    candidates = fetcher.fetch()
    if not candidates:
        logger.info("ℹ️ Hiç içerik bulunamadı.")
        return

    # Kalıcı dedup kaynağı: Supabase aktifse o (cron container'ları geçici), yoksa SQLite.
    hashes = [c["hash"] for c in candidates]
    if store.is_active:
        existing = store.existing_hashes(hashes)
        history = store.recent_embeddings()
    else:
        existing = set(hashes) - db.filter_new_hashes(hashes)
        history = db.get_recent_embeddings()

    new_data = [c for c in candidates if c["hash"] not in existing]
    logger.info(f"🔎 {len(new_data)} yeni makale ({len(existing)} zaten kayıtlı).")
    if not new_data:
        logger.info("ℹ️ Yeni sinyal bulunamadı.")
        return

    # V2 — Kaynak kotası: her kaynaktan en fazla MAX_NEW_PER_SOURCE taze haber (havuzu dengele).
    new_data = apply_source_quota(new_data, MAX_NEW_PER_SOURCE)
    logger.info(f"⚖️ Kaynak kotası: {len(new_data)} aday kaldı (kaynak başına ≤{MAX_NEW_PER_SOURCE}).")

    kept, dropped = deduper.deduplicate(new_data, history)
    for item in dropped:
        item["status"] = "duplicate"
    if not kept:
        logger.info("ℹ️ Tüm yeni içerikler mevcutlara benzer — pending'e bir şey eklenmedi.")
        db.save_items_batch(dropped)  # tekrar taranmasınlar
        store.save_articles(dropped)
        return

    analyzed = processor.process(kept)
    # Analizi başarısız olanları yayınlama/kalıcılaştırma — sonraki turda yeniden denensin.
    ok = [i for i in analyzed if i.get("ai_insight") != ANALYSIS_FAILED]
    failed = len(analyzed) - len(ok)
    if failed:
        logger.warning(f"⚠️ {failed} makale analiz edilemedi — kalıcılaştırılmadı, sonraki turda denenecek.")

    if not ok:
        logger.error("Hiçbir analiz başarılı olmadı — pending'e bir şey eklenmedi.")
        db.save_items_batch(dropped)
        store.save_articles(dropped)
        return

    # V3 — Skorla sırala, eşik üstünü pending'e ekleyecek aday set olarak al.
    cap_part = f", cap={MAX_PUBLISHED}" if MAX_PUBLISHED > 0 else ""
    published = select_for_publication(ok, MIN_IMPACT_SCORE, MAX_PUBLISHED)
    logger.info(
        f"🎯 {len(ok)} skorlanan makaleden {len(published)} tanesi pending'e ekleniyor "
        f"(eşik ≥{MIN_IMPACT_SCORE}{cap_part})."
    )

    # V3 — Semantik kümeleme (sınırsız kategori; LLM verinin doğasına göre karar verir).
    if published:
        from clustering import cluster_topics
        hash_to_cat = cluster_topics(published)
        for item in published:
            item["category"] = hash_to_cat.get(item["hash"], "Genel")

    # Status etiketleri: eşik üstü → pending (HITL bekler); eşik altı ok'lar da → pending
    # (Streamlit'te görsün), istersen reddedersin. Sadece dropped (semantik tekrar) duplicate.
    for item in published:
        item["status"] = "pending"

    # Eşik altı ok'ları da DB'ye 'rejected' olarak yaz (skor saklansın, pending'te görünmesin).
    below_threshold = [i for i in ok if i not in published]
    for item in below_threshold:
        item["status"] = "rejected"

    persisted = published + below_threshold + dropped
    if persisted:
        store.save_articles(persisted)
        db.save_items_batch(persisted)

    # V3 — Auto-publish emniyet sübabı: en eski pending yeterince yaşlıysa yayınla.
    auto_hours = float(os.getenv("AUTO_PUBLISH_AFTER_HOURS", "24"))
    auto_count = 0
    if auto_hours > 0 and store.is_active:
        oldest_age = store.oldest_pending_age_hours()
        if oldest_age is not None and oldest_age >= auto_hours:
            pending_rows = store.get_pending_items()
            if pending_rows:
                logger.info(
                    f"⏰ Otomasyon tetiklendi: en eski pending {oldest_age:.1f}h "
                    f"(>= {auto_hours}h) — {len(pending_rows)} haber yayınlanıyor."
                )
                items_to_publish = [
                    {
                        "hash": r["id_hash"],
                        "title": r["title"],
                        "title_tr": r.get("title_tr"),
                        "link": r["link"],
                        "source": r["source"],
                        "ai_insight": r.get("ai_insight"),
                        "impact_score": r.get("impact_score"),
                        "category": r.get("category"),
                    }
                    for r in pending_rows
                ]
                from publish_workflow import publish_newsletter
                result = publish_newsletter(
                    items_to_publish, store, publisher, trigger="auto"
                )
                auto_count = result.get("count", 0)

    # Healthcheck heartbeat (UptimeRobot / healthchecks.io vb. — opsiyonel).
    hc = os.getenv("HEALTHCHECK_URL")
    if hc:
        with contextlib.suppress(requests.RequestException):
            requests.get(hc, timeout=10)

    auto_suffix = f", {auto_count} auto-yayınlandı" if auto_count else ""
    logger.info(
        f"✅ Döngü tamam. {len(published)} yeni pending, {len(below_threshold)} eşik-altı, "
        f"{len(dropped)} duplicate, {failed} analiz hatası{auto_suffix}."
    )


def main() -> None:
    # Tek-sefer modu (Render Cron Job / manuel batch): bir döngü çalıştır ve çık.
    if os.getenv("RUN_MODE", "").lower() == "once" or "once" in sys.argv[1:]:
        run_pipeline()
        return

    # İlk batch hemen — sistemin çalıştığını anında doğrula
    run_pipeline()

    schedule.every().day.at("08:00").do(run_pipeline)
    schedule.every().day.at("18:00").do(run_pipeline)

    logger.info("⏳ Sovereign aktif. Görev bekleniyor... (Çıkış: Ctrl+C)")
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("🛑 Sistem manuel olarak durduruldu.")


if __name__ == "__main__":
    main()
