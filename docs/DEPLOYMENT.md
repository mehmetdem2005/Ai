# Dağıtım Rehberi — Vercel + Render + Supabase (Oracle'sız)

Bu sistem 3 parçaya bölünmüştür. Hiçbiri Oracle/VPS gerektirmez.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Frontend         │     │  Backend / Panel  │     │  Veritabanı       │
│  VERCEL           │     │  RENDER           │     │  SUPABASE         │
│  (halka açık site)│◀────│  (Streamlit kokpit│────▶│  (Postgres)       │
└──────────────────┘     │   = patron ekranı)│     └──────────────────┘
        ▲                 └──────────────────┘              ▲
        │ deploy hook (yayında tazelenir)                   │
        │                                                   │
        └───────────────────────────────────────────────────
                                  │
                    ┌─────────────────────────┐
                    │  Crawler (haber toplayan) │
                    │  GITHUB ACTIONS (ücretsiz)│
                    │  günde 2× → Supabase      │
                    └─────────────────────────┘
```

## Akış (V3 "patron modu")
1. **GitHub Actions** günde 2× haber toplar, skorlar, kümeler → Supabase'e `pending` yazar.
2. **Render'daki panel**te giriş yaparsın, haberleri görür/düzenler/reddedersin → **Yayınla**.
3. Yayında: Supabase `newsletters` güncellenir + (varsa) Beehiiv draft + sosyal post + **Vercel sitesi otomatik tazelenir**.
4. 24 saat onaylamazsan: worker emniyet sübabını tetikler ve bekleyenleri otomatik yayınlar.

---

## 1) Supabase (DB) — HAZIR ✅
Şema + migration'lar zaten uygulandı. Bir şey yapmana gerek yok.
(Yeni proje kurarsan: `supabase_schema.sql`'i SQL Editor'da çalıştır.)

## 2) Render (Backend / Panel)
1. Render Dashboard → **New → Blueprint** → bu repo'yu seç (`render.yaml` otomatik okunur).
2. Açılan env formunda `sync:false` alanları doldur:
   `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_KEY`, `DEEPSEEK_API_KEY`,
   `GEMINI_API_KEY`, `OPENAI_API_KEY` (+ opsiyonel `BEEHIIV_*`, `VERCEL_DEPLOY_HOOK_URL`).
3. **Apply** → panel: `https://sovereign-cockpit.onrender.com`
4. Free plan'da ~15dk hareketsizlikte uyur, girince uyanır (onay paneli için sorun değil).

## 3) Vercel (Frontend / Halka açık site)
1. Vercel → **Add New → Project** → bu repo'yu içe aktar.
2. **Settings → Environment Variables**: `SUPABASE_URL` ve `SUPABASE_KEY` (service_role) ekle.
   (Bunlar yalnızca build sırasında, sunucuda kullanılır — tarayıcıya sızmaz; üretilen
   `data.json` sadece zaten halka açık olan yayınlanmış bülten içeriğini taşır.)
3. Build ayarları `vercel.json`'dan otomatik gelir (`web/build.py` çalışır, `web/dist` yayınlanır).
4. Deploy → site canlı. Özel alan adı eklemek için Vercel → Domains.
5. **Otomatik tazeleme:** Vercel → Settings → Git → **Deploy Hooks** → bir hook oluştur,
   URL'i Render panelindeki `VERCEL_DEPLOY_HOOK_URL` env'ine yapıştır. Artık her yayında
   site kendiliğinden güncellenir.

## 4) GitHub Actions (Crawler) — zaten çalışıyor ✅
`.github/workflows/bulletin.yml` günde 2× çalışır. Repo → **Settings → Secrets and variables
→ Actions** altında şunların ekli olduğundan emin ol: `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` (+ opsiyonel `BEEHIIV_*`).

---

## Güvenlik notu
- `SUPABASE_KEY` (service_role) güçlü bir anahtardır — yalnızca sunucu tarafı (Render build,
  Vercel build, GitHub Actions) ortam değişkenlerinde tut, asla istemci JS'ine koyma.
- Render/Vercel/GitHub token'larını paylaştıktan sonra, işin bitince **yetkilerini daralt
  veya iptal et** (least-privilege).
