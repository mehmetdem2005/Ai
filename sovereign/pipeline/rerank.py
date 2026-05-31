"""LLM rerank — embedding-match aday havuzundan KESİN alakalı olanları seçer.

Sorun: text-embedding-3-small medical literature'da ilaç/mekanizma adı
gibi yüksek-frekans token'lara ağır basıyor. "HER2+ meme + ADC + direnç"
niş tanımı için "T-DXd in gastric cancer" makalesi 0.60 cosine alıyor —
ortak token T-DXd yüzünden. Tümör tipi alt sinyal kalıyor.

Çözüm: embedding'le cömert (20-30) candidate al, sonra LLM'e "kesin
alakalı 5 tanesi" filter ettir. LLM tümör tipi/popülasyon/klinik soru
ekseninde ayrımı yapar — embedding bunu yapamıyor.

Maliyet: ~3K input + ~250 output token / brief. DeepSeek için ~$0.001.
"""
from __future__ import annotations

import json
import logging
import os

import requests

log = logging.getLogger(__name__)

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
MODEL = os.environ.get("DEEPSEEK_MODEL_RERANK") or os.environ.get("DEEPSEEK_MODEL_SUMMARY") or "deepseek-chat"

SYSTEM_PROMPT = """Sen tıbbi literatür alaka-değerlendirme uzmanısın. Sana bir TAKİP KONUSU ve
aday MAKALELER verilir. Her makaleyi "kesin alakalı / alakasız" olarak değerlendir.

KESİN ALAKALI tanımı:
- Konunun ana hastalık alanı + popülasyon + tedavi/mekanizma + klinik soru ile
  DOĞRUDAN örtüşür.
- Tek bir kelime (ilaç adı, mekanizma adı, gen adı) örtüşmesi YETERSİZ.
- Konu "X kanseri" diyorsa, X-DIŞI-bir kanser makalesi ALAKASIZdır (ortak ilaç olsa bile).
- Konu "metastatik" diyorsa adjuvan/neoadjuvan makaleler ALAKASIZ; tersi de geçerli.
- Konu "yetişkin" demese de pediatrik içeren makale gözden geçirilmeli — pediatrik popülasyonu
  AÇIKÇA dahil etmeyen konular için pediatrik ALAKASIZdır.
- Mekanizma/preklinik (in vitro, fare modeli, computational) tek başına sınıflandırma
  hatası yapma: konu "klinik" diyorsa preklinik ALAKASIZ, konu mekanizma diyorsa preklinik
  ALAKALI olabilir.

ÇIKTI: SADECE JSON, başına/sonuna açıklama yazma.
{
  "selected": [
    {"id": <int makale id>, "reason": "<tek cümle TR gerekçe>"}
  ],
  "rejected": [
    {"id": <int>, "reason": "<tek cümle TR ret gerekçesi>"}
  ]
}

Maksimum {max_select} adet "selected" ver — daha az yeter de fazla VERME. Eşik tut,
şüpheli olanları "rejected" listesine koy. Tam "selected" sayısı doldurmak için
gevşeme — daha kaliteli daha az tercih edilir."""


def _build_user_prompt(niche_label: str, niche_description: str, candidates: list[dict]) -> str:
    """Aday makaleler için kompakt user mesajı."""
    parts = [
        f"KONU\nEtiket: {niche_label}",
        f"Tanım: {niche_description.strip()[:1500]}",
        "",
        "ADAY MAKALELER (id ile referans):",
    ]
    for c in candidates:
        title = (c.get("title") or "(başlıksız)").strip()
        abstract = (c.get("abstract") or "").strip()
        # ilk 400 char abstract yeterli — tümör tipi/popülasyon ilk paragrafta
        if len(abstract) > 400:
            abstract = abstract[:400] + "…"
        journal = c.get("journal") or "-"
        src = c.get("source_type") or "?"
        parts.append(f"\n[ID:{c['id']}] {title}\nKaynak: {src} · {journal}\nÖzet: {abstract or '(abstract yok)'}")
    return "\n".join(parts)


def rerank_candidates(
    niche_label: str,
    niche_description: str,
    candidates: list[dict],
    max_select: int = 5,
    api_key: str | None = None,
) -> tuple[list[dict], list[dict]]:
    """LLM ile top-N aday makaleyi alaka-filtreleme.

    candidates: items + score içeren liste, en az 'id', 'title', 'abstract',
                'journal', 'source_type' alanları zorunlu.
    Dönen: (selected_ordered, rejected) — her ikisi de {'id', 'reason'} içerir.
           selected: LLM'in seçtiği sırayla, en fazla max_select.
           rejected: LLM'in elediği geri kalan.

    LLM hatası durumunda: candidates'i olduğu gibi top max_select'e kırpıp
    her birine boş reason ile döner (fail-safe).
    """
    if not candidates:
        return [], []

    api_key = api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        log.warning("DEEPSEEK_API_KEY yok — rerank atlanıyor, embedding sırası korunuyor")
        fallback = [{"id": c["id"], "reason": ""} for c in candidates[:max_select]]
        return fallback, [{"id": c["id"], "reason": ""} for c in candidates[max_select:]]

    user_msg = _build_user_prompt(niche_label, niche_description, candidates)
    system_msg = SYSTEM_PROMPT.replace("{max_select}", str(max_select))

    try:
        r = requests.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.1,  # belirleyici, alaka kararı için tutarlılık
                "response_format": {"type": "json_object"},
            },
            timeout=90,
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except Exception as e:
        log.error("Rerank LLM hatası: %s — embedding sırası korunarak top %d alınıyor", e, max_select)
        fallback = [{"id": c["id"], "reason": ""} for c in candidates[:max_select]]
        return fallback, [{"id": c["id"], "reason": ""} for c in candidates[max_select:]]

    sel_raw = parsed.get("selected") or []
    rej_raw = parsed.get("rejected") or []
    valid_ids = {c["id"] for c in candidates}

    def _clean(items, label):
        out = []
        seen = set()
        for it in items:
            try:
                iid = int(it.get("id"))
            except Exception:
                continue
            if iid not in valid_ids or iid in seen:
                continue
            seen.add(iid)
            reason = str(it.get("reason") or "").strip()[:300]
            out.append({"id": iid, "reason": reason})
        return out

    selected = _clean(sel_raw, "selected")[:max_select]
    rejected = _clean(rej_raw, "rejected")

    selected_set = {x["id"] for x in selected}
    rejected_set = {x["id"] for x in rejected}
    # LLM bazı ID'leri ne selected ne rejected'a koymuş olabilir — defensive: kalanları rejected'a ekle
    for c in candidates:
        if c["id"] not in selected_set and c["id"] not in rejected_set:
            rejected.append({"id": c["id"], "reason": "(LLM listelemedi)"})

    log.info("Rerank: %d aday → %d seçildi, %d elendi", len(candidates), len(selected), len(rejected))
    return selected, rejected
