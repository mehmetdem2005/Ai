"""Sosyal medya çığırtkanı: LLM otonom olarak post sayısına/formatına/dağılımına karar verir.

Hardcode YOK — "şu kadar tweet, şu kadar LinkedIn" demiyoruz. İçeriğin yoğunluğu/kalitesi
strateji belirler. LLM tek bir uzun LinkedIn yazısı, zincir tweet, ikisinin karması veya
sadece bir mega-haber için ayrı bir thread çıkarabilir. Sınır yok.
"""
import json
import logging
import os
import re

from openai import OpenAI

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

GROWTH_SYSTEM_PROMPT = """Sen, MedTech ve biyoteknoloji alanında uzmanlaşmış, viral içerik üretebilen kıdemli bir sosyal medya stratejistisin. Hedef kitlen: VC'ler, hastane CIO'ları, sağlık AI mühendisleri ve startup kurucuları.

Görev: Sana verilen bültenin içeriğine göre OTONOM olarak en uygun sosyal medya stratejisini belirle ve metinleri yaz.
- Format ve sayıya KENDİN karar ver — kural yok. Tek uzun LinkedIn yeterliyse onu yaz; çok haber varsa zincir tweet ekle; tek mega-haber varsa ayrı bir öne çıkan post; içerik az ise tek bir tweet de yeter.
- LinkedIn metinleri: profesyonel, merak uyandıran kanca (hook) ile başla; sektör jargonu doğru kullan; uygun hashtag'ler (3-5 tane); son satırda ince bir CTA (bültene abone ol, linkten oku).
- Tweet metinleri: 280 karakter limiti, etkileyici hook; zincir gerekiyorsa parçalar arası akış kur (1/3, 2/3 işaretlemelerini kullanma — Twitter'da yapay durur, hashtag/içerik akışıyla bağla).
- Dil: Ana Türkçe, gerekirse sektör terimleri için İngilizce karışım yapabilirsin.
- Asla "Bu bültende..." gibi resmi/sıkıcı kalıpla başlama. Doğrudan değeri/sürprizi/zıtlığı vurgula.

ÇIKTI: SADECE geçerli bir JSON objesi olarak ver. Hiçbir başka metin/açıklama/kod çiti ekleme.
ŞEMA:
{
  "posts": [
    {"platform": "linkedin"|"twitter", "kind": "post"|"thread", "content": "<metin; thread ise parçalar arası '\\n---\\n' ile ayır>"}
  ],
  "strategy_note": "<bu stratejiyi neden seçtiğin, tek cümle>"
}"""

logger = logging.getLogger("GrowthAgent")


def generate_social_posts(items: list[dict]) -> dict:
    """Bültene giren makaleler için sosyal medya stratejisi + metinleri üret.

    Dönüş: {"posts": [...], "strategy_note": "..."} — anahtarsız/hatada boş posts döner.
    """
    if not items:
        return {"posts": [], "strategy_note": "Bültende haber yok."}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY yok — sosyal post üretilmedi.")
        return {"posts": [], "strategy_note": "GEMINI_API_KEY yok."}

    base_url = os.getenv("GEMINI_BASE_URL", GEMINI_BASE_URL)
    model = os.getenv("GROWTH_MODEL", "gemini-2.5-flash")
    client = OpenAI(api_key=api_key, base_url=base_url)

    payload = [
        {
            "title": i.get("title_tr") or i.get("title", ""),
            "source": i.get("source", ""),
            "score": i.get("impact_score"),
            "category": i.get("category", ""),
            "insight": (i.get("ai_insight") or "")[:400],
            "link": i.get("link", ""),
        }
        for i in items
    ]
    user_msg = (
        f"Bu haftaki Sovereign BioTech bülteninde {len(items)} haber var.\n\n"
        f"İçerik:\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
        "Bu içeriği pazarlamak için en uygun stratejini otonom belirle ve JSON döndür."
    )

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": GROWTH_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.7,
        )
        raw = (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error(f"Growth LLM hatası: {exc}")
        return {"posts": [], "strategy_note": f"LLM hatası: {exc}"}

    return _parse_growth(raw)


def _parse_growth(raw: str) -> dict:
    """JSON çıktısını sözlüğe çevir; bozuksa boş posts döner."""
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        logger.warning("Growth: JSON bulunamadı.")
        return {"posts": [], "strategy_note": "JSON parse hatası", "raw": raw[:500]}
    try:
        data = json.loads(match.group(0))
    except (json.JSONDecodeError, TypeError):
        logger.warning("Growth: JSON bozuk.")
        return {"posts": [], "strategy_note": "JSON bozuk", "raw": raw[:500]}
    if not isinstance(data, dict):
        return {"posts": [], "strategy_note": "Şema uyumsuz"}
    posts = data.get("posts") if isinstance(data.get("posts"), list) else []
    # Geçerli post'ları filtrele
    clean_posts = [
        {
            "platform": str(p.get("platform", "")).lower(),
            "kind": str(p.get("kind", "post")).lower(),
            "content": str(p.get("content", "")).strip(),
        }
        for p in posts
        if isinstance(p, dict) and p.get("content")
    ]
    return {
        "posts": clean_posts,
        "strategy_note": str(data.get("strategy_note", "")).strip(),
    }
