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

import os
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
from openai import OpenAI
from tenacity import retry, wait_exponential, stop_after_attempt

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

DEFAULT_SYSTEM_PROMPT = """Sen, sağlık teknolojileri (MedTech) ve Biyoteknoloji alanında uzmanlaşmış kıdemli bir yatırım analisti ve yapay zeka stratejistisin.
Okuyucuların: Sağlık sektörüne yatırım yapan melek yatırımcılar (VC'ler), hastane CIO'ları ve sağlık odaklı AI geliştiren mühendisler.
Görev: Verilen haberi oku ve okuyucu kitlesi için NEDEN ÖNEMLİ olduğunu maksimum 3 cümle ile analiz et.
- Sadece "ne oldu" deme, "bunun ticari veya teknolojik etkisi ne olacak" (Impact) kısmına odaklan.
- Eğer haberde çoklu ajan sistemleri (multi-agent), otomasyon, giyilebilir teknoloji veya yeni bir algoritmik yaklaşım varsa, mutlaka vurgula.
- Dil: Resmi, veri odaklı, net ve profesyonel (Türkçe)."""

SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT") or DEFAULT_SYSTEM_PROMPT
NEWSLETTER_TITLE = os.getenv("NEWSLETTER_TITLE", "🧬 MedTech & AI Signal")

# Runner'lar UTC; bülten İstanbul saatine göre tarihlensin.
ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")
TR_MONTHS = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
    7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
}


def now_ist() -> datetime:
    return datetime.now(ISTANBUL_TZ)


def load_feeds() -> list[dict]:
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
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


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
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cols = {row[1] for row in conn.execute("PRAGMA table_info(processed_items)")}
            if "embedding" not in cols:
                conn.execute("ALTER TABLE processed_items ADD COLUMN embedding TEXT")

    def filter_new_hashes(self, hash_list: list[str]) -> set[str]:
        if not hash_list:
            return set()
        placeholders = ",".join("?" for _ in hash_list)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                f"SELECT id_hash FROM processed_items WHERE id_hash IN ({placeholders})",
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
            )
            for i in items
        ]
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.executemany(
                "INSERT OR IGNORE INTO processed_items "
                "(id_hash, title, link, source, embedding) VALUES (?, ?, ?, ?, ?)",
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
        for item, vec in zip(items, vectors):
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

    @retry(wait=wait_exponential(multiplier=2, min=2, max=10), stop=stop_after_attempt(3))
    def _call_llm(self, prompt: str) -> str:
        if not self.is_active:
            return "[MOCK] API key yok. Bu bir taslak (mock) analist notudur."
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        return (response.choices[0].message.content or "").strip()

    def process(self, items: list[dict]) -> list[dict]:
        if not items:
            return []
        mode = f"{self.provider}/{self.model}" if self.is_active else "mock"
        self.logger.info(f"🧠 {len(items)} makale {mode} ile analiz ediliyor...")
        for item in items:
            prompt = f"Başlık: {item['title']}\nÖzet: {item['summary']}"
            try:
                item["ai_insight"] = self._call_llm(prompt)
            except Exception as exc:
                self.logger.error(f"Analiz hatası ({item['title'][:40]}): {exc}")
                item["ai_insight"] = "Analiz yapılamadı."
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
            lines.append(f"### {idx}. [{item['title']}]({item['link']})")
            lines.append(f"**Kaynak:** {item['source']}")
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

    def save_articles(self, items: list[dict]) -> None:
        if not self.is_active or not items:
            return
        rows = [
            {
                "id_hash": i["hash"],
                "title": i["title"],
                "link": i["link"],
                "source": i["source"],
                "summary": i.get("summary"),
                "ai_insight": i.get("ai_insight"),
                "embedding": i.get("embedding"),
            }
            for i in items
        ]
        try:
            resp = requests.post(
                f"{self.url}/rest/v1/articles?on_conflict=id_hash",
                headers=self._headers(upsert=True),
                json=rows,
                timeout=30,
            )
            if resp.status_code >= 300:
                self.logger.error(f"Supabase articles hatası {resp.status_code}: {resp.text[:200]}")
            else:
                self.logger.info(f"☁️ Supabase: {len(rows)} makale yazıldı.")
        except requests.RequestException as exc:
            self.logger.error(f"Supabase articles bağlantı hatası: {exc}")

    def save_newsletter(self, filename: str | None, content: str, article_count: int) -> None:
        if not self.is_active:
            return
        try:
            resp = requests.post(
                f"{self.url}/rest/v1/newsletters",
                headers=self._headers(),
                json={"filename": filename, "content": content, "article_count": article_count},
                timeout=30,
            )
            if resp.status_code >= 300:
                self.logger.error(f"Supabase newsletters hatası {resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as exc:
            self.logger.error(f"Supabase newsletters bağlantı hatası: {exc}")


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

    kept, dropped = deduper.deduplicate(new_data, history)
    if not kept:
        logger.info("ℹ️ Tüm yeni içerikler mevcutlara benzer — bülten üretilmedi.")
        db.save_items_batch(dropped)  # tekrar taranmasınlar
        store.save_articles(dropped)
        return

    analyzed = processor.process(kept)
    path, content = publisher.publish(analyzed)
    store.save_articles(analyzed + dropped)
    store.save_newsletter(os.path.basename(path) if path else None, content, len(analyzed))
    saved = db.save_items_batch(analyzed + dropped)
    logger.info(f"✅ Döngü tamamlandı. {saved} kayıt yerel DB'ye, {len(analyzed + dropped)} makale Supabase'e ({len(dropped)} tekrar eleme).")


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
