"""Supabase'den bültenleri çekip statik siteyi (dist/) üretir. Vercel build'inde çalışır.

Mimari:
- landing.html → index.html (anasayfa)
- reader.html, admin.html, editorial.html, dashboard.html, abonelik.html,
  ayarlar.html, hakkinda.html (alt sayfalar)
- tokens.css, mobile.css (tasarım sistemi)
- nav.js, i18n.js (navigasyon + 4-dil çeviri)
- auth.js (Supabase Auth + admin buton katmanı)

Placeholder injection: index.html, reader.html ve auth.js içindeki
__SUPABASE_URL__, __SUPABASE_ANON_KEY__, __ADMIN_PANEL_URL__ token'ları
Vercel env'inden enjekte edilir."""
import json
import os
import pathlib
import shutil

import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ADMIN_PANEL_URL = os.environ.get("ADMIN_PANEL_URL", "https://sovereign-admin.vercel.app")
BEEHIIV_SUBSCRIBE_URL = os.environ.get("BEEHIIV_SUBSCRIBE_URL", "")

HERE = pathlib.Path(__file__).parent
DIST = HERE / "dist"

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True, exist_ok=True)

# 1. Supabase'den bültenleri çek → data.json
resp = requests.get(
    f"{URL}/rest/v1/newsletters"
    "?select=id,filename,article_count,content,created_at&order=created_at.desc&limit=200",
    headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "User-Agent": "Mozilla/5.0 (compatible; SovereignBio-Pages/1.0)",
    },
    timeout=30,
)
resp.raise_for_status()
rows = resp.json()
(DIST / "data.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")

# 2. Asset'ler — placeholder içermeyenler değişmeden kopyalanır
ASSETS = ["tokens.css", "mobile.css", "i18n.js"]
for f in ASSETS:
    shutil.copy(HERE / f, DIST / f)

# 3. Placeholder enjeksiyonu — auth.js + nav.js + her HTML sayfasında çalışır
PLACEHOLDERS = {
    "__SUPABASE_URL__": URL,
    "__SUPABASE_ANON_KEY__": ANON_KEY,
    "__ADMIN_PANEL_URL__": ADMIN_PANEL_URL,
    "__BEEHIIV_SUBSCRIBE_URL__": BEEHIIV_SUBSCRIBE_URL,
}


def inject(src: str) -> str:
    for k, v in PLACEHOLDERS.items():
        src = src.replace(k, v)
    return src


# Placeholder içeren JS'leri inject ile yaz
for js_file in ("auth.js", "nav.js"):
    src = inject((HERE / js_file).read_text(encoding="utf-8"))
    (DIST / js_file).write_text(src, encoding="utf-8")

# 4. HTML sayfaları
# landing.html → index.html (anasayfa)
PAGE_MAP = {
    "landing.html": "index.html",
    "reader.html": "reader.html",
    "admin.html": "admin.html",
    "editorial.html": "editorial.html",
    "dashboard.html": "dashboard.html",
    "abonelik.html": "abonelik.html",
    "ayarlar.html": "ayarlar.html",
    "hakkinda.html": "hakkinda.html",
}

# <base href="/"> — Vercel rewrite'larından (örn. /b/:id → /reader?bulten=:id)
# gelen sayfalarda relative asset path'lerinin (tokens.css, nav.js, data.json)
# kök'e göre çözülmesini sağlar. Olmazsa /b/tokens.css 404 olur.
#
# FOUC-free tercih bootstrap'i — her sayfanın <head>'ine inject edilir.
# Render'dan ÖNCE çalışıp data-theme/density/accent attribute'larını uygular.
# Cross-tab sync için 'storage' event listener ekler.
PREFS_BOOTSTRAP = """<base href="/">
<script>
(function(){
  var h=document.documentElement;
  function apply(){
    var t=localStorage.getItem('sov_theme');
    if(t&&t!=='system')h.setAttribute('data-theme',t);else h.removeAttribute('data-theme');
    var d=localStorage.getItem('sov_density');
    if(d)h.setAttribute('data-density',d);else h.removeAttribute('data-density');
    var a=localStorage.getItem('sov_accent');
    if(a)h.setAttribute('data-accent',a);else h.removeAttribute('data-accent');
  }
  apply();
  window.addEventListener('storage',function(e){
    if(e.key&&e.key.indexOf('sov_')===0)apply();
  });
})();
</script>
</head>"""

for src_name, dst_name in PAGE_MAP.items():
    src_file = HERE / src_name
    if not src_file.exists():
        print(f"⚠️ kaynak yok, atlandı: {src_name}")
        continue
    html = inject(src_file.read_text(encoding="utf-8"))
    # Bootstrap'i </head>'den hemen önce inject et (idempotent: zaten varsa atla)
    if "sov_theme" not in html.split("</head>")[0]:
        html = html.replace("</head>", PREFS_BOOTSTRAP, 1)
    (DIST / dst_name).write_text(html, encoding="utf-8")

# 5. Legacy yönetim sayfası — geriye dönük link uyumu için
if (HERE / "yonetim.html").exists():
    (DIST / "yonetim.html").write_text(
        inject((HERE / "yonetim.html").read_text(encoding="utf-8")), encoding="utf-8"
    )
if (HERE / "admin.js").exists():
    shutil.copy(HERE / "admin.js", DIST / "admin.js")

print(f"✓ {len(rows)} bülten + {len(PAGE_MAP)} sayfa + {len(ASSETS)} asset → dist/")
if not ANON_KEY:
    print("⚠️  SUPABASE_ANON_KEY env yok — login akışı çalışmaz.")

# i18n audit: data-i18n olmayan görünür Türkçe metni listele (build'i kırmaz)
try:
    import subprocess
    print()
    subprocess.run(["python3", str(HERE / "i18n_audit.py")], check=False)
except Exception as exc:
    print(f"⚠️ i18n audit çalışamadı: {exc}")
