"""Semantik konu gruplama: seçilen haberleri LLM ile dinamik kategorilere ayırır.

Sınırsız kategori — LLM verinin doğasına göre kaç kategori gerektiğine kendi karar verir.
Gemini 2.5 Flash (OpenAI-uyumlu endpoint) üzerinden tek batch çağrı yapar.
"""
import json
import logging
import os
import re

from openai import OpenAI

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

CLUSTER_SYSTEM_PROMPT = """Sen, sağlık teknolojisi (MedTech) ve biyoteknoloji haberlerini editöryal olarak gruplayan kıdemli bir analistsin.

Görev: Verilen haberleri (her birinin hash'i, başlığı ve içgörüsü var) anlamsal olarak grupla.
- Kategori sayısı sınırı YOK. İçeriğin gerektirdiği kadar (1, 2, 5...) doğal kategori çıkar; verinin anlamsal dağılımına göre otonom karar ver.
- Kategori adları kısa, betimleyici, Türkçe olsun (örn: "Yatırımlar ve Fonlar", "Klinik Araştırmalar", "Giyilebilir Teknolojiler", "Regülasyon ve Politika", "Sektör Liderliği", "Yapay Zeka Tanı").
- Her haber TAM olarak bir kategoriye girer (örtüşme yok).
- Çıktıyı SADECE geçerli bir JSON objesi olarak ver — başka hiçbir metin/açıklama/kod çiti ekleme.
- Şema: {"<Kategori Adı>": ["<hash1>", "<hash2>"], "<Kategori Adı 2>": ["<hash3>"]}"""

logger = logging.getLogger("Clustering")


def cluster_topics(items: list[dict]) -> dict[str, str]:
    """LLM ile haberleri kategorilere ayır. Dönüş: {hash: category_name}.

    Hata/anahtarsız/tek-haber durumunda hepsini "Genel" kategorisine koyar (güvenli düşüş).
    """
    if not items:
        return {}
    if len(items) == 1:
        return {items[0]["hash"]: "Genel"}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY yok — kümeleme atlandı, hepsi 'Genel'.")
        return {i["hash"]: "Genel" for i in items}

    base_url = os.getenv("GEMINI_BASE_URL", GEMINI_BASE_URL)
    model = os.getenv("CLUSTER_MODEL", "gemini-2.5-flash")
    client = OpenAI(api_key=api_key, base_url=base_url)

    payload = [
        {
            "hash": i["hash"],
            "title": i.get("title_tr") or i.get("title", ""),
            "insight": (i.get("ai_insight") or "")[:300],
        }
        for i in items
    ]
    user_msg = "Haberler:\n" + json.dumps(payload, ensure_ascii=False, indent=2)

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": CLUSTER_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,
        )
        raw = (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error(f"Kümeleme LLM hatası: {exc}")
        return {i["hash"]: "Genel" for i in items}

    return _parse_clusters(raw, items)


def _parse_clusters(raw: str, items: list[dict]) -> dict[str, str]:
    """JSON çıktısını {hash: category} sözlüğüne çevir; eksik kalanları 'Genel'e koy."""
    valid = {i["hash"] for i in items}
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        logger.warning("Kümeleme JSON bulunamadı — hepsi 'Genel'.")
        return dict.fromkeys(valid, "Genel")
    try:
        data = json.loads(match.group(0))
    except (json.JSONDecodeError, TypeError):
        logger.warning("Kümeleme JSON bozuk — hepsi 'Genel'.")
        return dict.fromkeys(valid, "Genel")
    if not isinstance(data, dict):
        return dict.fromkeys(valid, "Genel")

    result: dict[str, str] = {}
    for category, hashes in data.items():
        if not isinstance(hashes, list):
            continue
        cat = str(category).strip() or "Genel"
        for h in hashes:
            if isinstance(h, str) and h in valid:
                result[h] = cat
    for h in valid:
        result.setdefault(h, "Genel")

    n_cat = len(set(result.values()))
    logger.info(f"🗂️ Kümeleme: {len(items)} haber -> {n_cat} kategori.")
    return result
