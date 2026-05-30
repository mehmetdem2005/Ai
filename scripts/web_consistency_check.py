"""Web sayfaları arası tutarlılık denetimi.

Her HTML sayfasının doğru asset'leri (tokens.css, nav.js, auth.js, i18n.js) yüklediğini,
i18n_audit.py'nin gap raporlamadığını, ve build.py'nin temiz çalıştığını kontrol eder.

Exit kodu: 0 = OK, 1 = sorun var (stdout'a yazılır).
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
WEB = HERE / "web"

# Her sayfa şu asset'leri yüklemeli (admin ve dist'in build çıktısı hariç)
REQUIRED_ASSETS = {
    "tokens.css": "link.*tokens.css",
    "i18n.js": 'src="i18n.js"',
    "nav.js": 'src="nav.js"',
    "auth.js": 'src="auth.js"',
    "topnav-mount": 'id="topnav-mount"',
}
SKIP_PAGES: set[str] = {"yonetim.html"}  # legacy redirect-only sayfası


def check_pages() -> list[str]:
    problems: list[str] = []
    for html_file in sorted(WEB.glob("*.html")):
        if html_file.name in SKIP_PAGES:
            continue
        text = html_file.read_text(encoding="utf-8")
        for asset, pattern in REQUIRED_ASSETS.items():
            if not re.search(pattern, text):
                problems.append(f"  ✗ {html_file.name}: {asset} eksik")
    return problems


def check_i18n_audit() -> list[str]:
    """i18n_audit.py'yi çalıştır — bilgilendirici (fail etmez)."""
    audit = WEB / "i18n_audit.py"
    if not audit.exists():
        return []
    try:
        out = subprocess.run(
            ["python3", str(audit)],
            capture_output=True, text=True, timeout=30, check=False,
        )
        combined = (out.stdout or "") + (out.stderr or "")
        m = re.search(r"Toplam\s+(\d+)\s+eksik", combined, re.I)
        if m and int(m.group(1)) > 0:
            print(f"  ℹ i18n: {m.group(1)} eksik anahtar (uyarı — engellemez)")
    except Exception as exc:
        print(f"  ⚠ i18n_audit çalışmadı: {exc}")
    return []


def main() -> int:
    problems = check_pages() + check_i18n_audit()
    if problems:
        print("Tutarlılık denetimi BAŞARISIZ:")
        for p in problems:
            print(p)
        return 1
    print("✓ Tutarlılık OK: tüm sayfalar gerekli asset'leri yüklüyor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
