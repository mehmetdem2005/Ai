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
        subscribe_desc: "Ücretsiz, Pro ve Kurumsal planlar.",
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
        evening_desc: "En son yayınlanan brief",
        morning_desc: "Günün ilk taraması",
        archive_desc: "Tüm geçmiş edisyonlar",
        longreads_desc: "Haftalık derinlemesine",
        topics_desc: "Regulasyon · Klinik AI · CRISPR",
        mission_desc: "Sovereign'i kim hazırlıyor",
        method_desc: "Brief nasıl üretiliyor",
        sources_desc: "İzlenen yayın kategorileri",
        faq_desc: "Sınırlar, hatalar, iletişim",
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
        morning_n: "Sabah edisyonu",
        morning_n_desc: "Yayınlandığında e-posta gönderilsin.",
        evening_n: "Akşam edisyonu",
        evening_n_desc: "Yayınlandığında e-posta gönderilsin.",
        long_n: "Uzun okuma",
        long_n_desc: "Haftalık derinlemesine analiz yayınlandığında.",
        product_n: "Ürün duyuruları",
        product_n_desc: "Yeni özellik ve önemli değişiklikler.",
        current_plan: "Mevcut plan",
        current_plan_v: "Brief — Ücretsiz",
        upgrade: "Yükselt",
        payment: "Ödeme yöntemi",
        payment_v: "Henüz eklenmedi",
        add: "Ekle",
        billing: "Fatura geçmişi",
        billing_v: "Aktif fatura yok.",
        view: "Görüntüle",
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
        delete_btn: "Sil",
      },
      landing: {
        hero_h1: "Sovereign — günlük biyoteknoloji & yapay zekâ brief'i.",
        hero_sub: "Yayınları tarayan, tekrarları eleyen, sade bir Türkçe brief'e dönüştüren deneysel bir yapay zekâ motoru.",
        cta_today: "Bugünün brief'ini oku",
        cta_subscribe: "Abonelik",
        today_label: "28 Mayıs · Akşam edisyonu",
        today_title: "Bugünkü brief — en son taramadan damıtılmış başlık.",
        modules_label: "Modüller",
        modules_h2: "Sovereign'de neler var.",
        latest_h2: "Son edisyonlar",
      },
      ayarlar: {
        title: "Ayarlar",
        dek: "Görünüm, dil, bildirimler ve hesap tercihleri.",
        sec_lang: "Dil",
        sec_lang_desc: "Arayüz dili. Brief içeriği için çeviri yol haritasında.",
        sec_view: "Görünüm",
        sec_view_desc: "Tema, yoğunluk ve aksan rengi.",
        sec_notif: "Bildirimler",
        sec_notif_desc: "Yeni brief geldiğinde nasıl haber almak istersiniz.",
        sec_sub: "Abonelik",
        sec_sub_desc: "Mevcut plan ve faturalama bilgileriniz.",
        sec_acc: "Hesap",
        sec_acc_desc: "Profil bilgileri ve güvenlik.",
      },
      reader: {
        archive_title: "Bülten arşivi",
        archive_meta: "GÜNDE 2× · SABAH & AKŞAM EDİSYONLARI",
        chip_all: "Tümü",
        chip_7d: "7 gün",
        chip_30d: "30 gün",
        chip_regulation: "Regülasyon",
        chip_clinical_ai: "Klinik AI",
        chip_crispr: "CRISPR",
        empty_title: "Henüz bülten üretilmedi.",
        loading: "Bültenler yükleniyor…",
        load_error: "Veri yüklenemedi.",
        share_btn: "⤴ Paylaş",
        download_btn: "⤓ İndir",
        in_publication: "YAYINDA",
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
        link_sub_free: "Ücretsiz",
        link_sub_pro: "Premium",
        link_sub_team: "Kurumsal",
        link_sub_contact: "İletişim",
        legal: "© 2025–2026 Sovereign · Tüm hakları saklıdır",
        legal_privacy: "Gizlilik",
        legal_terms: "Kullanım koşulları",
        legal_imprint: "Künye",
        intro: "Yayınları tarayan, tekrarları eleyen ve Türkçe bir brief'e dönüştüren deneysel bir motor.",
        sub_placeholder: "adres@şirket.com",
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
        subscribe_desc: "Free, Pro and Enterprise plans.",
        faq_desc: "Limits, errors, content production process.",
        contact_desc: "Feedback, error reports, questions.",
        title_briefs: "Briefs", title_long: "Long reads", title_topics: "Topic clusters",
        title_team: "Masthead", title_method: "Methodology", title_sources: "Sources",
        title_subscribe: "Subscribe", title_faq: "FAQ", title_contact: "Contact",
      },
      dd: {
        evening_desc: "Latest published brief",
        morning_desc: "First scan of the day",
        archive_desc: "All past editions",
        longreads_desc: "Weekly deep-dive",
        topics_desc: "Regulatory · Clinical AI · CRISPR",
        mission_desc: "Who runs Sovereign",
        method_desc: "How the brief is produced",
        sources_desc: "Tracked publication categories",
        faq_desc: "Limits, errors, contact",
      },
      settings: {
        toc: "Sections",
        theme: "Theme", theme_desc: "Light, dark or system preference.",
        density: "Density", density_desc: "Page spacing and text compactness.",
        accent: "Accent color", accent_desc: "Link, emphasis and button colors.",
        light: "Light", dark: "Dark", system: "System",
        compact: "Compact", standard: "Standard", comfy: "Roomy",
        blue: "Blue", indigo: "Indigo", forest: "Forest", red: "Red",
        morning_n: "Morning edition", morning_n_desc: "Email me when published.",
        evening_n: "Evening edition", evening_n_desc: "Email me when published.",
        long_n: "Long reads", long_n_desc: "Email me when a weekly long-read drops.",
        product_n: "Product updates", product_n_desc: "New features and important changes.",
        current_plan: "Current plan", current_plan_v: "Brief — Free",
        upgrade: "Upgrade",
        payment: "Payment method", payment_v: "None added yet", add: "Add",
        billing: "Billing history", billing_v: "No active invoices.", view: "View",
        email: "Email", change: "Change",
        password: "Password", password_v: "Last update unknown", reset: "Reset",
        export: "Data export", export_desc: "Reading history, settings, subscription data.",
        download: "Download (JSON)",
        delete: "Delete account", delete_desc: "All data is permanently removed.",
        delete_btn: "Delete",
      },
      landing: {
        hero_h1: "Sovereign — daily biotech & AI brief.",
        hero_sub: "An experimental AI engine that scans publications, dedupes signal, and turns it into a concise daily brief.",
        cta_today: "Read today's brief",
        cta_subscribe: "Subscribe",
        today_label: "May 28 · Evening edition",
        today_title: "Today's brief — distilled from the latest scan.",
        modules_label: "Modules",
        modules_h2: "What's in Sovereign.",
        latest_h2: "Latest editions",
      },
      ayarlar: {
        title: "Settings",
        dek: "Appearance, language, notifications and account preferences.",
        sec_lang: "Language",
        sec_lang_desc: "Interface language. Brief content translation is on the roadmap.",
        sec_view: "Appearance",
        sec_view_desc: "Theme, density and accent color.",
        sec_notif: "Notifications",
        sec_notif_desc: "How you want to hear about new briefs.",
        sec_sub: "Subscription",
        sec_sub_desc: "Your current plan and billing information.",
        sec_acc: "Account",
        sec_acc_desc: "Profile information and security.",
      },
      reader: {
        archive_title: "Brief archive",
        archive_meta: "TWICE DAILY · MORNING & EVENING EDITIONS",
        chip_all: "All",
        chip_7d: "7 days",
        chip_30d: "30 days",
        chip_regulation: "Regulation",
        chip_clinical_ai: "Clinical AI",
        chip_crispr: "CRISPR",
        empty_title: "No briefs published yet.",
        loading: "Loading briefs…",
        load_error: "Could not load data.",
        share_btn: "⤴ Share",
        download_btn: "⤓ Download",
        in_publication: "PUBLISHED",
      },
      footer: {
        col_brief: "Briefs", col_about: "About", col_sub: "Subscribe",
        link_brief_today: "Today's brief", link_brief_archive: "Archive",
        link_brief_long: "Long reads", link_brief_topics: "Topic clusters",
        link_about_mission: "Mission & masthead", link_about_method: "Methodology",
        link_about_sources: "Tracked sources", link_about_faq: "FAQ",
        link_sub_free: "Free", link_sub_pro: "Premium", link_sub_team: "Enterprise",
        link_sub_contact: "Contact",
        legal: "© 2025–2026 Sovereign · All rights reserved",
        legal_privacy: "Privacy", legal_terms: "Terms", legal_imprint: "Imprint",
        intro: "An experimental engine that scans publications, dedupes signal and turns it into a daily brief.",
        sub_placeholder: "you@company.com",
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
        subscribe_desc: "Planes Gratis, Pro y Empresa.",
        faq_desc: "Límites, errores, proceso de producción.",
        contact_desc: "Comentarios, informes de errores, preguntas.",
        title_briefs: "Boletines", title_long: "Lecturas largas", title_topics: "Temas",
        title_team: "Créditos", title_method: "Metodología", title_sources: "Fuentes",
        title_subscribe: "Suscripción", title_faq: "FAQ", title_contact: "Contacto",
      },
      dd: {
        evening_desc: "Último boletín publicado",
        morning_desc: "Primer escaneo del día",
        archive_desc: "Todas las ediciones pasadas",
        longreads_desc: "Análisis semanal en profundidad",
        topics_desc: "Regulación · IA clínica · CRISPR",
        mission_desc: "Quién gestiona Sovereign",
        method_desc: "Cómo se produce el boletín",
        sources_desc: "Categorías de publicaciones",
        faq_desc: "Límites, errores, contacto",
      },
      settings: {
        toc: "Secciones",
        theme: "Tema", theme_desc: "Claro, oscuro o preferencia del sistema.",
        density: "Densidad", density_desc: "Espaciado de página y compacidad del texto.",
        accent: "Color de acento", accent_desc: "Enlaces, énfasis y colores de botones.",
        light: "Claro", dark: "Oscuro", system: "Sistema",
        compact: "Compacto", standard: "Estándar", comfy: "Espacioso",
        blue: "Azul", indigo: "Índigo", forest: "Verde", red: "Rojo",
        morning_n: "Edición de la mañana", morning_n_desc: "Avísame por correo al publicar.",
        evening_n: "Edición de la tarde", evening_n_desc: "Avísame por correo al publicar.",
        long_n: "Lecturas largas", long_n_desc: "Avísame cuando salga una lectura larga.",
        product_n: "Actualizaciones del producto", product_n_desc: "Nuevas funciones y cambios importantes.",
        current_plan: "Plan actual", current_plan_v: "Brief — Gratis",
        upgrade: "Mejorar",
        payment: "Método de pago", payment_v: "Ninguno añadido", add: "Añadir",
        billing: "Historial de facturas", billing_v: "Sin facturas activas.", view: "Ver",
        email: "Correo electrónico", change: "Cambiar",
        password: "Contraseña", password_v: "Última actualización desconocida", reset: "Restablecer",
        export: "Exportar datos", export_desc: "Historial de lectura, ajustes, datos de suscripción.",
        download: "Descargar (JSON)",
        delete: "Eliminar cuenta", delete_desc: "Todos los datos se eliminan permanentemente.",
        delete_btn: "Eliminar",
      },
      landing: {
        hero_h1: "Sovereign — resumen diario de biotecnología e IA.",
        hero_sub: "Un motor de IA experimental que escanea publicaciones, deduplica señales y las convierte en un breve resumen diario.",
        cta_today: "Leer el resumen de hoy",
        cta_subscribe: "Suscripción",
        today_label: "28 may · Edición de la tarde",
        today_title: "Resumen de hoy — destilado del último escaneo.",
        modules_label: "Módulos",
        modules_h2: "Qué hay en Sovereign.",
        latest_h2: "Últimas ediciones",
      },
      ayarlar: {
        title: "Ajustes",
        dek: "Apariencia, idioma, notificaciones y preferencias de cuenta.",
        sec_lang: "Idioma",
        sec_lang_desc: "Idioma de la interfaz. Traducción del contenido en hoja de ruta.",
        sec_view: "Apariencia",
        sec_view_desc: "Tema, densidad y color de acento.",
        sec_notif: "Notificaciones",
        sec_notif_desc: "Cómo quieres enterarte de los nuevos boletines.",
        sec_sub: "Suscripción",
        sec_sub_desc: "Tu plan actual e información de facturación.",
        sec_acc: "Cuenta",
        sec_acc_desc: "Información de perfil y seguridad.",
      },
      reader: {
        archive_title: "Archivo de boletines",
        archive_meta: "DOS VECES AL DÍA · EDICIONES MAÑANA Y NOCHE",
        chip_all: "Todos",
        chip_7d: "7 días",
        chip_30d: "30 días",
        chip_regulation: "Regulación",
        chip_clinical_ai: "IA Clínica",
        chip_crispr: "CRISPR",
        empty_title: "Aún no hay boletines publicados.",
        loading: "Cargando boletines…",
        load_error: "No se pudieron cargar los datos.",
        share_btn: "⤴ Compartir",
        download_btn: "⤓ Descargar",
        in_publication: "PUBLICADO",
      },
      footer: {
        col_brief: "Boletines", col_about: "Acerca", col_sub: "Suscripción",
        link_brief_today: "Resumen de hoy", link_brief_archive: "Archivo",
        link_brief_long: "Lecturas largas", link_brief_topics: "Temas",
        link_about_mission: "Misión y créditos", link_about_method: "Metodología",
        link_about_sources: "Fuentes monitoreadas", link_about_faq: "FAQ",
        link_sub_free: "Gratis", link_sub_pro: "Premium", link_sub_team: "Empresa",
        link_sub_contact: "Contacto",
        legal: "© 2025–2026 Sovereign · Todos los derechos reservados",
        legal_privacy: "Privacidad", legal_terms: "Términos", legal_imprint: "Aviso legal",
        intro: "Un motor experimental que escanea publicaciones, deduplica señales y produce un resumen diario.",
        sub_placeholder: "tu@empresa.com",
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
        subscribe_desc: "Kostenlos-, Pro- und Unternehmenstarife.",
        faq_desc: "Grenzen, Fehler, Produktionsprozess.",
        contact_desc: "Feedback, Fehlermeldungen, Fragen.",
        title_briefs: "Briefings", title_long: "Tiefenanalysen", title_topics: "Themen",
        title_team: "Impressum", title_method: "Methodik", title_sources: "Quellen",
        title_subscribe: "Abonnement", title_faq: "FAQ", title_contact: "Kontakt",
      },
      dd: {
        evening_desc: "Zuletzt veröffentlichtes Briefing",
        morning_desc: "Erster Scan des Tages",
        archive_desc: "Alle vergangenen Ausgaben",
        longreads_desc: "Wöchentliche Tiefenanalyse",
        topics_desc: "Regulierung · Klinische KI · CRISPR",
        mission_desc: "Wer Sovereign betreibt",
        method_desc: "Wie das Briefing entsteht",
        sources_desc: "Kategorien beobachteter Publikationen",
        faq_desc: "Grenzen, Fehler, Kontakt",
      },
      settings: {
        toc: "Bereiche",
        theme: "Thema", theme_desc: "Hell, dunkel oder Systemeinstellung.",
        density: "Dichte", density_desc: "Seitenabstände und Textkompaktheit.",
        accent: "Akzentfarbe", accent_desc: "Links, Hervorhebung und Schaltflächen.",
        light: "Hell", dark: "Dunkel", system: "System",
        compact: "Kompakt", standard: "Standard", comfy: "Geräumig",
        blue: "Blau", indigo: "Indigo", forest: "Grün", red: "Rot",
        morning_n: "Morgenausgabe", morning_n_desc: "Bei Veröffentlichung per E-Mail benachrichtigen.",
        evening_n: "Abendausgabe", evening_n_desc: "Bei Veröffentlichung per E-Mail benachrichtigen.",
        long_n: "Tiefenanalysen", long_n_desc: "Bei wöchentlicher Tiefenanalyse benachrichtigen.",
        product_n: "Produkt-Updates", product_n_desc: "Neue Funktionen und wichtige Änderungen.",
        current_plan: "Aktueller Tarif", current_plan_v: "Brief — Kostenlos",
        upgrade: "Upgrade",
        payment: "Zahlungsmethode", payment_v: "Noch keine hinzugefügt", add: "Hinzufügen",
        billing: "Rechnungsverlauf", billing_v: "Keine aktiven Rechnungen.", view: "Anzeigen",
        email: "E-Mail", change: "Ändern",
        password: "Passwort", password_v: "Letzte Aktualisierung unbekannt", reset: "Zurücksetzen",
        export: "Datenexport", export_desc: "Leseverlauf, Einstellungen, Abonnementdaten.",
        download: "Herunterladen (JSON)",
        delete: "Konto löschen", delete_desc: "Alle Daten werden dauerhaft entfernt.",
        delete_btn: "Löschen",
      },
      landing: {
        hero_h1: "Sovereign — tägliches Biotech- & KI-Briefing.",
        hero_sub: "Eine experimentelle KI-Engine, die Publikationen scannt, Signale dedupliziert und in ein kurzes tägliches Briefing verwandelt.",
        cta_today: "Heutiges Briefing lesen",
        cta_subscribe: "Abonnement",
        today_label: "28. Mai · Abendausgabe",
        today_title: "Heutiges Briefing — aus dem aktuellen Scan destilliert.",
        modules_label: "Module",
        modules_h2: "Was Sovereign enthält.",
        latest_h2: "Letzte Ausgaben",
      },
      ayarlar: {
        title: "Einstellungen",
        dek: "Darstellung, Sprache, Benachrichtigungen und Kontoeinstellungen.",
        sec_lang: "Sprache",
        sec_lang_desc: "Sprache der Oberfläche. Inhaltsübersetzung steht auf der Roadmap.",
        sec_view: "Darstellung",
        sec_view_desc: "Thema, Dichte und Akzentfarbe.",
        sec_notif: "Benachrichtigungen",
        sec_notif_desc: "Wie Sie über neue Briefings informiert werden möchten.",
        sec_sub: "Abonnement",
        sec_sub_desc: "Aktueller Tarif und Rechnungsinformationen.",
        sec_acc: "Konto",
        sec_acc_desc: "Profilinformationen und Sicherheit.",
      },
      reader: {
        archive_title: "Briefing-Archiv",
        archive_meta: "2× TÄGLICH · MORGEN- & ABENDAUSGABEN",
        chip_all: "Alle",
        chip_7d: "7 Tage",
        chip_30d: "30 Tage",
        chip_regulation: "Regulierung",
        chip_clinical_ai: "Klinische KI",
        chip_crispr: "CRISPR",
        empty_title: "Noch keine Briefings veröffentlicht.",
        loading: "Briefings werden geladen…",
        load_error: "Daten konnten nicht geladen werden.",
        share_btn: "⤴ Teilen",
        download_btn: "⤓ Herunterladen",
        in_publication: "VERÖFFENTLICHT",
      },
      footer: {
        col_brief: "Briefings", col_about: "Über", col_sub: "Abonnement",
        link_brief_today: "Heutiges Briefing", link_brief_archive: "Archiv",
        link_brief_long: "Tiefenanalysen", link_brief_topics: "Themen",
        link_about_mission: "Mission & Impressum", link_about_method: "Methodik",
        link_about_sources: "Beobachtete Quellen", link_about_faq: "FAQ",
        link_sub_free: "Kostenlos", link_sub_pro: "Premium", link_sub_team: "Unternehmen",
        link_sub_contact: "Kontakt",
        legal: "© 2025–2026 Sovereign · Alle Rechte vorbehalten",
        legal_privacy: "Datenschutz", legal_terms: "Bedingungen", legal_imprint: "Impressum",
        intro: "Eine experimentelle Engine, die Publikationen scannt, Signale dedupliziert und ein tägliches Briefing erzeugt.",
        sub_placeholder: "sie@firma.com",
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
