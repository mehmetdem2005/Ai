"""Faz 2: _i18n_gaps.json'daki tüm eksik metni LLM ile 4 dile çevirir,
i18n.js'e ekler, HTML sayfalarına data-i18n attribute'ları yerleştirir.

Her sayfa için 1 LLM call. Aksanlı karakterler doğru korunur (ASCII translit'e
karşı sıkı prompt). HTML patching idempotent: data-i18n zaten varsa atlanır.

Kullanım:
  DEEPSEEK_API_KEY=... python3 web/_i18n_complete.py [page1 page2 ...]
  (sayfa adı verilmezse tüm gaps işlenir)
"""
import json
import os
import pathlib
import re
import sys
import time

from openai import OpenAI

HERE = pathlib.Path(__file__).parent
GAPS = json.loads((HERE / "_i18n_gaps.json").read_text(encoding="utf-8"))
I18N = HERE / "i18n.js"

# Sayfa adı (uzantısız) → i18n.js namespace prefix
PAGE_NS = {
    "admin": "admin",
    "editorial": "editorial",
    "dashboard": "dashboard",
    "abonelik": "subscribe",
    "hakkinda": "about",
}

SYS_PROMPT = """Sen Türkçe arayüz metinlerini 4 dile (TR/EN/ES/DE) çeviren ve i18n anahtarları üreten bir asistansın.

Sana bir SaaS web sitesinin spesifik bir sayfasından Türkçe metinler verilecek. Her metin için:
1. ANLAMINI yansıtan kısa snake_case bir key üret (sadece spesifik kısım — namespace prefix EKLEME).
2. TR alanına temizlenmiş/düzgün Türkçe yaz (orijinal genellikle doğrudur, sadece kırpılmış cümle parçalarını düzelt).
3. EN: doğal, akıcı İngilizce.
4. ES: doğal, akıcı İspanyolca.
5. DE: doğal, akıcı Almanca.

KESİN KURALLAR:
- Tüm dillerde Türkçe karakterleri (ı ş ğ ü ö ç İ Ş Ğ Ü Ö Ç) doğru yaz. ASCII transliterasyon YASAK.
- Tüm dillerde aksan karakterlerini (é à ñ ü ä ö ß) doğru kullan.
- Markdown sembollerini koru: → ↓ ⤴ ⤓ ✓ ★ — · ✕ Aç → vs.
- Sayıları (28 May, $99, %25, 14g) olduğu gibi tut, sadece kelime kısmını çevir.
- "Sovereign" marka adı her dilde aynı kalsın.
- Key'ler BENZERSİZ ve KISA olsun (max 30 karakter).
- Domain terimleri (RSS, FDA, CRISPR, AI) İngilizce kalabilir.

ÇIKTI: SADECE geçerli JSON array, başka hiçbir şey yok. Kod çiti yasak.

Şema:
[
  {"key": "<snake_case>", "tr": "<TR>", "en": "<EN>", "es": "<ES>", "de": "<DE>"},
  ...
]"""


def call_llm(client: OpenAI, model: str, page: str, namespace: str, texts: list[str]) -> list[dict]:
    bullets = "\n".join(f"{i+1}. {t!r}" for i, t in enumerate(texts))
    user_msg = (
        f"Sayfa: {page} (namespace: {namespace})\n"
        f"Toplam {len(texts)} metin çevirilecek.\n\n"
        f"Metinler:\n{bullets}\n\n"
        "JSON array döndür — sırası aynı kalsın, her birine benzersiz key ata."
    )
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYS_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.2,
    )
    raw = (resp.choices[0].message.content or "").strip()
    # JSON array'i çıkar
    m = re.search(r"\[\s*\{.*\}\s*\]", raw, re.DOTALL)
    if not m:
        raise RuntimeError(f"JSON array bulunamadı:\n{raw[:500]}")
    data = json.loads(m.group(0))
    if len(data) != len(texts):
        print(f"  ⚠️ LLM {len(data)} döndürdü, beklenen {len(texts)} — kısmi devam.")
    return data


