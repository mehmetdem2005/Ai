"""Build-time i18n audit: tüm HTML sayfalarını tarar, görünür Türkçe metni olup
da `data-i18n` attribute'u olmayan node'ları listeler.

Çıktı:
- stdout: özet rapor (sayfa başına eksik sayısı + örnekler)
- web/_i18n_gaps.json: tam liste (sonraki turda data-i18n eklenmesi için)

Build'i kıracak şekilde çağırılırsa --strict bayrağı kullanılır."""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
PAGES = [
    "landing.html", "reader.html", "admin.html", "editorial.html",
    "dashboard.html", "abonelik.html", "ayarlar.html", "hakkinda.html",
]

TR_CHARS = set("ığüşöçİĞÜŞÖÇ")
# Skip: script/style/svg içeriği + sadece sayı/sembol + URL/email/tarih
SKIP_TAGS = {"script", "style", "svg", "path", "rect", "circle", "g", "defs", "use", "title", "head"}
URL_RX = re.compile(r"^https?://|\.com$|\.org$|@.+\..+", re.I)


def parse_visible_text(html: str) -> list[tuple[str, str]]:
    """Çok hafif HTML parser — text node'lara, hangi tag'de + içinde data-i18n
    var mı bilgisiyle ulaşmak için.

    Sadece bizim sayfalarımız için işe yarar; full HTML5 parser değil."""
    out: list[tuple[str, str]] = []  # (text, surrounding_tag_context)
    pos = 0
    tag_stack: list[tuple[str, bool]] = []  # (tag_name, has_data_i18n_in_ancestors)
    # ancestor_has_i18n track: any ancestor has data-i18n?
    while pos < len(html):
        lt = html.find("<", pos)
        if lt < 0:
            text = html[pos:].strip()
            if text:
                out.append((text, _ancestor_context(tag_stack)))
            break
        # Önceki text node
        text = html[pos:lt]
        if text.strip():
            out.append((text.strip(), _ancestor_context(tag_stack)))
        # Tag'i parse et
        gt = html.find(">", lt + 1)
        if gt < 0:
            break
        tag_content = html[lt + 1:gt]
        pos = gt + 1
        # Comment?
        if tag_content.startswith("!--"):
            end = html.find("-->", lt)
            pos = end + 3 if end > 0 else len(html)
            continue
        # DOCTYPE / declaration
        if tag_content.startswith("!"):
            continue
        # Closing tag?
        if tag_content.startswith("/"):
            tname = tag_content[1:].split()[0].lower() if tag_content[1:].split() else ""
            # En son aynı tag açılışını pop et
            for i in range(len(tag_stack) - 1, -1, -1):
                if tag_stack[i][0] == tname:
                    tag_stack.pop(i)
                    break
            continue
        # Opening tag
        parts = tag_content.split(None, 1)
        tname = parts[0].lower().rstrip("/")
        attrs = parts[1] if len(parts) > 1 else ""
        has_i18n = "data-i18n" in attrs
        # Self-closing — stack'e ekleme
        if tag_content.rstrip().endswith("/"):
            continue
        # Void elements
        if tname in {"br", "hr", "img", "input", "meta", "link"}:
            continue
        tag_stack.append((tname, has_i18n))
    return out


def _ancestor_context(stack: list[tuple[str, bool]]) -> str:
    """Atalar zinciri: 'body > main > .h1' gibi + i18n flag"""
    has_i18n = any(s[1] for s in stack)
    if has_i18n:
        return "HAS_I18N"
    if any(s[0] in SKIP_TAGS for s in stack):
        return "SKIP"
    # Son 3 atayı path olarak ver
    return " > ".join(s[0] for s in stack[-3:])


def is_translatable_tr(text: str) -> bool:
    """Türkçe karakterli + çevirilebilir cümle/kelime mi?"""
    if len(text) < 2:
        return False
    if URL_RX.search(text):
        return False
    if not any(c in TR_CHARS for c in text):
        # Türkçe karakter yoksa skip — saf ASCII Türkçe kelimeler için risk var
        # ama false positive'ten kaçınalım, sadece aksanlı işaretlere bak
        return False
    # Sadece noktalama/rakamlı
    letters = sum(1 for c in text if c.isalpha())
    if letters < 2:
        return False
    return True


def audit_page(path: pathlib.Path) -> list[dict]:
    html = path.read_text(encoding="utf-8")
    nodes = parse_visible_text(html)
    gaps: list[dict] = []
    for text, ctx in nodes:
        if ctx in ("HAS_I18N", "SKIP"):
            continue
        if not is_translatable_tr(text):
            continue
        # Boşluk ve newline'ları temizle
        clean = " ".join(text.split())
        if not clean:
            continue
        gaps.append({"text": clean, "context": ctx})
    return gaps


def main() -> int:
    strict = "--strict" in sys.argv
    all_gaps: dict[str, list[dict]] = {}
    total = 0
    for page in PAGES:
        p = HERE / page
        if not p.exists():
            continue
        gaps = audit_page(p)
        all_gaps[page] = gaps
        total += len(gaps)
        if gaps:
            print(f"\n📄 {page}: {len(gaps)} eksik data-i18n")
            for g in gaps[:5]:
                preview = g["text"][:80].replace("\n", " ")
                print(f"    · '{preview}'")
            if len(gaps) > 5:
                print(f"    … ve {len(gaps) - 5} daha")
        else:
            print(f"✓ {page}: tüm görünür TR metin etiketli")
    # Kaydı build sürecinin diğer adımlarına bırak
    out = HERE / "_i18n_gaps.json"
    out.write_text(json.dumps(all_gaps, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n→ Toplam {total} eksik data-i18n · detay: {out}")
    if strict and total > 0:
        print("\n❌ --strict modunda eksikler var; build başarısız.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
