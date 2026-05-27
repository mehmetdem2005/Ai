"""
Sovereign BioTech — Otonom MedTech & AI Bülten Motoru
=====================================================
RSS → SQLite (dedup) → Gemini 2.5 Flash → Markdown bülten taslağı.
Yasal: KVKK / ETK / GDPR uyumlu — sadece public RSS, sıfır cold mail.
"""

import os
import time
import logging
import sqlite3
import hashlib
from datetime import datetime

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

# ==========================================
# 2. MEDTECH NİŞ KONFİGÜRASYONU
# ==========================================
SOURCES = [
    {"name": "Nature Digital Medicine", "url": "https://www.nature.com/npjdigitalmed.rss"},
    {"name": "MIT Tech Review (Biotech)", "url": "https://www.technologyreview.com/topic/biotechnology/feed"},
    {"name": "MobiHealthNews", "url": "https://www.mobihealthnews.com/feed"},
    {"name": "Fierce Healthcare", "url": "https://www.fiercehealthcare.com/rss/medtech"},
    {"name": "TechCrunch Health", "url": "https://techcrunch.com/category/health/feed/"},
]

SYSTEM_PROMPT = """Sen, sağlık teknolojileri (MedTech) ve Biyoteknoloji alanında uzmanlaşmış kıdemli bir yatırım analisti ve yapay zeka stratejistisin.
Okuyucuların: Sağlık sektörüne yatırım yapan melek yatırımcılar (VC'ler), hastane CIO'ları ve sağlık odaklı AI geliştiren mühendisler.
Görev: Verilen haberi oku ve okuyucu kitlesi için NEDEN ÖNEMLİ olduğunu maksimum 3 cümle ile analiz et.
- Sadece "ne oldu" deme, "bunun ticari veya teknolojik etkisi ne olacak" (Impact) kısmına odaklan.
- Eğer haberde çoklu ajan sistemleri (multi-agent), otomasyon, giyilebilir teknoloji veya yeni bir algoritmik yaklaşım varsa, mutlaka vurgula.
- Dil: Resmi, veri odaklı, net ve profesyonel (Türkçe)."""

# ==========================================
# 3. ÇEKİRDEK BİLEŞENLER
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
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

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

    def save_items_batch(self, items: list[dict]) -> int:
        if not items:
            return 0
        tuples = [(i["hash"], i["title"], i["link"], i["source"]) for i in items]
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.executemany(
                "INSERT OR IGNORE INTO processed_items (id_hash, title, link, source) VALUES (?, ?, ?, ?)",
                tuples,
            )
            return cursor.rowcount


class DataFetcher:
    MAX_ENTRIES = 10

    def __init__(self, sources: list[dict], db: DatabaseManager) -> None:
        self.sources = sources
        self.db = db
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
                feed = feedparser.parse(src["url"])
                if feed.bozo:
                    self.logger.warning(f"{src['name']} feed uyarısı: {feed.bozo_exception}")
                for entry in feed.entries[: self.MAX_ENTRIES]:
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

        if not all_entries:
            return []

        # Tek sorguluk DB dedup (N+1 problemi yok)
        new_hashes = self.db.filter_new_hashes([item["hash"] for item in all_entries])
        new_items = [item for item in all_entries if item["hash"] in new_hashes]
        self.logger.info(
            f"📊 {len(all_entries)} makale tarandı, {len(new_items)} yeni makale."
        )
        return new_items


class AIProcessor:
    """Gemini 2.5 Flash (OpenAI uyumlu endpoint üzerinden). Tek code path."""

    def __init__(self) -> None:
        self.logger = logging.getLogger("AI_Engine")
        api_key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.client = OpenAI(
            api_key=api_key if api_key else "dummy",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        self.is_active = bool(api_key)
        if not self.is_active:
            self.logger.warning("⚠️ LLM_API_KEY yok — mock modunda.")

    @retry(wait=wait_exponential(multiplier=2, min=2, max=10), stop=stop_after_attempt(3))
    def _call_gemini_flash(self, prompt: str) -> str:
        if not self.is_active:
            return "[MOCK] API key yok. Bu bir taslak (mock) analist notudur."

        response = self.client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()

    def process(self, items: list[dict]) -> list[dict]:
        if not items:
            return []
        mode = "Gemini 2.5 Flash" if self.is_active else "mock"
        self.logger.info(f"🧠 {len(items)} makale {mode} ile analiz ediliyor...")
        for item in items:
            prompt = f"Başlık: {item['title']}\nÖzet: {item['summary']}"
            try:
                item["ai_insight"] = self._call_gemini_flash(prompt)
            except Exception as exc:
                self.logger.error(f"Analiz hatası ({item['title'][:40]}): {exc}")
                item["ai_insight"] = "Analiz yapılamadı."
        return items


class Publisher:
    def __init__(self) -> None:
        self.logger = logging.getLogger("Publisher")

    def publish(self, items: list[dict]) -> str | None:
        if not items:
            return None
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        readable = datetime.now().strftime("%d %B %Y")
        path = os.path.join(OUTPUT_DIR, f"newsletter_{timestamp}.md")

        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"# 🧬 MedTech & AI Signal\n**Tarih:** {readable}\n\n")
                f.write(
                    "Sektördeki gürültüyü filtreliyor, otonom yapay zeka "
                    "mimarimizle sadece sinyali veriyoruz:\n\n---\n\n"
                )
                for idx, item in enumerate(items, 1):
                    f.write(f"### {idx}. [{item['title']}]({item['link']})\n")
                    f.write(f"**Kaynak:** {item['source']}\n\n")
                    f.write(f"💡 **Analist Sinyali:**\n> {item['ai_insight']}\n\n---\n\n")
        except OSError as exc:
            self.logger.error(f"Bülten yazılamadı: {exc}")
            return None

        self.logger.info(f"📝 Draft bülten: {path}")
        return path


# ==========================================
# 4. ORKESTRATÖR
# ==========================================
def run_pipeline() -> None:
    logger.info("=" * 60)
    logger.info("🚀 SOVEREIGN BIOTECH DÖNGÜSÜ BAŞLADI")
    logger.info("=" * 60)

    db = DatabaseManager(os.path.join(DB_DIR, "data_warehouse.sqlite"))
    fetcher = DataFetcher(SOURCES, db)
    processor = AIProcessor()
    publisher = Publisher()

    new_data = fetcher.fetch()
    if not new_data:
        logger.info("ℹ️ Yeni sinyal bulunamadı.")
        return

    analyzed = processor.process(new_data)
    publisher.publish(analyzed)
    saved = db.save_items_batch(analyzed)
    logger.info(f"✅ Döngü tamamlandı. {saved} yeni içerik DB'ye yazıldı.")


def main() -> None:
    # İlk batch hemen — sistemin çalıştığını anında doğrula
    run_pipeline()

    # Günde 2 kez (SCHEDULER AKTİF — Gemini comment'lemiş, geri açtım)
    schedule.every().day.at("08:00").do(run_pipeline)
    schedule.every().day.at("18:00").do(run_pipeline)

    logger.info("⏳ Sovereign BioTech aktif. Görev bekleniyor... (Çıkış: Ctrl+C)")
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("🛑 Sistem manuel olarak durduruldu.")


if __name__ == "__main__":
    main()
