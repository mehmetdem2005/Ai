// Public sayfalarda site_strings'i DB'den çekip data-cms-key elementlerini doldurur.
// Anahtar DB'de yoksa elementin orijinal içeriği (kod içi fallback) korunur.
//
// Kullanım: HTML'e ekle:
//   <h1 data-cms-page="landing" data-cms-key="hero.h1">Fallback metin</h1>
// veya page'i tüm sayfaya bir kez:
//   <body data-cms-page="landing">...</body>
//
// Markdown render için: data-cms-md="key" (Sovereign'in basit md renderer'ı yok burada
// — düz metin fallback uygulanır; long content için textContent yeterli)

(function () {
  const SUPABASE_URL = "__SUPABASE_URL__";
  const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
  if (!SUPABASE_URL || SUPABASE_URL.indexOf("__") === 0) return;

  const pageSlug = document.body?.dataset?.cmsPage;
  const elements = document.querySelectorAll("[data-cms-key]");
  if (!pageSlug || elements.length === 0) return;

  const lang = (document.documentElement.lang || "tr").slice(0, 2);

  fetch(
    `${SUPABASE_URL}/rest/v1/site_strings?` +
    `select=key,value,value_md&page_slug=eq.${encodeURIComponent(pageSlug)}&lang=eq.${lang}`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY } }
  )
    .then((r) => (r.ok ? r.json() : []))
    .then((rows) => {
      const map = {};
      rows.forEach((r) => { map[r.key] = r; });
      elements.forEach((el) => {
        const k = el.dataset.cmsKey;
        const e = map[k];
        if (!e) return;
        // İçeriği değiştir. Eğer HTML içermesi gerekiyorsa data-cms-html ekle (varsayılan: text-only)
        if (el.dataset.cmsHtml === "1") el.innerHTML = e.value;
        else el.textContent = e.value;
      });
    })
    .catch(() => { /* sessizce fallback metni kalır */ });
})();