def make_keys_unique(translations: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out = []
    for t in translations:
        base = t["key"]
        k = base
        i = 1
        while k in seen:
            i += 1
            k = f"{base}_{i}"
        seen.add(k)
        t["key"] = k
        out.append(t)
    return out


def add_to_i18n(namespace: str, translations: list[dict]) -> None:
    """Her dil bloğunda footer'ından önce `<namespace>: { ... }` ekler.
    İdempotent: namespace o dilde zaten varsa atlar."""
    src = I18N.read_text(encoding="utf-8")
    for lang in ("tr", "en", "es", "de"):
        # Bu dilin bloğunu bul
        lang_start_marker = f"\n    {lang}: {{"
        lang_start = src.find(lang_start_marker)
        if lang_start < 0:
            print(f"  ⚠️ {lang} bloğu bulunamadı, atlandı")
            continue
        # Bu dilin blok sonu (sonraki kapanışın indenti '    },\n')
        lang_end = src.find("\n    },", lang_start + len(lang_start_marker))
        if lang_end < 0:
            print(f"  ⚠️ {lang} blok sonu bulunamadı")
            continue
        # Bu blok içinde namespace zaten var mı?
        ns_marker = f"\n      {namespace}: {{"
        if ns_marker in src[lang_start:lang_end]:
            print(f"  • {lang}: {namespace} zaten var, atlanıyor")
            continue
        # Bu blok içinde footer'ı bul
        footer_pos = src.find("\n      footer: {", lang_start, lang_end)
        if footer_pos < 0:
            # footer yoksa blok sonundan hemen önce ekle
            footer_pos = lang_end

        # Eklenecek blok
        lines = [f"      {namespace}: {{"]
        for t in translations:
            val = t.get(lang) or t.get("tr", "")
            esc = val.replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'        {t["key"]}: "{esc}",')
        lines.append("      },")
        block = "\n" + "\n".join(lines)
        src = src[:footer_pos] + block + src[footer_pos:]
    I18N.write_text(src, encoding="utf-8")


def patch_html(page_html: pathlib.Path, namespace: str, gap_texts: list[str], translations: list[dict]) -> int:
    """HTML'de her gap text'i için, en yakın çevreleyen tag'e data-i18n ekler."""
    html = page_html.read_text(encoding="utf-8")
    patched = 0
    for text, tr in zip(gap_texts, translations):
        key = f'{namespace}.{tr["key"]}'
        # gaps.json'da text whitespace temizlenmiş — HTML'de orijinal forma yakın olabilir
        # >TEXT< pattern, regex değil plain string
        needle = f">{text}<"
        pos = html.find(needle)
        if pos < 0:
            # Whitespace toleranslı re ile dene
            pat = re.compile(r">\s*" + re.escape(text) + r"\s*<")
            m = pat.search(html)
            if not m:
                continue
            pos = m.start()
            real_end = m.end()
        else:
            real_end = pos + len(needle)
        # Açılış tag'ini bul
        tag_start = html.rfind("<", 0, pos)
        if tag_start < 0:
            continue
        tag_end = html.find(">", tag_start)
        if tag_end < 0 or tag_end > pos:
            continue
        tag = html[tag_start:tag_end + 1]
        # void/closing/comment skip
        if tag.startswith("</") or tag.startswith("<!"):
            continue
        if "data-i18n" in tag:
            continue
        new_tag = tag[:-1] + f' data-i18n="{key}">'
        html = html[:tag_start] + new_tag + html[tag_end + 1:]
        patched += 1
    page_html.write_text(html, encoding="utf-8")
    return patched


def process_page(client: OpenAI, model: str, page_html_name: str, gaps_for_page: list[dict]) -> None:
    page = page_html_name.replace(".html", "")
    namespace = PAGE_NS.get(page, page)
    print(f"\n📄 {page_html_name}: {len(gaps_for_page)} gap → LLM çağrısı ({model})…")
    texts = [g["text"] for g in gaps_for_page]
    if not texts:
        return

    try:
        translations = call_llm(client, model, page, namespace, texts)
    except Exception as exc:
        print(f"  ❌ LLM hatası: {exc}")
        return

    translations = make_keys_unique(translations[:len(texts)])
    if len(translations) < len(texts):
        # Eksik kalanlar için key boş + TR fallback
        for t in texts[len(translations):]:
            translations.append({"key": f"untranslated_{len(translations)}", "tr": t, "en": t, "es": t, "de": t})

    add_to_i18n(namespace, translations)
    print(f"  ✓ i18n.js'e {namespace} namespace eklendi ({len(translations)} key × 4 dil)")

    page_path = HERE / page_html_name
    patched = patch_html(page_path, namespace, texts, translations)
    print(f"  ✓ {page_html_name}'e {patched}/{len(texts)} data-i18n attribute eklendi")


def main() -> int:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        print("❌ DEEPSEEK_API_KEY eksik")
        return 1

    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    target_pages = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    pages_to_process = []
    for page_html, gaps in GAPS.items():
        if target_pages and page_html not in target_pages:
            continue
        if not gaps:
            continue
        pages_to_process.append((page_html, gaps))

    print(f"İşlenecek sayfa: {len(pages_to_process)}, toplam gap: {sum(len(g) for _, g in pages_to_process)}")

    for page_html, gaps in pages_to_process:
        process_page(client, model, page_html, gaps)
        time.sleep(1)  # rate-limit önlem

    print("\n✓ Faz 2 tamamlandı. Audit'i tekrar çalıştırıp 0 olduğunu doğrula.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
