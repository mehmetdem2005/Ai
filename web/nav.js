// Sovereign · Editorial Wire — Unified top navigation
// Mega-menü destekli, sayfalar arası tutarlı yapı.

(function () {
  const NAV_HTML = `
<div class="masthead">
  <span class="vol" data-i18n="masthead.lastupdate">Son güncelleme: 28 Mayıs 2026, 18:00</span>
  <span class="spacer"></span>

  <div class="dd lang-dd">
    <button class="dd-trigger lang-trigger" aria-haspopup="true">
      <span class="lang-flag">🇹🇷</span>
      <span class="lang-code">TR</span>
      <span class="chev">▾</span>
    </button>
    <div class="dd-panel lang-panel">
      <div class="dd-col">
        <a href="#" data-lang="tr" class="lang-option active"><span class="lang-flag">🇹🇷</span><b>Türkçe</b><span>Ana dil</span></a>
        <a href="#" data-lang="en" class="lang-option"><span class="lang-flag">🇬🇧</span><b>English</b><span>Coming soon</span></a>
        <a href="#" data-lang="es" class="lang-option"><span class="lang-flag">🇪🇸</span><b>Español</b><span>Próximamente</span></a>
        <a href="#" data-lang="de" class="lang-option"><span class="lang-flag">🇩🇪</span><b>Deutsch</b><span>Demnächst</span></a>
      </div>
    </div>
  </div>

  <a href="ayarlar.html" class="settings-link" aria-label="Ayarlar">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    <span data-i18n="nav.settings">Ayarlar</span>
  </a>
</div>

<header class="appbar">
  <a href="landing.html" class="brand" data-page="landing">
    <span class="brand-name">Sovereign<em>.</em></span>
    <span class="tagline">Günlük Biyoteknoloji + Yapay Zekâ Brief'i</span>
  </a>

  <nav class="topnav">
    <div class="dd" data-page="bultenler">
      <button class="dd-trigger" aria-haspopup="true">
        <span data-i18n="nav.briefs">Bültenler</span> <span class="chev">▾</span>
      </button>
      <div class="dd-panel dd-wide">
        <div class="dd-col">
          <div class="dd-label" data-i18n="nav.today">Bugün</div>
          <a href="reader.html"><b data-i18n="nav.evening">Akşam edisyonu</b><span>En son yayınlanan brief</span></a>
          <a href="reader.html"><b data-i18n="nav.morning">Sabah edisyonu</b><span>Günün ilk taraması</span></a>
        </div>
        <div class="dd-col">
          <div class="dd-label" data-i18n="nav.explore">Keşfet</div>
          <a href="reader.html"><b data-i18n="nav.archive">Arşiv</b><span>Tüm geçmiş edisyonlar</span></a>
          <a href="editorial.html"><b data-i18n="nav.longreads">Uzun okumalar</b><span>Haftalık derinlemesine</span></a>
          <a href="reader.html#konular"><b data-i18n="nav.topics">Konu kümeleri</b><span>Regulasyon · Klinik AI · CRISPR</span></a>
        </div>
      </div>
    </div>

    <div class="dd" data-page="hakkinda">
      <button class="dd-trigger" aria-haspopup="true">
        <span data-i18n="nav.about">Hakkında</span> <span class="chev">▾</span>
      </button>
      <div class="dd-panel">
        <div class="dd-col">
          <a href="hakkinda.html"><b data-i18n="nav.mission">Misyon &amp; künye</b><span>Sovereign'i kim hazırlıyor</span></a>
          <a href="hakkinda.html#metodoloji"><b data-i18n="nav.methodology">Metodoloji</b><span>Brief nasıl üretiliyor</span></a>
          <a href="hakkinda.html#kaynaklar"><b data-i18n="nav.sources">Kaynaklar</b><span>İzlenen yayın kategorileri</span></a>
          <a href="hakkinda.html#sss"><b data-i18n="nav.faq">Sıkça sorulan sorular</b><span>Sınırlar, hatalar, iletişim</span></a>
        </div>
      </div>
    </div>

    <a href="abonelik.html" data-page="abonelik" data-i18n="nav.subscribe">Abonelik</a>
    <a href="hakkinda.html#iletisim" data-page="iletisim" data-i18n="nav.contact">İletişim</a>
  </nav>

  <div class="topnav-actions">
    <a href="#" class="login-link" data-i18n="nav.signin">Giriş</a>
    <a href="abonelik.html" class="btn primary sm cta-desktop" data-i18n="nav.getbriefs">Brief'leri al →</a>
    <button class="nav-burger" aria-label="Menüyü aç" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<aside class="nav-drawer" id="navDrawer" aria-hidden="true">
  <div class="drawer-overlay"></div>
  <div class="drawer-panel" role="dialog" aria-label="Menü">
    <div class="drawer-head">
      <span class="brand-name" style="font-size:22px;">Sovereign<em>.</em></span>
      <button class="drawer-close" aria-label="Kapat">×</button>
    </div>
    <nav class="drawer-nav">
      <a href="landing.html" class="dn-link" data-page="landing" data-i18n="nav.home">Anasayfa</a>

      <details class="dn-group">
        <summary><span data-i18n="nav.briefs">Bültenler</span> <span class="chev">▾</span></summary>
        <div class="dn-sub">
          <div class="dn-sublabel" data-i18n="nav.today">Bugün</div>
          <a href="reader.html" data-i18n="nav.evening">Akşam edisyonu</a>
          <a href="reader.html" data-i18n="nav.morning">Sabah edisyonu</a>
          <div class="dn-sublabel" data-i18n="nav.explore">Keşfet</div>
          <a href="reader.html" data-i18n="nav.archive">Arşiv</a>
          <a href="editorial.html" data-i18n="nav.longreads">Uzun okumalar</a>
          <a href="reader.html#konular" data-i18n="nav.topics">Konu kümeleri</a>
        </div>
      </details>

      <details class="dn-group">
        <summary><span data-i18n="nav.about">Hakkında</span> <span class="chev">▾</span></summary>
        <div class="dn-sub">
          <a href="hakkinda.html" data-i18n="nav.mission">Misyon &amp; künye</a>
          <a href="hakkinda.html#metodoloji" data-i18n="nav.methodology">Metodoloji</a>
          <a href="hakkinda.html#kaynaklar" data-i18n="nav.sources">İzlenen kaynaklar</a>
          <a href="hakkinda.html#sss" data-i18n="nav.faq">Sıkça sorulan</a>
        </div>
      </details>

      <a href="abonelik.html" class="dn-link" data-page="abonelik" data-i18n="nav.subscribe">Abonelik</a>
      <a href="ayarlar.html" class="dn-link" data-page="ayarlar" data-i18n="nav.settings">Ayarlar</a>
      <a href="hakkinda.html#iletisim" class="dn-link" data-page="iletisim" data-i18n="nav.contact">İletişim</a>

      <div class="drawer-foot">
        <a href="#" class="login-link" data-i18n="nav.signin">Giriş yap</a>
        <a href="abonelik.html" class="btn primary lg" style="width:100%; justify-content:center;" data-i18n="nav.getbriefs">Brief'leri al →</a>
      </div>
    </nav>
  </div>
</aside>
`;

  const FOOTER_HTML = `
<footer class="foot-pro">
  <div class="foot-grid">
    <div class="foot-col foot-brand">
      <div class="brand">Sovereign<em>.</em></div>
      <p data-i18n="footer.intro">Yayınları tarayan, tekrarları eleyen ve Türkçe bir brief'e dönüştüren deneysel bir motor.</p>
      <div class="foot-sub">
        <input type="email" placeholder="adres@şirket.com" data-i18n-attr="placeholder:footer.sub_placeholder" />
        <button data-i18n="footer.sub_button">Abone ol</button>
      </div>
    </div>
    <div class="foot-col">
      <h5 data-i18n="footer.col_brief">Bülten</h5>
      <a data-i18n="footer.link_brief_today" href="reader.html">Bugünkü brief</a>
      <a data-i18n="footer.link_brief_archive" href="reader.html">Arşiv</a>
      <a data-i18n="footer.link_brief_long" href="editorial.html">Uzun okumalar</a>
      <a data-i18n="footer.link_brief_topics" href="reader.html#konular">Konu kümeleri</a>
    </div>
    <div class="foot-col">
      <h5 data-i18n="footer.col_about">Hakkında</h5>
      <a data-i18n="footer.link_about_mission" href="hakkinda.html">Misyon &amp; ekip</a>
      <a data-i18n="footer.link_about_method" href="hakkinda.html#metodoloji">Metodoloji</a>
      <a data-i18n="footer.link_about_sources" href="hakkinda.html#kaynaklar">İzlenen kaynaklar</a>
      <a data-i18n="footer.link_about_faq" href="hakkinda.html#sss">SSS</a>
    </div>
    <div class="foot-col">
      <h5 data-i18n="footer.col_sub">Abone ol</h5>
      <a data-i18n="footer.link_sub_free" href="abonelik.html">Ücretsiz</a>
      <a data-i18n="footer.link_sub_pro" href="abonelik.html#pro">Premium</a>
      <a data-i18n="footer.link_sub_team" href="abonelik.html#kurumsal">Kurumsal</a>
      <a data-i18n="footer.link_sub_contact" href="hakkinda.html#iletisim">İletişim</a>
    </div>
  </div>
  <div class="foot-base">
    <span data-i18n="footer.legal">© 2025–2026 Sovereign · Tüm hakları saklıdır</span>
    <span class="foot-base-links">
      <a href="#" data-i18n="footer.legal_privacy">Gizlilik</a>
      <a href="#" data-i18n="footer.legal_terms">Kullanım koşulları</a>
      <a href="#" data-i18n="footer.legal_imprint">Künye</a>
    </span>
  </div>
</footer>
`;

  function getCurrentPage() {
    const path = location.pathname.split('/').pop() || 'landing.html';
    if (path.includes('landing')) return 'landing';
    if (path.includes('reader')) return 'bultenler';
    if (path.includes('editorial')) return 'bultenler';
    if (path.includes('abonelik')) return 'abonelik';
    if (path.includes('ayarlar')) return 'ayarlar';
    if (path.includes('hakkinda')) return 'hakkinda';
    if (path.includes('iletisim')) return 'iletisim';
    return 'landing';
  }

  function mount() {
    const navMount = document.getElementById('topnav-mount');
    if (navMount) {
      navMount.outerHTML = NAV_HTML;
      const current = getCurrentPage();
      document.querySelectorAll('[data-page]').forEach(el => {
        if (el.dataset.page === current) el.classList.add('active');
      });

      // Click-to-toggle dropdowns (for tap support)
      document.querySelectorAll('.dd-trigger').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const dd = btn.closest('.dd');
          const wasOpen = dd.classList.contains('open');
          document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open'));
          if (!wasOpen) dd.classList.add('open');
        });
      });
      document.addEventListener('click', e => {
        if (!e.target.closest('.dd')) {
          document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open'));
        }
      });

      // Hamburger drawer
      const drawer = document.getElementById('navDrawer');
      const burger = document.querySelector('.nav-burger');
      const closeBtn = document.querySelector('.drawer-close');
      const overlay = document.querySelector('.drawer-overlay');
      const openDrawer = () => {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      };
      const closeDrawer = () => {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      };
      burger?.addEventListener('click', openDrawer);
      closeBtn?.addEventListener('click', closeDrawer);
      overlay?.addEventListener('click', closeDrawer);
      drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
      });

      // Language switcher
      const LANG_LABELS = {
        tr: { flag: '🇹🇷', code: 'TR' },
        en: { flag: '🇬🇧', code: 'EN' },
        es: { flag: '🇪🇸', code: 'ES' },
        de: { flag: '🇩🇪', code: 'DE' }
      };
      const saved = localStorage.getItem('sov_lang') || 'tr';
      const applyLang = (code) => {
        document.documentElement.lang = code;
        const t = LANG_LABELS[code];
        const trigger = document.querySelector('.lang-trigger');
        if (trigger && t) {
          trigger.querySelector('.lang-flag').textContent = t.flag;
          trigger.querySelector('.lang-code').textContent = t.code;
        }
        document.querySelectorAll('.lang-option').forEach(el => {
          el.classList.toggle('active', el.dataset.lang === code);
        });
      };
      applyLang(saved);
      if (window.sovereignI18n) window.sovereignI18n.translateAll(saved);
      document.querySelectorAll('.lang-option').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          const code = el.dataset.lang;
          localStorage.setItem('sov_lang', code);
          applyLang(code);
          if (window.sovereignI18n) window.sovereignI18n.translateAll(code);
          document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open'));
        });
      });
    }

    const footMount = document.getElementById('footer-mount');
    if (footMount) {
      footMount.outerHTML = FOOTER_HTML;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
