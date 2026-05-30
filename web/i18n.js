// Sovereign · i18n — UI translations (TR/EN/ES/DE)
// Marker: data-i18n="key.path"  or  data-i18n-attr="placeholder|aria-label|...:key.path"

(function () {
  const T = {
    tr: {
      brand: { tagline: "Günlük Biyoteknoloji + Yapay Zekâ Brief'i" },
      masthead: { lastupdate: "Son güncelleme: 28 Mayıs 2026, 18:00" },
      nav: {
        home: "Anasayfa",
        briefs: "Bültenler",
        about: "Hakkında",
        subscribe: "Abonelik",
        settings: "Ayarlar",
        contact: "İletişim",
        signin: "Giriş",
        admin_section: "Yönetim",
        admin_panel: "Admin Paneli",
        logout: "Çıkış yap",
        getbriefs: "Brief'leri al →",
        today: "Bugün",
        explore: "Keşfet",
        evening: "Akşam edisyonu",
        morning: "Sabah edisyonu",
        archive: "Arşiv",
        longreads: "Uzun okumalar",
        topics: "Konu kümeleri",
        mission: "Misyon & künye",
        methodology: "Metodoloji",
        sources: "Kaynaklar",
        faq: "Sıkça sorulan sorular",
      },
      lang: {
        tr: { name: "Türkçe", status: "Ana dil · yayında" },
        en: { name: "English", status: "Coming soon" },
        es: { name: "Español", status: "Próximamente" },
        de: { name: "Deutsch", status: "Demnächst" },
      },
      common: {
        open: "Aç →",
        read: "Oku →",
        allarchive: "Tüm arşiv →",
        published: "YAYINDA",
      },
      modules: {
        briefs_desc: "Sabah ve akşam edisyonları, geçmiş arşivle birlikte.",
        long_desc: "Haftalık derinlemesine analiz, editoryal sentez.",
        topics_desc: "Regulasyon · Klinik AI · CRISPR · Wearables · Funding.",
        team_desc: "Tek kişilik bir yayın ve yapay zekâ — kim hazırlıyor, nasıl üretiliyor.",
        method_desc: "Brief'in altı adımlık üretim süreci.",
        sources_desc: "İzlenen yayınların kategori bazlı listesi.",
        subscribe_desc: "E-posta listesine katıl. Günde 2 kez yeni brief, doğrudan kutuna.",
        faq_desc: "Sınırlar, hatalar, içerik üretim süreci.",
        contact_desc: "Geri bildirim, hata raporu, sorular.",
        title_briefs: "Bültenler",
        title_long: "Uzun okumalar",
        title_topics: "Konu kümeleri",
        title_team: "Künye",
        title_method: "Metodoloji",
        title_sources: "Kaynaklar",
        title_subscribe: "Abonelik",
        title_faq: "SSS",
        title_contact: "İletişim",
      },
      dd: {
      },
      settings: {
        toc: "Bölümler",
        theme: "Tema",
        theme_desc: "Aydınlık, koyu veya sistem tercihi.",
        density: "Yoğunluk",
        density_desc: "Sayfa boşlukları ve metin sıkışıklığı.",
        accent: "Aksan rengi",
        accent_desc: "Link, vurgu ve düğme renkleri.",
        light: "Aydınlık", dark: "Koyu", system: "Sistem",
        compact: "Sıkı", standard: "Standart", comfy: "Ferah",
        blue: "Mavi", indigo: "İndigo", forest: "Yeşil", red: "Kırmızı",
        email: "E-posta",
        change: "Değiştir",
        password: "Şifre",
        password_v: "Son güncelleme bilinmiyor",
        reset: "Sıfırla",
        export: "Veri dışa aktarma",
        export_desc: "Okuma geçmişi, ayarlar, abonelik verisi.",
        download: "İndir (JSON)",
        delete: "Hesabı sil",
        delete_desc: "Tüm veriler kalıcı olarak silinir.",
        comfy: "Ferah",
        coming_soon: "Yakında",
        dark: "Koyu",
        forest: "Yeşil",
        indigo: "İndigo",
        red: "Kırmızı",
        signed_out: "Henüz giriş yapmadın",
        signed_out_desc: "Hesap ayarlarını görmek için giriş yapmalısın.",
        standard: "Standart",
        system: "Sistem",
      },
      landing: {
        hero_h1: "Sovereign — günlük biyoteknoloji & yapay zekâ brief'i.",
        hero_sub: "Yayınları tarayan, tekrarları eleyen, sade bir Türkçe brief'e dönüştüren deneysel bir yapay zekâ motoru.",
        cta_today: "Bugünün brief'ini oku",
        cta_subscribe: "Abonelik",
        modules_label: "Modüller",
        modules_h2: "Sovereign'de neler var.",
        latest_h2: "Son edisyonlar",
      },
      ayarlar: {
        title: "Ayarlar",
        dek: "Görünüm, dil, bildirimler ve hesap tercihleri.",
        sec_lang: "Dil",
        sec_lang_desc: "Arayüz dili. 4 dil aktif; seçimin tarayıcında hatırlanır. Brief içeriği şu an Türkçe yayınlanır.",
        sec_view: "Görünüm",
        sec_view_desc: "Tema, yoğunluk ve aksan rengi.",
        sec_notif: "Bildirimler",
        sec_notif_desc: "E-posta bildirimleri için abonelik sayfasından kayıt ol. Tarayıcı bildirimleri yakında.",
        notif_signup_link: "→ Abonelik sayfasına git",
        sec_acc: "Hesap",
        sec_acc_desc: "Profil bilgileri ve güvenlik.",
      },
      reader: {
        archive_title: "Bülten arşivi",
        archive_meta: "GÜNDE 2× · SABAH & AKŞAM EDİSYONLARI",
        empty_title: "Henüz bülten üretilmedi.",
        loading: "Bültenler yükleniyor…",
        load_error: "Veri yüklenemedi.",
        share_btn: "⤴ Paylaş",
        download_btn: "⤓ İndir",
        in_publication: "YAYINDA",
        long_read: "📖 Uzun okuma →",
      },
      dashboard: {
        admin_only: "Bu sayfa adminlere özel",
        admin_only_desc: "Pipeline metriklerini görmek için yönetici hesabıyla giriş yapmalısın.",
        cfg_loading: "Yükleniyor…",
        config_h2: "LLM ve pipeline yapılandırması",
        cron_loading: "Cron…",
        cron_pause: "Cron\\'u durdur",
        cron_start: "Cron\\'u başlat",
        crumb: "/ Pipeline",
        dek: "Sovereign'in canlı durumu — bülten sayıları, son worker tikleri, cron yapılandırması.",
        latest_h2: "Son yayınlanan + son 7 günün en güçlü sinyali",
        loading: "Yükleniyor…",
        operational: "Operasyonel",
        run_now: "Şimdi tetikle",
        runs_h2: "Son worker tikleri",
        stat_articles: "Toplam makale",
        stat_articles_hint: "Tarama + analiz",
        stat_newsletters: "Yayınlanan bülten",
        stat_newsletters_hint: "Tüm zamanlar",
        stat_pending: "Onay bekleyen",
        stat_pending_hint: "HITL kuyruğunda",
        stat_published: "Yayınlanan makale",
        stat_published_hint: "Bülten içinde gönderilmiş",
        title: "Pipeline durumu.",
      },
      admin: {
        add_btn: "Ekle",
        add_desc: "RSS / Atom feed URL'i. Eklendikten sonra bir sonraki worker tikinde taranır.",
        add_h2: "Yeni kaynak",
        admin_only: "Bu sayfa adminlere özel",
        admin_only_desc: "Kaynak yönetimi için yönetici hesabıyla giriş yapmalısın.",
        crumb: "/ Kaynak yönetimi",
        dek: "Sovereign'in taradığı RSS/Atom kaynaklarını ekle, kapat veya sil. Değişiklik bir sonraki worker tikinde aktiftir.",
        list_desc: "Aktif kaynaklar bir sonraki tikte taranır. Sil aksiyonu geri alınamaz.",
        list_h2: "Mevcut kaynaklar",
        loading: "Yükleniyor…",
        name_lbl: "Kaynak adı",
        quick_actions: "Hızlı aksiyonlar",
        quick_actions_desc: "Worker'ı şimdi tetikle veya otomatik cron'u aç/kapa.",
        run_now: "Şimdi tetikle",
        title: "Kaynaklar.",
        url_lbl: "URL",
      },
      editorial: {
        back: "← Bültene dön",
        generate: "Uzun analiz üret",
        generate_warn: "Üretim 1-2 dakika sürer ve DeepSeek API tüketir.",
        loading: "Yükleniyor…",
        no_long_read: "Bu bülten için uzun okuma henüz oluşturulmadı.",
        no_long_read_desc: "Admin bu bültenin derinlemesine analizini üretebilir. 1500-2000 kelimelik tek seferlik analiz, ardından cache'lenir.",
      },
      subscribe: {
        email_lbl: "E-posta",
        hero_dek: "Günde 2 kez, sabah ve akşam. Sağlık teknolojisi ve yapay zekâ alanında damıtılmış sinyal — doğrudan e-posta kutuna.",
        hero_h1_a: "Sovereign brief'lerine",
        hero_h1_b: "abone ol.",
        how_h3: "Nasıl çalışıyor.",
        how_p: "RSS'den taranan haberler embedding-tabanlı benzerlik filtresinden geçer, ardından DeepSeek-v4-pro tarafından analiz edilip 1-10 etki puanı ile skorlanır. Eşiği geçenler editöryal onaydan geçtikten sonra bültene girer.",
        manifesto_label: "Neden Sovereign",
        privacy_note: "KVKK/GDPR uyumlu. İstediğin zaman tek tıkla çıkabilirsin. Spam yapmıyoruz, e-posta paylaşılmıyor.",
        subscribe_btn: "Abone ol",
        why_h3: "Sinyal, gürültü değil.",
        why_p: "Her gün yüzlerce yayından gelen sağlık-AI haberlerini taramak imkansız. Sovereign otonom bir yapay zekâ motoruyla onlarca kaynağı tarar, benzer haberleri eler ve sadece etki puanı yüksek sinyalleri damıtır.",
        you_h3: "Senin için.",
        you_p: "VC, hastane CIO'su, dijital sağlık girişimcisi veya klinik AI mühendisiyseniz, sabah kahveniz ve akşam kapanışınız arasında sektörü kaçırmadan takip etmek istersiniz. Sovereign tam bunun için.",
      },
      about: {
        breadcrumb_about: "Hakkımızda",
        editorial_team: "ve yapay zekâ.",
        about_sovereign_desc: "Sovereign'i kim hazırlıyor, sinyali nasıl seçiyoruz, hangi kaynakları izliyoruz. Editorial standartlarımız ve sıkça sorulan sorular.",
        contents: "İçindekiler",
        imprint: "Künye",
        contact: "İletişim",
        real_info: "gerçek bilgi",
        imprint_section_title: "02 / Künye",
        structure: "Yapı.",
        single_person_publication: "Sovereign tek kişilik bir yayın. Tarama, eleme, yazım ve yayın yapay zekâ tarafından yürütülür; çerçeve ve kaynak listesi insan tarafından belirlenir ve sürdürülür.",
        content_disclaimer: "İçerik tek başına karar referansı olarak kullanılmamalı. Her brief'in sonundaki kaynak listesine geri dönülmesi önerilir.",
        process: "Süreç.",
        process_steps: "Her edisyon altı adımdan geçer. Tüm süreç yapay zekâ tarafından yürütülür; çerçeve ve kaynak listesi insan tarafından belirlenir.",
        monitored_sources: "Belirlenen yayınlar gece-gündüz takip edilir. Akademik dergiler, regulasyon kaynakları, sektör analizleri, klinik veritabanları.",
        ai_deduplication: "Yapay zekâ aynı haberin farklı versiyonlarını ve yüzeysel kopyaları birleştirir.",
        contextualization: "Bağlamlama",
        story_context_eval: "Kalan her hikaye, ilişkili önceki materyallerle birlikte değerlendirilir.",
        writing: "Yazım",
        writing_structure: "Beş bölümlü standart yapı: sinyal, bağlam, etki, çekince, takip. Yapay zekâ tarafından yazılır.",
        publication: "Yayın",
        publication_schedule: "Brief sabah ve akşam edisyonu olarak otomatik yayınlanır.",
        error_feedback: "Okuyucu hata bildirimleri kaynak listesinin güncellenmesinde dikkate alınır.",
        sources_section_title: "04 / İzlenen kaynaklar",
        by_category: "Kategori bazında.",
        who_ich_announcements: "WHO, ICH duyuruları",
        sector_analyses: "Sektör analizleri",
        clinical_research: "Klinik araştırma",
        company_announcements: "Şirket duyuruları",
        public_filings: "Halka açık dosyalar",
        official_press_releases: "Resmî basın duyuruları",
        faq_section_title: "05 / Sıkça sorulan",
        who_writes_content: "İçeriği kim yazıyor?",
        ai_writing_process: "Tarama, yazım ve yayın yapay zekâ tarafından yürütülür. Format şablonu ve kaynak listesi tek bir kişi tarafından sürdürülür.",
        brief_as_reference: "Brief'i karar referansı olarak kullanabilir miyim?",
        brief_not_for_decision: "Hayır. Brief tarama amaçlıdır; ürün, klinik veya yatırım kararı için tek başına referans değildir. Her zaman brief sonundaki kaynak listesindeki yayınlara geri dönün.",
        brief_scanning_tool: "Sektörün nereye baktığını ve neyin gündem olduğunu görmek için bir tarama aracı olarak çalışır. Yüzlerce başlığa göz atmaktan zaman tasarrufu sağlar; ama hiçbirinin yerine geçmez.",
        found_error: "Hata var, ne yapayım?",
        error_report_procedure: "İletişim bölümündeki adresten ulaşın. Yapısal hatalar bildirilince kaynak listesi güncellenir ve sonraki edisyonlar etkilenir.",
        where_to_see_sources: "Kaynakları nereden görebilirim?",
        contact_section_title: "06 / İletişim",
        single_contact_address: "Soru, geri bildirim, hata bildirimi için tek bir adres. Tek kişilik bir yayın — her mesajı ben okuyorum.",
        all_feedback_types: "Her türlü soru, geri bildirim, hata bildirimi.",
        source_list_actions: "Kaynak listesini görmek, sorun açmak, kod incelemek.",
        h1_prefix: "Tek kişi",
        h1_suffix: "Bir ekip değil.",
      },
      footer: {
        col_brief: "Bülten",
        col_about: "Hakkında",
        col_sub: "Abone ol",
        link_brief_today: "Bugünkü brief",
        link_brief_archive: "Arşiv",
        link_brief_long: "Uzun okumalar",
        link_brief_topics: "Konu kümeleri",
        link_about_mission: "Misyon & künye",
        link_about_method: "Metodoloji",
        link_about_sources: "İzlenen kaynaklar",
        link_about_faq: "SSS",
        
        
        
        link_sub_signup: "E-postaya kaydol",
        link_sub_contact: "İletişim",
        legal: "© 2025–2026 Sovereign · Tüm hakları saklıdır",
        legal_privacy: "Gizlilik",
        legal_terms: "Kullanım koşulları",
        legal_imprint: "Künye",
        intro: "Yayınları tarayan, tekrarları eleyen ve Türkçe bir brief'e dönüştüren deneysel bir motor.",
        sub_button: "Abone ol",
      },
    },

    en: {
      brand: { tagline: "Daily Biotech + AI Brief" },
      masthead: { lastupdate: "Last updated: May 28, 2026, 6:00 PM" },
      nav: {
        home: "Home", briefs: "Briefs", about: "About", subscribe: "Subscribe",
        settings: "Settings", contact: "Contact",
        signin: "Sign in", getbriefs: "Get briefs →",
        admin_section: "Admin",
        admin_panel: "Admin Panel",
        logout: "Sign out",
        today: "Today", explore: "Explore",
        evening: "Evening edition", morning: "Morning edition",
        archive: "Archive", longreads: "Long reads", topics: "Topic clusters",
        mission: "Mission & masthead", methodology: "Methodology",
        sources: "Sources", faq: "FAQ",
      },
      lang: {
        tr: { name: "Türkçe", status: "Primary · live" },
        en: { name: "English", status: "Coming soon" },
        es: { name: "Español", status: "Coming soon" },
        de: { name: "Deutsch", status: "Coming soon" },
      },
      common: { open: "Open →", read: "Read →", allarchive: "Full archive →", published: "LIVE" },
      modules: {
        briefs_desc: "Morning and evening editions, with full archive.",
        long_desc: "Weekly deep-dive analysis and editorial synthesis.",
        topics_desc: "Regulatory · Clinical AI · CRISPR · Wearables · Funding.",
        team_desc: "A one-person publication and AI — who runs it, how it's made.",
        method_desc: "The six-step production process behind each brief.",
        sources_desc: "Tracked publications by category.",
        subscribe_desc: "Join the email list. Two briefs a day, straight to your inbox.",
        faq_desc: "Limits, errors, content production process.",
        contact_desc: "Feedback, error reports, questions.",
        title_briefs: "Briefs", title_long: "Long reads", title_topics: "Topic clusters",
        title_team: "Masthead", title_method: "Methodology", title_sources: "Sources",
        title_subscribe: "Subscribe", title_faq: "FAQ", title_contact: "Contact",
      },
      dd: {
      },
      settings: {
        toc: "Sections",
        theme: "Theme", theme_desc: "Light, dark or system preference.",
        density: "Density", density_desc: "Page spacing and text compactness.",
        accent: "Accent color", accent_desc: "Link, emphasis and button colors.",
        light: "Light", dark: "Dark", system: "System",
        compact: "Compact", standard: "Standard", comfy: "Roomy",
        blue: "Blue", indigo: "Indigo", forest: "Forest", red: "Red",
        email: "Email", change: "Change",
        password: "Password", password_v: "Last update unknown", reset: "Reset",
        export: "Data export", export_desc: "Reading history, settings, subscription data.",
        download: "Download (JSON)",
        delete: "Delete account", delete_desc: "All data is permanently removed.",
        comfy: "Comfy",
        coming_soon: "Coming soon",
        dark: "Dark",
        forest: "Forest",
        indigo: "Indigo",
        red: "Red",
        signed_out: "Not signed in yet",
        signed_out_desc: "You must log in to see account settings.",
        standard: "Standard",
        system: "System",
      },
      landing: {
        hero_h1: "Sovereign — daily biotech & AI brief.",
        hero_sub: "An experimental AI engine that scans publications, dedupes signal, and turns it into a concise daily brief.",
        cta_today: "Read today's brief",
        cta_subscribe: "Subscribe",
        modules_label: "Modules",
        modules_h2: "What's in Sovereign.",
        latest_h2: "Latest editions",
      },
      ayarlar: {
        title: "Settings",
        dek: "Appearance, language, notifications and account preferences.",
        sec_lang: "Language",
        sec_lang_desc: "UI language. 4 languages active; your choice is remembered in this browser. Brief content is currently published in Turkish only.",
        sec_view: "Appearance",
        sec_view_desc: "Theme, density and accent color.",
        sec_notif: "Notifications",
        sec_notif_desc: "For email notifications, sign up on the subscription page. Browser notifications coming soon.",
        notif_signup_link: "→ Go to subscription page",
        sec_acc: "Account",
        sec_acc_desc: "Profile information and security.",
      },
      reader: {
        archive_title: "Brief archive",
        archive_meta: "TWICE DAILY · MORNING & EVENING EDITIONS",
        empty_title: "No briefs published yet.",
        loading: "Loading briefs…",
        load_error: "Could not load data.",
        share_btn: "⤴ Share",
        download_btn: "⤓ Download",
        in_publication: "PUBLISHED",
        long_read: "📖 Long read →",
      },
      dashboard: {
        admin_only: "This page is for admins only",
        admin_only_desc: "You must log in with an admin account to see pipeline metrics.",
        cfg_loading: "Loading…",
        config_h2: "LLM and pipeline configuration",
        cron_loading: "Cron…",
        cron_pause: "Pause cron",
        cron_start: "Start cron",
        crumb: "/ Pipeline",
        dek: "Sovereign's live status — newsletter counts, latest worker ticks, cron configuration.",
        latest_h2: "Latest published + strongest signal of the last 7 days",
        loading: "Loading…",
        operational: "Operational",
        run_now: "Trigger now",
        runs_h2: "Latest worker ticks",
        stat_articles: "Total articles",
        stat_articles_hint: "Scraping + analysis",
        stat_newsletters: "Published newsletters",
        stat_newsletters_hint: "All time",
        stat_pending: "Pending approval",
        stat_pending_hint: "In HITL queue",
        stat_published: "Published articles",
        stat_published_hint: "Sent in newsletter",
        title: "Pipeline status.",
      },
      admin: {
        add_btn: "Add",
        add_desc: "RSS / Atom feed URL. It will be scanned on the next worker tick after being added.",
        add_h2: "New source",
        admin_only: "This page is for admins only",
        admin_only_desc: "You must log in with an admin account for source management.",
        crumb: "/ Source management",
        dek: "Add, disable, or delete RSS/Atom sources scanned by Sovereign. Changes take effect on the next worker tick.",
        list_desc: "Active sources are scanned on the next tick. The delete action cannot be undone.",
        list_h2: "Current sources",
        loading: "Loading…",
        name_lbl: "Source name",
        quick_actions: "Quick actions",
        quick_actions_desc: "Trigger the worker now or toggle automatic cron on/off.",
        run_now: "Trigger now",
        title: "Sources.",
        url_lbl: "URL",
      },
      editorial: {
        back: "← Back to newsletter",
        generate: "Generate long read",
        generate_warn: "Generation takes 1-2 minutes and consumes DeepSeek API.",
        loading: "Loading…",
        no_long_read: "A long read has not been generated for this newsletter yet.",
        no_long_read_desc: "The admin can generate an in-depth analysis for this newsletter. A one-time 1500-2000 word analysis, then cached.",
      },
      subscribe: {
        email_lbl: "Email",
        hero_dek: "Twice a day, morning and evening. Distilled signal in health technology and artificial intelligence — straight to your inbox.",
        hero_h1_a: "Sovereign briefs",
        hero_h1_b: "subscribe.",
        how_h3: "How it works.",
        how_p: "News scraped from RSS passes through an embedding-based similarity filter, then is analyzed by DeepSeek-v4-pro and scored with a 1-10 impact score. Those exceeding the threshold enter the newsletter after editorial approval.",
        manifesto_label: "Why Sovereign",
        privacy_note: "KVKK/GDPR compliant. You can unsubscribe with one click at any time. We don't spam, your email is not shared.",
        subscribe_btn: "Subscribe",
        why_h3: "Signal, not noise.",
        why_p: "Scanning health-AI news from hundreds of publications every day is impossible. Sovereign scans dozens of sources with an autonomous AI engine, filters out similar news, and distills only the high-impact signals.",
        you_h3: "For you.",
        you_p: "If you're a VC, hospital CIO, digital health entrepreneur, or clinical AI engineer, you want to track the industry between your morning coffee and evening shutdown without missing a beat. Sovereign is exactly for that.",
      },
      about: {
        breadcrumb_about: "About Us",
        editorial_team: "and AI.",
        about_sovereign_desc: "Who prepares Sovereign, how we select the signal, which sources we monitor. Our editorial standards and frequently asked questions.",
        contents: "Contents",
        imprint: "Imprint",
        contact: "Contact",
        real_info: "real information",
        imprint_section_title: "02 / Imprint",
        structure: "Structure.",
        single_person_publication: "Sovereign is a single-person publication. Scanning, filtering, writing, and publishing are carried out by artificial intelligence; the framework and source list are determined and maintained by a human.",
        content_disclaimer: "Content should not be used as a standalone decision reference. It is recommended to return to the source list at the end of each brief.",
        process: "Process.",
        process_steps: "Each edition goes through six steps. The entire process is carried out by artificial intelligence; the framework and source list are determined by a human.",
        monitored_sources: "The designated publications are monitored around the clock. Academic journals, regulatory sources, industry analyses, clinical databases.",
        ai_deduplication: "Artificial intelligence merges different versions of the same news and superficial copies.",
        contextualization: "Contextualization",
        story_context_eval: "Each remaining story is evaluated together with related prior materials.",
        writing: "Writing",
        writing_structure: "Standard five-section structure: signal, context, impact, reservation, follow-up. Written by artificial intelligence.",
        publication: "Publication",
        publication_schedule: "The brief is automatically published as a morning and evening edition.",
        error_feedback: "Reader error reports are taken into account in updating the source list.",
        sources_section_title: "04 / Monitored sources",
        by_category: "By category.",
        who_ich_announcements: "WHO, ICH announcements",
        sector_analyses: "Sector analyses",
        clinical_research: "Clinical research",
        company_announcements: "Company announcements",
        public_filings: "Public filings",
        official_press_releases: "Official press releases",
        faq_section_title: "05 / Frequently asked",
        who_writes_content: "Who writes the content?",
        ai_writing_process: "Scanning, writing, and publishing are carried out by artificial intelligence. The format template and source list are maintained by a single person.",
        brief_as_reference: "Can I use the brief as a decision reference?",
        brief_not_for_decision: "No. The brief is for scanning purposes; it is not a standalone reference for product, clinical, or investment decisions. Always return to the publications in the source list at the end of the brief.",
        brief_scanning_tool: "It works as a scanning tool to see where the sector is looking and what is on the agenda. It saves time by skimming hundreds of headlines; but it does not replace any of them.",
        found_error: "There is an error, what should I do?",
        error_report_procedure: "Contact the address in the contact section. When structural errors are reported, the source list is updated and subsequent editions are affected.",
        where_to_see_sources: "Where can I see the sources?",
        contact_section_title: "06 / Contact",
        single_contact_address: "A single address for questions, feedback, and error reports. A single-person publication — I read every message.",
        all_feedback_types: "All kinds of questions, feedback, error reports.",
        source_list_actions: "See the source list, open an issue, inspect the code.",
        h1_prefix: "One person",
        h1_suffix: "Not a team.",
      },
      footer: {
        col_brief: "Briefs", col_about: "About", col_sub: "Subscribe",
        link_brief_today: "Today's brief", link_brief_archive: "Archive",
        link_brief_long: "Long reads", link_brief_topics: "Topic clusters",
        link_about_mission: "Mission & masthead", link_about_method: "Methodology",
        link_about_sources: "Tracked sources", link_about_faq: "FAQ",
        
        link_sub_signup: "Subscribe by email",
        link_sub_contact: "Contact",
        legal: "© 2025–2026 Sovereign · All rights reserved",
        legal_privacy: "Privacy", legal_terms: "Terms", legal_imprint: "Imprint",
        intro: "An experimental engine that scans publications, dedupes signal and turns it into a daily brief.",
        sub_button: "Subscribe",
      },
    },

    es: {
      brand: { tagline: "Resumen diario de Biotecnología + IA" },
      masthead: { lastupdate: "Última actualización: 28 may 2026, 18:00" },
      nav: {
        home: "Inicio", briefs: "Boletines", about: "Acerca", subscribe: "Suscripción",
        settings: "Ajustes", contact: "Contacto",
        signin: "Entrar", getbriefs: "Recibir boletines →",
        admin_section: "Administración",
        admin_panel: "Panel admin",
        logout: "Cerrar sesión",
        today: "Hoy", explore: "Explorar",
        evening: "Edición de la tarde", morning: "Edición de la mañana",
        archive: "Archivo", longreads: "Lecturas largas", topics: "Temas",
        mission: "Misión y créditos", methodology: "Metodología",
        sources: "Fuentes", faq: "Preguntas frecuentes",
      },
      lang: {
        tr: { name: "Türkçe", status: "Principal · en vivo" },
        en: { name: "English", status: "Próximamente" },
        es: { name: "Español", status: "Próximamente" },
        de: { name: "Deutsch", status: "Próximamente" },
      },
      common: { open: "Abrir →", read: "Leer →", allarchive: "Archivo completo →", published: "EN VIVO" },
      modules: {
        briefs_desc: "Ediciones de mañana y tarde, con archivo completo.",
        long_desc: "Análisis semanal en profundidad, síntesis editorial.",
        topics_desc: "Regulación · IA clínica · CRISPR · Wearables · Financiación.",
        team_desc: "Una publicación unipersonal y la IA — quién la hace, cómo se produce.",
        method_desc: "El proceso de producción en seis pasos.",
        sources_desc: "Publicaciones monitoreadas por categoría.",
        subscribe_desc: "Únete a la lista. Dos boletines al día, directamente a tu bandeja.",
        faq_desc: "Límites, errores, proceso de producción.",
        contact_desc: "Comentarios, informes de errores, preguntas.",
        title_briefs: "Boletines", title_long: "Lecturas largas", title_topics: "Temas",
        title_team: "Créditos", title_method: "Metodología", title_sources: "Fuentes",
        title_subscribe: "Suscripción", title_faq: "FAQ", title_contact: "Contacto",
      },
      dd: {
      },
      settings: {
        toc: "Secciones",
        theme: "Tema", theme_desc: "Claro, oscuro o preferencia del sistema.",
        density: "Densidad", density_desc: "Espaciado de página y compacidad del texto.",
        accent: "Color de acento", accent_desc: "Enlaces, énfasis y colores de botones.",
        light: "Claro", dark: "Oscuro", system: "Sistema",
        compact: "Compacto", standard: "Estándar", comfy: "Espacioso",
        blue: "Azul", indigo: "Índigo", forest: "Verde", red: "Rojo",
        email: "Correo electrónico", change: "Cambiar",
        password: "Contraseña", password_v: "Última actualización desconocida", reset: "Restablecer",
        export: "Exportar datos", export_desc: "Historial de lectura, ajustes, datos de suscripción.",
        download: "Descargar (JSON)",
        delete: "Eliminar cuenta", delete_desc: "Todos los datos se eliminan permanentemente.",
        comfy: "Confortable",
        coming_soon: "Próximamente",
        dark: "Oscuro",
        forest: "Bosque",
        indigo: "Índigo",
        red: "Rojo",
        signed_out: "Aún no has iniciado sesión",
        signed_out_desc: "Debes iniciar sesión para ver la configuración de la cuenta.",
        standard: "Estándar",
        system: "Sistema",
      },
      landing: {
        hero_h1: "Sovereign — resumen diario de biotecnología e IA.",
        hero_sub: "Un motor de IA experimental que escanea publicaciones, deduplica señales y las convierte en un breve resumen diario.",
        cta_today: "Leer el resumen de hoy",
        cta_subscribe: "Suscripción",
        modules_label: "Módulos",
        modules_h2: "Qué hay en Sovereign.",
        latest_h2: "Últimas ediciones",
      },
      ayarlar: {
        title: "Ajustes",
        dek: "Apariencia, idioma, notificaciones y preferencias de cuenta.",
        sec_lang: "Idioma",
        sec_lang_desc: "Idioma de la interfaz. 4 idiomas activos; tu elección se recuerda en este navegador. El contenido del boletín se publica actualmente solo en turco.",
        sec_view: "Apariencia",
        sec_view_desc: "Tema, densidad y color de acento.",
        sec_notif: "Notificaciones",
        sec_notif_desc: "Para notificaciones por correo, suscríbete en la página de suscripción. Notificaciones del navegador próximamente.",
        notif_signup_link: "→ Ir a la página de suscripción",
        sec_acc: "Cuenta",
        sec_acc_desc: "Información de perfil y seguridad.",
      },
      reader: {
        archive_title: "Archivo de boletines",
        archive_meta: "DOS VECES AL DÍA · EDICIONES MAÑANA Y NOCHE",
        empty_title: "Aún no hay boletines publicados.",
        loading: "Cargando boletines…",
        load_error: "No se pudieron cargar los datos.",
        share_btn: "⤴ Compartir",
        download_btn: "⤓ Descargar",
        in_publication: "PUBLICADO",
        long_read: "📖 Lectura larga →",
      },
      dashboard: {
        admin_only: "Esta página es solo para administradores",
        admin_only_desc: "Debes iniciar sesión con una cuenta de administrador para ver las métricas del pipeline.",
        cfg_loading: "Cargando…",
        config_h2: "Configuración de LLM y pipeline",
        cron_loading: "Cron…",
        cron_pause: "Pausar cron",
        cron_start: "Iniciar cron",
        crumb: "/ Pipeline",
        dek: "Estado en vivo de Sovereign — recuentos de boletines, últimos ticks del worker, configuración del cron.",
        latest_h2: "Último publicado + señal más potente de los últimos 7 días",
        loading: "Cargando…",
        operational: "Operativo",
        run_now: "Activar ahora",
        runs_h2: "Últimos ticks del worker",
        stat_articles: "Total de artículos",
        stat_articles_hint: "Escaneo + análisis",
        stat_newsletters: "Boletines publicados",
        stat_newsletters_hint: "Todos los tiempos",
        stat_pending: "Pendientes de aprobación",
        stat_pending_hint: "En la cola HITL",
        stat_published: "Artículos publicados",
        stat_published_hint: "Enviado en el boletín",
        title: "Estado del pipeline.",
      },
      admin: {
        add_btn: "Añadir",
        add_desc: "URL del feed RSS/Atom. Se escaneará en el siguiente tick del worker una vez añadido.",
        add_h2: "Nueva fuente",
        admin_only: "Esta página es solo para administradores",
        admin_only_desc: "Debes iniciar sesión con una cuenta de administrador para gestionar fuentes.",
        crumb: "/ Gestión de fuentes",
        dek: "Agrega, desactiva o elimina fuentes RSS/Atom escaneadas por Sovereign. Los cambios surten efecto en el siguiente tick del worker.",
        list_desc: "Las fuentes activas se escanearán en el próximo tick. La acción de eliminación no se puede deshacer.",
        list_h2: "Fuentes actuales",
        loading: "Cargando…",
        name_lbl: "Nombre de la fuente",
        quick_actions: "Acciones rápidas",
        quick_actions_desc: "Activa el worker ahora o activa/desactiva el cron automático.",
        run_now: "Activar ahora",
        title: "Fuentes.",
        url_lbl: "URL",
      },
      editorial: {
        back: "← Volver al boletín",
        generate: "Generar análisis largo",
        generate_warn: "La generación tarda 1-2 minutos y consume la API de DeepSeek.",
        loading: "Cargando…",
        no_long_read: "Aún no se ha generado un análisis largo para este boletín.",
        no_long_read_desc: "El administrador puede generar un análisis en profundidad de este boletín. Un análisis único de 1500-2000 palabras, luego se almacena en caché.",
      },
      subscribe: {
        email_lbl: "Correo electrónico",
        hero_dek: "Dos veces al día, mañana y tarde. Señal destilada en tecnología de la salud e inteligencia artificial — directamente a tu bandeja de entrada.",
        hero_h1_a: "Los resúmenes de Sovereign",
        hero_h1_b: "suscríbete.",
        how_h3: "Cómo funciona.",
        how_p: "Las noticias extraídas de RSS pasan por un filtro de similitud basado en embeddings, luego son analizadas por DeepSeek-v4-pro y puntuadas con una nota de impacto de 1 a 10. Las que superan el umbral entran en el boletín tras la aprobación editorial.",
        manifesto_label: "Por qué Sovereign",
        privacy_note: "Cumple con el KVKK/GDPR. Puedes darte de baja con un solo clic en cualquier momento. No hacemos spam, tu correo no se comparte.",
        subscribe_btn: "Suscribirse",
        why_h3: "Señal, no ruido.",
        why_p: "Escanear noticias de salud e IA de cientos de publicaciones cada día es imposible. Sovereign examina decenas de fuentes con un motor de IA autónomo, elimina noticias similares y destila solo las señales de alto impacto.",
        you_h3: "Para ti.",
        you_p: "Si eres un VC, CIO de hospital, emprendedor de salud digital o ingeniero de IA clínica, quieres seguir el sector entre tu café matutino y tu cierre nocturno sin perderte nada. Sovereign es exactamente para eso.",
      },
      about: {
        breadcrumb_about: "Sobre nosotros",
        editorial_team: "e IA.",
        about_sovereign_desc: "Quién prepara Sovereign, cómo seleccionamos la señal, qué fuentes monitorizamos. Nuestros estándares editoriales y preguntas frecuentes.",
        contents: "Contenido",
        imprint: "Aviso legal",
        contact: "Contacto",
        real_info: "información real",
        imprint_section_title: "02 / Aviso legal",
        structure: "Estructura.",
        single_person_publication: "Sovereign es una publicación unipersonal. El escaneo, filtrado, redacción y publicación son realizados por inteligencia artificial; el marco y la lista de fuentes son determinados y mantenidos por una persona.",
        content_disclaimer: "El contenido no debe usarse como referencia única para decisiones. Se recomienda volver a la lista de fuentes al final de cada brief.",
        process: "Proceso.",
        process_steps: "Cada edición pasa por seis pasos. Todo el proceso es llevado a cabo por inteligencia artificial; el marco y la lista de fuentes son determinados por una persona.",
        monitored_sources: "Las publicaciones designadas se monitorizan las 24 horas. Revistas académicas, fuentes regulatorias, análisis sectoriales, bases de datos clínicas.",
        ai_deduplication: "La inteligencia artificial fusiona diferentes versiones de la misma noticia y copias superficiales.",
        contextualization: "Contextualización",
        story_context_eval: "Cada historia restante se evalúa junto con materiales previos relacionados.",
        writing: "Redacción",
        writing_structure: "Estructura estándar de cinco secciones: señal, contexto, impacto, reserva, seguimiento. Redactada por inteligencia artificial.",
        publication: "Publicación",
        publication_schedule: "El brief se publica automáticamente como edición de la mañana y de la tarde.",
        error_feedback: "Los informes de error de los lectores se tienen en cuenta en la actualización de la lista de fuentes.",
        sources_section_title: "04 / Fuentes monitorizadas",
        by_category: "Por categoría.",
        who_ich_announcements: "Anuncios de la OMS, ICH",
        sector_analyses: "Análisis sectoriales",
        clinical_research: "Investigación clínica",
        company_announcements: "Anuncios de empresas",
        public_filings: "Archivos públicos",
        official_press_releases: "Comunicados de prensa oficiales",
        faq_section_title: "05 / Preguntas frecuentes",
        who_writes_content: "¿Quién escribe el contenido?",
        ai_writing_process: "El escaneo, la redacción y la publicación son realizados por inteligencia artificial. La plantilla de formato y la lista de fuentes son mantenidas por una sola persona.",
        brief_as_reference: "¿Puedo usar el brief como referencia para decisiones?",
        brief_not_for_decision: "No. El brief es para fines de escaneo; no es una referencia única para decisiones de producto, clínicas o de inversión. Vuelva siempre a las publicaciones en la lista de fuentes al final del brief.",
        brief_scanning_tool: "Funciona como una herramienta de escaneo para ver hacia dónde mira el sector y qué está en la agenda. Ahorra tiempo al ojear cientos de titulares; pero no reemplaza a ninguno de ellos.",
        found_error: "Hay un error, ¿qué debo hacer?",
        error_report_procedure: "Contacte con la dirección en la sección de contacto. Cuando se informa de errores estructurales, la lista de fuentes se actualiza y las ediciones posteriores se ven afectadas.",
        where_to_see_sources: "¿Dónde puedo ver las fuentes?",
        contact_section_title: "06 / Contacto",
        single_contact_address: "Una sola dirección para preguntas, comentarios e informes de errores. Una publicación unipersonal — leo cada mensaje.",
        all_feedback_types: "Todo tipo de preguntas, comentarios, informes de errores.",
        source_list_actions: "Ver la lista de fuentes, abrir un problema, inspeccionar el código.",
        h1_prefix: "Una persona",
        h1_suffix: "No un equipo.",
      },
      footer: {
        col_brief: "Boletines", col_about: "Acerca", col_sub: "Suscripción",
        link_brief_today: "Resumen de hoy", link_brief_archive: "Archivo",
        link_brief_long: "Lecturas largas", link_brief_topics: "Temas",
        link_about_mission: "Misión y créditos", link_about_method: "Metodología",
        link_about_sources: "Fuentes monitoreadas", link_about_faq: "FAQ",
        
        link_sub_signup: "Suscribirse por correo",
        link_sub_contact: "Contacto",
        legal: "© 2025–2026 Sovereign · Todos los derechos reservados",
        legal_privacy: "Privacidad", legal_terms: "Términos", legal_imprint: "Aviso legal",
        intro: "Un motor experimental que escanea publicaciones, deduplica señales y produce un resumen diario.",
        sub_button: "Suscribirse",
      },
    },

    de: {
      brand: { tagline: "Tägliches Biotech- + KI-Briefing" },
      masthead: { lastupdate: "Zuletzt aktualisiert: 28. Mai 2026, 18:00" },
      nav: {
        home: "Start", briefs: "Briefings", about: "Über", subscribe: "Abonnement",
        settings: "Einstellungen", contact: "Kontakt",
        signin: "Anmelden", getbriefs: "Briefings erhalten →",
        admin_section: "Verwaltung",
        admin_panel: "Admin-Panel",
        logout: "Abmelden",
        today: "Heute", explore: "Entdecken",
        evening: "Abendausgabe", morning: "Morgenausgabe",
        archive: "Archiv", longreads: "Tiefenanalysen", topics: "Themen",
        mission: "Mission & Impressum", methodology: "Methodik",
        sources: "Quellen", faq: "Häufige Fragen",
      },
      lang: {
        tr: { name: "Türkçe", status: "Primär · live" },
        en: { name: "English", status: "Demnächst" },
        es: { name: "Español", status: "Demnächst" },
        de: { name: "Deutsch", status: "Demnächst" },
      },
      common: { open: "Öffnen →", read: "Lesen →", allarchive: "Gesamtes Archiv →", published: "LIVE" },
      modules: {
        briefs_desc: "Morgen- und Abendausgaben mit vollständigem Archiv.",
        long_desc: "Wöchentliche Tiefenanalyse, redaktionelle Synthese.",
        topics_desc: "Regulierung · Klinische KI · CRISPR · Wearables · Finanzierung.",
        team_desc: "Eine Einzelpublikation und KI — wer dahintersteht, wie es entsteht.",
        method_desc: "Der sechsstufige Produktionsprozess.",
        sources_desc: "Beobachtete Publikationen nach Kategorie.",
        subscribe_desc: "Trag dich in die Liste ein. Zweimal täglich neue Briefings direkt in dein Postfach.",
        faq_desc: "Grenzen, Fehler, Produktionsprozess.",
        contact_desc: "Feedback, Fehlermeldungen, Fragen.",
        title_briefs: "Briefings", title_long: "Tiefenanalysen", title_topics: "Themen",
        title_team: "Impressum", title_method: "Methodik", title_sources: "Quellen",
        title_subscribe: "Abonnement", title_faq: "FAQ", title_contact: "Kontakt",
      },
      dd: {
      },
      settings: {
        toc: "Bereiche",
        theme: "Thema", theme_desc: "Hell, dunkel oder Systemeinstellung.",
        density: "Dichte", density_desc: "Seitenabstände und Textkompaktheit.",
        accent: "Akzentfarbe", accent_desc: "Links, Hervorhebung und Schaltflächen.",
        light: "Hell", dark: "Dunkel", system: "System",
        compact: "Kompakt", standard: "Standard", comfy: "Geräumig",
        blue: "Blau", indigo: "Indigo", forest: "Grün", red: "Rot",
        email: "E-Mail", change: "Ändern",
        password: "Passwort", password_v: "Letzte Aktualisierung unbekannt", reset: "Zurücksetzen",
        export: "Datenexport", export_desc: "Leseverlauf, Einstellungen, Abonnementdaten.",
        download: "Herunterladen (JSON)",
        delete: "Konto löschen", delete_desc: "Alle Daten werden dauerhaft entfernt.",
        comfy: "Komfortabel",
        coming_soon: "Demnächst",
        dark: "Dunkel",
        forest: "Wald",
        indigo: "Indigo",
        red: "Rot",
        signed_out: "Noch nicht angemeldet",
        signed_out_desc: "Du musst dich anmelden, um die Kontoeinstellungen zu sehen.",
        standard: "Standard",
        system: "System",
      },
      landing: {
        hero_h1: "Sovereign — tägliches Biotech- & KI-Briefing.",
        hero_sub: "Eine experimentelle KI-Engine, die Publikationen scannt, Signale dedupliziert und in ein kurzes tägliches Briefing verwandelt.",
        cta_today: "Heutiges Briefing lesen",
        cta_subscribe: "Abonnement",
        modules_label: "Module",
        modules_h2: "Was Sovereign enthält.",
        latest_h2: "Letzte Ausgaben",
      },
      ayarlar: {
        title: "Einstellungen",
        dek: "Darstellung, Sprache, Benachrichtigungen und Kontoeinstellungen.",
        sec_lang: "Sprache",
        sec_lang_desc: "Sprache der Oberfläche. 4 Sprachen aktiv; deine Wahl wird in diesem Browser gespeichert. Briefing-Inhalte erscheinen aktuell nur auf Türkisch.",
        sec_view: "Darstellung",
        sec_view_desc: "Thema, Dichte und Akzentfarbe.",
        sec_notif: "Benachrichtigungen",
        sec_notif_desc: "Für E-Mail-Benachrichtigungen melde dich auf der Abonnement-Seite an. Browser-Benachrichtigungen folgen bald.",
        notif_signup_link: "→ Zur Abo-Seite",
        sec_acc: "Konto",
        sec_acc_desc: "Profilinformationen und Sicherheit.",
      },
      reader: {
        archive_title: "Briefing-Archiv",
        archive_meta: "2× TÄGLICH · MORGEN- & ABENDAUSGABEN",
        empty_title: "Noch keine Briefings veröffentlicht.",
        loading: "Briefings werden geladen…",
        load_error: "Daten konnten nicht geladen werden.",
        share_btn: "⤴ Teilen",
        download_btn: "⤓ Herunterladen",
        in_publication: "VERÖFFENTLICHT",
        long_read: "📖 Lange Lektüre →",
      },
      dashboard: {
        admin_only: "Diese Seite ist nur für Administratoren",
        admin_only_desc: "Du musst dich mit einem Admin-Konto anmelden, um Pipeline-Metriken einzusehen.",
        cfg_loading: "Wird geladen…",
        config_h2: "LLM- und Pipeline-Konfiguration",
        cron_loading: "Cron…",
        cron_pause: "Cron anhalten",
        cron_start: "Cron starten",
        crumb: "/ Pipeline",
        dek: "Live-Status von Sovereign — Newsletter-Zahlen, letzte Worker-Ticks, Cron-Konfiguration.",
        latest_h2: "Zuletzt veröffentlicht + stärkstes Signal der letzten 7 Tage",
        loading: "Wird geladen…",
        operational: "Betriebsbereit",
        run_now: "Jetzt auslösen",
        runs_h2: "Letzte Worker-Ticks",
        stat_articles: "Artikel gesamt",
        stat_articles_hint: "Scraping + Analyse",
        stat_newsletters: "Veröffentlichte Newsletter",
        stat_newsletters_hint: "Gesamtzeitraum",
        stat_pending: "Warten auf Freigabe",
        stat_pending_hint: "In der HITL-Warteschlange",
        stat_published: "Veröffentlichte Artikel",
        stat_published_hint: "Im Newsletter versendet",
        title: "Pipeline-Status.",
      },
      admin: {
        add_btn: "Hinzufügen",
        add_desc: "RSS-/Atom-Feed-URL. Sie wird nach dem Hinzufügen beim nächsten Worker-Tick gescannt.",
        add_h2: "Neue Quelle",
        admin_only: "Diese Seite ist nur für Administratoren",
        admin_only_desc: "Du musst dich mit einem Admin-Konto anmelden, um Quellen zu verwalten.",
        crumb: "/ Quellenverwaltung",
        dek: "Füge RSS/Atom-Quellen hinzu, deaktiviere oder lösche sie, die von Sovereign gescannt werden. Änderungen werden beim nächsten Worker-Tick wirksam.",
        list_desc: "Aktive Quellen werden beim nächsten Tick gescannt. Das Löschen kann nicht rückgängig gemacht werden.",
        list_h2: "Vorhandene Quellen",
        loading: "Wird geladen…",
        name_lbl: "Quellenname",
        quick_actions: "Schnellaktionen",
        quick_actions_desc: "Worker jetzt auslösen oder den automatischen Cron ein-/ausschalten.",
        run_now: "Jetzt auslösen",
        title: "Quellen.",
        url_lbl: "URL",
      },
      editorial: {
        back: "← Zurück zum Newsletter",
        generate: "Lange Analyse erstellen",
        generate_warn: "Die Erstellung dauert 1-2 Minuten und verbraucht die DeepSeek-API.",
        loading: "Wird geladen…",
        no_long_read: "Eine lange Lektüre wurde für diesen Newsletter noch nicht erstellt.",
        no_long_read_desc: "Der Admin kann eine tiefgehende Analyse für diesen Newsletter erstellen. Eine einmalige 1500-2000-Wörter-Analyse, die dann gecacht wird.",
      },
      subscribe: {
        email_lbl: "E-Mail",
        hero_dek: "Zweimal täglich, morgens und abends. Destilliertes Signal aus Gesundheitstechnologie und künstlicher Intelligenz — direkt in dein Postfach.",
        hero_h1_a: "Sovereign Briefs",
        hero_h1_b: "abonnieren.",
        how_h3: "Wie es funktioniert.",
        how_p: "Aus RSS gescrapte Nachrichten durchlaufen einen embedding-basierten Ähnlichkeitsfilter, werden dann von DeepSeek-v4-pro analysiert und mit einem Wirkungs-Score von 1-10 bewertet. Diejenigen, die den Schwellenwert überschreiten, gelangen nach redaktioneller Prüfung in den Newsletter.",
        manifesto_label: "Warum Sovereign",
        privacy_note: "KVKK/DSGVO-konform. Du kannst dich jederzeit mit einem Klick abmelden. Kein Spam, deine E-Mail wird nicht weitergegeben.",
        subscribe_btn: "Abonnieren",
        why_h3: "Signal, kein Rauschen.",
        why_p: "Es ist unmöglich, jeden Tag Gesundheits-KI-Nachrichten aus Hunderten von Publikationen zu scannen. Sovereign durchsucht mit einer autonomen KI-Engine Dutzende von Quellen, filtert ähnliche Nachrichten heraus und destilliert nur die Signale mit hohem Wirkungsgrad.",
        you_h3: "Für dich.",
        you_p: "Wenn du ein VC, Krankenhaus-CIO, Digital-Health-Unternehmer oder klinischer KI-Ingenieur bist, möchtest du die Branche zwischen deinem Morgenkaffee und dem Feierabend verfolgen, ohne etwas zu verpassen. Genau dafür ist Sovereign da.",
      },
      about: {
        breadcrumb_about: "Über uns",
        editorial_team: "und KI.",
        about_sovereign_desc: "Wer bereitet Sovereign vor, wie wählen wir das Signal aus, welche Quellen verfolgen wir. Unsere redaktionellen Standards und häufig gestellte Fragen.",
        contents: "Inhalt",
        imprint: "Impressum",
        contact: "Kontakt",
        real_info: "echte Information",
        imprint_section_title: "02 / Impressum",
        structure: "Struktur.",
        single_person_publication: "Sovereign ist eine Ein-Personen-Publikation. Scannen, Filtern, Schreiben und Veröffentlichen erfolgen durch künstliche Intelligenz; Rahmen und Quellenliste werden von einem Menschen festgelegt und gepflegt.",
        content_disclaimer: "Der Inhalt sollte nicht als alleinige Entscheidungsreferenz verwendet werden. Es wird empfohlen, auf die Quellenliste am Ende jedes Briefings zurückzugreifen.",
        process: "Prozess.",
        process_steps: "Jede Ausgabe durchläuft sechs Schritte. Der gesamte Prozess wird von künstlicher Intelligenz ausgeführt; Rahmen und Quellenliste werden von einem Menschen festgelegt.",
        monitored_sources: "Die festgelegten Publikationen werden rund um die Uhr verfolgt. Akademische Zeitschriften, regulatorische Quellen, Branchenanalysen, klinische Datenbanken.",
        ai_deduplication: "Die künstliche Intelligenz führt verschiedene Versionen derselben Nachricht und oberflächliche Kopien zusammen.",
        contextualization: "Kontextualisierung",
        story_context_eval: "Jede verbleibende Geschichte wird zusammen mit verwandten früheren Materialien bewertet.",
        writing: "Schreiben",
        writing_structure: "Standardmäßige Fünf-Abschnitte-Struktur: Signal, Kontext, Auswirkung, Vorbehalt, Nachverfolgung. Verfasst von künstlicher Intelligenz.",
        publication: "Veröffentlichung",
        publication_schedule: "Das Briefing wird automatisch als Morgen- und Abendausgabe veröffentlicht.",
        error_feedback: "Fehlermeldungen von Lesern werden bei der Aktualisierung der Quellenliste berücksichtigt.",
        sources_section_title: "04 / Überwachte Quellen",
        by_category: "Nach Kategorie.",
        who_ich_announcements: "WHO-, ICH-Ankündigungen",
        sector_analyses: "Branchenanalysen",
        clinical_research: "Klinische Forschung",
        company_announcements: "Unternehmensankündigungen",
        public_filings: "Öffentliche Einreichungen",
        official_press_releases: "Offizielle Pressemitteilungen",
        faq_section_title: "05 / Häufig gefragt",
        who_writes_content: "Wer schreibt den Inhalt?",
        ai_writing_process: "Scannen, Schreiben und Veröffentlichen erfolgen durch künstliche Intelligenz. Formatvorlage und Quellenliste werden von einer einzigen Person gepflegt.",
        brief_as_reference: "Kann ich das Briefing als Entscheidungsreferenz verwenden?",
        brief_not_for_decision: "Nein. Das Briefing dient zu Scan-Zwecken; es ist keine alleinige Referenz für Produkt-, klinische oder Investitionsentscheidungen. Kehren Sie immer zu den Publikationen in der Quellenliste am Ende des Briefings zurück.",
        brief_scanning_tool: "Es dient als Scan-Tool, um zu sehen, wohin die Branche blickt und was auf der Agenda steht. Es spart Zeit, indem es Hunderte von Überschriften überfliegt; ersetzt aber keine davon.",
        found_error: "Es gibt einen Fehler, was soll ich tun?",
        error_report_procedure: "Kontaktieren Sie die Adresse im Kontaktbereich. Wenn strukturelle Fehler gemeldet werden, wird die Quellenliste aktualisiert und nachfolgende Ausgaben sind betroffen.",
        where_to_see_sources: "Wo kann ich die Quellen einsehen?",
        contact_section_title: "06 / Kontakt",
        single_contact_address: "Eine einzige Adresse für Fragen, Feedback und Fehlermeldungen. Eine Ein-Personen-Publikation — ich lese jede Nachricht.",
        all_feedback_types: "Alle Arten von Fragen, Feedback, Fehlermeldungen.",
        source_list_actions: "Quellenliste einsehen, ein Problem eröffnen, Code einsehen.",
        h1_prefix: "Eine Person",
        h1_suffix: "Kein Team.",
      },
      footer: {
        col_brief: "Briefings", col_about: "Über", col_sub: "Abonnement",
        link_brief_today: "Heutiges Briefing", link_brief_archive: "Archiv",
        link_brief_long: "Tiefenanalysen", link_brief_topics: "Themen",
        link_about_mission: "Mission & Impressum", link_about_method: "Methodik",
        link_about_sources: "Beobachtete Quellen", link_about_faq: "FAQ",
        
        link_sub_signup: "Per E-Mail abonnieren",
        link_sub_contact: "Kontakt",
        legal: "© 2025–2026 Sovereign · Alle Rechte vorbehalten",
        legal_privacy: "Datenschutz", legal_terms: "Bedingungen", legal_imprint: "Impressum",
        intro: "Eine experimentelle Engine, die Publikationen scannt, Signale dedupliziert und ein tägliches Briefing erzeugt.",
        sub_button: "Abonnieren",
      },
    },
  };

  function get(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
  }

  // Eksik anahtarları bir kez logla, spam etmesin
  const _warnedMissing = new Set();

  function warnMissing(key, lang) {
    const id = `${lang}::${key}`;
    if (_warnedMissing.has(id)) return;
    _warnedMissing.add(id);
    console.warn(`[i18n] eksik anahtar (${lang}): "${key}"`);
  }

  function resolveValue(key, lang) {
    // 1) Hedef dilde dene
    const target = get(T[lang] || {}, key);
    if (typeof target === 'string') return { value: target, lang };
    // 2) TR'ye fallback (kaynak dil)
    if (lang !== 'tr') {
      const tr = get(T.tr || {}, key);
      if (typeof tr === 'string') {
        warnMissing(key, lang);
        return { value: tr, lang: 'tr', fallback: true };
      }
    }
    // 3) Hiçbiri yok — anahtarı kendisini döndür ki en azından bir şey görünsün
    warnMissing(key, lang);
    return { value: null, lang: 'tr', missing: true };
  }

  function isDebug() {
    return location.search.indexOf('i18n=debug') >= 0;
  }

  function applyTo(el, key, lang) {
    const res = resolveValue(key, lang);
    if (res.value != null) {
      el.textContent = res.value;
    }
    el.classList.remove('i18n-fallback', 'i18n-missing');
    if (isDebug()) {
      if (res.missing) el.classList.add('i18n-missing');
      else if (res.fallback) el.classList.add('i18n-fallback');
    }
  }

  function applyAttr(el, attr, key, lang) {
    const res = resolveValue(key, lang);
    if (res.value != null) {
      el.setAttribute(attr, res.value);
    }
  }

  function injectDebugStyle() {
    if (document.getElementById('i18n-debug-style')) return;
    const s = document.createElement('style');
    s.id = 'i18n-debug-style';
    s.textContent = `
.i18n-fallback { outline: 2px dashed #fbbf24 !important; outline-offset: 1px; }
.i18n-missing  { outline: 2px solid  #ef4444 !important; outline-offset: 1px; background: rgba(239,68,68,.08) !important; }
.i18n-untagged { outline: 2px dotted #ec4899 !important; outline-offset: 1px; }
.i18n-debug-banner {
  position: fixed; bottom: 16px; right: 16px; z-index: 99999;
  background: #1f2328; color: #fff; padding: 10px 14px; border-radius: 8px;
  font: 12px ui-monospace,monospace; max-width: 360px; line-height: 1.4;
  box-shadow: 0 8px 24px rgba(0,0,0,.3);
}
`;
    document.head.appendChild(s);
  }

  function translateAll(lang) {
    if (isDebug()) injectDebugStyle();
    const safeLang = T[lang] ? lang : 'tr';
    document.documentElement.lang = safeLang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      applyTo(el, key, safeLang);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) applyAttr(el, attr, key, safeLang);
      });
    });

    // Dil seçici label'ları
    const dict = T[safeLang] || T.tr;
    document.querySelectorAll('.lang-option[data-lang], .lang-pick[data-lang-pick]').forEach(el => {
      const code = el.dataset.lang || el.dataset.langPick;
      const info = dict.lang?.[code];
      if (info) {
        const bEl = el.querySelector('b, .lname');
        const sEl = el.querySelector('span:last-child, .lstatus');
        if (bEl) bEl.textContent = info.name;
        if (sEl) sEl.textContent = info.status;
      }
    });

    if (isDebug()) {
      auditUntagged();
      updateDebugBanner();
    }

    // Custom event — diğer scriptler dinleyip dinamik içeriği güncelleyebilir
    document.dispatchEvent(new CustomEvent('i18n:applied', { detail: { lang: safeLang } }));
  }

  // ── Otomatik dinamik içerik çevirisi ─────────────────────────────────────
  // JS ile sonradan eklenen [data-i18n] node'ları yakalayıp çevirir.
  let _observer = null;
  function startObserver() {
    if (_observer) return;
    _observer = new MutationObserver((mutations) => {
      const lang = localStorage.getItem('sov_lang') || 'tr';
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.hasAttribute && node.hasAttribute('data-i18n')) {
            applyTo(node, node.getAttribute('data-i18n'), lang);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('[data-i18n]').forEach(el => {
              applyTo(el, el.getAttribute('data-i18n'), lang);
            });
            node.querySelectorAll('[data-i18n-attr]').forEach(el => {
              const spec = el.getAttribute('data-i18n-attr');
              spec.split(',').forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key) applyAttr(el, attr, key, lang);
              });
            });
            if (isDebug()) auditUntagged();
          }
        });
      }
      if (isDebug()) updateDebugBanner();
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // ── Debug: data-i18n'siz görünür Türkçe text node'ları işaretle ────────
  const TR_CHAR_RX = /[ığüşöçİĞÜŞÖÇ]/;
  function auditUntagged() {
    const walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_TEXT,
      {
        acceptNode(n) {
          const t = (n.nodeValue || '').trim();
          if (t.length < 2) return NodeFilter.FILTER_REJECT;
          if (!TR_CHAR_RX.test(t)) return NodeFilter.FILTER_REJECT;
          let p = n.parentElement;
          while (p) {
            const tag = p.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
            if (p.hasAttribute('data-i18n')) return NodeFilter.FILTER_REJECT;
            if (p.classList && p.classList.contains('i18n-ignore')) return NodeFilter.FILTER_REJECT;
            p = p.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let n, count = 0;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (p) p.classList.add('i18n-untagged');
      count++;
    }
    window._i18nUntagged = count;
  }
  function updateDebugBanner() {
    let b = document.getElementById('i18n-debug-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'i18n-debug-banner';
      b.className = 'i18n-debug-banner';
      document.body.appendChild(b);
    }
    const missing = _warnedMissing.size;
    const untagged = window._i18nUntagged || 0;
    b.innerHTML =
      `<b>i18n debug</b><br>` +
      `kırmızı: eksik anahtar (${missing})<br>` +
      `sarı: TR fallback<br>` +
      `pembe: data-i18n yok (${untagged})`;
  }

  window.sovereignI18n = { T, translateAll, get, resolveValue };
})();
