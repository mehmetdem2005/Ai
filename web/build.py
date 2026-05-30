"""Sovereign V2 statik site build'i. Vercel build'inde çalışır.

Mimari (sade):
- landing.html → index.html — Pro pitch + CTA
- hakkinda.html — Sovereign nedir / kim için
- tokens.css, mobile.css — tasarım sistemi
- pro/*.html — kişiselleştirilmiş SaaS UI (auth/onboarding/dashboard)

Placeholder injection: __SUPABASE_URL__, __SUPABASE_ANON_KEY__ Vercel env'inden.
Eski "bülten arşivi" mantığı kaldırıldı (V2 = kişiselleştirilmiş, herkesin kendi briefi).
"""
import os
import pathlib
import shutil

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

HERE = pathlib.Path(__file__).parent
DIST = HERE / "dist"

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True, exist_ok=True)

# 1. Asset'ler — placeholder içermeyenler değişmeden kopyalanır
ASSETS = ["tokens.css", "mobile.css"]
for f in ASSETS:
    if (HERE / f).exists():
        shutil.copy(HERE / f, DIST / f)

# 2. Placeholder enjeksiyonu — Pro UI Supabase anon JWT akışı kullanır
PLACEHOLDERS = {
    "__SUPABASE_URL__": URL,
    "__SUPABASE_ANON_KEY__": ANON_KEY,
}


def inject(src: str) -> str:
    for k, v in PLACEHOLDERS.items():
        src = src.replace(k, v)
    return src


# 3. Public sayfalar (yalnızca landing + hakkinda)
PAGE_MAP = {
    "landing.html": "index.html",
    "hakkinda.html": "hakkinda.html",
}

for src_name, dst_name in PAGE_MAP.items():
    src_file = HERE / src_name
    if not src_file.exists():
        print(f"⚠️ kaynak yok, atlandı: {src_name}")
        continue
    html = inject(src_file.read_text(encoding="utf-8"))
    (DIST / dst_name).write_text(html, encoding="utf-8")

# 4. Sovereign Pro — kişiselleştirilmiş SaaS UI (web/pro/*.html → dist/pro/*.html)
PRO_DIR = HERE / "pro"
if PRO_DIR.is_dir():
    PRO_DIST = DIST / "pro"
    PRO_DIST.mkdir(parents=True, exist_ok=True)
    pro_pages = sorted(PRO_DIR.glob("*.html"))
    for src_file in pro_pages:
        html = inject(src_file.read_text(encoding="utf-8"))
        (PRO_DIST / src_file.name).write_text(html, encoding="utf-8")
    print(f"✓ Pro UI: {len(pro_pages)} sayfa → dist/pro/")

print(f"✓ {len(PAGE_MAP)} public sayfa + {len(ASSETS)} asset → dist/")
if not ANON_KEY:
    print("⚠️  SUPABASE_ANON_KEY env yok — Pro UI login çalışmaz.")
