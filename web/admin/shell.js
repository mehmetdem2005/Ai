(function () {
  const SUPABASE_URL = "__SUPABASE_URL__";
  const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

  const ROUTES = {
    overview:    { label: "Özet" },
    newsletters: { label: "Bültenler",       parent: "İçerik" },
    articles:    { label: "Makaleler",       parent: "İçerik" },
    cms:         { label: "Site metinleri",  parent: "İçerik" },
    sources:     { label: "Kaynaklar",       parent: "Kaynak & İşlem" },
    cron:        { label: "Cron & worker",   parent: "Kaynak & İşlem" },
    users:       { label: "Pro kullanıcılar", parent: "Kullanıcı" },
    iam:         { label: "Erişim & roller", parent: "Kullanıcı" },
    audit:       { label: "Audit log",       parent: "Sistem" },
    settings:    { label: "Ayarlar",          parent: "Sistem" },
  };

  const Admin = window.Admin = window.Admin || {};
  Admin.routes = ROUTES;
  Admin.modules = {};
  Admin.register = function (name, mod) { Admin.modules[name] = mod; };

  let activeRoute = null;
  let activeUnmount = null;

  function bounce() { location.replace("/"); }

  function parseHash() {
    const raw = (location.hash || "#/overview").replace(/^#\/?/, "");
    const [name] = raw.split("/");
    return ROUTES[name] ? name : "overview";
  }

  function renderCrumbs(name) {
    const r = ROUTES[name];
    const crumbs = document.getElementById("crumbs");
    if (!crumbs) return;
    const parts = [`<a href="#/overview">Admin</a>`];
    if (r.parent) parts.push(`<span class="sep">/</span><span>${r.parent}</span>`);
    parts.push(`<span class="sep">/</span><span class="current">${r.label}</span>`);
    crumbs.innerHTML = parts.join(" ");
  }
  Admin.setCrumb = function (extra) {
    const r = ROUTES[activeRoute];
    if (!r) return;
    const crumbs = document.getElementById("crumbs");
    if (!crumbs) return;
    const parts = [`<a href="#/overview">Admin</a>`];
    if (r.parent) parts.push(`<span class="sep">/</span><span>${r.parent}</span>`);
    parts.push(`<span class="sep">/</span><a href="#/${activeRoute}">${r.label}</a>`);
    if (extra) parts.push(`<span class="sep">/</span><span class="current">${extra}</span>`);
    crumbs.innerHTML = parts.join(" ");
  };

  function mountRoute(name) {
    if (activeUnmount) { try { activeUnmount(); } catch {} activeUnmount = null; }
    document.querySelectorAll(".route").forEach(el => { el.hidden = el.dataset.route !== name; });
    document.querySelectorAll(".sb-item").forEach(el => { el.classList.toggle("active", el.dataset.route === name); });
    activeRoute = name;
    renderCrumbs(name);
    document.title = `Sovereign · ${ROUTES[name].label}`;

    const section = document.querySelector(`.route[data-route="${name}"]`);
    if (!section) return;
    const mod = Admin.modules[name];
    if (mod && typeof mod.mount === "function") {
      try {
        const ret = mod.mount(section, Admin.ctx);
        if (typeof ret === "function") activeUnmount = ret;
        else if (ret && typeof ret.unmount === "function") activeUnmount = ret.unmount.bind(ret);
      } catch (e) {
        Admin.state?.render(section, { error: e });
      }
    }
    document.querySelector(".content")?.scrollTo(0, 0);
  }

  function bindShellEvents() {
    document.getElementById("sbCollapse")?.addEventListener("click", () => {
      const app = document.getElementById("adminApp");
      app.classList.toggle("sb-collapsed");
      localStorage.setItem("admin_sb_collapsed", app.classList.contains("sb-collapsed") ? "1" : "0");
    });
    document.getElementById("sbToggleMobile")?.addEventListener("click", () => {
      document.getElementById("adminApp").classList.toggle("sb-mobile-open");
    });
    document.getElementById("userPill")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = document.getElementById("userDD");
      dd.hidden = !dd.hidden;
    });
    document.addEventListener("click", () => {
      const dd = document.getElementById("userDD");
      if (dd) dd.hidden = true;
    });
    document.getElementById("signOutBtn")?.addEventListener("click", async () => {
      await Admin.db.sb.auth.signOut();
      bounce();
    });
    window.addEventListener("hashchange", () => mountRoute(parseHash()));
    if (localStorage.getItem("admin_sb_collapsed") === "1") {
      document.getElementById("adminApp").classList.add("sb-collapsed");
    }
  }

  function showApp(ctx) {
    document.body.hidden = false;
    document.getElementById("adminApp").hidden = false;
    const email = ctx.session.user.email || "admin";
    document.getElementById("userEmail").textContent = email;
    document.getElementById("userAvatar").textContent = (email[0] || "·").toUpperCase();
    bindShellEvents();
    mountRoute(parseHash());
  }

  async function init() {
    if (!window.supabase || SUPABASE_URL.indexOf("__") === 0) { bounce(); return; }
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "sov-auth" },
    });
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { bounce(); return; }

    // Gerçek IAM: admin_users tablosundan rol oku.
    // app_metadata fallback'i geriye uyumluluk için tutulur.
    let role = null;
    let capabilities = [];
    try {
      const { data, error } = await sb.from("admin_users")
        .select("role, active")
        .eq("user_id", session.user.id)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      role = data?.role || null;
      if (role) {
        const { data: r } = await sb.from("admin_roles")
          .select("capabilities").eq("role", role).maybeSingle();
        capabilities = r?.capabilities || [];
      }
    } catch {}

    if (!role) {
      const legacy = session.user?.app_metadata?.role;
      if (legacy === "admin") { role = "admin"; capabilities = ["*"]; }
    }

    if (!role) { bounce(); return; }

    const ctx = { session, role, capabilities };
    Admin.ctx = ctx;
    Admin.initDb(sb, ctx);
    showApp(ctx);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
